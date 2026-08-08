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
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

type cartRecoveryResult struct {
	Sent    int                  `json:"sent"`
	Skipped int                  `json:"skipped"`
	Failed  int                  `json:"failed"`
	Errors  []string             `json:"errors,omitempty"`
	Details []cartRecoveryDetail `json:"details,omitempty"`
}

type cartRecoveryDetail struct {
	UserID                   string  `json:"user_id"`
	UserName                 string  `json:"user_name,omitempty"`
	Status                   string  `json:"status"` // skipped | failed
	Reason                   string  `json:"reason"`
	Message                  string  `json:"message"`
	ExistingDiscountPercent  float64 `json:"existing_discount_percent,omitempty"`
	RequestedDiscountPercent float64 `json:"requested_discount_percent,omitempty"`
}

// SendCartRecoverySMS targets active, non-empty carts — either every one of
// them, a date range on when the cart was created, or a single specific
// user — and, for users who don't already hold an unused, unexpired
// cart-recovery coupon (unless an explicitly higher discount is requested),
// issues a coupon scoped to the product/color variants currently in their cart
// (any size qualifies, and it stays valid if at least one of those variants is
// still in the cart later) and texts them the code. At most two active
// cart-recovery coupons are allowed per user.
// POST /api/admin/carts/send-recovery-sms
func SendCartRecoverySMS(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DiscountPercent     float64 `json:"discount_percent"`
		ValidDays           int     `json:"valid_days"`
		AllowHigherDiscount bool    `json:"allow_higher_discount,omitempty"`
		UserID              string  `json:"user_id,omitempty"`
		CreatedFrom         string  `json:"created_from,omitempty"` // "YYYY-MM-DD"
		CreatedTo           string  `json:"created_to,omitempty"`   // "YYYY-MM-DD"
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

	addDetail := func(userID primitive.ObjectID, userName, status, reason, message string, existingPercent float64) {
		result.Details = append(result.Details, cartRecoveryDetail{
			UserID:                   userID.Hex(),
			UserName:                 userName,
			Status:                   status,
			Reason:                   reason,
			Message:                  message,
			ExistingDiscountPercent:  existingPercent,
			RequestedDiscountPercent: req.DiscountPercent,
		})
		result.Errors = append(result.Errors, message)
		if status == "skipped" {
			result.Skipped++
		} else {
			result.Failed++
		}
	}

	for _, cart := range carts {
		var user models.User
		if err := usersColl.FindOne(ctx, bson.M{"_id": cart.UserID}).Decode(&user); err != nil {
			addDetail(cart.UserID, "", "failed", "user_not_found", fmt.Sprintf("کاربر %s یافت نشد", cart.UserID.Hex()), 0)
			continue
		}
		if user.Phone == "" {
			addDetail(cart.UserID, user.Name, "skipped", "no_phone", fmt.Sprintf("کاربر %s شماره موبایل ثبت‌شده ندارد", user.Name), 0)
			continue
		}

		activeRecoveryFilter := bson.M{
			"user_id":     cart.UserID,
			"source":      "cart_recovery",
			"used":        false,
			"valid_until": bson.M{"$gte": time.Now()},
		}
		activeCursor, err := couponsColl.Find(ctx, activeRecoveryFilter, options.Find().SetProjection(bson.M{"value": 1}))
		if err != nil {
			addDetail(cart.UserID, user.Name, "failed", "coupon_lookup_failed", fmt.Sprintf("کاربر %s: خطا در بررسی کدهای تخفیف فعال", user.Name), 0)
			continue
		}
		var activeCoupons []struct {
			Value float64 `bson:"value"`
		}
		if err := activeCursor.All(ctx, &activeCoupons); err != nil {
			addDetail(cart.UserID, user.Name, "failed", "coupon_lookup_failed", fmt.Sprintf("کاربر %s: خطا در پردازش کدهای تخفیف فعال", user.Name), 0)
			continue
		}

		highestExistingPercent := 0.0
		for _, activeCoupon := range activeCoupons {
			if activeCoupon.Value > highestExistingPercent {
				highestExistingPercent = activeCoupon.Value
			}
		}
		if len(activeCoupons) > 0 && !req.AllowHigherDiscount {
			addDetail(cart.UserID, user.Name, "skipped", "active_coupon_exists", fmt.Sprintf("کاربر %s کد تخفیف فعال بازگشت به سبد خرید با تخفیف %.0f%% دارد؛ برای ارسال کد دوم گزینه ارسال با درصد بالاتر را فعال کنید", user.Name, highestExistingPercent), highestExistingPercent)
			continue
		}
		if len(activeCoupons) > 0 && req.DiscountPercent <= highestExistingPercent {
			addDetail(cart.UserID, user.Name, "skipped", "not_higher", fmt.Sprintf("درصد جدید برای کاربر %s باید بیشتر از %.0f%% باشد", user.Name, highestExistingPercent), highestExistingPercent)
			continue
		}
		if len(activeCoupons) >= 2 {
			addDetail(cart.UserID, user.Name, "skipped", "maximum_active_coupons", fmt.Sprintf("کاربر %s از قبل دو کد تخفیف فعال بازگشت به سبد خرید دارد", user.Name), highestExistingPercent)
			continue
		}

		requiredProducts, cartSnapshot := buildCartRecoverySnapshot(ctx, productsColl, cart.Items)
		if len(requiredProducts) == 0 {
			addDetail(cart.UserID, user.Name, "skipped", "inactive_products", fmt.Sprintf("کاربر %s: محصولات سبد خرید دیگر فعال نیستند", user.Name), highestExistingPercent)
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
			addDetail(cart.UserID, user.Name, "failed", "coupon_save_failed", fmt.Sprintf("کاربر %s: خطا در ذخیره کد تخفیف", user.Name), highestExistingPercent)
			continue
		}

		firstName := firstNameOf(user.Name)
		if err := smsService.SendCartRecoveryCoupon(user.Phone, firstName, int(req.DiscountPercent), req.ValidDays); err != nil {
			addDetail(cart.UserID, user.Name, "failed", "sms_failed", fmt.Sprintf("کاربر %s: خطا در ارسال پیامک", user.Name), highestExistingPercent)
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
