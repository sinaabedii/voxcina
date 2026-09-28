package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
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
	// Referral is the recruiter surface: whether this seller may recruit,
	// the code they share, and the path-only signup URL the storefront
	// resolves against its own origin (no host config exists server-side,
	// so the panel returns a path and the frontend copies the absolute link).
	Referral struct {
		CanRefer   bool   `json:"can_refer"`
		Code       string `json:"code,omitempty"`
		SignupPath string `json:"signup_path,omitempty"`
	} `json:"referral"`
	// ReferralEarnings is the parent's 5% cut of the recruited team's paid
	// sales. Separate from Summary.Commission by construction — see
	// services.ReferralEarnings.
	ReferralEarnings services.ReferralEarnings     `json:"referral_earnings"`
	Summary          services.SellerPerformance    `json:"summary"`
	Vouchers         []services.VoucherPerformance `json:"vouchers"`
	RecentOrders     []services.AttributedOrder    `json:"recent_orders"`
	CanCreate        bool                          `json:"can_create"`
	ActiveLimit      int                           `json:"active_limit"`
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
	// The seller's own budget drives the voucher picker: standard sellers
	// split 36, referral-joined sellers split 20. A stored value outside the
	// {36, 20} whitelist (including every legacy document, which stores
	// nothing) is treated as the standard budget.
	budget := models.NormalizeSellerBudget(seller.SellerBudgetPercent)
	if seller.SellerBudgetPercent != 0 && budget != seller.SellerBudgetPercent {
		log.Printf("seller %s has out-of-whitelist seller_budget_percent=%d; treating as %d",
			seller.ID.Hex(), seller.SellerBudgetPercent, budget)
	}
	payload.Budget.TotalPercent = budget
	payload.Budget.MinPercent = models.SellerVoucherMinPercent
	payload.Budget.MaxPercent = budget
	payload.Referral.CanRefer = seller.CanReferSellers
	if seller.CanReferSellers && seller.SellerReferralCode != "" {
		payload.Referral.Code = seller.SellerReferralCode
		payload.Referral.SignupPath = "/seller/sign-up?ref=" + seller.SellerReferralCode
	}
	// No referral code means this seller could never have recruited, so the
	// team lookup is skipped and the earnings stay zero.
	payload.ReferralEarnings = services.ReferralEarnings{Sellers: []services.SellerPerformance{}}
	if seller.SellerReferralCode != "" {
		earnings, err := services.ReferralEarningsFor(ctx, db.Database, seller.ID, now)
		if err != nil {
			return nil, err
		}
		payload.ReferralEarnings = earnings
		summary.ReferralCommission = earnings.Commission
		summary.ReferralOrdersPaid = earnings.OrdersPaid
		summary.ReferralSellerCount = earnings.SellerCount
		payload.Summary = summary
	}
	return payload, nil
}

// toPersianDigits renders a non-negative integer in Persian digits so dynamic
// budget messages read like the hand-written Persian copy around them
// ("دقیقاً ۳۶ درصد", not "دقیقاً 36 درصد").
func toPersianDigits(n int) string {
	if n == 0 {
		return "۰"
	}
	var out []rune
	for n > 0 {
		out = append([]rune{rune('۰' + n%10)}, out...)
		n /= 10
	}
	return string(out)
}

func validateSellerVoucherParams(discountPercent, sellerSharePercent, maxUses *int, validDays *int, validTo *time.Time, now time.Time) (time.Time, string) {
	return validateSellerVoucherParamsForBudget(models.SellerVoucherBudgetPercent, discountPercent, sellerSharePercent, maxUses, validDays, validTo, now)
}

// validateSellerVoucherParamsForBudget is the budget-aware core: the split is
// checked against the caller's own budget (36 standard, 20 referral-joined)
// so each seller's picker matches their panel's budget block.
func validateSellerVoucherParamsForBudget(budget int, discountPercent, sellerSharePercent, maxUses *int, validDays *int, validTo *time.Time, now time.Time) (time.Time, string) {
	if discountPercent == nil || sellerSharePercent == nil {
		return time.Time{}, "درصد تخفیف مشتری و سهم فروشنده هر دو باید مشخص شوند"
	}
	if maxUses == nil || *maxUses <= 0 {
		return time.Time{}, "سقف تعداد استفاده برای کاربران باید عددی بزرگتر از صفر باشد"
	}

	if err := models.ValidateSellerVoucherSplitForBudget(budget, *discountPercent, *sellerSharePercent); err != nil {
		faBudget := toPersianDigits(budget)
		switch {
		case errors.Is(err, models.ErrSellerSplitOutOfRange):
			return time.Time{}, fmt.Sprintf("هر سهم باید عددی صحیح بین ۰ تا %s باشد", faBudget)
		default:
			return time.Time{}, fmt.Sprintf("مجموع تخفیف مشتری و سهم فروشنده باید دقیقاً %s درصد باشد", faBudget)
		}
	}

	if validDays != nil {
		if *validDays < 1 || *validDays > 365 {
			return time.Time{}, "مدت اعتبار باید بین ۱ تا ۳۶۵ روز (حداکثر ۱ سال) باشد"
		}
		return now.Add(time.Duration(*validDays) * 24 * time.Hour), ""
	} else if validTo != nil {
		if !validTo.After(now) {
			return time.Time{}, "تاریخ انقضا باید در آینده باشد"
		}
		maxAllowed := now.Add(366 * 24 * time.Hour)
		if validTo.After(maxAllowed) {
			return time.Time{}, "تاریخ انقضا نمی‌تواند بیشتر از ۱ سال باشد"
		}
		return *validTo, ""
	}

	return time.Time{}, "مدت اعتبار یا تاریخ انقضا الزامی است (حداکثر ۱ سال)"
}

