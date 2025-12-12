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
// Updated to include colorVariants for the new product structure
type ProductResponse struct {
	ID            primitive.ObjectID    `json:"id"`
	Name          string                `json:"name"`
	Description   string                `json:"description"`
	Price         float64               `json:"price"`
	OriginalPrice float64               `json:"originalPrice"`
	MainImages    []string              `json:"mainImages,omitempty"`
	ColorVariants []models.ColorVariant `json:"colorVariants"`
	Brand         string                `json:"brand,omitempty"`
	BrandID       primitive.ObjectID    `json:"brand_id,omitempty"`
	InStock       bool                  `json:"inStock"`
	// Legacy field for backward compatibility
	Image string `json:"image,omitempty"`
}

// CartItemResponse represents an item in a user's cart for API responses.
type CartItemResponse struct {
	Product  ProductResponse    `json:"product"`
	Variant  models.CartVariant `json:"variant"`
	Quantity int                `json:"quantity"`
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
	Warnings  []string           `json:"warnings,omitempty"`
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

// --- Helper Functions for DRY Refactoring ---

// ErrUserNotFound indicates user ID was not found in context
var ErrUserNotFound = fmt.Errorf("user ID not found in context")

// ErrInvalidUserID indicates user ID is invalid (wrong type or NilObjectID)
var ErrInvalidUserID = fmt.Errorf("invalid user ID")

// ErrCartNotFound indicates no active cart was found for the user
var ErrCartNotFound = fmt.Errorf("active cart not found")

// getUserIDFromContext extracts and validates the user ID from the request context.
// Returns the user ID or an error with appropriate HTTP status code.
func getUserIDFromContext(r *http.Request) (primitive.ObjectID, int, error) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		return primitive.NilObjectID, http.StatusUnauthorized, ErrUserNotFound
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, http.StatusInternalServerError, fmt.Errorf("user ID in context is of incorrect type")
	}

	if userID == primitive.NilObjectID {
		return primitive.NilObjectID, http.StatusUnauthorized, ErrInvalidUserID
	}

	return userID, 0, nil
}

// getActiveCartForUser fetches the active cart for a user.
// Returns the cart, or an error with appropriate HTTP status code.
func getActiveCartForUser(ctx context.Context, userID primitive.ObjectID) (*models.Cart, int, error) {
	cartCollection := db.Database.Collection("carts")
	var cart models.Cart

	err := cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).Decode(&cart)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, http.StatusNotFound, ErrCartNotFound
		}
		return nil, http.StatusInternalServerError, fmt.Errorf("error fetching cart: %w", err)
	}

	return &cart, 0, nil
}

// enrichVariantFromProduct finds ColorName and SKU for a variant from the product's ColorVariants.
// Returns an enriched CartVariant with ColorName and SKU populated.
func enrichVariantFromProduct(product *models.Product, variant models.CartVariant) models.CartVariant {
	enriched := models.CartVariant{
		Size:  variant.Size,
		Color: variant.Color,
	}

	for _, colorVariant := range product.ColorVariants {
		if colorVariant.Color == variant.Color {
			enriched.ColorName = colorVariant.ColorName
			for _, sizeVariant := range colorVariant.Sizes {
				if sizeVariant.Size == variant.Size {
					enriched.SKU = sizeVariant.SKU
					break
				}
			}
			break
		}
	}

	return enriched
}

// updateCartAndRespond updates the cart in the database and sends the JSON response.
// Returns an error if the update or response preparation fails.
func updateCartAndRespond(ctx context.Context, w http.ResponseWriter, cart *models.Cart) error {
	cartCollection := db.Database.Collection("carts")

	updateFields := bson.M{
		"items":      cart.Items,
		"updated_at": cart.UpdatedAt,
	}
	// Ensure items is always an array, not null
	if len(cart.Items) == 0 {
		updateFields["items"] = []models.CartItem{}
	}

	_, err := cartCollection.UpdateOne(
		ctx,
		bson.M{"_id": cart.ID, "is_active": true},
		bson.M{"$set": updateFields},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart: "+err.Error())
		return err
	}

	finalCartResponse, err := prepareCartResponse(ctx, *cart)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing cart response: "+err.Error())
		return err
	}

	utils.JSONResponse(w, http.StatusOK, finalCartResponse)
	return nil
}

