package handlers

import (
	"context"
	"net/http"
	"sort"
	"strconv"
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

// loadSellers returns every user holding the seller role, optionally narrowed
// by a name/phone/email search.
func loadSellers(ctx context.Context, search string) ([]models.User, error) {
	filter := bson.M{"role": RoleSeller}
	if search != "" {
		// Anchored on neither side: partners are looked up by a fragment of a
		// name as often as by a full phone number.
		rx := bson.M{"$regex": primitive.Regex{Pattern: regexEscape(search), Options: "i"}}
		filter["$or"] = []bson.M{
			{"name": rx},
			{"phone": rx},
			{"email": rx},
		}
	}

	cursor, err := db.Database.Collection("users").Find(
		ctx, filter, options.Find().SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var sellers []models.User
	if err := cursor.All(ctx, &sellers); err != nil {
		return nil, err
	}
	return sellers, nil
}

// regexEscape neutralises the regex metacharacters a search box will contain by
// accident, so searching for "(" is a search and not a syntax error.
func regexEscape(s string) string {
	var b strings.Builder
	for _, r := range s {
		if strings.ContainsRune(`\.+*?()|[]{}^$`, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// vouchersBySeller loads all seller-owned codes and groups them by owner.
// Every listed seller gets an entry, even an empty one, so MeasureSellers
// reports a zero row rather than omitting a partner who has not minted a code.
func vouchersBySeller(ctx context.Context, sellers []models.User) (map[primitive.ObjectID][]models.Discount, error) {
	ids := make([]primitive.ObjectID, 0, len(sellers))
	grouped := make(map[primitive.ObjectID][]models.Discount, len(sellers))
	for _, s := range sellers {
		ids = append(ids, s.ID)
		grouped[s.ID] = nil
	}
	if len(ids) == 0 {
		return grouped, nil
	}

	cursor, err := db.Database.Collection("discounts").Find(
		ctx,
		bson.M{"seller_id": bson.M{"$in": ids}},
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
	for _, v := range vouchers {
		if v.SellerID == nil {
			continue
		}
		grouped[*v.SellerID] = append(grouped[*v.SellerID], v)
	}
	return grouped, nil
}

// adminSellersResponse is the sellers table plus the shop-wide totals across
// every partner, so the header cards do not need a second request.
type adminSellersResponse struct {
	Sellers []services.SellerPerformance `json:"sellers"`
	Totals  struct {
		SellerCount      int     `json:"seller_count"`
		VoucherCount     int     `json:"voucher_count"`
		OrdersPaid       int     `json:"orders_paid"`
		GrossSubtotal    float64 `json:"gross_subtotal"`
		CustomerDiscount float64 `json:"customer_discount"`
		Commission       float64 `json:"commission"`
		RevenueCollected float64 `json:"revenue_collected"`
	} `json:"totals"`
	Budget struct {
		TotalPercent int `json:"total_percent"`
	} `json:"budget"`
}

// AdminListSellers handles GET /api/admin/sellers.
//
// Returns every seller with their codes and the full statistics for each, in
// one pass over the orders collection.
func AdminListSellers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	sortBy := r.URL.Query().Get("sort_by") // "commission" (default) | "orders" | "newest" | "name"

	sellers, err := loadSellers(ctx, search)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت فروشندگان")
		return
	}

	grouped, err := vouchersBySeller(ctx, sellers)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت کدهای فروشندگان")
		return
	}

	measured, err := services.MeasureSellers(ctx, db.Database, grouped, time.Now())
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در محاسبه آمار فروشندگان")
		return
	}

	var resp adminSellersResponse
	resp.Sellers = make([]services.SellerPerformance, 0, len(sellers))
	for _, s := range sellers {
		row := measured[s.ID]
		row.SellerID = s.ID
		row.Name = s.Name
		row.Phone = s.Phone
		row.Email = s.Email
		row.IsActive = s.IsActive
		row.JoinedAt = s.CreatedAt
		resp.Sellers = append(resp.Sellers, row)

		resp.Totals.VoucherCount += row.VoucherCount
		resp.Totals.OrdersPaid += row.OrdersPaid
		resp.Totals.GrossSubtotal += row.GrossSubtotal
		resp.Totals.CustomerDiscount += row.CustomerDiscount
		resp.Totals.Commission += row.Commission
		resp.Totals.RevenueCollected += row.RevenueCollected
	}
	resp.Totals.SellerCount = len(sellers)
	resp.Budget.TotalPercent = models.SellerVoucherBudgetPercent

	sortSellerRows(resp.Sellers, sortBy)
	utils.JSONResponse(w, http.StatusOK, resp)
}

// sortSellerRows orders the table. Default is by commission owed, which is the
// column an admin is usually here to settle.
func sortSellerRows(rows []services.SellerPerformance, sortBy string) {
	switch sortBy {
	case "orders":
		sort.SliceStable(rows, func(i, j int) bool { return rows[i].OrdersPaid > rows[j].OrdersPaid })
	case "newest":
		sort.SliceStable(rows, func(i, j int) bool { return rows[i].JoinedAt.After(rows[j].JoinedAt) })
	case "name":
		sort.SliceStable(rows, func(i, j int) bool { return rows[i].Name < rows[j].Name })
	default:
		sort.SliceStable(rows, func(i, j int) bool { return rows[i].Commission > rows[j].Commission })
	}
}

// AdminGetSeller handles GET /api/admin/sellers/{sellerId}.
//
// Reuses the seller's own panel builder, so the admin reads exactly the numbers
// the partner sees — there is no second implementation to drift.
func AdminGetSeller(w http.ResponseWriter, r *http.Request) {
	sellerID, err := primitive.ObjectIDFromHex(mux.Vars(r)["sellerId"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه فروشنده نامعتبر است")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var seller models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": sellerID}).Decode(&seller); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "فروشنده یافت نشد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت فروشنده")
		return
	}
	if seller.Role != RoleSeller {
		utils.ErrorResponse(w, http.StatusNotFound, "این کاربر فروشنده نیست")
		return
	}

	payload, err := buildSellerPanel(ctx, seller)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در محاسبه آمار فروشنده")
		return
	}
	utils.JSONResponse(w, http.StatusOK, payload)
}

