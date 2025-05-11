package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// ProductResponse is used to structure product details within the cart response.
type ProductResponse struct {
	ID          primitive.ObjectID `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Price       float64            `json:"price"`
	Image       string             `json:"image"` // URL of the main product image
	// Add other fields from models.Product that are needed in cart response
}

// CartItemResponse represents an item in a user's cart for API responses.
type CartItemResponse struct {
	Product   ProductResponse    `json:"product"`
	Variant   models.CartVariant `json:"variant"`
	Quantity  int                `json:"quantity"`
	// Price     float64            `json:"price"` // This would be product.Price * quantity
}

// CartResponse represents the complete cart structure for API responses.
type CartResponse struct {
	ID        primitive.ObjectID `json:"id"`
	UserID    primitive.ObjectID `json:"userId"`
	Items     []CartItemResponse `json:"items"`
	Summary   CartSummary        `json:"summary"`
	CreatedAt time.Time          `json:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt"`
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
// This function should return primitive.ObjectID, string for consistency with models.User
func getUserIDFromToken(r *http.Request) (primitive.ObjectID, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return primitive.NilObjectID, nil // Or return a specific error
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return primitive.NilObjectID, nil // Or return a specific error
	}
	tokenString := parts[1]
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		// Ensure JWT_SECRET is loaded from env or config
		return []byte("137888"), nil // Use the same secret as in auth.go
	})
	if err != nil {
		return primitive.NilObjectID, err
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if userIDStr, ok := claims["user_id"].(string); ok {
			userIDObj, err := primitive.ObjectIDFromHex(userIDStr)
			if err != nil {
				return primitive.NilObjectID, err // Invalid ObjectID format in token
			}
			return userIDObj, nil
		}
	}
	return primitive.NilObjectID, nil // Or a specific error indicating missing claim
}

// prepareCartResponse fetches product details for cart items and constructs the full CartResponse.
func prepareCartResponse(ctx context.Context, cart models.Cart) (CartResponse, error) {
	var responseItems []CartItemResponse
	productsCollection := db.Database.Collection("products")

	for _, item := range cart.Items {
		var product models.Product
		// Make sure ctx is passed to FindOne
		err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				// Product not found, this is a data integrity issue or product was deleted
				// Log and decide whether to skip or return an error for the whole cart
				utils.LogAction("error", fmt.Sprintf("Product with ID %s in cart %s not found in products collection", item.ProductID.Hex(), cart.ID.Hex()))
				// Optionally, skip this item:
				// continue
				// Or, return an error to indicate inconsistent cart data:
				return CartResponse{}, fmt.Errorf("product %s not found, cart data inconsistent", item.ProductID.Hex())
			} 
			return CartResponse{}, fmt.Errorf("error fetching product %s: %w", item.ProductID.Hex(), err)
		}

		productImage := "" // Default image path
		if len(product.Images) > 0 {
			productImage = product.Images[0] // Assuming models.Product.Images is []string
		}

		responseItems = append(responseItems, CartItemResponse{
			Product: ProductResponse{
				ID:          product.ID,
				Name:        product.Name,
				Description: product.Description,
				Price:       product.Price, 
				Image:       productImage,
			},
			Variant:  item.Variant,
			Quantity: item.Quantity,
		})
	}

	summary := calculateCartSummaryInternal(responseItems) // Use the new summary function

	return CartResponse{
		ID:        cart.ID,
		UserID:    cart.UserID,
		Items:     responseItems,
		CreatedAt: cart.CreatedAt,
		UpdatedAt: cart.UpdatedAt,
		Summary:   summary, // Embedding summary directly if CartResponse is updated to include it.
		// For now, the response example in GetCart has Cart and Summary as separate fields.
		// To match that, we would return cartResponse and summary separately, or adjust CartResponse struct.
		// Let's adjust CartResponse to include Summary.
	}, nil
}

// GetCart returns the complete cart for a given user
func GetCart(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID") // Assume AuthMiddleware sets "userID" as primitive.ObjectID
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context (authentication error)")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "User ID in context is of incorrect type")
		return
	}

	if userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID in context (NilObjectID)")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second) // Increased timeout
	defer cancel()

	cartCollection := db.Database.Collection("carts") // Assuming collection name is "carts"
	var cart models.Cart
	// Try to find an existing active cart for the user
	err := cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).Decode(&cart)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Create new active cart if none exists
			cart = models.Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				Items:     []models.CartItem{},
				IsActive:  true, // Ensure new carts are active
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			_, insertErr := cartCollection.InsertOne(ctx, cart)
			if insertErr != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating new cart: "+insertErr.Error())
				return
			}
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching cart: "+err.Error())
			return
		}
	}

	cartResponse, err := prepareCartResponse(ctx, cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing cart response: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, cartResponse)
}