// validateVariantStock validates that a variant exists and has sufficient stock.
// Returns the available stock and an error if validation fails.
func validateVariantStock(product *models.Product, color, size string, requestedQty int) (int, int, error) {
	for _, colorVariant := range product.ColorVariants {
		if colorVariant.Color == color {
			for _, sizeVariant := range colorVariant.Sizes {
				if sizeVariant.Size == size {
					if requestedQty > sizeVariant.Quantity {
						return sizeVariant.Quantity, http.StatusBadRequest, fmt.Errorf(
							"not enough stock. Available: %d, Requested: %d",
							sizeVariant.Quantity, requestedQty,
						)
					}
					return sizeVariant.Quantity, 0, nil
				}
			}
			// Size not found for this color
			return 0, http.StatusBadRequest, fmt.Errorf(
				"invalid variant: size '%s' not found for color '%s'",
				size, color,
			)
		}
	}
	// Color not found
	return 0, http.StatusBadRequest, fmt.Errorf(
		"invalid variant: color '%s' not found for this product",
		color,
	)
}

// --- End Helper Functions ---

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
	var warnings []string // Collect warnings

	for _, item := range cart.Items {
		var product models.Product
		// Make sure ctx is passed to FindOne
		err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).
			Decode(&product)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				// Product not found, skip this item and log a warning
				msg := fmt.Sprintf(
					"Product with ID %s in cart %s not found, skipping",
					item.ProductID.Hex(),
					cart.ID.Hex(),
				)
				utils.LogAction("warning", msg)
				warnings = append(warnings, msg)
				continue // Skip this item
			}
			return CartResponse{}, fmt.Errorf(
				"error fetching product %s: %w",
				item.ProductID.Hex(),
				err,
			)
		}

		// Get legacy image from MainImages or first ColorVariant for backward compatibility
		productImage := ""
		if len(product.MainImages) > 0 {
			productImage = product.MainImages[0]
		} else if len(product.ColorVariants) > 0 && len(product.ColorVariants[0].Images) > 0 {
			productImage = product.ColorVariants[0].Images[0]
		}

		responseItems = append(responseItems, CartItemResponse{
			Product: ProductResponse{
				ID:            product.ID,
				Name:          product.Name,
				Description:   product.Description,
				Price:         product.Price,
				OriginalPrice: product.OriginalPrice,
				MainImages:    product.MainImages,
				ColorVariants: product.ColorVariants,
				Brand:         product.Brand,
				BrandID:       product.BrandID,
				InStock:       product.InStock,
				Image:         productImage, // Legacy field
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
		Summary:   summary,
		Warnings:  warnings, // Add warnings to response
	}, nil
}

// GetCart returns the complete cart for a given user
func GetCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cart, statusCode, err := getActiveCartForUser(ctx, userID)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	// After successfully decoding the cart, check if it contains any items
	if len(cart.Items) == 0 {
		// Treat an empty cart as non-existent so that the frontend can POST its local items
		utils.ErrorResponse(w, http.StatusNotFound, "Active cart is empty for user")
		return
	}

	cartResponse, err := prepareCartResponse(ctx, *cart)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing cart response: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, cartResponse)
}

