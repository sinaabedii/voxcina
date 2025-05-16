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
	ShippingAddress models.ShippingAddress `json:"shipping_address"`
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
		if len(product.Images) > 0 { // Assuming models.Product has Images []string
			productImage = product.Images[0]
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
		Items           []models.OrderItem     `json:"items"`
		TotalAmount     float64                `json:"totalAmount"`
		ShippingAddress models.ShippingAddress `json:"shippingAddress"`
	}

	if err := json.NewDecoder(r.Body).Decode(&orderData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order payload")
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

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

	var responses []OrderAPIResponse
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

	utils.JSONResponse(w, http.StatusOK, responses)
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
