package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

type cartRecoveryResult struct {
	Sent    int      `json:"sent"`
	Skipped int      `json:"skipped"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

// SendCartRecoverySMS targets active, non-empty carts — either every one of
// them, a date range on when the cart was created, or a single specific
// user — and, for users who don't already hold an unused, unexpired
// cart-recovery coupon, issues a coupon scoped to the product/color variants
// currently in their cart (any size qualifies, and it stays valid if at
// least one of those variants is still in the cart later) and texts them the
// code.
// POST /api/admin/carts/send-recovery-sms
func SendCartRecoverySMS(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DiscountPercent float64 `json:"discount_percent"`
		ValidDays       int     `json:"valid_days"`
		UserID          string  `json:"user_id,omitempty"`
		CreatedFrom     string  `json:"created_from,omitempty"` // "YYYY-MM-DD"
		CreatedTo       string  `json:"created_to,omitempty"`   // "YYYY-MM-DD"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	if req.DiscountPercent <= 0 || req.DiscountPercent > 100 {
		utils.ErrorResponse(w, http.StatusBadRequest, "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد")
		return
	}
	if req.ValidDays <= 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "مدت اعتبار باید حداقل ۱ روز باشد")
		return
	}

	targetingUser := req.UserID != ""
	var targetUserID primitive.ObjectID
	if targetingUser {
		var err error
		targetUserID, err = primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "شناسه کاربر نامعتبر است")
			return
		}
	}

	cartFilter := bson.M{"is_active": true, "items.0": bson.M{"$exists": true}}
	if targetingUser {
		cartFilter["user_id"] = targetUserID
	} else {
		createdFilter := bson.M{}
		if req.CreatedFrom != "" {
			t, err := time.Parse("2006-01-02", req.CreatedFrom)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "تاریخ شروع نامعتبر است")
				return
			}
			createdFilter["$gte"] = t
		}
		if req.CreatedTo != "" {
			t, err := time.Parse("2006-01-02", req.CreatedTo)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "تاریخ پایان نامعتبر است")
				return
			}
			// Inclusive of the whole end day.
			createdFilter["$lte"] = t.Add(24*time.Hour - time.Nanosecond)
		}
		if len(createdFilter) > 0 {
			cartFilter["created_at"] = createdFilter
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cartsColl := db.Database.Collection("carts")
	cursor, err := cartsColl.Find(ctx, cartFilter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت سبدهای خرید")
		return
	}
	defer cursor.Close(ctx)

	var carts []models.Cart
	if err := cursor.All(ctx, &carts); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در پردازش سبدهای خرید")
		return
	}

	if targetingUser && len(carts) == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "این کاربر سبد خرید فعال و غیرخالی ندارد")
		return
	}

	result := cartRecoveryResult{}
	smsService := services.NewSMSService()
	usersColl := db.Database.Collection("users")
	productsColl := db.Database.Collection("products")
	couponsColl := db.Database.Collection("negotiated_coupons")

	// skip records a non-error reason a cart was left out. When targeting a
	// single user, the reason is surfaced back so the admin gets a clear
	// explanation instead of a silent no-op.
	skip := func(reason string) {
		result.Skipped++
		if targetingUser {
			result.Errors = append(result.Errors, reason)
		}
	}

	for _, cart := range carts {
		var user models.User
		if err := usersColl.FindOne(ctx, bson.M{"_id": cart.UserID}).Decode(&user); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("کاربر %s: یافت نشد", cart.UserID.Hex()))
			continue
		}
		if user.Phone == "" {
			skip(fmt.Sprintf("کاربر %s شماره موبایل ثبت‌شده ندارد", user.Name))
			continue
		}

		existing, _ := couponsColl.CountDocuments(ctx, bson.M{
			"user_id":     cart.UserID,
			"source":      "cart_recovery",
			"used":        false,
			"valid_until": bson.M{"$gte": time.Now()},
		})
		if existing > 0 {
			skip(fmt.Sprintf("کاربر %s در حال حاضر کد تخفیف فعال بازگشت به سبد خرید دارد", user.Name))
			continue
		}

		requiredProducts, cartSnapshot := buildCartRecoverySnapshot(ctx, productsColl, cart.Items)
		if len(requiredProducts) == 0 {
			skip(fmt.Sprintf("کاربر %s: محصولات سبد خرید دیگر فعال نیستند", user.Name))
			continue
		}

		code := fmt.Sprintf("CART-%08X", rand.Uint32())
		coupon := models.NegotiatedCoupon{
			Code:             code,
			UserID:           cart.UserID,
			RequiredProducts: requiredProducts,
			CartSnapshot:     cartSnapshot,
			Type:             "percentage",
			Value:            req.DiscountPercent,
			ValidUntil:       time.Now().Add(time.Duration(req.ValidDays) * 24 * time.Hour),
			Used:             false,
			Source:           "cart_recovery",
			CreatedAt:        time.Now(),
		}
		if _, err := couponsColl.InsertOne(ctx, coupon); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("کاربر %s: خطا در ذخیره کوپن", cart.UserID.Hex()))
			continue
		}

		firstName := firstNameOf(user.Name)
		if err := smsService.SendCartRecoveryCoupon(user.Phone, firstName, int(req.DiscountPercent), req.ValidDays); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("کاربر %s: خطا در ارسال پیامک", cart.UserID.Hex()))
			couponsColl.DeleteOne(ctx, bson.M{"code": code})
			continue
		}

		result.Sent++
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// buildCartRecoverySnapshot resolves each cart item to its canonical color
// variant and dedupes by (product, color), producing the RequiredProducts
// list the coupon will be validated against plus a display snapshot.
func buildCartRecoverySnapshot(ctx context.Context, productsColl *mongo.Collection, items []models.CartItem) ([]models.RequiredProduct, []models.CartItemSnapshot) {
	seen := make(map[string]bool)
	required := make([]models.RequiredProduct, 0, len(items))
	snapshot := make([]models.CartItemSnapshot, 0, len(items))

	for _, item := range items {
		var product models.Product
		if err := productsColl.FindOne(ctx, bson.M{"_id": item.ProductID, "is_active": true}).Decode(&product); err != nil {
			continue
		}

		color, colorName, image := item.Variant.Color, item.Variant.ColorName, ""
		if cv, _, ok := findColorVariant(&product, color, colorName); ok {
			color = canonicalColorValue(cv)
			colorName = cv.ColorName
			if len(cv.Images) > 0 {
				image = cv.Images[0]
			}
		}

		key := item.ProductID.Hex() + "|" + color + "|" + colorName
		if !seen[key] {
			seen[key] = true
			required = append(required, models.RequiredProduct{
				ProductID: item.ProductID,
				Color:     color,
				ColorName: colorName,
				Image:     image,
			})
		}

		snapshot = append(snapshot, models.CartItemSnapshot{
			ProductID:   item.ProductID.Hex(),
			ProductName: product.Name,
			Price:       product.Price,
			Color:       color,
			ColorName:   colorName,
			Size:        item.Variant.Size,
		})
	}

	return required, snapshot
}

func firstNameOf(fullName string) string {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return ""
	}
	parts := strings.Fields(fullName)
	return parts[0]
}