// CreateOrReplaceCart handles POST /api/cart when a user logs in with a local cart.
// It deactivates any existing active carts for the user and creates a new active cart
// with the items provided from the frontend's local storage.
func CreateOrReplaceCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	var requestPayload struct {
		Items []struct {
			ProductID string             `json:"productId"`
			Quantity  int                `json:"quantity"`
			Variant   models.CartVariant `json:"variant"`
		} `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestPayload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// If there are no items in the request, it might not make sense to create a new empty cart
	// and deactivate old ones. The frontend already handles not POSTing if localCartItems is empty.
	// However, if an empty items array IS sent, this will proceed to create an empty cart.

	ctx, cancel := context.WithTimeout(
		context.Background(),
		20*time.Second,
	) // Increased timeout for multiple DB ops
	defer cancel()

	cartCollection := db.Database.Collection("carts")
	productsCollection := db.Database.Collection("products")

	// Step 1: Check if there is an existing active cart for the user
	var existingCart models.Cart
	existingErr := cartCollection.FindOne(ctx, bson.M{"user_id": userID, "is_active": true}).
		Decode(&existingCart)

	if existingErr != nil && existingErr != mongo.ErrNoDocuments {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error checking existing cart: "+existingErr.Error(),
		)
		return
	}

	// Helper map to merge quantities by product+variant
	type itemKey struct {
		ProductID primitive.ObjectID
		Size      string
		Color     string
	}

	mergeMap := make(map[itemKey]*models.CartItem)

	// If an active cart already exists, seed mergeMap with its current items
	if existingErr == nil {
		for _, it := range existingCart.Items {
			k := itemKey{
				ProductID: it.ProductID,
				Size:      it.Variant.Size,
				Color:     it.Variant.Color,
			}
			copyItem := it // create copy to avoid referencing loop var
			mergeMap[k] = &copyItem
		}
	}

	// Step 2: Convert request items -> validate -> merge into map
	for _, reqItem := range requestPayload.Items {
		if reqItem.Quantity <= 0 {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				fmt.Sprintf(
					"Quantity for product %s must be positive",
					reqItem.ProductID,
				),
			)
			return
		}
		productIDObj, convErr := primitive.ObjectIDFromHex(reqItem.ProductID)
		if convErr != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				fmt.Sprintf("Invalid product ID format: %s", reqItem.ProductID),
			)
			return
		}

		// Validate product exists and get variant details
		var productCheck models.Product
		if prodErr := productsCollection.FindOne(ctx, bson.M{"_id": productIDObj}).Decode(&productCheck); prodErr != nil {
			if prodErr == mongo.ErrNoDocuments {
				utils.ErrorResponse(
					w,
					http.StatusNotFound,
					fmt.Sprintf("Product with ID %s not found", reqItem.ProductID),
				)
			} else {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error validating product: "+prodErr.Error())
			}
			return
		}

		// Enrich variant with ColorName and SKU from product
		enrichedVariant := enrichVariantFromProduct(&productCheck, reqItem.Variant)

		k := itemKey{
			ProductID: productIDObj,
			Size:      reqItem.Variant.Size,
			Color:     reqItem.Variant.Color,
		}
		if existing, ok := mergeMap[k]; ok {
			existing.Quantity += reqItem.Quantity // increment quantity
			// Update ColorName and SKU
			existing.Variant.ColorName = enrichedVariant.ColorName
			existing.Variant.SKU = enrichedVariant.SKU
		} else {
			mergeMap[k] = &models.CartItem{
				ProductID: productIDObj,
				Variant:   enrichedVariant,
				Quantity:  reqItem.Quantity,
			}
		}
	}

	// Build merged items slice
	mergedItems := make([]models.CartItem, 0, len(mergeMap))
	for _, v := range mergeMap {
		mergedItems = append(mergedItems, *v)
	}

	// Decide whether to insert new cart or update existing
	if existingErr == mongo.ErrNoDocuments {
		// No active cart — create new
		newCart := models.Cart{
			ID:        primitive.NewObjectID(),
			UserID:    userID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Items:     mergedItems,
		}
		if _, err := cartCollection.InsertOne(ctx, newCart); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving new cart: "+err.Error(),
			)
			return
		}
		existingCart = newCart // for response preparation
	} else {
		// Active cart exists — update its items & timestamp
		existingCart.Items = mergedItems
		existingCart.UpdatedAt = time.Now()
		update := bson.M{"$set": bson.M{"items": existingCart.Items, "updated_at": existingCart.UpdatedAt}}
		if _, err := cartCollection.UpdateOne(ctx, bson.M{"_id": existingCart.ID}, update); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating cart: "+err.Error())
			return
		}
	}

	// Prepare and return response
	finalCartResponse, err := prepareCartResponse(ctx, existingCart)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error preparing cart response: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusCreated, finalCartResponse)
}

// AddToCart adds or updates an item in the user's cart
// RENAMING THIS TO AddItemToExistingCart FOR CLARITY
// This handler should be for POST /api/cart/item or similar specific route
func AddItemToExistingCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	var requestData struct {
		ProductID string             `json:"productId"`
		Variant   models.CartVariant `json:"variant"` // Using models.CartVariant
		Quantity  int                `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
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

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	) // Increased timeout
	defer cancel()

	// Fetch product to ensure it exists and validate variant
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

	// Validate that the requested color+size combination exists and has stock
	availableStock, statusCode, err := validateVariantStock(&product, requestData.Variant.Color, requestData.Variant.Size, requestData.Quantity)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	// Enrich variant with ColorName and SKU
	enrichedVariant := enrichVariantFromProduct(&product, requestData.Variant)

	// Fetch the user's active cart
	cart, statusCode, err := getActiveCartForUser(ctx, userID)
	if err != nil {
		if err == ErrCartNotFound {
			utils.ErrorResponse(w, statusCode, "Active cart not found for user. Please create a cart first via POST /api/cart.")
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
		}
		return
	}

	// Check if item (product + variant) already exists in cart
	itemIndex := -1
	existingQuantity := 0
	for i, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == enrichedVariant.Size &&
			item.Variant.Color == enrichedVariant.Color {
			itemIndex = i
			existingQuantity = item.Quantity
			break
		}
	}

	// Check if total quantity (existing + new) exceeds available stock
	totalQuantity := existingQuantity + requestData.Quantity
	if totalQuantity > availableStock {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf(
			"موجودی کافی نیست. موجودی انبار: %d، در سبد خرید: %d، درخواست جدید: %d",
			availableStock, existingQuantity, requestData.Quantity,
		))
		return
	}

	if itemIndex > -1 {
		// Update quantity of existing item
		cart.Items[itemIndex].Quantity = totalQuantity
		// Also update ColorName and SKU in case they were missing before
		cart.Items[itemIndex].Variant.ColorName = enrichedVariant.ColorName
		cart.Items[itemIndex].Variant.SKU = enrichedVariant.SKU
	} else {
		// Add new item with enriched variant
		cart.Items = append(cart.Items, models.CartItem{
			ProductID: productID,
			Variant:   enrichedVariant,
			Quantity:  requestData.Quantity,
		})
	}
	cart.UpdatedAt = time.Now()

	// Update cart and send response
	updateCartAndRespond(ctx, w, cart)
}

