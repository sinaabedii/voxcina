package handlers

// Negotiation of discount coupons for the storefront. The try-on fitting room
// no longer negotiates (see tryon_chat.go); this file backs the checkout-page
// discount chat (checkout_negotiation.go) and the shared
// /api/coupons/apply + admin voucher surfaces.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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

// buildServerCartContext reads the user's real cart so prices in the prompt
// cannot be spoofed by the caller.
func buildServerCartContext(ctx context.Context, userID primitive.ObjectID) []services.CouponCartItem {
	cart, _, err := getActiveCartForUser(ctx, userID)
	if err != nil || cart == nil {
		return nil
	}

	items := make([]services.CouponCartItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		var product models.Product
		if err := db.Database.Collection("products").FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			continue
		}

		entry := services.CouponCartItem{
			ProductID:   item.ProductID.Hex(),
			ProductName: product.Name,
			Price:       product.Price,
			Color:       item.Variant.Color,
			ColorName:   item.Variant.ColorName,
			Size:        item.Variant.Size,
		}
		if cv, _, ok := findColorVariant(&product, item.Variant.Color, item.Variant.ColorName); ok {
			entry.Color = canonicalColorValue(cv)
			entry.ColorName = cv.ColorName
		}
		items = append(items, entry)
	}
	return items
}

// loadNegotiationProgress reports how many coupons this room has already
// produced, the largest percent among them, and the reason cited for that
// largest grant — the three facts the reason gate needs to decide whether the
// agent may go higher this turn.
func loadNegotiationProgress(ctx context.Context, userID primitive.ObjectID, chatID string) (int, int, string) {
	if chatID == "" {
		return 0, 0, ""
	}

	cursor, err := db.Database.Collection("negotiated_coupons").Find(ctx, bson.M{
		"user_id": userID,
		"chat_id": chatID,
	})
	if err != nil {
		fmt.Printf("[checkout-negotiate] progress lookup failed: %v\n", err)
		return 0, 0, ""
	}
	defer cursor.Close(ctx)

	var coupons []models.NegotiatedCoupon
	if err := cursor.All(ctx, &coupons); err != nil {
		fmt.Printf("[checkout-negotiate] progress decode failed: %v\n", err)
		return 0, 0, ""
	}

	prevMax := 0
	lastReason := ""
	for _, c := range coupons {
		if int(c.Value) > prevMax {
			prevMax = int(c.Value)
			lastReason = c.Reason
		}
	}
	return len(coupons), prevMax, lastReason
}

// loadLatestActiveCoupon returns the most recent still-unused, unexpired
// negotiated coupon for this fitting room, as a NegotiateCouponOut the agent
// can echo straight back to the client when it restates the current best price.
// Returns nil when there is none — the agent then mints a fresh code.
func loadLatestActiveCoupon(ctx context.Context, userID primitive.ObjectID, chatID string) *services.NegotiateCouponOut {
	if chatID == "" {
		return nil
	}

	var coupon models.NegotiatedCoupon
	err := db.Database.Collection("negotiated_coupons").FindOne(ctx, bson.M{
		"user_id":     userID,
		"chat_id":     chatID,
		"used":        false,
		"valid_until": bson.M{"$gt": time.Now()},
	}, options.FindOne().SetSort(bson.M{"created_at": -1})).Decode(&coupon)
	if err != nil {
		return nil
	}

	out := &services.NegotiateCouponOut{
		Code:       coupon.Code,
		Value:      coupon.Value,
		Reason:     coupon.Reason,
		ValidUntil: coupon.ValidUntil.Format(time.RFC3339),
		IsReuse:    true,
	}

	productIDStrings := make([]string, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		productIDStrings = append(productIDStrings, pid.Hex())
	}
	out.ProductIDs = productIDStrings
	if len(productIDStrings) > 1 {
		out.CompProductID = productIDStrings[1]
	}

	if len(coupon.RequiredProducts) > 0 {
		out.MainColor = coupon.RequiredProducts[0].Color
		out.MainColorName = coupon.RequiredProducts[0].ColorName
		if len(coupon.RequiredProducts) > 1 {
			out.CompColor = coupon.RequiredProducts[1].Color
			out.CompColorName = coupon.RequiredProducts[1].ColorName
		}
	}

	return out
}

