package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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

// Default commission rate for new stores (10%)
const DefaultCommissionRate = 10.0

// generateStoreSlug creates a URL-friendly slug from a store name
func generateStoreSlug(name string) string {
	// Convert to lowercase and replace spaces with hyphens
	slug := strings.ToLower(strings.TrimSpace(name))
	// Remove special characters except hyphens
	reg := regexp.MustCompile(`[^a-z0-9\p{L}-]+`)
	slug = reg.ReplaceAllString(slug, "-")
	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	return slug
}

// RegisterStore handles POST /api/stores/register
// Allows a customer to register as a seller and create a store
func RegisterStore(w http.ResponseWriter, r *http.Request) {
	// Get UserID from context
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

	// Parse multipart form for logo/banner uploads
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing form: "+err.Error())
		return
	}

	// Get form values
	name := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))
	phone := strings.TrimSpace(r.FormValue("phone"))
	email := strings.TrimSpace(r.FormValue("email"))

	// Address fields
	province := strings.TrimSpace(r.FormValue("province"))
	city := strings.TrimSpace(r.FormValue("city"))
	address := strings.TrimSpace(r.FormValue("address"))
	postalCode := strings.TrimSpace(r.FormValue("postal_code"))

	// Bank info
	bankName := strings.TrimSpace(r.FormValue("bank_name"))
	accountNumber := strings.TrimSpace(r.FormValue("account_number"))
	iban := strings.TrimSpace(r.FormValue("iban"))
	accountHolder := strings.TrimSpace(r.FormValue("account_holder"))

	// Validation
	if name == "" || phone == "" || email == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Name, phone, and email are required")
		return
	}
	if city == "" || postalCode == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "City and postal code are required")
		return
	}
	if bankName == "" || accountNumber == "" || iban == "" || accountHolder == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Bank information is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	storeCollection := db.Database.Collection("stores")

	// Check if user already has a store
	var existingUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&existingUser); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	if existingUser.StoreID != nil {
		utils.ErrorResponse(w, http.StatusConflict, "User already has a store")
		return
	}

	// Generate unique slug
	baseSlug := generateStoreSlug(name)
	slug := baseSlug
	counter := 1
	for {
		count, _ := storeCollection.CountDocuments(ctx, bson.M{"slug": slug})
		if count == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}

	storeID := primitive.NewObjectID()

	// Handle logo upload
	var logoPath string
	if files := r.MultipartForm.File["logo"]; len(files) > 0 {
		uploadDir := filepath.Join(BaseUploadDir, "stores", storeID.Hex())
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory")
			return
		}

		file, err := files[0].Open()
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error opening logo file")
			return
		}
		defer file.Close()

		ext := filepath.Ext(files[0].Filename)
		filename := fmt.Sprintf("logo-%d%s", time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating logo file")
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving logo file")
			return
		}
		logoPath = filepath.Join("/uploads/stores", storeID.Hex(), filename)
	}

	// Handle banner upload
	var bannerPath string
	if files := r.MultipartForm.File["banner"]; len(files) > 0 {
		uploadDir := filepath.Join(BaseUploadDir, "stores", storeID.Hex())
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory")
			return
		}

		file, err := files[0].Open()
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error opening banner file")
			return
		}
		defer file.Close()

		ext := filepath.Ext(files[0].Filename)
		filename := fmt.Sprintf("banner-%d%s", time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating banner file")
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving banner file")
			return
		}
		bannerPath = filepath.Join("/uploads/stores", storeID.Hex(), filename)
	}

	store := models.Store{
		ID:          storeID,
		OwnerID:     userID,
		Name:        name,
		Slug:        slug,
		Description: description,
		Logo:        logoPath,
		Banner:      bannerPath,
		Phone:       phone,
		Email:       email,
		Address: models.StoreAddress{
			Province:   province,
			City:       city,
			Address:    address,
			PostalCode: postalCode,
		},
		BankInfo: models.StoreBankInfo{
			BankName:      bankName,
			AccountNumber: accountNumber,
			IBAN:          iban,
			AccountHolder: accountHolder,
		},
		Rating:         0,
		ReviewCount:    0,
		ProductCount:   0,
		TotalSales:     0,
		Status:         models.StoreStatusPending,
		IsVerified:     false,
		IsActive:       true,
		CommissionRate: DefaultCommissionRate,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Insert store
	if _, err := storeCollection.InsertOne(ctx, store); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating store: "+err.Error())
		return
	}

	// Update user role to seller and link store
	update := bson.M{
		"$set": bson.M{
			"role":       RoleSeller,
			"store_id":   storeID,
			"updated_at": time.Now(),
		},
	}
	if _, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update); err != nil {
		// Rollback store creation
		storeCollection.DeleteOne(ctx, bson.M{"_id": storeID})
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating user: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, store)
}

// GetStore handles GET /api/stores/{id}
func GetStore(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")

	var store models.Store
	var err error

	// Try to find by ID first, then by slug
	if objID, parseErr := primitive.ObjectIDFromHex(idStr); parseErr == nil {
		err = storeCollection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&store)
	} else {
		err = storeCollection.FindOne(ctx, bson.M{"slug": idStr, "is_active": true}).Decode(&store)
	}

	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Store not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching store")
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, store)
}

// GetMyStore handles GET /api/seller/store
// Returns the authenticated seller's store
func GetMyStore(w http.ResponseWriter, r *http.Request) {
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")

	var store models.Store
	err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "You don't have a store yet")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching store")
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, store)
}


