package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
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
	"backEnd/utils"
)

var ErrInventoryUnavailable = errors.New("inventory unavailable")

var (
	errDiscountMinimumOrder = errors.New("discount minimum order not met")
	errDiscountProductScope = errors.New("discount does not apply to order")
)

type checkoutDiscountRuleError struct {
	kind    error
	message string
}

func (e *checkoutDiscountRuleError) Error() string {
	return e.message
}

func (e *checkoutDiscountRuleError) Unwrap() error {
	return e.kind
}

// OrderProductResponse is a subset of product information for order items.
type OrderProductResponse struct {
	ID      primitive.ObjectID `json:"id"`
	Name    string             `json:"name"`
	Image   string             `json:"image"` // Assuming main image URL
	Brand   string             `json:"brand,omitempty"`
	BrandID primitive.ObjectID `json:"brand_id,omitempty"`
}

// OrderItemAPIResponse represents a single item in an order for API responses.
type OrderItemAPIResponse struct {
	Product         OrderProductResponse `json:"product"`
	Variant         models.OrderVariant  `json:"variant"`
	Quantity        int                  `json:"quantity"`
	PriceAtPurchase float64              `json:"price_at_purchase"`
}

// OrderAPIResponse represents the full order structure for API responses.
// It includes populated product details for items and Jalali dates.
type OrderAPIResponse struct {
	ID                   primitive.ObjectID          `json:"id"`
	UserID               primitive.ObjectID          `json:"user_id"`
	OrderNumber          string                      `json:"order_number"`
	Items                []OrderItemAPIResponse      `json:"items"`
	TotalAmount          float64                     `json:"total_amount"`
	ShippingCost         float64                     `json:"shipping_cost"`
	TaxAmount            float64                     `json:"tax_amount"`
	DiscountAmount       float64                     `json:"discount_amount"`
	DiscountCode         string                      `json:"discount_code,omitempty"`
	ShippingAddress      models.Address              `json:"shipping_address"`
	Status               string                      `json:"status"`
	StatusText           string                      `json:"status_text"`
	TrackingCode         *string                     `json:"tracking_code,omitempty"`
	PaymentStatus        string                      `json:"payment_status"`
	PaymentMethod        string                      `json:"payment_method"`
	ZibalTrackID         *int64                      `json:"zibal_track_id,omitempty"`
	ZibalRefNumber       *string                     `json:"zibal_ref_number,omitempty"`
	GatewayName          string                      `json:"gateway_name,omitempty"`
	GatewayTransactionID string                      `json:"gateway_transaction_id,omitempty"`
	SnappPayPaymentToken string                      `json:"snappay_payment_token,omitempty"`
	DigipayTrackingCode  string                      `json:"digipay_tracking_code,omitempty"`
	Timeline             []models.OrderTimelineEntry `json:"timeline,omitempty"`
	Notes                []models.OrderNote          `json:"notes,omitempty"`
	CreatedAt            time.Time                   `json:"created_at"`
	UpdatedAt            time.Time                   `json:"updated_at"`
	JalaliCreatedAt      string                      `json:"jalali_created_at"`
	JalaliUpdatedAt      string                      `json:"jalali_updated_at"`
	ProductCount         int                         `json:"product_count"`
}

type AdminOrderAPIResponse struct {
	OrderAPIResponse
	UserFirstName string `json:"user_first_name,omitempty"`
	UserLastName  string `json:"user_last_name,omitempty"`
	UserName      string `json:"user_name,omitempty"`
	UserPhone     string `json:"user_phone,omitempty"`
}

// Helper function to populate order items and create OrderAPIResponse
func newOrderAPIResponse(
	ctx context.Context,
	order models.Order,
) (OrderAPIResponse, error) {
	var populatedItems []OrderItemAPIResponse
	productsCollection := db.Database.Collection("products")

	for _, item := range order.Items {
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			// Log error, decide if to skip item or return error for the whole order
			utils.LogAction(
				"error",
				fmt.Sprintf(
					"Product ID %s for order %s not found: %v",
					item.ProductID.Hex(),
					order.ID.Hex(),
					err,
				),
			)
			// For now, let's assume if a product is in an order item, it should exist. This indicates a data issue.
			return OrderAPIResponse{}, fmt.Errorf(
				"product with ID %s not found for order item",
				item.ProductID.Hex(),
			)
		}
		productImage := selectedVariantImage(product, item.Variant.Color, item.Variant.ColorName)

		populatedItems = append(populatedItems, OrderItemAPIResponse{
			Product: OrderProductResponse{
				ID:      product.ID,
				Name:    product.Name,
				Image:   productImage,
				Brand:   product.Brand,
				BrandID: product.BrandID,
			},
			Variant:         item.Variant,
			Quantity:        item.Quantity,
			PriceAtPurchase: item.PriceAtPurchase,
		})
	}

	gatewayName := orderGatewayName(ctx, order)
	paymentToken := ""
	if gatewayName == "snappay" {
		paymentToken = order.GatewayReference
	}

	return OrderAPIResponse{
		ID:                   order.ID,
		UserID:               order.UserID,
		OrderNumber:          order.OrderNumber,
		Items:                populatedItems,
		TotalAmount:          order.TotalAmount,
		ShippingCost:         order.ShippingCost,
		TaxAmount:            order.TaxAmount,
		DiscountAmount:       order.DiscountAmount,
		DiscountCode:         order.DiscountCode,
		ShippingAddress:      order.ShippingAddress,
		Status:               order.Status,
		StatusText:           order.StatusText,
		TrackingCode:         order.TrackingCode,
		PaymentStatus:        order.PaymentStatus,
		PaymentMethod:        order.PaymentMethod,
		ZibalTrackID:         order.ZibalTrackID,
		ZibalRefNumber:       order.ZibalRefNumber,
		GatewayName:          gatewayName,
		GatewayTransactionID: order.GatewayTransactionID,
		SnappPayPaymentToken: paymentToken,
		DigipayTrackingCode:  order.DigipayTrackingCode,
		Timeline:             order.Timeline,
		Notes:                order.Notes,
		CreatedAt:            order.CreatedAt,
		UpdatedAt:            order.UpdatedAt,
		JalaliCreatedAt:      utils.ToJalaliDateString(order.CreatedAt),
		JalaliUpdatedAt:      utils.ToJalaliDateString(order.UpdatedAt),
		ProductCount:         order.GetProductCount(),
	}, nil
}

