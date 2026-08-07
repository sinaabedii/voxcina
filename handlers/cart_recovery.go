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

// SendCartRecoverySMS finds every active, non-empty cart and — for users who
// don't already hold an unused, unexpired cart-recovery coupon — issues a
// coupon scoped to the product/color variants currently in their cart (any
// size qualifies, and it stays valid if at least one of those variants is
// still in the cart later) and texts them the code.
// POST /api/admin/carts/send-recovery-sms
func SendCartRecoverySMS(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DiscountPercent float64 `json:"discount_percent"`
		ValidDays       int     `json:"valid_days"`
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

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cartsColl := db.Database.Collection("carts")
	cursor, err := cartsColl.Find(ctx, bson.M{"is_active": true, "items.0": bson.M{"$exists": true}})
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

	result := cartRecoveryResult{}
	smsService := services.NewSMSService()
	usersColl := db.Database.Collection("users")
	productsColl := db.Database.Collection("products")
	couponsColl := db.Database.Collection("negotiated_coupons")

	for _, cart := range carts {
		var user models.User
		if err := usersColl.FindOne(ctx, bson.M{"_id": cart.UserID}).Decode(&user); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("کاربر %s: یافت نشد", cart.UserID.Hex()))
			continue
		}
		if user.Phone == "" {
			result.Skipped++
			continue
		}

		existing, _ := couponsColl.CountDocuments(ctx, bson.M{
			"user_id":     cart.UserID,
			"source":      "cart_recovery",
			"used":        false,
			"valid_until": bson.M{"$gte": time.Now()},
		})
		if existing > 0 {
			result.Skipped++
			continue
		}

		requiredProducts, cartSnapshot := buildCartRecoverySnapshot(ctx, productsColl, cart.Items)
		if len(requiredProducts) == 0 {
			result.Skipped++
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