// adminSellerVoucherRow is one seller code with its owner attached, for the
// flat "every seller code in the shop" table.
type adminSellerVoucherRow struct {
	services.VoucherPerformance
	SellerID   string `json:"seller_id"`
	SellerName string `json:"seller_name"`
}

// AdminListSellerVouchers handles GET /api/admin/seller-vouchers.
//
// The flat counterpart of AdminListSellers: every seller code in the shop, each
// with its own statistics and its owner, sorted by commission earned.
func AdminListSellerVouchers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 500 {
		limit = 200
	}

	sellers, err := loadSellers(ctx, strings.TrimSpace(r.URL.Query().Get("search")))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت فروشندگان")
		return
	}
	names := make(map[primitive.ObjectID]string, len(sellers))
	for _, s := range sellers {
		names[s.ID] = s.Name
	}

	grouped, err := vouchersBySeller(ctx, sellers)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت کدهای فروشندگان")
		return
	}

	measured, err := services.MeasureSellers(ctx, db.Database, grouped, time.Now())
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در محاسبه آمار کدها")
		return
	}

	rows := make([]adminSellerVoucherRow, 0)
	for sellerID, summary := range measured {
		for _, v := range summary.Vouchers {
			rows = append(rows, adminSellerVoucherRow{
				VoucherPerformance: v,
				SellerID:           sellerID.Hex(),
				SellerName:         names[sellerID],
			})
		}
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].Commission != rows[j].Commission {
			return rows[i].Commission > rows[j].Commission
		}
		return rows[i].CreatedAt.After(rows[j].CreatedAt)
	})
	if len(rows) > limit {
		rows = rows[:limit]
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"vouchers": rows,
		"count":    len(rows),
	})
}