func newAdminOrderAPIResponse(ctx context.Context, order models.Order) (AdminOrderAPIResponse, error) {
	response, err := newOrderAPIResponse(ctx, order)
	if err != nil {
		return AdminOrderAPIResponse{}, err
	}

	adminResponse := AdminOrderAPIResponse{OrderAPIResponse: response}

	// Populate registered user details (first_name / last_name / phone)
	// so the admin order details view can show both the account holder and
	// the shipping-address recipient.
	usersCollection := db.Database.Collection("users")
	var user models.User
	if err := usersCollection.FindOne(ctx, bson.M{"_id": order.UserID}).Decode(&user); err == nil {
		adminResponse.UserFirstName = user.FirstName
		adminResponse.UserLastName = user.LastName
		adminResponse.UserPhone = user.Phone
		// Prefer explicit Name, fall back to composed first+last.
		if strings.TrimSpace(user.Name) != "" {
			adminResponse.UserName = user.Name
		} else if strings.TrimSpace(user.FirstName) != "" || strings.TrimSpace(user.LastName) != "" {
			adminResponse.UserName = strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName))
		}
		// If FirstName/LastName empty but Name exists, try to split for convenience.
		if (adminResponse.UserFirstName == "" || adminResponse.UserLastName == "") && strings.TrimSpace(adminResponse.UserName) != "" {
			parts := strings.Fields(adminResponse.UserName)
			if len(parts) >= 1 && adminResponse.UserFirstName == "" {
				adminResponse.UserFirstName = parts[0]
			}
			if len(parts) >= 2 && adminResponse.UserLastName == "" {
				adminResponse.UserLastName = strings.Join(parts[1:], " ")
			}
		}
	} else if err != mongo.ErrNoDocuments {
		utils.LogAction("error", fmt.Sprintf("Failed to fetch user %s for order %s: %v", order.UserID.Hex(), order.ID.Hex(), err))
	}

	return adminResponse, nil
}

// orderGatewayName keeps the payment gateway visible for failed attempts too.
// Older orders may not have gateway_name set, but their payment attempt still
// records which provider was selected.
func orderGatewayName(ctx context.Context, order models.Order) string {
	if order.GatewayName != "" {
		return order.GatewayName
	}
	if order.ZibalTrackID != nil || order.ZibalRefNumber != nil {
		return "zibal"
	}

	var attempt models.PaymentAttempt
	err := db.Database.Collection("payment_attempts").FindOne(ctx, bson.M{
		"order_id": order.ID,
	}, options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})).Decode(&attempt)
	if err != nil {
		return ""
	}
	return attempt.Gateway
}

// validateInventory checks if all items have sufficient stock
// Returns an error message if any item is out of stock or has insufficient quantity
func validateInventory(ctx context.Context, items []models.OrderItem) (bool, string) {
	productsCollection := db.Database.Collection("products")

	for _, item := range items {
		if !isConcreteOrderVariant(item.Variant) {
			return false, "رنگ مشخص و سایز محصول الزامی است"
		}
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			if err == mongo.ErrNoDocuments {
				return false, fmt.Sprintf("محصول با شناسه %s یافت نشد", item.ProductID.Hex())
			}
			return false, fmt.Sprintf("خطا در بررسی موجودی محصول: %v", err)
		}

		colorVariant, _, ok := findColorVariant(&product, item.Variant.Color, item.Variant.ColorName)
		if !ok {
			return false, fmt.Sprintf(
				"تنوع انتخاب شده (رنگ: %s، سایز: %s) برای محصول %s یافت نشد",
				item.Variant.Color, item.Variant.Size, product.Name,
			)
		}
		sizeVariant, _, ok := findSizeVariant(colorVariant, item.Variant.Size)
		if !ok {
			return false, fmt.Sprintf(
				"تنوع انتخاب شده (رنگ: %s، سایز: %s) برای محصول %s یافت نشد",
				colorVariant.ColorName, item.Variant.Size, product.Name,
			)
		}
		if sizeVariant.Quantity < item.Quantity {
			return false, fmt.Sprintf(
				"موجودی کافی برای %s (رنگ: %s، سایز: %s) وجود ندارد. موجودی: %d، درخواست: %d",
				product.Name, colorVariant.ColorName, sizeVariant.Size,
				sizeVariant.Quantity, item.Quantity,
			)
		}
	}

	return true, ""
}

func calculateCheckoutDiscount(ctx context.Context, userID primitive.ObjectID, code string, items []models.OrderItem, subtotal float64) (float64, error) {
	if code == "" {
		return 0, nil
	}
	var discount models.Discount
	err := db.Database.Collection("discounts").FindOne(ctx, bson.M{"code": code}).Decode(&discount)
	if err == nil {
		if eligibilityErr := validateCheckoutDiscountEligibility(discount, userID); eligibilityErr != nil {
			return 0, eligibilityErr
		}
		if subtotal < discount.MinOrderAmount {
			return calculateAdminDiscount(discount, nil, subtotal, nil)
		}
		categoryProductIDs, categoryErr := findCategoryDiscountProducts(ctx, discount.ApplicableTo.CategoryIDs, items)
		if categoryErr != nil {
			return 0, categoryErr
		}
		return calculateAdminDiscount(discount, items, subtotal, categoryProductIDs)
	}
	if err != mongo.ErrNoDocuments {
		return 0, err
	}

	var coupon models.NegotiatedCoupon
	if err := db.Database.Collection("negotiated_coupons").FindOne(ctx, bson.M{"code": code, "user_id": userID}).Decode(&coupon); err != nil {
		return 0, err
	}
	base := subtotal
	if len(coupon.RequiredProducts) > 0 {
		base = 0
		for _, item := range items {
			for _, required := range coupon.RequiredProducts {
				if item.ProductID == required.ProductID && colorsOverlap(required.Color, required.ColorName, item.Variant.Color, item.Variant.ColorName) {
					base += item.PriceAtPurchase * float64(item.Quantity)
					break
				}
			}
		}
	}
	return math.Min(base, base*coupon.Value/100), nil
}

func validateCheckoutDiscountEligibility(discount models.Discount, userID primitive.ObjectID) error {
	eligible, message := validateUserEligibility(discount, userID, true)
	if !eligible {
		return errors.New(message)
	}
	return nil
}

