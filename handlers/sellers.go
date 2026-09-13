package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// sellerVoucherValidity is how long a freshly minted seller code stays usable.
// Sellers do not choose it: the split is the only lever they have, and an
// open-ended code is one nobody ever revisits. An admin can retire a code early
// from the sellers section.
const sellerVoucherValidity = 365 * 24 * time.Hour

// maxActiveSellerVouchers caps how many live codes one seller may hold at once.
// Codes are free to mint and permanent once used, so without a cap a seller
// could paper the internet with one code per split and make the statistics
// unreadable. Expired codes do not count against it.
const maxActiveSellerVouchers = 20

// sellerVoucherCodeAttempts bounds the retry loop that mints a unique code.
// With 4 random bytes a collision is already unlikely; this just refuses to
// spin forever if the random source or the uniqueness check misbehaves.
const sellerVoucherCodeAttempts = 8

// currentUserID pulls the authenticated user out of the request context.
// AuthMiddleware put it there; a missing or wrong-typed value means the route
// was wired without auth, which is a programming error rather than a 401.
func currentUserID(r *http.Request) (primitive.ObjectID, bool) {
	id, ok := r.Context().Value("userID").(primitive.ObjectID)
	if !ok || id.IsZero() {
		return primitive.NilObjectID, false
	}
	return id, true
}

// sellerVouchersFor loads every code a seller owns, newest first.
func sellerVouchersFor(ctx context.Context, sellerID primitive.ObjectID) ([]models.Discount, error) {
	cursor, err := db.Database.Collection("discounts").Find(
		ctx,
		bson.M{"seller_id": sellerID},
		options.Find().SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var vouchers []models.Discount
	if err := cursor.All(ctx, &vouchers); err != nil {
		return nil, err
	}
	return vouchers, nil
}

// generateSellerVoucherCode mints an unused code.
//
// The suffix is random rather than derived from the seller's name or id: the
// code is printed on other people's websites, and a partner's identity should
// not be readable from it. Uniqueness is checked against BOTH code collections
// because checkout resolves a promo code by looking in negotiated_coupons
// first — a seller code that collided with one there would silently apply the
// wrong discount.
func generateSellerVoucherCode(ctx context.Context) (string, error) {
	discounts := db.Database.Collection("discounts")
	coupons := db.Database.Collection("negotiated_coupons")

	for attempt := 0; attempt < sellerVoucherCodeAttempts; attempt++ {
		raw := make([]byte, 4)
		if _, err := rand.Read(raw); err != nil {
			return "", err
		}
		code := models.SellerVoucherCodePrefix + strings.ToUpper(hex.EncodeToString(raw))

		taken, err := discounts.CountDocuments(ctx, bson.M{"code": code})
		if err != nil {
			return "", err
		}
		if taken > 0 {
			continue
		}
		taken, err = coupons.CountDocuments(ctx, bson.M{"code": code})
		if err != nil {
			return "", err
		}
		if taken == 0 {
			return code, nil
		}
	}
	return "", errors.New("could not mint an unused voucher code")
}

// sellerPanelPayload is the whole seller panel in one response: who they are,
// what they have earned, every code with its own numbers, and the orders behind
// them. One round trip because the panel has no meaningful partial state.
type sellerPanelPayload struct {
	Seller struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Phone string `json:"phone,omitempty"`
		Email string `json:"email,omitempty"`
	} `json:"seller"`
	Budget struct {
		TotalPercent int `json:"total_percent"`
		MinPercent   int `json:"min_percent"`
		MaxPercent   int `json:"max_percent"`
	} `json:"budget"`
	Summary      services.SellerPerformance    `json:"summary"`
	Vouchers     []services.VoucherPerformance `json:"vouchers"`
	RecentOrders []services.AttributedOrder    `json:"recent_orders"`
	CanCreate    bool                          `json:"can_create"`
	ActiveLimit  int                           `json:"active_limit"`
}

// GetSellerPanel handles GET /api/seller/overview.
//
// Scoped entirely to the caller: the seller id comes from the JWT, never from
// the request, so there is no way to ask for someone else's numbers.
func GetSellerPanel(w http.ResponseWriter, r *http.Request) {
	sellerID, ok := currentUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "احراز هویت لازم است")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	var seller models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": sellerID}).Decode(&seller); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت اطلاعات فروشنده")
		return
	}

	payload, err := buildSellerPanel(ctx, seller)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در محاسبه آمار فروشنده")
		return
	}
	utils.JSONResponse(w, http.StatusOK, payload)
}

