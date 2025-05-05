package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// Product represents a product in the store
type Product struct {
	ID          string  `bson:"_id"         json:"id"`
	Name        string  `bson:"name"        json:"name"`
	Description string  `bson:"description" json:"description"`
	Price       float64 `bson:"price"       json:"price"`
	Image       string  `bson:"image"       json:"image"`
	Category    string  `bson:"category"    json:"category"`
	Brand       string  `bson:"brand"       json:"brand"`
	Stock       int     `bson:"stock"       json:"stock"`
}

// CartItem represents an item in a user's cart with all necessary details
type CartItem struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"   json:"id,omitempty"`
	ProductID primitive.ObjectID `bson:"productId"       json:"productId"`
	Product   models.Product     `bson:"product"         json:"product"`
	Quantity  int                `bson:"quantity"        json:"quantity"`
	Size      string             `bson:"size,omitempty"  json:"size,omitempty"`
	Color     string             `bson:"color,omitempty" json:"color,omitempty"`
	Price     float64            `bson:"price"           json:"price"`
}

// Cart represents the complete cart structure
type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"userId"        json:"userId"`
	Items     []CartItem         `bson:"items"         json:"items"`
	CreatedAt time.Time          `bson:"createdAt"     json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt"     json:"updatedAt"`
}

// CartSummary represents the cart's financial summary
type CartSummary struct {
	Subtotal float64 `json:"subtotal"`
	Shipping float64 `json:"shipping"`
	Tax      float64 `json:"tax"`
	Discount float64 `json:"discount"`
	Total    float64 `json:"total"`
}

// PromoCode represents a discount code
type PromoCode struct {
	Code               string    `json:"code"`
	DiscountPercentage float64   `json:"discountPercentage"`
	MinPurchase        float64   `json:"minPurchase"`
	MaxDiscount        float64   `json:"maxDiscount"`
	ExpireDate         time.Time `json:"expireDate"`
	Description        string    `json:"description"`
	IsValid            bool      `json:"isValid"`
	ErrorMessage       string    `json:"errorMessage,omitempty"`
}

// getUserIDFromToken extracts the user ID from the JWT token in the Authorization header
func getUserIDFromToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", nil
	}

	// Extract the token from the Authorization header
	// Format: "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", nil
	}

	tokenString := parts[1]

	// Parse and validate the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte("137888"), nil // Use the same secret as in auth.go
	})

	if err != nil {
		return "", err
	}

	// Extract the user ID from the claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if userID, ok := claims["user_id"].(string); ok {
			return userID, nil
		}
	}

	return "", nil
}

