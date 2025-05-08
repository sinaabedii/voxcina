package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// POST /api/checkout
func Checkout(w http.ResponseWriter, r *http.Request) {
	var orderData struct {
		UserID          string               `json:"userId"`
		Items           []models.OrderItem   `json:"items"`
		TotalAmount     float64              `json:"totalAmount"`
		ShippingAddress models.ShippingAddress `json:"shippingAddress"`
	}

	if err := json.NewDecoder(r.Body).Decode(&orderData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order payload")
		return
	}

	// Convert string user ID to ObjectID
	userID, err := primitive.ObjectIDFromHex(orderData.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
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
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	collection := db.Database.Collection("orders")
	_, err = collection.InsertOne(ctx, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating order")
		return
	}
	
	// Return order with Jalali dates
	utils.JSONResponse(w, http.StatusOK, order.ToResponse())
}

// GET /api/orders?orderId=<orderId>
func GetOrder(w http.ResponseWriter, r *http.Request) {
	orderId := r.URL.Query().Get("orderId")
	objID, err := primitive.ObjectIDFromHex(orderId)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID")
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	collection := db.Database.Collection("orders")
	var order models.Order
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}
	
	// Return order with Jalali dates and product count
	response := order.ToResponse()
	utils.JSONResponse(w, http.StatusOK, response)
}

// GET /api/orders?userId=<userId>
func GetUserOrders(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")
	userObjID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	collection := db.Database.Collection("orders")
	cursor, err := collection.Find(ctx, bson.M{"user_id": userObjID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching orders")
		return
	}
	defer cursor.Close(ctx)
	
	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error processing orders")
		return
	}
	
	// Convert to responses with Jalali dates
	var responses []models.OrderResponse
	for _, order := range orders {
		responses = append(responses, order.ToResponse())
	}
	
	utils.JSONResponse(w, http.StatusOK, responses)
}

// PATCH /api/orders/:id/tracking
func UpdateOrderTracking(w http.ResponseWriter, r *http.Request) {
	// Extract order ID from path
	orderIdStr := r.PathValue("id")
	if orderIdStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID is required")
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
			"status": "shipped",
			"status_text": "ارسال شده",
			"updated_at": time.Now(),
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
	
	// Return success response
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Order tracking updated successfully"})
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