// UpdateCart updates an item's quantity in the cart
func UpdateCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	var requestData struct {
		ProductID string             `json:"productId"`
		Variant   models.CartVariant `json:"variant"`
		Quantity  int                `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
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

	// Validate inventory if quantity > 0
	if requestData.Quantity > 0 {
		productsCollection := db.Database.Collection("products")
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&product); err != nil {
			if err == mongo.ErrNoDocuments {
				utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
			} else {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching product: "+err.Error())
			}
			return
		}

		// Validate variant exists and has sufficient stock
		_, statusCode, err := validateVariantStock(&product, requestData.Variant.Color, requestData.Variant.Size, requestData.Quantity)
		if err != nil {
			// Translate error messages to Persian for user-facing errors
			if statusCode == http.StatusBadRequest {
				utils.ErrorResponse(w, statusCode, fmt.Sprintf(
					"موجودی کافی نیست یا تنوع انتخاب شده یافت نشد: %s",
					err.Error(),
				))
			} else {
				utils.ErrorResponse(w, statusCode, err.Error())
			}
			return
		}
	}

	// Fetch the user's active cart
	cart, statusCode, err := getActiveCartForUser(ctx, userID)
	if err != nil {
		if err == ErrCartNotFound {
			utils.ErrorResponse(w, statusCode, "Active cart not found for user. Please create a cart first via POST /api/cart.")
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
		}
		return
	}

	itemIndex := -1
	for i, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == requestData.Variant.Size &&
			item.Variant.Color == requestData.Variant.Color {
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

	// Update cart and send response
	updateCartAndRespond(ctx, w, cart)
}

// RemoveFromCart removes an item from the user's cart based on ProductID and Variant from query params.
// Expected query params: productId, variantSize, variantColor
func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	queryParams := r.URL.Query()
	productIDStr := queryParams.Get("productId")
	variantSize := queryParams.Get("variantSize")
	variantColor := queryParams.Get("variantColor")

	if productIDStr == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Missing query parameter: productId",
		)
		return
	}
	// Variant fields (size, color) can be optional if a product doesn't have variants,
	// but for this model (models.CartVariant), they are expected.
	// Adjust if variants can be partial or non-existent for some products.

	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid product ID format in query parameter",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch the user's active cart
	cart, statusCode, err := getActiveCartForUser(ctx, userID)
	if err != nil {
		if err == ErrCartNotFound {
			utils.ErrorResponse(w, statusCode, "Active cart not found for user. Please create a cart first via POST /api/cart.")
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
		}
		return
	}

	itemFoundAndRemoved := false
	newItems := []models.CartItem{}
	for _, item := range cart.Items {
		if item.ProductID == productID && item.Variant.Size == variantSize &&
			item.Variant.Color == variantColor {
			itemFoundAndRemoved = true
			// Skip this item to remove it
		} else {
			newItems = append(newItems, item)
		}
	}

	if !itemFoundAndRemoved {
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Item with specified product ID and variant not found in cart",
		)
		return
	}

	cart.Items = newItems
	cart.UpdatedAt = time.Now()

	// Update cart and send response
	updateCartAndRespond(ctx, w, cart)
}

// calculateCartSummaryInternal calculates the cart's financial summary using populated items
func calculateCartSummaryInternal(items []CartItemResponse) CartSummary {
	var subtotal float64
	for _, item := range items {
		subtotal += item.Product.Price * float64(item.Quantity)
	}

	tax := subtotal * 0.10
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
		utils.JSONResponse(
			w,
			http.StatusOK,
			map[string]string{"message": "Cart is already inactive"},
		)
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
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deactivating cart: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Cart not found for deactivation (race condition?)",
		)
		return
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Cart deactivated successfully"},
	)
}

// ClearUserCart handles DELETE /api/cart - clears the entire cart for a user
func ClearUserCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the user's active cart
	cart, statusCode, err := getActiveCartForUser(ctx, userID)
	if err != nil {
		if err == ErrCartNotFound {
			// No active cart found - return empty cart response
			emptyCart := models.Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Items:     []models.CartItem{},
			}

			finalCartResponse, err := prepareCartResponse(ctx, emptyCart)
			if err != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing empty cart response: "+err.Error())
				return
			}
			utils.JSONResponse(w, http.StatusOK, finalCartResponse)
			return
		}
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	// Clear the cart items
	cart.Items = []models.CartItem{}
	cart.UpdatedAt = time.Now()

	// Update cart and send response
	updateCartAndRespond(ctx, w, cart)
}