// buildSellerPanel assembles the panel for one seller. Shared with the admin
// seller-detail endpoint so an admin reads exactly the figures the seller does.
func buildSellerPanel(ctx context.Context, seller models.User) (*sellerPanelPayload, error) {
	vouchers, err := sellerVouchersFor(ctx, seller.ID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	perf, summary, err := services.SellerVoucherStats(ctx, db.Database, vouchers, now)
	if err != nil {
		return nil, err
	}
	summary.SellerID = seller.ID
	summary.Name = seller.Name
	summary.Phone = seller.Phone
	summary.Email = seller.Email
	summary.IsActive = seller.IsActive
	summary.JoinedAt = seller.CreatedAt

	codes := make([]string, 0, len(vouchers))
	shares := make(map[string]int, len(vouchers))
	for _, v := range vouchers {
		codes = append(codes, v.Code)
		shares[v.Code] = v.SellerSharePercent
	}
	recent, err := services.AttributedOrders(ctx, db.Database, codes, shares, 50)
	if err != nil {
		return nil, err
	}

	payload := &sellerPanelPayload{
		Summary:      summary,
		Vouchers:     perf,
		RecentOrders: recent,
		ActiveLimit:  maxActiveSellerVouchers,
		CanCreate:    summary.ActiveVoucherCount < maxActiveSellerVouchers,
	}
	payload.Seller.ID = seller.ID.Hex()
	payload.Seller.Name = seller.Name
	payload.Seller.Phone = seller.Phone
	payload.Seller.Email = seller.Email
	payload.Budget.TotalPercent = models.SellerVoucherBudgetPercent
	payload.Budget.MinPercent = models.SellerVoucherMinPercent
	payload.Budget.MaxPercent = models.SellerVoucherMaxPercent
	return payload, nil
}

// CreateSellerVoucher handles POST /api/seller/vouchers.
//
// The body carries only the split. The code text, validity and ownership are
// all decided here — a seller cannot name their own code, claim someone else's
// id, or mint a code outside the fixed budget.
func CreateSellerVoucher(w http.ResponseWriter, r *http.Request) {
	sellerID, ok := currentUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "احراز هویت لازم است")
		return
	}

	var payload struct {
		DiscountPercent    *int `json:"discount_percent"`
		SellerSharePercent *int `json:"seller_share_percent"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}
	if payload.DiscountPercent == nil || payload.SellerSharePercent == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "درصد تخفیف مشتری و سهم فروشنده هر دو باید مشخص شوند")
		return
	}

	// Both halves are validated, not one plus a derived remainder: a client
	// that computes the split differently is caught here rather than minting a
	// code whose two percentages disagree.
	if err := models.ValidateSellerVoucherSplit(*payload.DiscountPercent, *payload.SellerSharePercent); err != nil {
		switch {
		case errors.Is(err, models.ErrSellerSplitOutOfRange):
			utils.ErrorResponse(w, http.StatusBadRequest, "هر سهم باید عددی صحیح بین ۰ تا ۳۶ باشد")
		default:
			utils.ErrorResponse(w, http.StatusBadRequest, "مجموع تخفیف مشتری و سهم فروشنده باید دقیقاً ۳۶ درصد باشد")
		}
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	now := time.Now()
	existing, err := sellerVouchersFor(ctx, sellerID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کدهای موجود")
		return
	}
	active := 0
	for _, v := range existing {
		if now.Before(v.ValidTo) && !now.Before(v.ValidFrom) {
			active++
		}
	}
	if active >= maxActiveSellerVouchers {
		utils.ErrorResponse(w, http.StatusConflict, "به سقف تعداد کدهای فعال رسیده‌اید")
		return
	}

	code, err := generateSellerVoucherCode(ctx)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ساخت کد تخفیف")
		return
	}

	voucher := models.Discount{
		Code:               code,
		Type:               "percentage",
		Value:              float64(*payload.DiscountPercent),
		MinOrderAmount:     0,
		ValidFrom:          now,
		ValidTo:            now.Add(sellerVoucherValidity),
		MaxUses:            0, // unlimited
		UsedCount:          0,
		IsPublic:           true,
		CreatedAt:          now,
		UpdatedAt:          now,
		SellerID:           &sellerID,
		SellerSharePercent: *payload.SellerSharePercent,
	}

	result, err := db.Database.Collection("discounts").InsertOne(ctx, voucher)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "این کد قبلاً ثبت شده است، دوباره تلاش کنید")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد تخفیف")
		return
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		voucher.ID = id
	}

	utils.JSONResponse(w, http.StatusCreated, voucher)
}
