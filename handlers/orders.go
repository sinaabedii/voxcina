package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Order represents an order document
type Order struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID     string             `bson:"userId" json:"userId"`
	Items      []interface{}      `bson:"items" json:"items"`
	TotalPrice float64            `bson:"totalPrice" json:"totalPrice"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

// POST /api/checkout
func Checkout(w http.ResponseWriter, r *http.Request) {
	var order Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order payload")
		return
	}
	order.ID = primitive.NewObjectID()
	order.CreatedAt = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("orders")
	_, err := collection.InsertOne(ctx, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating order")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Checkout initiated"})
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
	var order Order
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, order)
}
