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
	fmt.Println("[negotiate] --- START ---")
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		fmt.Printf("[negotiate] auth failed: status=%d err=%v\n", statusCode, err)
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	fmt.Printf("[negotiate] user=%s\n", userID.Hex())

	var req services.NegotiateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("[negotiate] decode error: %v\n", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	fmt.Printf("[negotiate] decoded req: productID=%s color=%s msg=%s\n", req.TryonProductID, req.TryonColor, req.Message[:min(50, len(req.Message))])

	if req.Message == "" {
		fmt.Println("[negotiate] empty message")
		utils.ErrorResponse(w, http.StatusBadRequest, "پیام نمی‌تواند خالی باشد")
		return
	}

	req.ComplementaryProducts = loadComplementaryProducts(req.TryonProductID, req.TryonColor)

	fmt.Println("[negotiate] calling RunSellerAgent...")
	result, err := services.RunSellerAgent(req)
	if err != nil {
		fmt.Printf("[negotiate] RunSellerAgent error: %v\n", err)
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "خطا در ارتباط با سرویس مذاکره")
		return
	}
	fmt.Printf("[negotiate] RunSellerAgent success, hasCoupon=%v reply=%s\n", result.Coupon != nil, result.Reply[:min(100, len(result.Reply))])

	if result.Coupon != nil {
		coupon := buildNegotiatedCoupon(req, result.Coupon, userID, result.Reply)
		coupon.TryonID = req.TryonID
		coupon.ChatID = req.ChatID
		if err := saveNegotiatedCoupon(context.Background(), coupon); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کوپن")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, result)
	fmt.Println("[negotiate] --- END ---")
}

func NegotiateCouponStream(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[negotiate-stream] --- START ---")
	userID, _, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "لطفاً وارد شوید")
		return
	}
	fmt.Printf("[negotiate-stream] user=%s\n", userID.Hex())

	var req services.NegotiateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	fmt.Printf("[negotiate-stream] productID=%s\n", req.TryonProductID)

	if req.Message == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "پیام نمی‌تواند خالی باشد")
		return
	}

	req.ComplementaryProducts = loadComplementaryProducts(req.TryonProductID, req.TryonColor)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	coupon, err := services.RunSellerAgentStream(req, w)
	if err != nil {
		fmt.Printf("[negotiate-stream] stream error: %v\n", err)
		evt := services.StreamEvent{Type: "error", Error: "خطا در ارتباط با سرویس مذاکره"}
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "data: %s\n\n", data)
		return
	}

	if coupon != nil {
		nc := buildNegotiatedCoupon(req, coupon, userID, "")
		nc.TryonID = req.TryonID
		nc.ChatID = req.ChatID
		if err := saveNegotiatedCoupon(context.Background(), nc); err != nil {
			fmt.Printf("[negotiate-stream] coupon save error: %v\n", err)
		}
	}

	fmt.Println("[negotiate-stream] --- END ---")
}

func loadComplementaryProducts(productID, color string) []services.CouponCartItem {
	if productID == "" {
		return nil
	}
	fmt.Printf("[negotiate] looking up complementary for product=%s color=%s\n", productID, color)
	compProducts, err := findComplementaryProducts(productID, color)
	if err != nil {
		fmt.Printf("[negotiate] failed to find complementary products: %v\n", err)
		return nil
	}
	fmt.Printf("[negotiate] found %d complementary products\n", len(compProducts))
	return compProducts
}

func buildNegotiatedCoupon(req services.NegotiateRequest, coupon *services.NegotiateCouponOut, userID primitive.ObjectID, agentReply string) models.NegotiatedCoupon {
	productIDs := make([]primitive.ObjectID, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		objID, err := primitive.ObjectIDFromHex(pid)
		if err == nil {
			productIDs = append(productIDs, objID)
		}
	}

	validUntil, _ := time.Parse(time.RFC3339, coupon.ValidUntil)

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

	conversation := make([]models.CouponMessage, 0, len(req.ChatHistory)+2)
	for _, msg := range req.ChatHistory {
		conversation = append(conversation, models.CouponMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	conversation = append(conversation, models.CouponMessage{
		Role:    "user",
		Content: req.Message,
	})
	if agentReply != "" {
		conversation = append(conversation, models.CouponMessage{
			Role:    "agent",
			Content: agentReply,
		})
	}

	return models.NegotiatedCoupon{
		Code:         coupon.Code,
		UserID:       userID,
		ProductIDs:   productIDs,
		CartSnapshot: cartSnapshot,
		Type:         "percentage",
		Value:        coupon.Value,
		ValidUntil:   validUntil,
		Used:         false,
		Conversation: conversation,
		CreatedAt:    time.Now(),
	}
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

	compProducts, err := queryCompProducts(collection, ctx, filter)
	if err != nil {
		return nil, err
	}

	if len(compProducts) == 0 {
		fallbackFilter := bson.M{
			"_id":       bson.M{"$ne": objID},
			"is_active": true,
			"color_variants": bson.M{
				"$elemMatch": bson.M{
					"try_on_image":        bson.M{"$ne": "", "$exists": true},
					"try_on_garment_type": bson.M{"$ne": sourceGarmentType},
				},
			},
		}
		fmt.Println("[negotiate] no garment-type matches, trying fallback query")
		compProducts, err = queryCompProducts(collection, ctx, fallbackFilter)
		if err != nil {
			return nil, err
		}
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
		item := services.CouponCartItem{
			ProductID:   p.ID.Hex(),
			ProductName: p.Name,
			Price:       p.Price,
		}
		for _, cv := range p.ColorVariants {
			if cv.TryOnImage != "" {
				item.Image = cv.TryOnImage
				item.Color = cv.Color
				if len(cv.Sizes) > 0 {
					item.Size = cv.Sizes[0].Size
				}
				break
			}
		}
		if item.Image == "" {
			for _, cv := range p.ColorVariants {
				if len(cv.Images) > 0 {
					item.Image = cv.Images[0]
					item.Color = cv.Color
					if len(cv.Sizes) > 0 {
						item.Size = cv.Sizes[0].Size
					}
					break
				}
			}
		}
		result = append(result, item)
	}

	return result, nil
}

func queryCompProducts(collection *mongo.Collection, ctx context.Context, filter bson.M) ([]models.Product, error) {
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("query error: %v", err)
	}
	defer cursor.Close(ctx)

	var compProducts []models.Product
	if err := cursor.All(ctx, &compProducts); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return compProducts, nil
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