func findCategoryDiscountProducts(ctx context.Context, categoryIDs []primitive.ObjectID, items []models.OrderItem) (map[primitive.ObjectID]struct{}, error) {
	categoryProductIDs := make(map[primitive.ObjectID]struct{})
	if len(categoryIDs) == 0 {
		return categoryProductIDs, nil
	}

	itemIDs := make([]primitive.ObjectID, 0, len(items))
	seen := make(map[primitive.ObjectID]struct{}, len(items))
	for _, item := range items {
		if _, ok := seen[item.ProductID]; ok {
			continue
		}
		seen[item.ProductID] = struct{}{}
		itemIDs = append(itemIDs, item.ProductID)
	}
	if len(itemIDs) == 0 {
		return categoryProductIDs, nil
	}

	cursor, err := db.Database.Collection("products").Find(ctx, bson.M{
		"_id":          bson.M{"$in": itemIDs},
		"category_ids": bson.M{"$in": categoryIDs},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}
	for _, product := range products {
		categoryProductIDs[product.ID] = struct{}{}
	}
	return categoryProductIDs, nil
}

func calculateAdminDiscount(discount models.Discount, items []models.OrderItem, subtotal float64, categoryProductIDs map[primitive.ObjectID]struct{}) (float64, error) {
	if subtotal < discount.MinOrderAmount {
		return 0, &checkoutDiscountRuleError{
			kind:    errDiscountMinimumOrder,
			message: fmt.Sprintf("حداقل مبلغ سفارش برای این کد %s تومان است", formatPriceFa(discount.MinOrderAmount)),
		}
	}

	base := subtotal
	if len(discount.ApplicableTo.ProductIDs) > 0 || len(discount.ApplicableTo.CategoryIDs) > 0 {
		productIDs := make(map[primitive.ObjectID]struct{}, len(discount.ApplicableTo.ProductIDs))
		for _, productID := range discount.ApplicableTo.ProductIDs {
			productIDs[productID] = struct{}{}
		}
		for productID := range categoryProductIDs {
			productIDs[productID] = struct{}{}
		}

		base = 0
		for _, item := range items {
			if _, ok := productIDs[item.ProductID]; ok {
				base += item.PriceAtPurchase * float64(item.Quantity)
			}
		}
		if base == 0 {
			return 0, &checkoutDiscountRuleError{
				kind:    errDiscountProductScope,
				message: "این کد تخفیف برای محصولات سبد خرید شما نیست",
			}
		}
	}

	if discount.Type == "fixed" {
		return math.Min(base, discount.Value), nil
	}
	return math.Min(base, base*discount.Value/100), nil
}

// reduceInventory decreases the inventory for each item in the order
// This should be called after successful payment
func reduceInventory(ctx context.Context, items []models.OrderItem) error {
	productsCollection := db.Database.Collection("products")
	reducedItems := make([]models.OrderItem, 0, len(items))
	rollback := func(err error) error {
		if len(reducedItems) == 0 {
			return err
		}
		if restoreErr := restoreInventory(ctx, reducedItems); restoreErr != nil {
			return fmt.Errorf("%v; failed to rollback inventory: %w", err, restoreErr)
		}
		return err
	}

	for _, item := range items {
		// First, get the product to find the correct indices
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			return rollback(fmt.Errorf("failed to find product %s: %w", item.ProductID.Hex(), err))
		}

		_, colorIdx, sizeIdx, ok := normalizeOrderVariantFromProduct(&product, item.Variant)
		if !ok || colorIdx == -1 || sizeIdx == -1 {
			return rollback(fmt.Errorf("variant not found for product %s", item.ProductID.Hex()))
		}

		// Update the specific size quantity using array indices
		updatePath := fmt.Sprintf("color_variants.%d.sizes.%d.quantity", colorIdx, sizeIdx)
		filter := bson.M{
			"_id":      item.ProductID,
			updatePath: bson.M{"$gte": item.Quantity},
		}
		update := bson.M{
			"$inc": bson.M{
				updatePath: -item.Quantity,
			},
			"$set": bson.M{
				"updated_at": time.Now(),
			},
		}

		result, err := productsCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			return rollback(fmt.Errorf("failed to reduce inventory for product %s: %w", item.ProductID.Hex(), err))
		}

		if result.MatchedCount == 0 {
			return rollback(fmt.Errorf("%w: insufficient inventory for product %s", ErrInventoryUnavailable, item.ProductID.Hex()))
		}
		reducedItems = append(reducedItems, item)

		// Check if product should be marked as out of stock
		// Re-fetch product to check total inventory
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err == nil {
			totalStock := 0
			for _, cv := range product.ColorVariants {
				for _, sv := range cv.Sizes {
					totalStock += sv.Quantity
				}
			}
			// Update in_stock flag if total stock is 0
			if totalStock <= 0 {
				productsCollection.UpdateOne(ctx, bson.M{"_id": item.ProductID}, bson.M{
					"$set": bson.M{"in_stock": false},
				})
			}
		}
	}

	return nil
}

// restoreInventory increases the inventory for each item (used when order is cancelled)
func restoreInventory(ctx context.Context, items []models.OrderItem) error {
	productsCollection := db.Database.Collection("products")

	for _, item := range items {
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			return fmt.Errorf("failed to find product %s: %w", item.ProductID.Hex(), err)
		}

		_, colorIdx, sizeIdx, ok := normalizeOrderVariantFromProduct(&product, item.Variant)
		if !ok || colorIdx == -1 || sizeIdx == -1 {
			continue // Skip if variant not found (product might have been modified)
		}

		updatePath := fmt.Sprintf("color_variants.%d.sizes.%d.quantity", colorIdx, sizeIdx)
		update := bson.M{
			"$inc": bson.M{
				updatePath: item.Quantity,
			},
			"$set": bson.M{
				"updated_at": time.Now(),
				"in_stock":   true, // Mark as in stock since we're restoring inventory
			},
		}

		productsCollection.UpdateOne(ctx, bson.M{"_id": item.ProductID}, update)
	}

	return nil
}

// ConfirmPayment handles POST /api/orders/{orderId}/confirm-payment
func ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID")
		return
	}

	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	var paymentData struct {
		TransactionID string `json:"transactionId"` // Payment gateway transaction ID
		PaymentMethod string `json:"paymentMethod"` // e.g., "card", "wallet", "cod"
	}
	if err := json.NewDecoder(r.Body).Decode(&paymentData); err != nil {
		// Payment data is optional for now
		paymentData.PaymentMethod = "online"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	ordersCollection := db.Database.Collection("orders")

	// Fetch the order
	var order models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID, "is_active": true}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}

	// Verify user owns this order (unless admin)
	roleCtx := r.Context().Value("role")
	isAdmin := roleCtx != nil && roleCtx.(string) == "admin"
	if !isAdmin && order.UserID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not authorized to confirm payment for this order")
		return
	}

	// Check if already paid
	if order.PaymentStatus == "paid" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order is already paid")
		return
	}

	// Validate inventory one more time before reducing
	valid, errMsg := validateInventory(ctx, order.Items)
	if !valid {
		// Update order status to indicate inventory issue
		ordersCollection.UpdateOne(ctx, bson.M{"_id": orderID}, bson.M{
			"$set": bson.M{
				"status":         "cancelled",
				"status_text":    "لغو شده - موجودی ناکافی",
				"payment_status": "failed",
				"updated_at":     time.Now(),
			},
		})
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Reduce inventory
	if err := reduceInventory(ctx, order.Items); err != nil {
		utils.LogAction("error", fmt.Sprintf("Failed to reduce inventory for order %s: %v", orderID.Hex(), err))
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در به‌روزرسانی موجودی: "+err.Error())
		return
	}

	// Update order payment status
	update := bson.M{
		"$set": bson.M{
			"payment_status": "paid",
			"status":         "processing",
			"status_text":    "در حال پردازش",
			"updated_at":     time.Now(),
		},
	}
	if _, err := ordersCollection.UpdateOne(ctx, bson.M{"_id": orderID}, update); err != nil {
		// Try to restore inventory if order update fails
		restoreInventory(ctx, order.Items)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating order: "+err.Error())
		return
	}

	// Clear user's cart after successful payment
	cartsCollection := db.Database.Collection("carts")
	cartsCollection.UpdateOne(ctx, bson.M{"user_id": userID, "is_active": true}, bson.M{
		"$set": bson.M{
			"items":      []models.CartItem{},
			"updated_at": time.Now(),
		},
	})

	go sendOrderConfirmationSMS(order.UserID, order.ID, order.OrderNumber, order.ShippingAddress.PhoneNumber)

	// Fetch updated order for response
	var updatedOrder models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&updatedOrder); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated order")
		return
	}

	response, err := newOrderAPIResponse(ctx, updatedOrder)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing order response: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "پرداخت با موفقیت تایید شد",
		"order":   response,
	})
}