func buildNegotiatedCoupon(input services.SellerAgentInput, coupon *services.NegotiateCouponOut, userID primitive.ObjectID) models.NegotiatedCoupon {
	productIDs := make([]primitive.ObjectID, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		objID, err := primitive.ObjectIDFromHex(pid)
		if err == nil {
			productIDs = append(productIDs, objID)
		}
	}

	validUntil, _ := time.Parse(time.RFC3339, coupon.ValidUntil)

	cartSnapshot := make([]models.CartItemSnapshot, 0, len(input.CartItems))
	for _, item := range input.CartItems {
		cartSnapshot = append(cartSnapshot, models.CartItemSnapshot{
			ProductID:   item.ProductID,
			ProductName: item.ProductName,
			Price:       item.Price,
			Color:       item.Color,
			ColorName:   item.ColorName,
			Size:        item.Size,
		})
	}

	conversation := make([]models.CouponMessage, 0, len(input.ChatHistory)+1)
	for _, msg := range input.ChatHistory {
		conversation = append(conversation, models.CouponMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	conversation = append(conversation, models.CouponMessage{
		Role:    "user",
		Content: input.Request.Message,
	})

	requiredProducts := buildRequiredProducts(input, coupon)

	return models.NegotiatedCoupon{
		Code:             coupon.Code,
		UserID:           userID,
		ProductIDs:       productIDs,
		RequiredProducts: requiredProducts,
		CartSnapshot:     cartSnapshot,
		Type:             "percentage",
		Value:            coupon.Value,
		Reason:           coupon.Reason,
		ValidUntil:       validUntil,
		Used:             false,
		Conversation:     conversation,
		CreatedAt:        time.Now(),
	}
}

func buildRequiredProducts(input services.SellerAgentInput, coupon *services.NegotiateCouponOut) []models.RequiredProduct {
	ctx := context.Background()
	collection := db.Database.Collection("products")
	result := make([]models.RequiredProduct, 0, len(coupon.ProductIDs))

	for i, pid := range coupon.ProductIDs {
		objID, err := primitive.ObjectIDFromHex(pid)
		if err != nil {
			continue
		}

		var product models.Product
		if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&product); err != nil {
			continue
		}

		var color, colorName, image string
		if i == 0 {
			color = input.Request.TryonColor
			colorName = input.TryonColorName
		} else if coupon.CompProductID != "" && pid == coupon.CompProductID {
			for _, cp := range input.ComplementaryProducts {
				if cp.ProductID == coupon.CompProductID {
					color = cp.Color
					colorName = cp.ColorName
					if cp.Image != "" {
						image = cp.Image
					}
					break
				}
			}
		}

		if cv, _, ok := findColorVariant(&product, color, colorName); ok {
			color = canonicalColorValue(cv)
			colorName = cv.ColorName
			if image == "" && len(cv.Images) > 0 {
				image = cv.Images[0]
			}
			if image == "" && cv.TryOnImage != "" {
				image = cv.TryOnImage
			}
		} else if len(product.ColorVariants) > 0 {
			cv := product.ColorVariants[0]
			color = canonicalColorValue(cv)
			colorName = cv.ColorName
			if image == "" && len(cv.Images) > 0 {
				image = cv.Images[0]
			}
		}

		result = append(result, models.RequiredProduct{
			ProductID: objID,
			Color:     color,
			ColorName: colorName,
			Image:     image,
		})
	}

	return result
}

func saveNegotiatedCoupon(ctx context.Context, coupon models.NegotiatedCoupon) error {
	collection := db.Database.Collection("negotiated_coupons")
	_, err := collection.InsertOne(ctx, coupon)
	return err
}

func ApplyNegotiatedCoupon(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req struct {
		Code      string `json:"code"`
		CartItems []struct {
			ProductID string `json:"product_id"`
			Color     string `json:"color,omitempty"`
			ColorName string `json:"color_name,omitempty"`
		} `json:"cart_items,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}

	if req.Code == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد کوپن الزامی است")
		return
	}

	ctx := context.Background()
	collection := db.Database.Collection("negotiated_coupons")

	var coupon models.NegotiatedCoupon
	err = collection.FindOne(ctx, bson.M{
		"code":    req.Code,
		"user_id": userID,
		"used":    false,
	}).Decode(&coupon)

	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "کد تخفیف نامعتبر است یا قبلاً استفاده شده")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تخفیف")
		return
	}

	if time.Now().After(coupon.ValidUntil) {
		utils.ErrorResponse(w, http.StatusGone, "کد تخفیف منقضی شده است")
		return
	}

	// Validate the required products against the current cart. Try-on negotiated
	// coupons require ALL required products present, in the negotiated color
	// (any size qualifies). Cart-recovery coupons only require that AT LEAST ONE
	// of the color variants that were in the cart when the SMS was sent is still
	// there. We must never trust an empty cart_items array, and ideally we
	// validate against the server-side cart so a stale client cannot lie (bug #3).
	// Prefer the server cart; fall back to client-supplied cart_items only when
	// the server cart is unavailable (e.g. anonymous).
	serverCart := buildServerCartContext(ctx, userID)
	var cartForValidation []struct {
		PID       string
		Color     string
		ColorName string
	}
	if len(serverCart) > 0 {
		for _, it := range serverCart {
			cartForValidation = append(cartForValidation, struct {
				PID       string
				Color     string
				ColorName string
			}{PID: it.ProductID, Color: it.Color, ColorName: it.ColorName})
		}
	} else {
		for _, ci := range req.CartItems {
			cartForValidation = append(cartForValidation, struct {
				PID       string
				Color     string
				ColorName string
			}{PID: ci.ProductID, Color: ci.Color, ColorName: ci.ColorName})
		}
	}
	// Bug #3: if coupon has required products, an empty cart cannot satisfy them.
	if len(coupon.RequiredProducts) > 0 && len(cartForValidation) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "سبد خرید خالی است")
		return
	}
	if len(coupon.RequiredProducts) > 0 && len(cartForValidation) > 0 {
		if coupon.Source == "cart_recovery" {
			found := false
			for _, required := range coupon.RequiredProducts {
				for _, cartItem := range cartForValidation {
					if cartItem.PID != required.ProductID.Hex() {
						continue
					}
					if colorsOverlap(required.Color, required.ColorName, cartItem.Color, cartItem.ColorName) {
						found = true
						break
					}
				}
				if found {
					break
				}
			}
			if !found {
				utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف دیگر با محصولات موجود در سبد خرید شما مطابقت ندارد")
				return
			}
		} else {
			for _, required := range coupon.RequiredProducts {
				requiredPID := required.ProductID.Hex()
				found := false
				for _, cartItem := range cartForValidation {
					if cartItem.PID != requiredPID {
						continue
					}
					if required.Color == "" && required.ColorName == "" {
						found = true
						break
					}
					if colorsOverlap(required.Color, required.ColorName, cartItem.Color, cartItem.ColorName) {
						found = true
						break
					}
				}
				if !found {
					utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی، در همان رنگ پیشنهادی، در سبد خرید باشند")
					return
				}
			}
		}
	} else if len(coupon.ProductIDs) > 0 && len(cartForValidation) > 0 {
		for _, requiredPID := range coupon.ProductIDs {
			found := false
			for _, cartItem := range cartForValidation {
				if cartItem.PID == requiredPID.Hex() {
					found = true
					break
				}
			}
			if !found {
				utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی در سبد خرید باشند")
				return
			}
		}
	} else if len(coupon.ProductIDs) > 0 && len(cartForValidation) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "سبد خرید خالی است")
		return
	}

	// Note: used flag is set by the frontend via POST /api/discounts/activate
	// after the discount is successfully applied to the cart.

	productIDStrings := make([]string, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		productIDStrings = append(productIDStrings, pid.Hex())
	}

	requiredProductsOut := make([]map[string]interface{}, 0, len(coupon.RequiredProducts))
	for _, rp := range coupon.RequiredProducts {
		requiredProductsOut = append(requiredProductsOut, map[string]interface{}{
			"product_id": rp.ProductID.Hex(),
			"color":      rp.Color,
			"color_name": rp.ColorName,
		})
	}

	description := "کد تخفیف اختصاصی شما"
	if coupon.Source == "cart_recovery" {
		description = "کد تخفیف بازگشت به سبد خرید"
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"valid": true,
		"discount": map[string]interface{}{
			"code":               coupon.Code,
			"type":               coupon.Type,
			"value":              coupon.Value,
			"discountPercentage": coupon.Value,
			"min_order_amount":   0,
			"valid_to":           coupon.ValidUntil.Format(time.RFC3339),
			"description":        description,
			"product_ids":        productIDStrings,
			"required_products":  requiredProductsOut,
			"source":             coupon.Source,
		},
	})
}

// colorsOverlap reports whether two (color, colorName) pairs refer to the same
// color variant, comparing both raw color and display-name values.
func colorsOverlap(color1, colorName1, color2, colorName2 string) bool {
	values1 := variantLookupValues(color1, colorName1)
	values2 := variantLookupValues(color2, colorName2)
	if len(values1) == 0 || len(values2) == 0 {
		return false
	}
	for _, v1 := range values1 {
		for _, v2 := range values2 {
			if v1 == v2 {
				return true
			}
		}
	}
	return false
}