// AddToCart adds or updates an item in the user's cart
func AddToCart(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID") // Assume AuthMiddleware sets "userID" as primitive.ObjectID
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context (authentication error)")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "User ID in context is of incorrect type")
		return
	}
	if userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID in context (NilObjectID)")
		return
	}

	var requestData struct {
		ProductID string             `json:"productId"`
		Variant   models.CartVariant `json:"variant"` // Using models.CartVariant
		Quantity  int                `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if requestData.Quantity <= 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Quantity must be positive")
		return
	}

	productID, err := primitive.ObjectIDFromHex(requestData.ProductID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second) // Increased timeout
	defer cancel()

	// Fetch product to ensure it exists (optional, but good for validation)
	productsCollection := db.Database.Collection("products")
	var product models.Product
	err = productsCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching product: "+err.Error())
		}
		return
	}
	
	// Check stock if applicable (models.Product needs a Stock field)
	// if product.Stock < requestData.Quantity {
	//    utils.ErrorResponse(w, http.StatusBadRequest, "Not enough stock")
	//    return
	// }


	cartCollection := db.Database.Collection("carts")
	var cart models.Cart
	// Fetch the user's active cart
	err = cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).Decode(&cart)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Active cart not found for user. Please initialize cart first via GET /api/cart.")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching active cart: "+err.Error())
		}
		return
	}

	// Check if item (product + variant) already exists in cart
	itemIndex := -1
	for i, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == requestData.Variant.Size && item.Variant.Color == requestData.Variant.Color {
			itemIndex = i
			break
		}
	}

	if itemIndex > -1 {
		// Update quantity of existing item
		cart.Items[itemIndex].Quantity += requestData.Quantity
	} else {
		// Add new item
		cart.Items = append(cart.Items, models.CartItem{
			ProductID: productID,
			Variant:   requestData.Variant,
			Quantity:  requestData.Quantity,
		})
	}
	cart.UpdatedAt = time.Now()

	// No upsert logic needed here, as we require an existing active cart.
	// Update the existing cart.
	update := bson.M{"$set": bson.M{"items": cart.Items, "updated_at": cart.UpdatedAt}}
	_, err = cartCollection.UpdateOne(ctx, bson.M{"_id": cart.ID, "is_active": true}, update)


	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart: "+err.Error())
		return
	}

	// Return the fully populated and updated cart
	finalCartResponse, err := prepareCartResponse(ctx, cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing updated cart response: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, finalCartResponse)
}

// UpdateCart updates an item's quantity in the cart
func UpdateCart(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID") // Assume AuthMiddleware sets "userID" as primitive.ObjectID
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context (authentication error)")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "User ID in context is of incorrect type")
		return
	}
	if userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID in context (NilObjectID)")
		return
	}

	var requestData struct {
		ProductID string             `json:"productId"`
		Variant   models.CartVariant `json:"variant"`
		Quantity  int                `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if requestData.Quantity < 0 { // Allow 0 for removal
		utils.ErrorResponse(w, http.StatusBadRequest, "Quantity cannot be negative")
		return
	}

	productID, err := primitive.ObjectIDFromHex(requestData.ProductID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cartCollection := db.Database.Collection("carts")
	var cart models.Cart
	// Fetch the user's active cart
	if err := cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).Decode(&cart); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Active cart not found for user. Please initialize cart first.")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching active cart: "+err.Error())
		}
		return
	}

	itemIndex := -1
	for i, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == requestData.Variant.Size && item.Variant.Color == requestData.Variant.Color {
			itemIndex = i
			break
		}
	}

	if itemIndex == -1 {
		utils.ErrorResponse(w, http.StatusNotFound, "Item not found in cart")
		return
	}

	if requestData.Quantity == 0 {
		// Remove item if quantity is 0
		cart.Items = append(cart.Items[:itemIndex], cart.Items[itemIndex+1:]...)
	} else {
		// Update quantity
		cart.Items[itemIndex].Quantity = requestData.Quantity
	}
	cart.UpdatedAt = time.Now()

	updateFields := bson.M{
		"items": cart.Items,
		"updated_at": cart.UpdatedAt,
	}
	// If items slice becomes empty, MongoDB might store it as null instead of an empty array depending on driver/library behavior or BSON tags like omitempty on the struct.
	// Ensure it's always at least an empty array if that's desired.
	if len(cart.Items) == 0 {
	    updateFields["items"] = []models.CartItem{}
	}

	_, err = cartCollection.UpdateOne(ctx, bson.M{"_id": cart.ID, "is_active": true}, bson.M{"$set": updateFields})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart: "+err.Error())
		return
	}

	finalCartResponse, err := prepareCartResponse(ctx, cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing updated cart response: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, finalCartResponse)
}