// POST /api/checkout
func Checkout(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().
		Value("userID")
		// Assume AuthMiddleware sets "userID" as primitive.ObjectID
	if userIDCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"User ID not found in context (authentication error)",
		)
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"User ID in context is of incorrect type",
		)
		return
	}
	if userID == primitive.NilObjectID {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"Invalid User ID in context (NilObjectID)",
		)
		return
	}

	var orderData struct {
		// UserID is now from context, remove from here if it was present
		Items           []models.OrderItem `json:"items"`
		TotalAmount     float64            `json:"totalAmount"`
		ShippingCost    float64            `json:"shippingCost"`
		TaxAmount       float64            `json:"taxAmount"`
		DiscountAmount  float64            `json:"discountAmount"`
		ShippingAddress models.Address     `json:"shippingAddress"`
		PromoCode       string             `json:"promoCode,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&orderData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order payload")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Validate promo code if provided
	if orderData.PromoCode != "" {
		now := time.Now()

		// First check if it's a negotiated coupon (TRYN-XXX / cart-recovery)
		var nc models.NegotiatedCoupon
		err := db.Database.Collection("negotiated_coupons").FindOne(ctx, bson.M{"code": orderData.PromoCode}).Decode(&nc)
		if err == nil {
			// Found as negotiated coupon — validate. `used` means "currently
			// applied to a cart" (set by /discounts/activate, cleared by
			// /discounts/deactivate). It must NOT block checkout — every
			// applied coupon is `used==true` at checkout time, and stays that
			// way after the order so it cannot be re-applied.
			if now.After(nc.ValidUntil) {
				utils.ErrorResponse(w, http.StatusBadRequest, "کد تخفیف شما منقضی شده است")
				return
			}
			// Check user ownership
			if nc.UserID != userID {
				utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف متعلق به شما نیست")
				return
			}
			// Check the required products against the order. Try-on negotiated
			// coupons require ALL required products, in the negotiated color (any
			// size qualifies). Cart-recovery coupons only require that AT LEAST
			// ONE of the original color variants made it into the order.
			if nc.Source == "cart_recovery" {
				found := false
				for _, required := range nc.RequiredProducts {
					for _, item := range orderData.Items {
						if item.ProductID != required.ProductID {
							continue
						}
						if colorsOverlap(required.Color, required.ColorName, item.Variant.Color, item.Variant.ColorName) {
							found = true
							break
						}
					}
					if found {
						break
					}
				}
				if !found {
					utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف دیگر با محصولات موجود در سفارش شما مطابقت ندارد")
					return
				}
			} else {
				for _, required := range nc.RequiredProducts {
					found := false
					for _, item := range orderData.Items {
						if item.ProductID != required.ProductID {
							continue
						}
						if required.Color == "" && required.ColorName == "" {
							found = true
							break
						}
						if colorsOverlap(required.Color, required.ColorName, item.Variant.Color, item.Variant.ColorName) {
							found = true
							break
						}
					}
					if !found {
						utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی، در همان رنگ پیشنهادی، در سفارش باشند")
						return
					}
				}
			}
		} else if err != mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تخفیف")
			return
		} else {
			// Not a negotiated coupon — check regular discounts collection
			var discount models.Discount
			err := db.Database.Collection("discounts").FindOne(ctx, bson.M{"code": orderData.PromoCode}).Decode(&discount)
			if err != nil {
				if err == mongo.ErrNoDocuments {
					utils.ErrorResponse(w, http.StatusBadRequest, "کد تخفیف نامعتبر است")
				} else {
					utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تخفیف")
				}
				return
			}
			if eligibilityErr := validateCheckoutDiscountEligibility(discount, userID); eligibilityErr != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, eligibilityErr.Error())
				return
			}
			// Validate regular discount — max_uses is enforced atomically at
			// activation time (see discounts.go:ActivateDiscount which only
			// increments while used_count < max_uses). At checkout we must
			// only reject when the cap was actually exceeded (>), otherwise
			// the normal apply→checkout flow for a max_uses=1 code is dead
			// (apply bumps 0→1, checkout would see 1>=1 and reject).
			if now.Before(discount.ValidFrom) || now.After(discount.ValidTo) {
				utils.ErrorResponse(w, http.StatusBadRequest, "کد تخفیف منقضی شده است")
				return
			}
			if discount.MaxUses > 0 && discount.UsedCount > discount.MaxUses {
				utils.ErrorResponse(w, http.StatusBadRequest, "کد تخفیف به سقف مصرف رسیده است")
				return
			}
		}
	}

	// Fetch product snapshots for each order item
	productsCollection := db.Database.Collection("products")
	itemsWithSnapshots := make([]models.OrderItem, 0, len(orderData.Items))
	var subtotal float64

	for _, item := range orderData.Items {
		if item.Quantity <= 0 {
			utils.ErrorResponse(w, http.StatusBadRequest, "تعداد محصول باید بیشتر از صفر باشد")
			return
		}
		// Fetch product to get name and image snapshot
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			if err == mongo.ErrNoDocuments {
				utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("محصول با شناسه %s یافت نشد", item.ProductID.Hex()))
				return
			}
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت اطلاعات محصول")
			return
		}

		normalizedVariant, _, _, _ := normalizeOrderVariantFromProduct(&product, item.Variant)
		productImage := selectedVariantImage(product, normalizedVariant.Color, normalizedVariant.ColorName)

		// Create order item with product snapshot
		itemWithSnapshot := models.OrderItem{
			ProductID:       item.ProductID,
			ProductName:     product.Name,
			ProductImage:    productImage,
			Variant:         normalizedVariant,
			Quantity:        item.Quantity,
			PriceAtPurchase: product.Price,
		}
		itemsWithSnapshots = append(itemsWithSnapshots, itemWithSnapshot)
		subtotal += product.Price * float64(item.Quantity)
	}
	if len(itemsWithSnapshots) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "سبد خرید خالی است")
		return
	}
	if valid, inventoryError := validateInventory(ctx, itemsWithSnapshots); !valid {
		utils.ErrorResponse(w, http.StatusBadRequest, inventoryError)
		return
	}
	calculatedDiscount, discountErr := calculateCheckoutDiscount(ctx, userID, orderData.PromoCode, itemsWithSnapshots, subtotal)
	if discountErr != nil {
		switch {
		case discountErr == mongo.ErrNoDocuments:
			utils.ErrorResponse(w, http.StatusBadRequest, "کد تخفیف نامعتبر است")
		case errors.Is(discountErr, errDiscountMinimumOrder), errors.Is(discountErr, errDiscountProductScope):
			utils.ErrorResponse(w, http.StatusBadRequest, discountErr.Error())
		default:
			utils.ErrorResponse(w, http.StatusBadRequest, "خطا در محاسبه کد تخفیف")
		}
		return
	}
	orderData.DiscountAmount = calculatedDiscount
	if orderData.ShippingCost < 0 || orderData.DiscountAmount < 0 || orderData.DiscountAmount > subtotal {
		utils.ErrorResponse(w, http.StatusBadRequest, "مقادیر مالی سفارش نامعتبر است")
		return
	}
	expectedTotal := subtotal + orderData.ShippingCost - orderData.DiscountAmount
	if math.Abs(expectedTotal-orderData.TotalAmount) > 1 {
		utils.ErrorResponse(w, http.StatusBadRequest, "مبلغ سفارش با اقلام سبد خرید مطابقت ندارد")
		return
	}

	// Create a new order
	now := time.Now()
	orderCount := getNextOrderNumber()

	order := models.Order{
		ID:              primitive.NewObjectID(),
		UserID:          userID,
		OrderNumber:     fmt.Sprintf("DGS-%05d", orderCount),
		Items:           itemsWithSnapshots,
		TotalAmount:     expectedTotal,
		ShippingCost:    orderData.ShippingCost,
		TaxAmount:       0,
		DiscountAmount:  orderData.DiscountAmount,
		DiscountCode:    orderData.PromoCode,
		ShippingAddress: orderData.ShippingAddress,
		Status:          "pending",
		StatusText:      "در انتظار پردازش",
		PaymentStatus:   "pending",
		IsActive:        true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	collection := db.Database.Collection("orders")
	_, err := collection.InsertOne(ctx, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating order")
		return
	}

	// Return order with Jalali dates and populated items
	response, err := newOrderAPIResponse(ctx, order)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing order response: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

// GET /api/orders?orderId=<orderId>
func GetOrder(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID and Role from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	roleCtx := r.Context().Value("role")

	if userIDCtx == nil || roleCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"User ID or role not found in context (authentication error)",
		)
		return
	}

	currentUserID, userIDOk := userIDCtx.(primitive.ObjectID)
	currentUserRole, roleOk := roleCtx.(string)

	if !userIDOk || !roleOk {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"User ID or role in context is of incorrect type",
		)
		return
	}

	vars := mux.Vars(r)
	orderIdStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	objID, err := primitive.ObjectIDFromHex(orderIdStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID format in path")
		return
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	) // Increased timeout for population
	defer cancel()

	collection := db.Database.Collection("orders")
	var order models.Order
	// Fetch active order by ID
	err = collection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Active order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}

	// --- Authorization Check: User must own the order or be an admin ---
	if currentUserRole != "admin" && order.UserID != currentUserID {
		utils.ErrorResponse(
			w,
			http.StatusForbidden,
			"You are not authorized to view this order",
		)
		return
	}

	response, err := newOrderAPIResponse(ctx, order)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing order response: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

// GET /api/orders — authenticated user's own orders with status/search filtering and pagination.
func GetUserOrders(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"User ID not found in context (authentication error)",
		)
		return
	}
	userObjID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"User ID in context is of incorrect type",
		)
		return
	}
	if userObjID == primitive.NilObjectID {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"Invalid User ID in context (NilObjectID)",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")

	// Pagination parameters (optional)
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")
	page, _ := strconv.ParseInt(pageQuery, 10, 64)
	limit, _ := strconv.ParseInt(limitQuery, 10, 64)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	} // Default limit
	skip := (page - 1) * limit

	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by newest first

	filter := bson.M{"user_id": userObjID, "is_active": true}

	// Status filter — mirrors GetAllOrders semantics. Only the five real
	// order statuses are valid (pending, processing, shipped, delivered,
	// cancelled). "all" or empty means no status filtering. The legacy
	// frontend sent "refunded" as an order status which never exists — that
	// value belongs to payment_status, so a filtered query must correctly
	// return zero results rather than being ignored.
	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		filter["status"] = status
	}

	// Search by order number, gateway transaction ID, or SnappPay payment token
	// (case-insensitive partial matching), scoped to this user's orders.
	if search := r.URL.Query().Get("search"); search != "" {
		pattern := bson.M{"$regex": search, "$options": "i"}
		filter["$or"] = []bson.M{
			{"order_number": pattern},
			{"gateway_transaction_id": pattern},
			{"gateway_reference": pattern},
		}
	}

	totalCount, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting orders: "+err.Error())
		return
	}

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching user orders: "+err.Error(),
		)
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error processing orders")
		return
	}

	// Initialize responses as an empty slice, not nil
	responses := make([]OrderAPIResponse, 0)
	for _, order := range orders {
		resp, err := newOrderAPIResponse(ctx, order)
		if err != nil {
			utils.LogAction(
				"error",
				fmt.Sprintf(
					"Error preparing response for order %s: %v",
					order.ID.Hex(),
					err,
				),
			)
			continue // Skip this order in the response if it has issues
		}
		responses = append(responses, resp)
	}

	pagination := map[string]interface{}{
		"currentPage": page,
		"totalPages":  (totalCount + limit - 1) / limit,
		"totalOrders": totalCount,
		"pageSize":    limit,
	}

	if len(responses) == 0 {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"message":     "شما هنوز هیچ سفارشی ثبت نکردهاید.",
			"link_text":   "مشاهده محصولات",
			"link_url":    "/products",
			"has_orders":  false,
			"orders_data": responses,
			"pagination":  pagination,
		})
		return
	}

	// If we have orders, return them along with a flag
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"has_orders":  true,
		"orders_data": responses,
		"pagination":  pagination,
	})
}

// PATCH /api/orders/:id/tracking
func UpdateOrderTracking(w http.ResponseWriter, r *http.Request) {
	// Get admin info from context (if available)
	var adminID primitive.ObjectID
	var adminName string
	if userIDCtx := r.Context().Value("userID"); userIDCtx != nil {
		if id, ok := userIDCtx.(primitive.ObjectID); ok {
			adminID = id
		}
	}
	if nameCtx := r.Context().Value("userName"); nameCtx != nil {
		if name, ok := nameCtx.(string); ok {
			adminName = name
		}
	}

	vars := mux.Vars(r)
	orderIdStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID is required in path")
		return
	}

	orderID, err := primitive.ObjectIDFromHex(orderIdStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	// Parse request body
	var updateData struct {
		TrackingCode string `json:"trackingCode"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate tracking code is not empty
	if updateData.TrackingCode == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد رهگیری نمی‌تواند خالی باشد")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")

	// Create timeline entry for tracking code addition
	timelineEntry := models.OrderTimelineEntry{
		Status:    "shipped",
		Timestamp: time.Now(),
		Note:      fmt.Sprintf("کد رهگیری اضافه شد: %s", updateData.TrackingCode),
		AdminID:   adminID,
		AdminName: adminName,
	}

	update := bson.M{
		"$set": bson.M{
			"tracking_code": updateData.TrackingCode,
			"status":        "shipped",
			"status_text":   "ارسال شده",
			"updated_at":    time.Now(),
		},
		"$push": bson.M{
			"timeline": timelineEntry,
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": orderID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating order")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	// Fetch the updated order to return it with populated items
	var updatedOrder models.Order
	if err := collection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&updatedOrder); err != nil {
		// If fetching fails, still indicate success for the update operation itself
		utils.LogAction(
			"error",
			fmt.Sprintf(
				"Failed to fetch order %s after tracking update: %v",
				orderID.Hex(),
				err,
			),
		)
		utils.JSONResponse(
			w,
			http.StatusOK,
			map[string]string{
				"message": "Order tracking updated successfully, but failed to retrieve updated order details.",
			},
		)
		return
	}

	response, err := newOrderAPIResponse(ctx, updatedOrder)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing updated order response: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