// sellerVoucherOwnedBy reports whether the discount is a seller voucher issued
// to sellerID. DeleteSellerVoucher treats every false answer as 404, so a
// caller can never probe whether another seller's code exists.
func sellerVoucherOwnedBy(d *models.Discount, sellerID primitive.ObjectID) bool {
	return d.IsSellerVoucher() && *d.SellerID == sellerID
}

// sellerVoucherRemovalDecide decides what DeleteSellerVoucher does with a
// loaded discount: owned=false means answer 404 (missing, not a seller
// voucher, or someone else's — indistinguishable on purpose); alreadyExpired
// means answer 200 without writing because the code is already unusable.
func sellerVoucherRemovalDecide(d *models.Discount, sellerID primitive.ObjectID, now time.Time) (owned bool, alreadyExpired bool) {
	if !sellerVoucherOwnedBy(d, sellerID) {
		return false, false
	}
	return true, !now.Before(d.ValidTo)
}

// DeleteSellerVoucher handles DELETE /api/seller/vouchers/{id}.
//
// Seller vouchers are never hard-deleted: order history references them (the
// admin DeleteDiscount refuses the same way), so "removal" retires the code by
// moving valid_to to now. GetDiscountByCode rejects anything with
// now.After(ValidTo), so the code stops working everywhere immediately. The
// operation is idempotent — re-removing an already-expired code answers 200
// without a write. Ownership is hidden: a code that is missing, not a seller
// voucher, or owned by someone else all answer the same 404.
func DeleteSellerVoucher(w http.ResponseWriter, r *http.Request) {
	sellerID, ok := currentUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "احراز هویت لازم است")
		return
	}

	objID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه کد تخفیف نامعتبر است")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	var existing models.Discount
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "کد تخفیف یافت نشد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تخفیف")
		return
	}

	now := time.Now()
	owned, alreadyExpired := sellerVoucherRemovalDecide(&existing, sellerID, now)
	if !owned {
		utils.ErrorResponse(w, http.StatusNotFound, "کد تخفیف یافت نشد")
		return
	}
	if alreadyExpired {
		utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "کد تخفیف قبلاً منقضی شده است"})
		return
	}

	if _, err := collection.UpdateOne(ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"valid_to": now, "updated_at": now}},
	); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در حذف کد تخفیف")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "کد تخفیف با موفقیت حذف شد"})
}

// CreateSellerVoucher handles POST /api/seller/vouchers.
//
// The body carries the split, usage cap and validity. The code text and ownership are
// decided here — a seller cannot name their own code, claim someone else's
// id, or mint a code outside their own budget (36 standard, 20 referral-joined).
func CreateSellerVoucher(w http.ResponseWriter, r *http.Request) {
	sellerID, ok := currentUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "احراز هویت لازم است")
		return
	}

	var payload struct {
		DiscountPercent    *int       `json:"discount_percent"`
		SellerSharePercent *int       `json:"seller_share_percent"`
		MaxUses            *int       `json:"max_uses"`
		ValidDays          *int       `json:"valid_days"`
		ValidTo            *time.Time `json:"valid_to"`
		ShippingDiscount   string     `json:"shipping_discount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "درخواست نامعتبر است")
		return
	}

	// Mirror CreateDiscount: unknown values are rejected, missing/empty means
	// "full" (the customer pays shipping). Pre-existing rows stored "" and the
	// charge paths treat "" as full via ShippingDiscountPercent, so nothing
	// old breaks.
	if !models.IsValidShippingDiscount(payload.ShippingDiscount) {
		utils.ErrorResponse(w, http.StatusBadRequest, "تخفیف هزینه ارسال نامعتبر است")
		return
	}
	shippingDiscount := payload.ShippingDiscount
	if shippingDiscount == "" {
		shippingDiscount = models.ShippingDiscountFull
	}

	now := time.Now()
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	// The caller's own budget decides the split: legacy documents (no stored
	// budget) and any out-of-whitelist value fall back to the standard 36.
	var seller models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": sellerID}).Decode(&seller); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت اطلاعات فروشنده")
		return
	}
	budget := models.NormalizeSellerBudget(seller.SellerBudgetPercent)
	if seller.SellerBudgetPercent != 0 && budget != seller.SellerBudgetPercent {
		log.Printf("seller %s has out-of-whitelist seller_budget_percent=%d; treating as %d",
			sellerID.Hex(), seller.SellerBudgetPercent, budget)
	}

	validTo, errMsg := validateSellerVoucherParamsForBudget(budget, payload.DiscountPercent, payload.SellerSharePercent, payload.MaxUses, payload.ValidDays, payload.ValidTo, now)
	if errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

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
		ShippingDiscount:   shippingDiscount,
		MinOrderAmount:     0,
		ValidFrom:          now,
		ValidTo:            validTo,
		MaxUses:            *payload.MaxUses,
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