// RemoveFromCart removes an item from the user's cart based on ProductID and Variant from query params.
// Expected query params: productId, variantSize, variantColor
func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID") // Assume AuthMiddleware sets "userID" as primitive.ObjectID
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context (authentication error)")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "User ID in context is of incorrect type")
		return
	}
	if userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid User ID in context (NilObjectID)")
		return
	}

	queryParams := r.URL.Query()
	productIDStr := queryParams.Get("productId")
	variantSize := queryParams.Get("variantSize")
	variantColor := queryParams.Get("variantColor")

	if productIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Missing query parameter: productId")
		return
	}
	// Variant fields (size, color) can be optional if a product doesn't have variants,
	// but for this model (models.CartVariant), they are expected.
	// Adjust if variants can be partial or non-existent for some products.

	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format in query parameter")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cartCollection := db.Database.Collection("carts")
	var cart models.Cart
	// Fetch the user's active cart
	if err := cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).Decode(&cart); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Active cart not found for user. Please initialize cart first.")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching active cart: "+err.Error())
		}
		return
	}

	itemFoundAndRemoved := false
	newItems := []models.CartItem{}
	for _, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == variantSize && item.Variant.Color == variantColor {
			itemFoundAndRemoved = true
			// Skip this item to remove it
		} else {
			newItems = append(newItems, item)
		}
	}

	if !itemFoundAndRemoved {
		utils.ErrorResponse(w, http.StatusNotFound, "Item with specified product ID and variant not found in cart")
		return
	}

	cart.Items = newItems
	cart.UpdatedAt = time.Now()
	
	updateFields := bson.M{
		"items": cart.Items,
		"updated_at": cart.UpdatedAt,
	}
	if len(cart.Items) == 0 {
	    updateFields["items"] = []models.CartItem{}
	}

	_, err = cartCollection.UpdateOne(ctx, bson.M{"_id": cart.ID, "is_active": true}, bson.M{"$set": updateFields})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart after removal: "+err.Error())
		return
	}

	finalCartResponse, err := prepareCartResponse(ctx, cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing updated cart response: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, finalCartResponse)
}

// calculateCartSummaryInternal calculates the cart's financial summary using populated items
func calculateCartSummaryInternal(items []CartItemResponse) CartSummary {
	var subtotal float64
	for _, item := range items {
		subtotal += item.Product.Price * float64(item.Quantity) 
	}

	tax := subtotal * 0.09 
	shipping := 0.0
	if len(items) > 0 {
		shipping = 150000 
	}

	discount := 0.0 

	return CartSummary{
		Subtotal: subtotal,
		Shipping: shipping,
		Tax:      tax,
		Discount: discount, 
		Total:    subtotal + tax + shipping - discount,
	}
}

// --- Admin Cart Management ---

// DeleteCart handles DELETE /api/admin/carts/{cartId} (Soft Delete)
// Requires admin authentication
func DeleteCart(w http.ResponseWriter, r *http.Request) {
	// Admin auth should be handled by middleware.
	vars := mux.Vars(r)
	cartIDStr, ok := vars["cartId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Cart ID not provided in path")
		return
	}
	cartID, err := primitive.ObjectIDFromHex(cartIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Cart ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cartsCollection := db.Database.Collection("carts")

	// Fetch the cart to check its current status
	var cartToDeactivate models.Cart
	if err := cartsCollection.FindOne(ctx, bson.M{"_id": cartID}).Decode(&cartToDeactivate); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Cart not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching cart: "+err.Error())
		}
		return
	}

	if !cartToDeactivate.IsActive {
		utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Cart is already inactive"})
		return
	}

	// Perform soft delete
	updateFields := bson.M{
		"is_active":  false,
		"updated_at": time.Now(),
	}
	updateDoc := bson.M{"$set": updateFields}

	result, err := cartsCollection.UpdateOne(ctx, bson.M{"_id": cartID}, updateDoc)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deactivating cart: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Cart not found for deactivation (race condition?)")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Cart deactivated successfully"})
}
