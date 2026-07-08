package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

type voucherProduct struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Image     string `json:"image"`
	Color     string `json:"color"`
	ColorName string `json:"color_name"`
	InStock   bool   `json:"in_stock"`
}

type userVoucher struct {
	ID               string           `json:"id"`
	Type             string           `json:"type"`
	Code             string           `json:"code"`
	DiscountType     string           `json:"discount_type"`
	Value            float64          `json:"value"`
	ValidUntil       string           `json:"valid_until"`
	ValidFrom        string           `json:"valid_from,omitempty"`
	MinOrderAmount   float64          `json:"min_order_amount,omitempty"`
	RequiredProducts []voucherProduct `json:"required_products"`
	Description      string           `json:"description"`
}

func GetUserVouchers(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid user ID in context")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	vouchers := make([]userVoucher, 0)

	targeted := fetchTargetedDiscounts(ctx, userID)
	for _, d := range targeted {
		v, ok := buildTargetedVoucher(ctx, d)
		if ok {
			vouchers = append(vouchers, v)
		}
	}

	negotiated := fetchNegotiatedCoupons(ctx, userID)
	for _, nc := range negotiated {
		v, ok := buildNegotiatedVoucher(ctx, nc)
		if ok {
			vouchers = append(vouchers, v)
		}
	}

	utils.JSONResponse(w, http.StatusOK, vouchers)
}

func fetchTargetedDiscounts(ctx context.Context, userID primitive.ObjectID) []models.Discount {
	collection := db.Database.Collection("discounts")
	now := time.Now()

	filter := bson.M{
		"$and": []bson.M{
			{"is_public": false},
			{"assigned_users": userID},
			{"valid_from": bson.M{"$lte": now}},
			{"valid_to": bson.M{"$gte": now}},
			{
				"$or": []bson.M{
					{"max_uses": 0},
					{"max_uses": bson.M{"$exists": false}},
					{"$expr": bson.M{"$lt": []interface{}{"$used_count", "$max_uses"}}},
				},
			},
		},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil
	}
	defer cursor.Close(ctx)

	var discounts []models.Discount
	if err = cursor.All(ctx, &discounts); err != nil {
		return nil
	}
	return discounts
}

func fetchNegotiatedCoupons(ctx context.Context, userID primitive.ObjectID) []models.NegotiatedCoupon {
	collection := db.Database.Collection("negotiated_coupons")
	now := time.Now()

	filter := bson.M{
		"user_id":     userID,
		"used":        false,
		"valid_until": bson.M{"$gte": now},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil
	}
	defer cursor.Close(ctx)

	var coupons []models.NegotiatedCoupon
	if err = cursor.All(ctx, &coupons); err != nil {
		return nil
	}
	return coupons
}

func buildTargetedVoucher(ctx context.Context, d models.Discount) (userVoucher, bool) {
	products := make([]voucherProduct, 0)

	for _, pid := range d.ApplicableTo.ProductIDs {
		vp, ok := resolveVoucherProduct(ctx, pid, "", "")
		if !ok {
			return userVoucher{}, false
		}
		if !vp.InStock {
			return userVoucher{}, false
		}
		products = append(products, vp)
	}

	desc := "تخفیف ویژه شما"
	if d.Type == "percentage" {
		desc = fmt.Sprintf("%d%% تخفیف ویژه شما", int(d.Value))
	} else {
		desc = fmt.Sprintf("%s تومان تخفیف ویژه شما", formatPriceFa(d.Value))
	}

	return userVoucher{
		ID:               d.ID.Hex(),
		Type:             "targeted",
		Code:             d.Code,
		DiscountType:     d.Type,
		Value:            d.Value,
		ValidFrom:        d.ValidFrom.Format(time.RFC3339),
		ValidUntil:       d.ValidTo.Format(time.RFC3339),
		MinOrderAmount:   d.MinOrderAmount,
		RequiredProducts: products,
		Description:      desc,
	}, true
}

func buildNegotiatedVoucher(ctx context.Context, nc models.NegotiatedCoupon) (userVoucher, bool) {
	products := make([]voucherProduct, 0)

	if len(nc.RequiredProducts) > 0 {
		for _, rp := range nc.RequiredProducts {
			vp, ok := resolveVoucherProduct(ctx, rp.ProductID, rp.Color, rp.ColorName)
			if !ok {
				return userVoucher{}, false
			}
			if !vp.InStock {
				return userVoucher{}, false
			}
			products = append(products, vp)
		}
	} else {
		for _, pid := range nc.ProductIDs {
			vp, ok := resolveVoucherProduct(ctx, pid, "", "")
			if !ok {
				return userVoucher{}, false
			}
			if !vp.InStock {
				return userVoucher{}, false
			}
			products = append(products, vp)
		}
	}

	return userVoucher{
		ID:               nc.ID.Hex(),
		Type:             "negotiated",
		Code:             nc.Code,
		DiscountType:     nc.Type,
		Value:            nc.Value,
		ValidUntil:       nc.ValidUntil.Format(time.RFC3339),
		RequiredProducts: products,
		Description:      "کد تخفیف اختصاصی اتاق پرو",
	}, true
}

func resolveVoucherProduct(ctx context.Context, productID primitive.ObjectID, color, colorName string) (voucherProduct, bool) {
	collection := db.Database.Collection("products")

	var product models.Product
	if err := collection.FindOne(ctx, bson.M{"_id": productID, "is_active": true}).Decode(&product); err != nil {
		return voucherProduct{}, false
	}

	var image, resolvedColor, resolvedColorName string
	inStock := false

	if color != "" || colorName != "" {
		if cv, _, ok := findColorVariant(&product, color, colorName); ok {
			resolvedColor = canonicalColorValue(cv)
			resolvedColorName = cv.ColorName
			if len(cv.Images) > 0 {
				image = cv.Images[0]
			}
			if cv.TryOnImage != "" && image == "" {
				image = cv.TryOnImage
			}
			for _, sv := range cv.Sizes {
				if sv.Quantity > 0 {
					inStock = true
					break
				}
			}
		}
	}

	if resolvedColor == "" && len(product.ColorVariants) > 0 {
		cv := product.ColorVariants[0]
		resolvedColor = canonicalColorValue(cv)
		resolvedColorName = cv.ColorName
		if len(cv.Images) > 0 {
			image = cv.Images[0]
		}
		for _, sv := range cv.Sizes {
			if sv.Quantity > 0 {
				inStock = true
				break
			}
		}
	}

	if image == "" && len(product.MainImages) > 0 {
		image = product.MainImages[0]
	}

	return voucherProduct{
		ID:        product.ID.Hex(),
		Name:      product.Name,
		Image:     image,
		Color:     resolvedColor,
		ColorName: resolvedColorName,
		InStock:   inStock,
	}, true
}

func formatPriceFa(amount float64) string {
	digits := []string{"۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"}
	intAmount := int64(amount)
	s := fmt.Sprintf("%d", intAmount)
	result := ""
	count := 0
	for i := len(s) - 1; i >= 0; i-- {
		if count > 0 && count%3 == 0 {
			result = "٬" + result
		}
		result = string(digits[s[i]-'0']) + result
		count++
	}
	return result
}