// GetCart returns the complete cart for a given user
func GetCart(w http.ResponseWriter, r *http.Request) {
	// Try to get user ID from token first
	userID, err := getUserIDFromToken(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// If no user ID from token, try query parameter
	if userID == "" {
		userID = r.URL.Query().Get("userId")
		if userID == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("cart")
	var cart Cart
	err = collection.FindOne(ctx, bson.M{"userId": userID}).Decode(&cart)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Create new cart if none exists
			cart = Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				Items:     []CartItem{},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			_, err = collection.InsertOne(ctx, cart)
			if err != nil {
				utils.ErrorResponse(
					w,
					http.StatusInternalServerError,
					"Error creating new cart",
				)
				return
			}
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching cart")
			return
		}
	}

	// Calculate summary
	summary := calculateCartSummary(cart.Items)

	response := struct {
		Cart    Cart        `json:"cart"`
		Summary CartSummary `json:"summary"`
	}{
		Cart:    cart,
		Summary: summary,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// AddToCart adds or updates an item in the user's cart
func AddToCart(w http.ResponseWriter, r *http.Request) {
	// Try to get user ID from token first
	userID, err := getUserIDFromToken(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// If no user ID from token, try query parameter
	if userID == "" {
		userID = r.URL.Query().Get("userId")
		if userID == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
			return
		}
	}

	var requestItem struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
		Size      string `json:"size,omitempty"`
		Color     string `json:"color,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestItem); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Convert product ID to ObjectID
	productID, err := primitive.ObjectIDFromHex(requestItem.ProductID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Fetch product details
	productsCollection := db.Database.Collection("products")
	var product models.Product
	err = productsCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&product)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}

	// Find or create cart
	cartCollection := db.Database.Collection("cart")
	var cart Cart
	err = cartCollection.FindOne(ctx, bson.M{"userId": userID}).Decode(&cart)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			cart = Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				Items:     []CartItem{},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching cart")
			return
		}
	}

	// Check if item already exists
	itemIndex := -1
	for i, existingItem := range cart.Items {
		if existingItem.ProductID == productID &&
			existingItem.Size == requestItem.Size &&
			existingItem.Color == requestItem.Color {
			itemIndex = i
			break
		}
	}

	if itemIndex > -1 {
		// Update existing item
		cart.Items[itemIndex].Quantity += requestItem.Quantity
	} else {
		// Add new item
		newItem := CartItem{
			ID:        primitive.NewObjectID(),
			ProductID: productID,
			Product:   product,
			Quantity:  requestItem.Quantity,
			Size:      requestItem.Size,
			Color:     requestItem.Color,
			Price:     product.Price,
		}
		cart.Items = append(cart.Items, newItem)
	}

	cart.UpdatedAt = time.Now()

	// Update or insert cart
	update := bson.M{
		"$set": cart,
	}
	_, err = cartCollection.UpdateOne(
		ctx,
		bson.M{"userId": userID},
		update,
		options.Update().SetUpsert(true),
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart")
		return
	}

	// Calculate and return updated summary
	summary := calculateCartSummary(cart.Items)

	response := struct {
		Cart    Cart        `json:"cart"`
		Summary CartSummary `json:"summary"`
	}{
		Cart:    cart,
		Summary: summary,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// UpdateCart updates an item's quantity in the cart
func UpdateCart(w http.ResponseWriter, r *http.Request) {
	// Try to get user ID from token first
	userID, err := getUserIDFromToken(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// If no user ID from token, try query parameter
	if userID == "" {
		userID = r.URL.Query().Get("userId")
		if userID == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
			return
		}
	}

	var requestData struct {
		ItemID   string `json:"itemId"`
		Quantity int    `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	itemID, err := primitive.ObjectIDFromHex(requestData.ItemID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("cart")

	// Find cart
	var cart Cart
	err = collection.FindOne(ctx, bson.M{"userId": userID}).Decode(&cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Cart not found")
		return
	}

	// Update item quantity
	itemIndex := -1
	for i, item := range cart.Items {
		if item.ID == itemID {
			itemIndex = i
			break
		}
	}

	if itemIndex == -1 {
		utils.ErrorResponse(w, http.StatusNotFound, "Item not found in cart")
		return
	}

	cart.Items[itemIndex].Quantity = requestData.Quantity
	cart.UpdatedAt = time.Now()

	// Update cart
	update := bson.M{
		"$set": cart,
	}
	_, err = collection.UpdateOne(ctx, bson.M{"userId": userID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart")
		return
	}

	// Calculate and return updated summary
	summary := calculateCartSummary(cart.Items)

	response := struct {
		Cart    Cart        `json:"cart"`
		Summary CartSummary `json:"summary"`
	}{
		Cart:    cart,
		Summary: summary,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// RemoveFromCart removes an item from the cart
func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	// Try to get user ID from token first
	userID, err := getUserIDFromToken(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// If no user ID from token, try query parameter
	if userID == "" {
		userID = r.URL.Query().Get("userId")
		if userID == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
			return
		}
	}

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

	// Find cart
	var cart Cart
	err = collection.FindOne(ctx, bson.M{"userId": userID}).Decode(&cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Cart not found")
		return
	}

	// Remove item
	newItems := make([]CartItem, 0)
	for _, item := range cart.Items {
		if item.ID != itemID {
			newItems = append(newItems, item)
		}
	}

	cart.Items = newItems
	cart.UpdatedAt = time.Now()

	// Update cart
	update := bson.M{
		"$set": cart,
	}
	_, err = collection.UpdateOne(ctx, bson.M{"userId": userID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart")
		return
	}

	// Calculate and return updated summary
	summary := calculateCartSummary(cart.Items)

	response := struct {
		Cart    Cart        `json:"cart"`
		Summary CartSummary `json:"summary"`
	}{
		Cart:    cart,
		Summary: summary,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// calculateCartSummary calculates the cart's financial summary
func calculateCartSummary(items []CartItem) CartSummary {
	var subtotal float64
	for _, item := range items {
		subtotal += item.Price * float64(item.Quantity)
	}

	tax := subtotal * 0.09
	shipping := 0.0
	if len(items) > 0 {
		shipping = 150000 // 150,000 Rials
	}

	return CartSummary{
		Subtotal: subtotal,
		Shipping: shipping,
		Tax:      tax,
		Discount: 0, // Promo code discount would be calculated here
		Total:    subtotal + tax + shipping,
	}
}
