package handlers

import (
	"context"
	"encoding/json"
	"fmt"
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
	enriched, _, _, _ := enrichCartVariantFromProduct(product, variant)
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
func validateVariantStock(product *models.Product, variant models.CartVariant, requestedQty int) (int, int, error) {
	if strings.TrimSpace(variant.VariantID) == "" {
		return 0, http.StatusBadRequest, fmt.Errorf("رنگ مشخص محصول الزامی است")
	}
	if strings.TrimSpace(variant.Size) == "" {
		return 0, http.StatusBadRequest, fmt.Errorf("سایز محصول الزامی است")
	}

	colorVariant, _, ok := findColorVariantByID(product, variant.VariantID)
	if !ok {
		return 0, http.StatusBadRequest, fmt.Errorf(
			"رنگ انتخاب‌شده برای این محصول یافت نشد",
		)
	}
	if strings.TrimSpace(colorVariant.Color) == "" && strings.TrimSpace(colorVariant.ColorName) == "" {
		return 0, http.StatusBadRequest, fmt.Errorf("این محصول رنگ مشخصی ندارد و قابل افزودن به سبد نیست")
	}

	sizeVariant, _, ok := findSizeVariant(colorVariant, variant.Size)
	if !ok {
		color := canonicalColorValue(colorVariant)
		return 0, http.StatusBadRequest, fmt.Errorf(
			"invalid variant: size '%s' not found for color '%s'",
			variant.Size, color,
		)
	}

	if requestedQty > sizeVariant.Quantity {
		return sizeVariant.Quantity, http.StatusBadRequest, fmt.Errorf(
			"not enough stock. Available: %d, Requested: %d",
			sizeVariant.Quantity, requestedQty,
		)
	}

	return sizeVariant.Quantity, 0, nil
}

// --- End Helper Functions ---

// getUserIDFromToken extracts the user ID from the JWT token in the Authorization header
// This function should return primitive.ObjectID, string for consistency with models.User
func getUserIDFromToken(r *http.Request) (primitive.ObjectID, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return primitive.NilObjectID, nil // Or return a specific error
	}
	parts := strings.Fields(authHeader)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return primitive.NilObjectID, nil // Or return a specific error
	}
	tokenString := parts[1]

	claims, err := ParseToken(tokenString)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if claims.TokenType != TokenTypeAccess || claims.UserID.IsZero() {
		return primitive.NilObjectID, nil
	}
	return claims.UserID, nil
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

		normalizedVariant, _, sizeIdx, variantOK := enrichCartVariantFromProduct(&product, item.Variant)
		if !variantOK || sizeIdx == -1 || !isConcreteCartVariant(normalizedVariant) {
			warnings = append(warnings, fmt.Sprintf("محصول %s با رنگ یا سایز نامعتبر از سبد حذف شد", product.Name))
			continue
		}
		item.Variant = normalizedVariant
		productImage := selectedVariantImage(product, item.Variant.Color, item.Variant.ColorName)

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
// Returns 200 with cart data (even if empty), or 404 if no cart exists
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
		// Return 404 only if no cart exists at all
		// This allows frontend to distinguish between "no cart" and "empty cart"
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	// Return cart even if empty - frontend handles empty cart display
	// This is more RESTful: cart exists but has no items
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
		VariantID string
		Color     string
	}

	mergeMap := make(map[itemKey]*models.CartItem)

	// If an active cart already exists, seed mergeMap with its current items
	if existingErr == nil {
		for _, it := range existingCart.Items {
			var product models.Product
			if err := productsCollection.FindOne(ctx, bson.M{"_id": it.ProductID}).Decode(&product); err != nil {
				continue
			}
			normalizedVariant, _, sizeIdx, ok := enrichCartVariantFromProduct(&product, it.Variant)
			if !ok || sizeIdx == -1 || !isConcreteCartVariant(normalizedVariant) {
				continue
			}
			it.Variant = normalizedVariant
			k := itemKey{
				ProductID: it.ProductID,
				Size:      it.Variant.Size,
				VariantID: it.Variant.VariantID,
				Color:     variantKeyColor(it.Variant),
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
		if strings.TrimSpace(reqItem.Variant.VariantID) == "" || strings.TrimSpace(reqItem.Variant.Size) == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "رنگ مشخص و سایز محصول الزامی است")
			return
		}

		// Enrich variant with ColorName and SKU from product
		enrichedVariant := enrichVariantFromProduct(&productCheck, reqItem.Variant)
		if !isConcreteCartVariant(enrichedVariant) {
			utils.ErrorResponse(w, http.StatusBadRequest, "این محصول رنگ مشخصی ندارد و قابل افزودن به سبد نیست")
			return
		}

		k := itemKey{
			ProductID: productIDObj,
			Size:      enrichedVariant.Size,
			VariantID: enrichedVariant.VariantID,
			Color:     variantKeyColor(enrichedVariant),
		}
		if existing, ok := mergeMap[k]; ok {
			existing.Quantity += reqItem.Quantity // increment quantity
			// Update variant fields in case old cart data was missing ColorName/SKU.
			existing.Variant.Color = enrichedVariant.Color
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
	availableStock, statusCode, err := validateVariantStock(&product, requestData.Variant, requestData.Quantity)
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
			// Auto-create cart if none exists
			cartCollection := db.Database.Collection("carts")
			newCart := models.Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				Items:     []models.CartItem{},
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			if _, insertErr := cartCollection.InsertOne(ctx, newCart); insertErr != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create cart")
				return
			}
			cart = &newCart
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
			return
		}
	}

	// Check if item (product + variant) already exists in cart
	itemIndex := -1
	existingQuantity := 0
	for i, item := range cart.Items {
		if item.ProductID == productID && cartVariantsMatch(item.Variant, enrichedVariant) {
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
		cart.Items[itemIndex].Variant.Color = enrichedVariant.Color
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
		_, statusCode, err := validateVariantStock(&product, requestData.Variant, requestData.Quantity)
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
			emptyCart := models.Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Items:     []models.CartItem{},
			}
			cartResponse, responseErr := prepareCartResponse(ctx, emptyCart)
			if responseErr != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing empty cart response: "+responseErr.Error())
				return
			}
			utils.JSONResponse(w, http.StatusOK, cartResponse)
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
		}
		return
	}

	itemIndex := -1
	for i, item := range cart.Items {
		if item.ProductID == productID && cartVariantsMatch(item.Variant, requestData.Variant) {
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
// Expected query params: productId, variantSize, variantColor, variantColorName
func RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, err.Error())
		return
	}

	queryParams := r.URL.Query()
	productIDStr := queryParams.Get("productId")
	variantSize := queryParams.Get("variantSize")
	variantID := queryParams.Get("variantId")
	variantColor := queryParams.Get("variantColor")
	variantColorName := queryParams.Get("variantColorName")

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
			emptyCart := models.Cart{
				ID:        primitive.NewObjectID(),
				UserID:    userID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Items:     []models.CartItem{},
			}
			cartResponse, responseErr := prepareCartResponse(ctx, emptyCart)
			if responseErr != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing empty cart response: "+responseErr.Error())
				return
			}
			utils.JSONResponse(w, http.StatusOK, cartResponse)
		} else {
			utils.ErrorResponse(w, statusCode, err.Error())
		}
		return
	}

	itemFoundAndRemoved := false
	newItems := []models.CartItem{}
	requestedVariant := models.CartVariant{
		VariantID: variantID,
		Size:      variantSize,
		Color:     variantColor,
		ColorName: variantColorName,
	}
	for _, item := range cart.Items {
		if item.ProductID == productID && cartVariantsMatch(item.Variant, requestedVariant) {
			itemFoundAndRemoved = true
			// Skip this item to remove it
		} else {
			newItems = append(newItems, item)
		}
	}

	if !itemFoundAndRemoved {
		// DELETE is idempotent: the requested item is already absent from the
		// server cart, so return the authoritative cart instead of making a
		// stale client item impossible to remove.
		cartResponse, responseErr := prepareCartResponse(ctx, *cart)
		if responseErr != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error preparing cart response: "+responseErr.Error())
			return
		}
		utils.JSONResponse(w, http.StatusOK, cartResponse)
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
	return calculateSummaryFromSubtotal(subtotal, len(items) > 0)
}