// Helper function to generate a sequential order number
func getNextOrderNumber() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("counters")

	// Simple query approach without using FindOneAndUpdate
	var result struct {
		ID  string `bson:"_id"`
		Seq int    `bson:"seq"`
	}

	// Try to find the current counter
	err := collection.FindOne(ctx, bson.M{"_id": "orderNumber"}).Decode(&result)

	// If counter doesn't exist or there's an error, start with 10001
	if err != nil {
		// Create a new counter
		_, err := collection.InsertOne(ctx, bson.M{
			"_id": "orderNumber",
			"seq": 10001,
		})

		if err != nil {
			return 10001 // Return default in case of error
		}

		return 10001
	}

	// Increment the counter
	newSeq := result.Seq + 1
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": "orderNumber"},
		bson.M{"$set": bson.M{"seq": newSeq}},
	)

	if err != nil {
		return result.Seq // Return current value if update failed
	}

	return newSeq
}

// --- Admin Order Management ---

// GetAdminOrderById handles GET /api/admin/orders/{orderId}
// Returns detailed order information for admin including all fields, timeline, notes, and Jalali dates
func GetAdminOrderById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}

	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ordersCollection := db.Database.Collection("orders")

	var order models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}

	// Prepare the response with populated product details and Jalali dates
	response, err := newAdminOrderAPIResponse(ctx, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing order response: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// addTimelineEntry appends a new timeline entry to an order's timeline
// It sets the timestamp to the current time and includes admin info if provided
func addTimelineEntry(order *models.Order, status string, adminID primitive.ObjectID, adminName string, note string) {
	entry := models.OrderTimelineEntry{
		Status:    status,
		Timestamp: time.Now(),
		Note:      note,
	}

	// Only set admin fields if adminID is not nil
	if adminID != primitive.NilObjectID {
		entry.AdminID = adminID
		entry.AdminName = adminName
	}

	// Initialize timeline if nil
	if order.Timeline == nil {
		order.Timeline = []models.OrderTimelineEntry{}
	}

	order.Timeline = append(order.Timeline, entry)
}

// DeleteOrder handles DELETE /api/admin/orders/{orderId} (Soft Delete)
// Requires admin authentication
func DeleteOrder(w http.ResponseWriter, r *http.Request) {
	// Admin auth should be handled by middleware.

	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	ordersCollection := db.Database.Collection("orders")

	// Fetch the order to check its current status
	var orderToDeactivate models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&orderToDeactivate); err != nil {
		if err == mongo.ErrNoDocuments { // Ensure mongo import: "go.mongodb.org/mongo-driver/mongo"
			utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}

	if !orderToDeactivate.IsActive {
		utils.JSONResponse(
			w,
			http.StatusOK,
			map[string]string{"message": "Order is already inactive"},
		)
		return
	}

	// Perform soft delete
	updateFields := bson.M{
		"is_active":  false,
		"updated_at": time.Now(),
	}
	updateDoc := bson.M{"$set": updateFields}

	result, err := ordersCollection.UpdateOne(ctx, bson.M{"_id": orderID}, updateDoc)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deactivating order: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Order not found for deactivation (race condition?)",
		)
		return
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Order deactivated successfully"},
	)
}

