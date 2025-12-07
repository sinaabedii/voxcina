package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
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

// OrderProductResponse is a subset of product information for order items.
type OrderProductResponse struct {
	ID    primitive.ObjectID `json:"id"`
	Name  string             `json:"name"`
	Image string             `json:"image"` // Assuming main image URL
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
	ID              primitive.ObjectID     `json:"id"`
	UserID          primitive.ObjectID     `json:"user_id"`
	OrderNumber     string                 `json:"order_number"`
	Items           []OrderItemAPIResponse `json:"items"`
	TotalAmount     float64                `json:"total_amount"`
	ShippingAddress models.Address         `json:"shipping_address"`
	Status          string                 `json:"status"`
	StatusText      string                 `json:"status_text"`
	TrackingCode    *string                `json:"tracking_code,omitempty"` // omitempty for null tracking code
	PaymentStatus   string                 `json:"payment_status"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	JalaliCreatedAt string                 `json:"jalali_created_at"`
	JalaliUpdatedAt string                 `json:"jalali_updated_at"`
	ProductCount    int                    `json:"product_count"`
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
		productImage := ""
		// Get image from MainImages or first ColorVariant
		if len(product.MainImages) > 0 {
			productImage = product.MainImages[0]
		} else if len(product.ColorVariants) > 0 && len(product.ColorVariants[0].Images) > 0 {
			productImage = product.ColorVariants[0].Images[0]
		}

		populatedItems = append(populatedItems, OrderItemAPIResponse{
			Product: OrderProductResponse{
				ID:    product.ID,
				Name:  product.Name,
				Image: productImage,
			},
			Variant:         item.Variant,
			Quantity:        item.Quantity,
			PriceAtPurchase: item.PriceAtPurchase,
		})
	}

	return OrderAPIResponse{
		ID:              order.ID,
		UserID:          order.UserID,
		OrderNumber:     order.OrderNumber,
		Items:           populatedItems,
		TotalAmount:     order.TotalAmount,
		ShippingAddress: order.ShippingAddress,
		Status:          order.Status,
		StatusText:      order.StatusText,
		TrackingCode:    order.TrackingCode,
		PaymentStatus:   order.PaymentStatus,
		CreatedAt:       order.CreatedAt,
		UpdatedAt:       order.UpdatedAt,
		JalaliCreatedAt: utils.ToJalaliDateString(order.CreatedAt),
		JalaliUpdatedAt: utils.ToJalaliDateString(order.UpdatedAt),
		ProductCount:    order.GetProductCount(),
	}, nil
}

// validateAndReserveInventory checks if all items have sufficient stock
// Returns an error message if any item is out of stock or has insufficient quantity
func validateInventory(ctx context.Context, items []models.OrderItem) (bool, string) {
	productsCollection := db.Database.Collection("products")

	for _, item := range items {
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			if err == mongo.ErrNoDocuments {
				return false, fmt.Sprintf("محصول با شناسه %s یافت نشد", item.ProductID.Hex())
			}
			return false, fmt.Sprintf("خطا در بررسی موجودی محصول: %v", err)
		}

		// Find the color variant and size
		found := false
		for _, colorVariant := range product.ColorVariants {
			if colorVariant.Color == item.Variant.Color {
				for _, sizeVariant := range colorVariant.Sizes {
					if sizeVariant.Size == item.Variant.Size {
						found = true
						if sizeVariant.Quantity < item.Quantity {
							return false, fmt.Sprintf(
								"موجودی کافی برای %s (رنگ: %s، سایز: %s) وجود ندارد. موجودی: %d، درخواست: %d",
								product.Name, colorVariant.ColorName, sizeVariant.Size,
								sizeVariant.Quantity, item.Quantity,
							)
						}
						break
					}
				}
				break
			}
		}

		if !found {
			return false, fmt.Sprintf(
				"تنوع انتخاب شده (رنگ: %s، سایز: %s) برای محصول %s یافت نشد",
				item.Variant.Color, item.Variant.Size, product.Name,
			)
		}
	}

	return true, ""
}

// reduceInventory decreases the inventory for each item in the order
// This should be called after successful payment
func reduceInventory(ctx context.Context, items []models.OrderItem) error {
	productsCollection := db.Database.Collection("products")

	for _, item := range items {
		// Use MongoDB's positional operator to update the specific size variant
		// We need to find the product, then update the specific color variant's size quantity
		filter := bson.M{
			"_id":                          item.ProductID,
			"color_variants.color":         item.Variant.Color,
			"color_variants.sizes.size":    item.Variant.Size,
		}

		// First, get the product to find the correct indices
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			return fmt.Errorf("failed to find product %s: %w", item.ProductID.Hex(), err)
		}

		// Find the color variant index and size index
		colorIdx := -1
		sizeIdx := -1
		for ci, cv := range product.ColorVariants {
			if cv.Color == item.Variant.Color {
				colorIdx = ci
				for si, sv := range cv.Sizes {
					if sv.Size == item.Variant.Size {
						sizeIdx = si
						break
					}
				}
				break
			}
		}

		if colorIdx == -1 || sizeIdx == -1 {
			return fmt.Errorf("variant not found for product %s", item.ProductID.Hex())
		}

		// Update the specific size quantity using array indices
		updatePath := fmt.Sprintf("color_variants.%d.sizes.%d.quantity", colorIdx, sizeIdx)
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
			return fmt.Errorf("failed to reduce inventory for product %s: %w", item.ProductID.Hex(), err)
		}

		if result.MatchedCount == 0 {
			return fmt.Errorf("product variant not found for inventory reduction: %s", item.ProductID.Hex())
		}

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

		colorIdx := -1
		sizeIdx := -1
		for ci, cv := range product.ColorVariants {
			if cv.Color == item.Variant.Color {
				colorIdx = ci
				for si, sv := range cv.Sizes {
					if sv.Size == item.Variant.Size {
						sizeIdx = si
						break
					}
				}
				break
			}
		}

		if colorIdx == -1 || sizeIdx == -1 {
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
		ShippingAddress models.Address     `json:"shippingAddress"`
	}

	if err := json.NewDecoder(r.Body).Decode(&orderData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order payload")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Validate inventory before creating order
	valid, errMsg := validateInventory(ctx, orderData.Items)
	if !valid {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Create a new order
	now := time.Now()
	orderCount := getNextOrderNumber()

	order := models.Order{
		ID:              primitive.NewObjectID(),
		UserID:          userID,
		OrderNumber:     fmt.Sprintf("DGS-%05d", orderCount),
		Items:           orderData.Items,
		TotalAmount:     orderData.TotalAmount,
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

// POST /api/orders/{orderId}/confirm-payment
// Confirms payment for an order and reduces inventory
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

// GET /api/orders?userId=<userId>
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
	if len(orders) == 0 {
		// No orders found, return a custom message
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"message":     "شما هنوز هیچ سفارشی ثبت نکرده‌اید.",
			"link_text":   "مشاهده محصولات",
			"link_url":    "/products", // Or your actual products page URL
			"has_orders":  false,
			"orders_data": responses, // Will be an empty array []
		})
		return
	}

	for _, order := range orders {
		resp, err := newOrderAPIResponse(ctx, order)
		if err != nil {
			// Log or handle error for individual order preparation
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

	// If we have orders, return them along with a flag
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"has_orders":  true,
		"orders_data": responses,
	})
}

// PATCH /api/orders/:id/tracking
func UpdateOrderTracking(w http.ResponseWriter, r *http.Request) {
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

	// Update the order
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")
	update := bson.M{
		"$set": bson.M{
			"tracking_code": updateData.TrackingCode,
			"status":        "shipped",
			"status_text":   "ارسال شده",
			"updated_at":    time.Now(),
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
func GetAllOrders(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
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

	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})

	// Build filter
	filter := bson.M{"is_active": true}
	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		filter["status"] = status
	}
	if search := r.URL.Query().Get("search"); search != "" {
		filter["order_number"] = bson.M{"$regex": search, "$options": "i"}
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

	responses := make([]OrderAPIResponse, 0)
	for _, ord := range ordersData {
		resp, err := newOrderAPIResponse(ctx, ord)
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

// UpdateOrderStatusAdmin handles PUT /api/admin/orders/{orderId} to update order status (Admin only)
func UpdateOrderStatusAdmin(w http.ResponseWriter, r *http.Request) {
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
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Determine status text
	var statusText string
	switch payload.Status {
	case "pending":
		statusText = "در انتظار تایید"
	case "processing":
		statusText = "در حال پردازش"
	case "shipping":
		statusText = "در حال ارسال"
	case "delivered":
		statusText = "تحویل شده"
	case "cancelled":
		statusText = "لغو شده"
	default:
		statusText = ""
	}

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

	// If changing to cancelled and order was paid, restore inventory
	if payload.Status == "cancelled" && currentOrder.Status != "cancelled" && currentOrder.PaymentStatus == "paid" {
		if err := restoreInventory(ctx, currentOrder.Items); err != nil {
			utils.LogAction("error", fmt.Sprintf("Failed to restore inventory for cancelled order %s: %v", orderID.Hex(), err))
			// Continue with cancellation even if inventory restore fails
		}
	}

	update := bson.M{"$set": bson.M{
		"status":      payload.Status,
		"status_text": statusText,
		"updated_at":  time.Now(),
	}}
	result, err := ordersCollection.UpdateOne(ctx, bson.M{"_id": orderID}, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating order status: "+err.Error(),
		)
		return
	}
	if result.MatchedCount == 0 {
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
	resp, err := newOrderAPIResponse(ctx, updatedOrder)
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
	var responseOrders []OrderAPIResponse
	for _, order := range orders {
		apiOrder, err := newOrderAPIResponse(ctx, order)
		if err != nil {
			// Log error but continue with other orders
			utils.LogAction("error", fmt.Sprintf("Error populating order %s: %v", order.ID.Hex(), err))
			continue
		}
		responseOrders = append(responseOrders, apiOrder)
	}

	// Ensure we always return an array, even if empty
	if responseOrders == nil {
		responseOrders = []OrderAPIResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"orders": responseOrders,
		"count":  len(responseOrders),
	})
}
