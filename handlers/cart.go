package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CartItem represents an item in a user's cart.
type CartItem struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    string             `bson:"userId" json:"userId"`
	ProductID string             `bson:"productId" json:"productId"`
	Quantity  int                `bson:"quantity" json:"quantity"`
}

// GetCart returns the cart items for a given user.
// GET /api/cart?userId=<userId>
func GetCart(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("cart")
	cursor, err := collection.Find(ctx, bson.M{"userId": userID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching cart")
		return
	}

	var items []CartItem
	if err := cursor.All(ctx, &items); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding cart items")
		return
	}
	utils.JSONResponse(w, http.StatusOK, items)
}

// AddToCart adds an item to the user's cart.
// POST /api/cart
func AddToCart(w http.ResponseWriter, r *http.Request) {
	var item CartItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// In production, you might check if the item already exists and update quantity.
	item.ID = primitive.NewObjectID()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("cart")
	_, err := collection.InsertOne(ctx, item)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error adding item to cart")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, item)
}

// RemoveFromCart removes an item from the cart by its ID.
// DELETE /api/cart/{itemId}
func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	itemIDStr := vars["itemId"]
	itemID, err := primitive.ObjectIDFromHex(itemIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("cart")
	result, err := collection.DeleteOne(ctx, bson.M{"_id": itemID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error removing item from cart")
		return
	}
	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Item not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item removed from cart"})
}