// calculateSummaryFromSubtotal derives the full cart financial summary from a known subtotal.
func calculateSummaryFromSubtotal(subtotal float64, hasItems bool) CartSummary {
	tax := subtotal * 0.10
	shipping := 0.0
	if hasItems {
		shipping = 150000
	}

	return CartSummary{
		Subtotal: subtotal,
		Shipping: shipping,
		Tax:      tax,
		Discount: 0,
		Total:    subtotal + tax + shipping,
	}
}

// --- Admin Cart Management ---

// AdminCartItemSummary represents a single populated cart item for the admin cart list/detail view.
type AdminCartItemSummary struct {
	ProductID primitive.ObjectID `json:"product_id"`
	Name      string             `json:"name"`
	Image     string             `json:"image,omitempty"`
	Price     float64            `json:"price"`
	Variant   models.CartVariant `json:"variant"`
	Quantity  int                `json:"quantity"`
}

// AdminCartResponse represents a cart with populated user and item details for the admin panel.
type AdminCartResponse struct {
	ID              primitive.ObjectID     `json:"id"`
	UserID          primitive.ObjectID     `json:"user_id"`
	UserName        string                 `json:"user_name,omitempty"`
	UserPhone       string                 `json:"user_phone,omitempty"`
	UserEmail       string                 `json:"user_email,omitempty"`
	Items           []AdminCartItemSummary `json:"items"`
	ItemCount       int                    `json:"item_count"`
	Summary         CartSummary            `json:"summary"`
	IsActive        bool                   `json:"is_active"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	JalaliCreatedAt string                 `json:"jalali_created_at"`
	JalaliUpdatedAt string                 `json:"jalali_updated_at"`
}

// newAdminCartResponse populates product and (optionally) user details for a cart in the admin panel.
func newAdminCartResponse(ctx context.Context, cart models.Cart, user *models.User) AdminCartResponse {
	productsCollection := db.Database.Collection("products")

	items := make([]AdminCartItemSummary, 0, len(cart.Items))
	var subtotal float64
	for _, item := range cart.Items {
		var product models.Product
		if err := productsCollection.FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			continue // Product no longer exists, skip it from the summary
		}
		productImage := selectedVariantImage(product, item.Variant.Color, item.Variant.ColorName)
		items = append(items, AdminCartItemSummary{
			ProductID: product.ID,
			Name:      product.Name,
			Image:     productImage,
			Price:     product.Price,
			Variant:   item.Variant,
			Quantity:  item.Quantity,
		})
		subtotal += product.Price * float64(item.Quantity)
	}

	resp := AdminCartResponse{
		ID:              cart.ID,
		UserID:          cart.UserID,
		Items:           items,
		ItemCount:       len(items),
		Summary:         calculateSummaryFromSubtotal(subtotal, len(items) > 0),
		IsActive:        cart.IsActive,
		CreatedAt:       cart.CreatedAt,
		UpdatedAt:       cart.UpdatedAt,
		JalaliCreatedAt: utils.ToJalaliDateString(cart.CreatedAt),
		JalaliUpdatedAt: utils.ToJalaliDateString(cart.UpdatedAt),
	}
	if user != nil {
		resp.UserName = user.Name
		resp.UserPhone = user.Phone
		resp.UserEmail = user.Email
	}
	return resp
}

// AdminListCarts handles GET /api/admin/carts - lists carts with pagination, filtering,
// and populated user + product details. Requires admin authentication.
func AdminListCarts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cartsCollection := db.Database.Collection("carts")
	usersCollection := db.Database.Collection("users")

	// Pagination
	page, err := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if err != nil || limit < 1 {
		limit = 10
	}
	skip := (page - 1) * limit

	// Sorting - defaults to most recently active cart first
	sortField := bson.D{{Key: "updated_at", Value: -1}}
	switch r.URL.Query().Get("sort_by") {
	case "oldest":
		sortField = bson.D{{Key: "updated_at", Value: 1}}
	case "created_desc":
		sortField = bson.D{{Key: "created_at", Value: -1}}
	case "created_asc":
		sortField = bson.D{{Key: "created_at", Value: 1}}
	}

	// Status filter: active (default), inactive, or all
	filter := bson.M{}
	switch r.URL.Query().Get("status") {
	case "inactive":
		filter["is_active"] = false
	case "all":
		// no constraint
	default:
		filter["is_active"] = true
	}

	// Only carts that currently have items
	if r.URL.Query().Get("only_with_items") == "true" {
		filter["items.0"] = bson.M{"$exists": true}
	}

	// Search by owning user's name or phone
	if search := r.URL.Query().Get("search"); search != "" {
		userCursor, findErr := usersCollection.Find(ctx, bson.M{
			"$or": []bson.M{
				{"name": bson.M{"$regex": search, "$options": "i"}},
				{"phone": bson.M{"$regex": search, "$options": "i"}},
			},
		})
		if findErr != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error searching users: "+findErr.Error())
			return
		}
		var matchedUsers []models.User
		if err := userCursor.All(ctx, &matchedUsers); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding users: "+err.Error())
			return
		}
		userIDs := make([]primitive.ObjectID, 0, len(matchedUsers))
		for _, u := range matchedUsers {
			userIDs = append(userIDs, u.ID)
		}
		filter["user_id"] = bson.M{"$in": userIDs}
	}

	findOptions := options.Find().SetSkip(skip).SetLimit(limit).SetSort(sortField)

	cursor, err := cartsCollection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching carts: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var cartsData []models.Cart
	if err := cursor.All(ctx, &cartsData); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding carts: "+err.Error())
		return
	}

	totalCount, err := cartsCollection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting carts: "+err.Error())
		return
	}

	// Batch-fetch the users referenced by this page of carts
	userIDSet := make(map[primitive.ObjectID]bool)
	for _, c := range cartsData {
		userIDSet[c.UserID] = true
	}
	userIDsToFetch := make([]primitive.ObjectID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDsToFetch = append(userIDsToFetch, id)
	}
	usersByID := make(map[primitive.ObjectID]models.User, len(userIDsToFetch))
	if len(userIDsToFetch) > 0 {
		uCursor, uErr := usersCollection.Find(ctx, bson.M{"_id": bson.M{"$in": userIDsToFetch}})
		if uErr != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching users: "+uErr.Error())
			return
		}
		var usersData []models.User
		if err := uCursor.All(ctx, &usersData); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding users: "+err.Error())
			return
		}
		for _, u := range usersData {
			usersByID[u.ID] = u
		}
	}

	responses := make([]AdminCartResponse, 0, len(cartsData))
	for _, cart := range cartsData {
		var userPtr *models.User
		if u, ok := usersByID[cart.UserID]; ok {
			userCopy := u
			userPtr = &userCopy
		}
		responses = append(responses, newAdminCartResponse(ctx, cart, userPtr))
	}

	// Lightweight, pagination-independent stats for the dashboard header
	totalActiveCarts, _ := cartsCollection.CountDocuments(ctx, bson.M{"is_active": true})
	emptyActiveCarts, _ := cartsCollection.CountDocuments(ctx, bson.M{"is_active": true, "items": bson.M{"$size": 0}})

	pagination := map[string]interface{}{
		"currentPage": page,
		"totalPages":  (totalCount + limit - 1) / limit,
		"totalCarts":  totalCount,
		"pageSize":    limit,
	}

	stats := map[string]interface{}{
		"total_carts":      totalActiveCarts,
		"empty_carts":      emptyActiveCarts,
		"carts_with_items": totalActiveCarts - emptyActiveCarts,
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"carts":      responses,
		"pagination": pagination,
		"stats":      stats,
	})
}

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