// UpdateStore handles PUT /api/seller/store
func UpdateStore(w http.ResponseWriter, r *http.Request) {
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

	storeCollection := db.Database.Collection("stores")

	// Find the seller's store
	var store models.Store
	if err := storeCollection.FindOne(ctx, bson.M{"owner_id": userID}).Decode(&store); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Store not found")
		return
	}

	// Parse request
	var updateData struct {
		Name        *string             `json:"name"`
		Description *string             `json:"description"`
		Phone       *string             `json:"phone"`
		Email       *string             `json:"email"`
		Address     *models.StoreAddress `json:"address"`
		BankInfo    *models.StoreBankInfo `json:"bank_info"`
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
	if updateData.Phone != nil {
		update["phone"] = *updateData.Phone
	}
	if updateData.Email != nil {
		update["email"] = *updateData.Email
	}
	if updateData.Address != nil {
		update["address"] = *updateData.Address
	}
	if updateData.BankInfo != nil {
		update["bank_info"] = *updateData.BankInfo
	}

	if len(update) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "No fields to update")
		return
	}

	update["updated_at"] = time.Now()

	_, err := storeCollection.UpdateOne(ctx, bson.M{"_id": store.ID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating store")
		return
	}

	// Fetch updated store
	var updatedStore models.Store
	storeCollection.FindOne(ctx, bson.M{"_id": store.ID}).Decode(&updatedStore)

	utils.JSONResponse(w, http.StatusOK, updatedStore)
}

// ListStores handles GET /api/stores
func ListStores(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")

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

	// Only show approved and active stores
	filter := bson.M{
		"is_active": true,
		"status":    models.StoreStatusApproved,
	}

	totalStores, _ := storeCollection.CountDocuments(ctx, filter)

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := storeCollection.Find(ctx, filter, opts)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"data":       []models.Store{},
			"pagination": map[string]interface{}{},
		})
		return
	}

	var stores []models.Store
	if err := cursor.All(ctx, &stores); err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"data":       []models.Store{},
			"pagination": map[string]interface{}{},
		})
		return
	}

	totalPages := int((totalStores + int64(limit) - 1) / int64(limit))

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data": stores,
		"pagination": map[string]interface{}{
			"totalPages":    totalPages,
			"currentPage":   page,
			"totalStores":   totalStores,
		},
	})
}

// GetStoreProducts handles GET /api/stores/{id}/products
func GetStoreProducts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")
	productCollection := db.Database.Collection("products")

	// Find store
	var store models.Store
	var err error

	if objID, parseErr := primitive.ObjectIDFromHex(idStr); parseErr == nil {
		err = storeCollection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&store)
	} else {
		err = storeCollection.FindOne(ctx, bson.M{"slug": idStr, "is_active": true}).Decode(&store)
	}

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Store not found")
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

	filter := bson.M{
		"store_id":  store.ID,
		"is_active": true,
	}

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
			"totalPages":     totalPages,
			"currentPage":    page,
			"totalProducts":  totalProducts,
		},
	})
}

// --- Admin Store Management ---

// AdminListStores handles GET /api/admin/stores
func AdminListStores(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")

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

	filter := bson.M{}
	if statusFilter != "" {
		filter["status"] = statusFilter
	}

	totalStores, _ := storeCollection.CountDocuments(ctx, filter)

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := storeCollection.Find(ctx, filter, opts)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"data":       []models.Store{},
			"pagination": map[string]interface{}{},
		})
		return
	}

	var stores []models.Store
	cursor.All(ctx, &stores)

	totalPages := int((totalStores + int64(limit) - 1) / int64(limit))

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data": stores,
		"pagination": map[string]interface{}{
			"totalPages":   totalPages,
			"currentPage":  page,
			"totalStores":  totalStores,
		},
	})
}

// AdminUpdateStoreStatus handles PUT /api/admin/stores/{id}/status
func AdminUpdateStoreStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	storeID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid store ID")
		return
	}

	var payload struct {
		Status     string `json:"status"`
		IsVerified *bool  `json:"is_verified"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate status
	validStatuses := []string{
		string(models.StoreStatusPending),
		string(models.StoreStatusApproved),
		string(models.StoreStatusRejected),
		string(models.StoreStatusSuspended),
	}
	validStatus := false
	for _, s := range validStatuses {
		if payload.Status == s {
			validStatus = true
			break
		}
	}
	if !validStatus {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid status value")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	storeCollection := db.Database.Collection("stores")

	update := bson.M{
		"status":     payload.Status,
		"updated_at": time.Now(),
	}
	if payload.IsVerified != nil {
		update["is_verified"] = *payload.IsVerified
	}

	result, err := storeCollection.UpdateOne(ctx, bson.M{"_id": storeID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating store status")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Store not found")
		return
	}

	var updatedStore models.Store
	storeCollection.FindOne(ctx, bson.M{"_id": storeID}).Decode(&updatedStore)

	utils.JSONResponse(w, http.StatusOK, updatedStore)
}


// CanBecomeSeller handles GET /api/users/can-become-seller
// Checks if the authenticated user can register as a seller
func CanBecomeSeller(w http.ResponseWriter, r *http.Request) {
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	storeCollection := db.Database.Collection("stores")

	// Check user exists and get their role
	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Check if user already has a store
	storeCount, _ := storeCollection.CountDocuments(ctx, bson.M{"owner_id": userID})

	response := map[string]interface{}{
		"can_become_seller": user.Role == RoleCustomer && storeCount == 0,
		"current_role":      user.Role,
		"has_store":         storeCount > 0,
	}

	if user.Role == RoleSeller {
		response["message"] = "شما قبلاً به عنوان فروشنده ثبت‌نام کرده‌اید"
	} else if storeCount > 0 {
		response["message"] = "شما قبلاً یک فروشگاه دارید"
	} else {
		response["message"] = "شما می‌توانید به عنوان فروشنده ثبت‌نام کنید"
	}

	utils.JSONResponse(w, http.StatusOK, response)
}