// GetAllOrders handles GET /api/admin/orders (Admin only)
// Supports advanced filtering: status, payment_status, search, date_from, date_to, sort_by
func GetAllOrders(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")

	// Parse pagination parameters
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")
	page, err := strconv.ParseInt(pageQuery, 10, 64)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.ParseInt(limitQuery, 10, 64)
	if err != nil || limit < 1 {
		limit = 10
	}
	skip := (page - 1) * limit

	// Parse sort_by parameter
	sortBy := r.URL.Query().Get("sort_by")
	sortField := bson.D{{Key: "created_at", Value: -1}} // Default: newest first
	switch sortBy {
	case "oldest":
		sortField = bson.D{{Key: "created_at", Value: 1}}
	case "amount_asc":
		sortField = bson.D{{Key: "total_amount", Value: 1}}
	case "amount_desc":
		sortField = bson.D{{Key: "total_amount", Value: -1}}
	case "newest":
		sortField = bson.D{{Key: "created_at", Value: -1}}
	}

	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(sortField)

	// Build filter with AND conditions
	filter := bson.M{"is_active": true}

	// Status filter
	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		filter["status"] = status
	}

	// Payment status filter
	if paymentStatus := r.URL.Query().Get("payment_status"); paymentStatus != "" && paymentStatus != "all" {
		filter["payment_status"] = paymentStatus
	}

	// Search by order number, gateway transaction ID, or SnappPay payment token
	// (case-insensitive partial matching).
	if search := r.URL.Query().Get("search"); search != "" {
		pattern := bson.M{"$regex": search, "$options": "i"}
		filter["$or"] = []bson.M{
			{"order_number": pattern},
			{"gateway_transaction_id": pattern},
			{"gateway_reference": pattern},
		}
	}

	// Date range filter
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")
	if dateFrom != "" || dateTo != "" {
		dateFilter := bson.M{}
		if dateFrom != "" {
			if fromTime, parseErr := time.Parse("2006-01-02", dateFrom); parseErr == nil {
				dateFilter["$gte"] = fromTime
			}
		}
		if dateTo != "" {
			if toTime, parseErr := time.Parse("2006-01-02", dateTo); parseErr == nil {
				// Add 1 day minus 1 second to include the entire end date
				dateFilter["$lte"] = toTime.Add(24*time.Hour - time.Second)
			}
		}
		if len(dateFilter) > 0 {
			filter["created_at"] = dateFilter
		}
	}

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching orders: "+err.Error(),
		)
		return
	}
	defer cursor.Close(ctx)

	var ordersData []models.Order
	if err := cursor.All(ctx, &ordersData); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding orders: "+err.Error(),
		)
		return
	}

	totalCount, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error counting orders: "+err.Error(),
		)
		return
	}

	responses := make([]AdminOrderAPIResponse, 0)
	for _, ord := range ordersData {
		resp, err := newAdminOrderAPIResponse(ctx, ord)
		if err != nil {
			utils.LogAction(
				"error",
				fmt.Sprintf(
					"Error preparing response for order %s: %v",
					ord.ID.Hex(),
					err,
				),
			)
			continue
		}
		responses = append(responses, resp)
	}

	pagination := map[string]interface{}{
		"currentPage": page,
		"totalPages":  (totalCount + limit - 1) / limit,
		"totalOrders": totalCount,
		"pageSize":    limit,
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"orders":     responses,
		"pagination": pagination,
	})
}

