package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

func NegotiateCoupon(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req services.NegotiateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}

	if req.Message == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "پیام نمی‌تواند خالی باشد")
		return
	}

	if req.TryonProductID != "" {
		compProducts, err := findComplementaryProducts(req.TryonProductID, req.TryonColor)
		if err != nil {
			fmt.Printf("NegotiateCoupon: failed to find complementary products: %v\n", err)
		} else {
			req.ComplementaryProducts = compProducts
		}
	}

	result, err := services.RunSellerAgent(req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "خطا در ارتباط با سرویس مذاکره")
		return
	}

	if result.Coupon != nil {
		productIDs := make([]primitive.ObjectID, 0, len(result.Coupon.ProductIDs))
		for _, pid := range result.Coupon.ProductIDs {
			objID, err := primitive.ObjectIDFromHex(pid)
			if err == nil {
				productIDs = append(productIDs, objID)
			}
		}

		validUntil, _ := time.Parse(time.RFC3339, result.Coupon.ValidUntil)

		cartSnapshot := make([]models.CartItemSnapshot, 0, len(req.CartItems))
		for _, item := range req.CartItems {
			cartSnapshot = append(cartSnapshot, models.CartItemSnapshot{
				ProductID:   item.ProductID,
				ProductName: item.ProductName,
				Price:       item.Price,
				Color:       item.Color,
				Size:        item.Size,
			})
		}

		conversation := make([]models.CouponMessage, 0, len(req.ChatHistory)+1)
		for _, msg := range req.ChatHistory {
			conversation = append(conversation, models.CouponMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
		conversation = append(conversation, models.CouponMessage{
			Role:    "agent",
			Content: result.Reply,
		})

		coupon := models.NegotiatedCoupon{
			Code:         result.Coupon.Code,
			UserID:       userID,
			ProductIDs:   productIDs,
			CartSnapshot: cartSnapshot,
			Type:         "percentage",
			Value:        result.Coupon.Value,
			ValidUntil:   validUntil,
			Used:         false,
			Conversation: conversation,
			CreatedAt:    time.Now(),
		}

		ctx := context.Background()
		collection := db.Database.Collection("negotiated_coupons")
		if _, err := collection.InsertOne(ctx, coupon); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کوپن")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

func ApplyNegotiatedCoupon(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req struct {
		Code string `json:"code"`
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

	_, err = collection.UpdateOne(ctx,
		bson.M{"_id": coupon.ID},
		bson.M{"$set": bson.M{"used": true}},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ثبت استفاده از کوپن")
		return
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
			"description":        "کد تخفیف اختصاصی شما",
		},
	})
}

func findComplementaryProducts(productID, color string) ([]services.CouponCartItem, error) {
	ctx := context.Background()
	collection := db.Database.Collection("products")

	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return nil, fmt.Errorf("invalid product ID: %v", err)
	}

	var product models.Product
	err = collection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&product)
	if err != nil {
		return nil, fmt.Errorf("product not found: %v", err)
	}

	var sourceGarmentType string
	for _, cv := range product.ColorVariants {
		if color != "" && cv.Color != color {
			continue
		}
		if cv.TryOnGarmentType != "" {
			sourceGarmentType = cv.TryOnGarmentType
			break
		}
	}
	if sourceGarmentType == "" {
		for _, cv := range product.ColorVariants {
			if cv.TryOnGarmentType != "" {
				sourceGarmentType = cv.TryOnGarmentType
				break
			}
		}
	}
	if sourceGarmentType == "" {
		sourceGarmentType = "upper_body"
	}

	compTypes := complementaryGarmentTypes(sourceGarmentType)
	if len(compTypes) == 0 {
		return nil, nil
	}

	filter := bson.M{
		"_id":       bson.M{"$ne": objID},
		"is_active": true,
		"color_variants": bson.M{
			"$elemMatch": bson.M{
				"try_on_garment_type": bson.M{"$in": compTypes},
				"try_on_image":        bson.M{"$ne": "", "$exists": true},
			},
		},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("query error: %v", err)
	}
	defer cursor.Close(ctx)

	var compProducts []models.Product
	if err := cursor.All(ctx, &compProducts); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}

	rand.Shuffle(len(compProducts), func(i, j int) {
		compProducts[i], compProducts[j] = compProducts[j], compProducts[i]
	})

	limit := 2
	if len(compProducts) < limit {
		limit = len(compProducts)
	}

	result := make([]services.CouponCartItem, 0, limit)
	for i := 0; i < limit; i++ {
		p := compProducts[i]
		result = append(result, services.CouponCartItem{
			ProductID:   p.ID.Hex(),
			ProductName: p.Name,
			Price:       p.Price,
		})
	}

	return result, nil
}

func complementaryGarmentTypes(garmentType string) []string {
	switch garmentType {
	case "upper_body":
		return []string{"lower_body"}
	case "lower_body":
		return []string{"upper_body"}
	case "dresses":
		return []string{"upper_body", "lower_body"}
	default:
		return nil
	}
}
