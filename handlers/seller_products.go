package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
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

// AddSellerProduct handles POST /api/seller/products
// Allows sellers to add products to their store
func AddSellerProduct(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Get seller's store
	storeCollection := db.Database.Collection("stores")
	var store models.Store
	if err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store); err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have a store. Please register as a seller first.")
		return
	}

	// Check if store is approved
	if store.Status != models.StoreStatusApproved {
		utils.ErrorResponse(w, http.StatusForbidden, "Your store is not approved yet")
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing form: "+err.Error())
		return
	}

	// Get form values
	name := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))
	priceStr := r.FormValue("price")
	originalPriceStr := r.FormValue("originalPrice")
	categoryIDsJSON := r.FormValue("categoryIds")
	brandIDStr := r.FormValue("brandId")
	collection := strings.TrimSpace(r.FormValue("collection"))
	variantsJSON := r.FormValue("variants")
	attributesJSON := r.FormValue("attributes")
	inStockStr := r.FormValue("inStock")

	// Validation
	if name == "" || priceStr == "" || categoryIDsJSON == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Name, price, and categoryIds are required")
		return
	}

	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil || price <= 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid price")
		return
	}

	originalPrice := price
	if originalPriceStr != "" {
		originalPrice, _ = strconv.ParseFloat(originalPriceStr, 64)
	}

	// Parse category IDs
	var categoryIDs []primitive.ObjectID
	var tempCategoryIDs []string
	if err := json.Unmarshal([]byte(categoryIDsJSON), &tempCategoryIDs); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid categoryIds format")
		return
	}
	for _, idStr := range tempCategoryIDs {
		objID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID: "+idStr)
			return
		}
		categoryIDs = append(categoryIDs, objID)
	}

	// Parse brand ID (optional for sellers)
	var brandID primitive.ObjectID
	var brandName string
	if brandIDStr != "" {
		brandID, err = primitive.ObjectIDFromHex(brandIDStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId format")
			return
		}
		// Get brand name
		var brand models.Brand
		brandCollection := db.Database.Collection("brands")
		if err := brandCollection.FindOne(ctx, bson.M{"_id": brandID}).Decode(&brand); err == nil {
			brandName = brand.Name
		}
	}

	// Validate collection
	if collection != "" {
		validCollections := []string{"بهار", "تابستان", "پاییز", "زمستان"}
		valid := false
		for _, vc := range validCollections {
			if collection == vc {
				valid = true
				break
			}
		}
		if !valid {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid collection value")
			return
		}
	}

	// Parse variants
	var variants []models.ProductVariant
	if variantsJSON != "" {
		if err := json.Unmarshal([]byte(variantsJSON), &variants); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid variants format")
			return
		}
	}

	// Parse attributes
	var attributes []models.ProductAttribute
	if attributesJSON != "" {
		if err := json.Unmarshal([]byte(attributesJSON), &attributes); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid attributes format")
			return
		}
	}

	inStock := true
	if inStockStr != "" {
		inStock, _ = strconv.ParseBool(inStockStr)
	}

	productID := primitive.NewObjectID()

	// Handle main images upload
	var mainImagePaths []string
	files := r.MultipartForm.File["mainImages"]
	if len(files) > 0 {
		uploadDir := filepath.Join(BaseUploadDir, "products", "main")
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory")
			return
		}

		for i, handler := range files {
			file, err := handler.Open()
			if err != nil {
				continue
			}

			ext := filepath.Ext(handler.Filename)
			filename := fmt.Sprintf("%s-%d-%d%s", productID.Hex(), time.Now().UnixNano(), i, ext)
			filePath := filepath.Join(uploadDir, filename)

			dst, err := os.Create(filePath)
			if err != nil {
				file.Close()
				continue
			}

			io.Copy(dst, file)
			dst.Close()
			file.Close()

			serverPath := filepath.Join("/uploads/products/main", filename)
			mainImagePaths = append(mainImagePaths, serverPath)
		}
	}

	product := models.Product{
		ID:            productID,
		Name:          name,
		Description:   description,
		Price:         price,
		OriginalPrice: originalPrice,
		Images:        mainImagePaths,
		CategoryIDs:   categoryIDs,
		BrandID:       brandID,
		Brand:         brandName,
		Collection:    collection,
		Variants:      variants,
		Attributes:    attributes,
		IsFlashSale:   false,
		IsActive:      true,
		InStock:       inStock,
		StoreID:       store.ID,
		StoreName:     store.Name,
		SellerID:      userID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	productCollection := db.Database.Collection("products")
	if _, err := productCollection.InsertOne(ctx, product); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating product")
		return
	}

	// Update store product count
	storeCollection.UpdateOne(ctx, bson.M{"_id": store.ID}, bson.M{
		"$inc": bson.M{"product_count": 1},
		"$set": bson.M{"updated_at": time.Now()},
	})

	utils.JSONResponse(w, http.StatusCreated, product)
}