// getStatusText returns the Persian localized text for a given order status
func getStatusText(status string) string {
	switch status {
	case "pending":
		return "در انتظار تایید"
	case "processing":
		return "در حال پردازش"
	case "shipped":
		return "ارسال شده"
	case "delivered":
		return "تحویل شده"
	case "cancelled":
		return "لغو شده"
	default:
		return ""
	}
}

func orderStatusRequiresPayment(status string) bool {
	return status == "processing" || status == "shipped" || status == "delivered"
}

// UpdateOrderStatusAdmin handles PUT /api/admin/orders/{orderId} to update order status (Admin only)
func UpdateOrderStatusAdmin(w http.ResponseWriter, r *http.Request) {
	// Get admin info from context
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}
	adminID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || adminID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID")
		return
	}

	// Get admin name from context (set by AdminAuthMiddleware)
	adminName := ""
	if nameCtx := r.Context().Value("userName"); nameCtx != nil {
		if name, ok := nameCtx.(string); ok {
			adminName = name
		}
	}

	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	var payload struct {
		Status            string `json:"status"`
		Note              string `json:"note,omitempty"`
		TrackingCode      string `json:"tracking_code,omitempty"`
		Confirm           bool   `json:"confirm"`
		CancelEntireOrder bool   `json:"cancelEntireOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"pending":    true,
		"processing": true,
		"shipped":    true,
		"delivered":  true,
		"cancelled":  true,
	}
	if !validStatuses[payload.Status] {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid status value")
		return
	}
	if payload.Status == "cancelled" && (!payload.Confirm || !payload.CancelEntireOrder) {
		utils.ErrorResponse(w, http.StatusBadRequest, "تایید صریح لغو کامل سفارش الزامی است")
		return
	}

	// Require tracking code when changing to "shipped" status
	if payload.Status == "shipped" && payload.TrackingCode == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد رهگیری برای تغییر وضعیت به 'ارسال شده' الزامی است")
		return
	}

	// Determine status text
	statusText := getStatusText(payload.Status)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	ordersCollection := db.Database.Collection("orders")

	// Fetch current order to check previous status
	var currentOrder models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&currentOrder); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}
	if orderStatusRequiresPayment(payload.Status) && currentOrder.PaymentStatus != "paid" {
		utils.ErrorResponse(w, http.StatusConflict, "پرداخت سفارش هنوز تایید نشده است")
		return
	}
	if payload.Status == "cancelled" && currentOrder.GatewayName == "snappay" && currentOrder.PaymentStatus == "paid" {
		utils.ErrorResponse(w, http.StatusConflict, "برای لغو سفارش اسنپ‌پی از عملیات لغو تراکنش با تاییدیه استفاده کنید")
		return
	}

	// If changing to cancelled and order was paid, restore inventory
	if payload.Status == "cancelled" && currentOrder.Status != "cancelled" && currentOrder.PaymentStatus == "paid" {
		if err := restoreInventory(ctx, currentOrder.Items); err != nil {
			utils.LogAction("error", fmt.Sprintf("Failed to restore inventory for cancelled order %s: %v", orderID.Hex(), err))
			// Continue with cancellation even if inventory restore fails
		}
	}

	// Create timeline entry for the status change
	timelineEntry := models.OrderTimelineEntry{
		Status:    payload.Status,
		Timestamp: time.Now(),
		Note:      payload.Note,
		AdminID:   adminID,
		AdminName: adminName,
	}

	// Build update document
	updateSet := bson.M{
		"status":      payload.Status,
		"status_text": statusText,
		"updated_at":  time.Now(),
	}

	// If tracking code is provided (for shipped status), update it as well
	if payload.TrackingCode != "" {
		updateSet["tracking_code"] = payload.TrackingCode
	}

	update := bson.M{
		"$set": updateSet,
		"$push": bson.M{
			"timeline": timelineEntry,
		},
	}

	updateFilter := bson.M{"_id": orderID}
	if orderStatusRequiresPayment(payload.Status) {
		updateFilter["payment_status"] = "paid"
	}
	result, err := ordersCollection.UpdateOne(ctx, updateFilter, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating order status: "+err.Error(),
		)
		return
	}
	if result.MatchedCount == 0 {
		if orderStatusRequiresPayment(payload.Status) {
			utils.ErrorResponse(w, http.StatusConflict, "پرداخت سفارش هنوز تایید نشده است")
			return
		}
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	var updatedOrder models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&updatedOrder); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated order: "+err.Error(),
		)
		return
	}
	resp, err := newAdminOrderAPIResponse(ctx, updatedOrder)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing updated response: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, resp)
}

// AddOrderNote handles POST /api/admin/orders/{orderId}/notes
// Adds an internal admin note to an order
func AddOrderNote(w http.ResponseWriter, r *http.Request) {
	// Get admin info from context
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}
	adminID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || adminID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID")
		return
	}

	// Get admin name from context (set by AdminAuthMiddleware)
	adminName := ""
	if nameCtx := r.Context().Value("userName"); nameCtx != nil {
		if name, ok := nameCtx.(string); ok {
			adminName = name
		}
	}

	// Get order ID from path
	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	// Parse request body
	var payload struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate content is not empty
	if payload.Content == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Note content cannot be empty")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ordersCollection := db.Database.Collection("orders")

	// Check if order exists
	var order models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID, "is_active": true}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}

	// Create new note
	newNote := models.OrderNote{
		ID:        primitive.NewObjectID(),
		Content:   payload.Content,
		AdminID:   adminID,
		AdminName: adminName,
		CreatedAt: time.Now(),
	}

	// Update order with new note
	update := bson.M{
		"$push": bson.M{
			"notes": newNote,
		},
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}

	result, err := ordersCollection.UpdateOne(ctx, bson.M{"_id": orderID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error adding note: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	// Fetch updated order for response
	var updatedOrder models.Order
	if err := ordersCollection.FindOne(ctx, bson.M{"_id": orderID}).Decode(&updatedOrder); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated order: "+err.Error())
		return
	}

	response, err := newAdminOrderAPIResponse(ctx, updatedOrder)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing order response: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "یادداشت با موفقیت اضافه شد",
		"order":   response,
	})
}

// OrderStatsResponse represents the statistics response for admin dashboard
type OrderStatsResponse struct {
	TotalOrders      int64   `json:"total_orders"`
	PendingOrders    int64   `json:"pending_orders"`
	ProcessingOrders int64   `json:"processing_orders"`
	ShippedOrders    int64   `json:"shipped_orders"`
	DeliveredOrders  int64   `json:"delivered_orders"`
	CancelledOrders  int64   `json:"cancelled_orders"`
	TotalRevenue     float64 `json:"total_revenue"`
	TodayOrders      int64   `json:"today_orders"`
	TodayRevenue     float64 `json:"today_revenue"`
}

// GetOrderStats handles GET /api/admin/orders/stats
// Returns order statistics for the admin dashboard with optional filtering
func GetOrderStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")

	// Parse filter parameters
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")
	statusFilter := r.URL.Query().Get("status")

	// Build base filter for active orders
	baseFilter := bson.M{"is_active": true}

	// Apply date range filter if provided
	if dateFrom != "" || dateTo != "" {
		dateFilter := bson.M{}
		if dateFrom != "" {
			if fromTime, err := time.Parse("2006-01-02", dateFrom); err == nil {
				dateFilter["$gte"] = fromTime
			}
		}
		if dateTo != "" {
			if toTime, err := time.Parse("2006-01-02", dateTo); err == nil {
				// Add 1 day to include the entire end date
				dateFilter["$lte"] = toTime.Add(24*time.Hour - time.Second)
			}
		}
		if len(dateFilter) > 0 {
			baseFilter["created_at"] = dateFilter
		}
	}

	// Apply status filter if provided
	if statusFilter != "" && statusFilter != "all" {
		baseFilter["status"] = statusFilter
	}

	// Calculate total orders count
	totalOrders, err := collection.CountDocuments(ctx, baseFilter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting total orders: "+err.Error())
		return
	}

	// Count orders by status
	pendingFilter := copyFilter(baseFilter)
	pendingFilter["status"] = "pending"
	pendingOrders, _ := collection.CountDocuments(ctx, pendingFilter)

	processingFilter := copyFilter(baseFilter)
	processingFilter["status"] = "processing"
	processingOrders, _ := collection.CountDocuments(ctx, processingFilter)

	shippedFilter := copyFilter(baseFilter)
	shippedFilter["status"] = "shipped"
	shippedOrders, _ := collection.CountDocuments(ctx, shippedFilter)

	deliveredFilter := copyFilter(baseFilter)
	deliveredFilter["status"] = "delivered"
	deliveredOrders, _ := collection.CountDocuments(ctx, deliveredFilter)

	cancelledFilter := copyFilter(baseFilter)
	cancelledFilter["status"] = "cancelled"
	cancelledOrders, _ := collection.CountDocuments(ctx, cancelledFilter)

	// Calculate total revenue from paid orders
	revenueFilter := copyFilter(baseFilter)
	revenueFilter["payment_status"] = "paid"
	totalRevenue := calculateRevenue(ctx, collection, revenueFilter)

	// Calculate today's statistics
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24*time.Hour - time.Second)

	todayFilter := bson.M{
		"is_active": true,
		"created_at": bson.M{
			"$gte": startOfDay,
			"$lte": endOfDay,
		},
	}
	todayOrders, _ := collection.CountDocuments(ctx, todayFilter)

	todayRevenueFilter := bson.M{
		"is_active":      true,
		"payment_status": "paid",
		"created_at": bson.M{
			"$gte": startOfDay,
			"$lte": endOfDay,
		},
	}
	todayRevenue := calculateRevenue(ctx, collection, todayRevenueFilter)

	stats := OrderStatsResponse{
		TotalOrders:      totalOrders,
		PendingOrders:    pendingOrders,
		ProcessingOrders: processingOrders,
		ShippedOrders:    shippedOrders,
		DeliveredOrders:  deliveredOrders,
		CancelledOrders:  cancelledOrders,
		TotalRevenue:     totalRevenue,
		TodayOrders:      todayOrders,
		TodayRevenue:     todayRevenue,
	}

	utils.JSONResponse(w, http.StatusOK, stats)
}

// copyFilter creates a shallow copy of a bson.M filter
func copyFilter(filter bson.M) bson.M {
	newFilter := bson.M{}
	for k, v := range filter {
		newFilter[k] = v
	}
	return newFilter
}

// calculateRevenue calculates the total revenue for orders matching the filter
func calculateRevenue(ctx context.Context, collection *mongo.Collection, filter bson.M) float64 {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$total_amount"},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0
	}
	defer cursor.Close(ctx)

	var results []struct {
		Total float64 `bson:"total"`
	}
	if err := cursor.All(ctx, &results); err != nil || len(results) == 0 {
		return 0
	}

	return results[0].Total
}

// GetRecentOrders retrieves a limited number of recent orders for the admin dashboard
func GetRecentOrders(w http.ResponseWriter, r *http.Request) {
	// Check if user is admin
	roleCtx := r.Context().Value("role")
	if roleCtx == nil || roleCtx.(string) != "admin" {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Admin access required")
		return
	}

	// Parse limit query parameter, default to 5 orders
	limitParam := r.URL.Query().Get("limit")
	limit := 5 // Default limit
	if limitParam != "" {
		parsedLimit, err := strconv.Atoi(limitParam)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")

	// Find options: sort by creation date descending and limit results
	findOptions := options.Find().
		SetSort(bson.M{"created_at": -1}).
		SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, bson.M{"is_active": true}, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching recent orders")
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error parsing recent orders")
		return
	}

	// Transform orders to API response format
	var responseOrders []AdminOrderAPIResponse
	for _, order := range orders {
		apiOrder, err := newAdminOrderAPIResponse(ctx, order)
		if err != nil {
			// Log error but continue with other orders
			utils.LogAction("error", fmt.Sprintf("Error populating order %s: %v", order.ID.Hex(), err))
			continue
		}
		responseOrders = append(responseOrders, apiOrder)
	}

	// Ensure we always return an array, even if empty
	if responseOrders == nil {
		responseOrders = []AdminOrderAPIResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"orders": responseOrders,
		"count":  len(responseOrders),
	})
}