// ListSellerProducts handles GET /api/seller/products
func ListSellerProducts(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get seller's store
	storeCollection := db.Database.Collection("stores")
	var store models.Store
	if err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store); err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have a store")
		return
	}

	// Pagination
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	skip := (page - 1) * limit

	productCollection := db.Database.Collection("products")
	filter := bson.M{"store_id": store.ID}

	totalProducts, _ := productCollection.CountDocuments(ctx, filter)

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := productCollection.Find(ctx, filter, opts)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"data":       []models.Product{},
			"pagination": map[string]interface{}{},
		})
		return
	}

	var products []models.Product
	cursor.All(ctx, &products)

	totalPages := int((totalProducts + int64(limit) - 1) / int64(limit))

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data": products,
		"pagination": map[string]interface{}{
			"totalPages":    totalPages,
			"currentPage":   page,
			"totalProducts": totalProducts,
		},
	})
}


// UpdateSellerProduct handles PUT /api/seller/products/{id}
func UpdateSellerProduct(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	vars := mux.Vars(r)
	productIDStr := vars["id"]
	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	productCollection := db.Database.Collection("products")

	// Verify product belongs to seller
	var existingProduct models.Product
	if err := productCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&existingProduct); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}

	if existingProduct.SellerID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only update your own products")
		return
	}

	// Parse update payload
	var updateData struct {
		Name          *string                    `json:"name"`
		Description   *string                    `json:"description"`
		Price         *float64                   `json:"price"`
		OriginalPrice *float64                   `json:"originalPrice"`
		CategoryIDs   []string                   `json:"categoryIds"`
		BrandID       *string                    `json:"brandId"`
		Collection    *string                    `json:"collection"`
		Variants      []models.ProductVariant    `json:"variants"`
		Attributes    []models.ProductAttribute  `json:"attributes"`
		IsActive      *bool                      `json:"isActive"`
		InStock       *bool                      `json:"inStock"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	update := bson.M{}

	if updateData.Name != nil {
		update["name"] = *updateData.Name
	}
	if updateData.Description != nil {
		update["description"] = *updateData.Description
	}
	if updateData.Price != nil {
		update["price"] = *updateData.Price
	}
	if updateData.OriginalPrice != nil {
		update["original_price"] = *updateData.OriginalPrice
	}
	if len(updateData.CategoryIDs) > 0 {
		var categoryIDs []primitive.ObjectID
		for _, idStr := range updateData.CategoryIDs {
			if objID, err := primitive.ObjectIDFromHex(idStr); err == nil {
				categoryIDs = append(categoryIDs, objID)
			}
		}
		update["category_ids"] = categoryIDs
	}
	if updateData.BrandID != nil {
		if brandID, err := primitive.ObjectIDFromHex(*updateData.BrandID); err == nil {
			update["brand_id"] = brandID
			// Get brand name
			var brand models.Brand
			brandCollection := db.Database.Collection("brands")
			if err := brandCollection.FindOne(ctx, bson.M{"_id": brandID}).Decode(&brand); err == nil {
				update["brand"] = brand.Name
			}
		}
	}
	if updateData.Collection != nil {
		update["collection"] = *updateData.Collection
	}
	if len(updateData.Variants) > 0 {
		update["variants"] = updateData.Variants
	}
	if len(updateData.Attributes) > 0 {
		update["attributes"] = updateData.Attributes
	}
	if updateData.IsActive != nil {
		update["is_active"] = *updateData.IsActive
	}
	if updateData.InStock != nil {
		update["in_stock"] = *updateData.InStock
	}

	if len(update) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "No fields to update")
		return
	}

	update["updated_at"] = time.Now()

	_, err = productCollection.UpdateOne(ctx, bson.M{"_id": productID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating product")
		return
	}

	var updatedProduct models.Product
	productCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&updatedProduct)

	utils.JSONResponse(w, http.StatusOK, updatedProduct)
}

// DeleteSellerProduct handles DELETE /api/seller/products/{id}
func DeleteSellerProduct(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	vars := mux.Vars(r)
	productIDStr := vars["id"]
	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	productCollection := db.Database.Collection("products")

	// Verify product belongs to seller
	var existingProduct models.Product
	if err := productCollection.FindOne(ctx, bson.M{"_id": productID}).Decode(&existingProduct); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}

	if existingProduct.SellerID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only delete your own products")
		return
	}

	// Soft delete
	_, err = productCollection.UpdateOne(ctx, bson.M{"_id": productID}, bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting product")
		return
	}

	// Update store product count
	storeCollection := db.Database.Collection("stores")
	storeCollection.UpdateOne(ctx, bson.M{"_id": existingProduct.StoreID}, bson.M{
		"$inc": bson.M{"product_count": -1},
		"$set": bson.M{"updated_at": time.Now()},
	})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Product deleted successfully"})
}

// GetSellerOrders handles GET /api/seller/orders
// Returns orders containing products from the seller's store
func GetSellerOrders(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get seller's store
	storeCollection := db.Database.Collection("stores")
	var store models.Store
	if err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store); err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have a store")
		return
	}

	// Pagination
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	statusFilter := r.URL.Query().Get("status")

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	skip := (page - 1) * limit

	orderCollection := db.Database.Collection("orders")

	// Find orders that contain items from this store
	filter := bson.M{
		"items.store_id": store.ID,
		"is_active":      true,
	}
	if statusFilter != "" {
		filter["status"] = statusFilter
	}

	totalOrders, _ := orderCollection.CountDocuments(ctx, filter)

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := orderCollection.Find(ctx, filter, opts)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"data":       []models.Order{},
			"pagination": map[string]interface{}{},
		})
		return
	}

	var orders []models.Order
	cursor.All(ctx, &orders)

	// Filter order items to only show items from this store
	for i := range orders {
		var storeItems []models.OrderItem
		for _, item := range orders[i].Items {
			if item.StoreID == store.ID {
				storeItems = append(storeItems, item)
			}
		}
		orders[i].Items = storeItems
	}

	totalPages := int((totalOrders + int64(limit) - 1) / int64(limit))

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data": orders,
		"pagination": map[string]interface{}{
			"totalPages":   totalPages,
			"currentPage":  page,
			"totalOrders":  totalOrders,
		},
	})
}

// GetSellerDashboard handles GET /api/seller/dashboard
func GetSellerDashboard(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get seller's store
	storeCollection := db.Database.Collection("stores")
	var store models.Store
	if err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store); err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have a store")
		return
	}

	productCollection := db.Database.Collection("products")
	orderCollection := db.Database.Collection("orders")

	// Count active products
	activeProducts, _ := productCollection.CountDocuments(ctx, bson.M{
		"store_id":  store.ID,
		"is_active": true,
	})

	// Count total orders
	totalOrders, _ := orderCollection.CountDocuments(ctx, bson.M{
		"items.store_id": store.ID,
		"is_active":      true,
	})

	// Count pending orders
	pendingOrders, _ := orderCollection.CountDocuments(ctx, bson.M{
		"items.store_id": store.ID,
		"status":         "pending",
		"is_active":      true,
	})

	// Calculate total revenue (simplified - in production, use aggregation)
	cursor, _ := orderCollection.Find(ctx, bson.M{
		"items.store_id": store.ID,
		"payment_status": "paid",
		"is_active":      true,
	})
	var orders []models.Order
	cursor.All(ctx, &orders)

	var totalRevenue float64
	for _, order := range orders {
		for _, item := range order.Items {
			if item.StoreID == store.ID {
				totalRevenue += item.PriceAtPurchase * float64(item.Quantity)
			}
		}
	}

	// Apply commission
	netRevenue := totalRevenue * (1 - store.CommissionRate/100)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"store":           store,
		"activeProducts":  activeProducts,
		"totalOrders":     totalOrders,
		"pendingOrders":   pendingOrders,
		"totalRevenue":    totalRevenue,
		"netRevenue":      netRevenue,
		"commissionRate":  store.CommissionRate,
	})
}
