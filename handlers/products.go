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

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_MAIN_IMAGES = 5

// AddProduct handles POST /api/admin/products
func AddProduct(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error parsing multipart form: "+err.Error(),
		)
		return
	}

	// --- Form Data ---
	name := r.FormValue("name")
	description := r.FormValue("description")
	priceStr := r.FormValue("price")
	categoryIDsJSON := r.FormValue("categoryIds") // JSON array of strings
	brandIDStr := r.FormValue("brandId")
	variantsJSON := r.FormValue(
		"variants",
	) // JSON array of models.ProductVariant (variant images not handled here yet)
	attributesJSON := r.FormValue("attributes") // JSON array of models.ProductAttribute
	isFlashSaleStr := r.FormValue("isFlashSale")
	isActiveStr := r.FormValue("isActive")

	if name == "" || priceStr == "" || categoryIDsJSON == "" || brandIDStr == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Missing required fields: name, price, categoryIds, brandId",
		)
		return
	}

	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid price format")
		return
	}

	var categoryIDs []primitive.ObjectID
	var tempCategoryIDs []string
	if err := json.Unmarshal([]byte(categoryIDsJSON), &tempCategoryIDs); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid categoryIds JSON format: "+err.Error(),
		)
		return
	}
	for _, idStr := range tempCategoryIDs {
		objID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid ObjectID in categoryIds: "+idStr,
			)
			return
		}
		categoryIDs = append(categoryIDs, objID)
	}

	brandID, err := primitive.ObjectIDFromHex(brandIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId format")
		return
	}

	var variants []models.ProductVariant
	if variantsJSON != "" {
		if err := json.Unmarshal([]byte(variantsJSON), &variants); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid variants JSON format: "+err.Error(),
			)
			return
		}
		// Variant image uploads would be handled here if supported in this step
		// For now, variant.Images will be empty or as provided in JSON (if URLs)
	}

	var attributes []models.ProductAttribute
	if attributesJSON != "" {
		if err := json.Unmarshal([]byte(attributesJSON), &attributes); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid attributes JSON format: "+err.Error(),
			)
			return
		}
	}

	isFlashSale, _ := strconv.ParseBool(isFlashSaleStr)
	isActive, err := strconv.ParseBool(isActiveStr)
	if isActiveStr == "" { // Default to true if not provided
		isActive = true
		err = nil
	}
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid boolean value for isActive",
		)
		return
	}

	// --- Main Image Uploads ---
	var mainImagePaths []string
	files := r.MultipartForm.File["mainImages"]
	if len(files) > MAX_MAIN_IMAGES {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			fmt.Sprintf("Too many main images. Maximum is %d.", MAX_MAIN_IMAGES),
		)
		return
	}

	for _, handler := range files {
		file, err := handler.Open()
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error opening main image file: "+err.Error(),
			)
			return
		}
		defer file.Close()

		uploadDir := "./uploads/products/main"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating main product uploads directory: "+err.Error(),
			)
			return
		}
		// Create a unique filename, e.g., productID-timestamp-originalExt
		// Since productID is not available yet, use a placeholder or timestamp only for now.
		// Better: generate productID first, then use it in filenames.
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf(
			"%d-%s%s",
			time.Now().UnixNano(),
			strings.ReplaceAll(handler.Filename, ext, ""),
			ext,
		)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating main image file on server: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving main image file: "+err.Error(),
			)
			return
		}
		mainImagePaths = append(mainImagePaths, "/uploads/products/main/"+filename)
	}

	product := models.Product{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Description: description,
		Price:       price,
		Images:      mainImagePaths, // Assign uploaded main image paths
		CategoryIDs: categoryIDs,
		BrandID:     brandID,
		Variants:    variants,
		Attributes:  attributes,
		IsFlashSale: isFlashSale,
		IsActive:    isActive,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	_, err = collection.InsertOne(ctx, product)
	if err != nil {
		// Clean up uploaded files if DB insert fails
		for _, p := range mainImagePaths {
			_ = os.Remove("." + p) // Construct server path, ignore error on cleanup
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error adding product to database: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusCreated, product)
}

// ListProducts handles GET /api/products
func ListProducts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")

	// Only fetch active products
	filter := bson.M{"is_active": true}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		// Return empty array instead of error for database connection issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		// Return empty array instead of error for decoding issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	// If no products found, return empty array
	if len(products) == 0 {
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// GetProduct handles GET /api/products/{id}
func GetProduct(w http.ResponseWriter, r *http.Request) {
	// Get ID from URL parameters or query string
	var id string
	if idParam := r.URL.Query().Get("id"); idParam != "" {
		id = idParam
	} else {
		// Try to extract from URL path variable using mux
		vars := mux.Vars(r)
		id = vars["id"]
		if id == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Product ID not provided")
			return
		}
	}

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")

	var product models.Product
	err = collection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).
		Decode(&product)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, product)
}

// SearchProducts handles GET /api/products/search?q=<query>
func SearchProducts(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	filter := bson.M{
		"name":      bson.M{"$regex": query, "$options": "i"},
		"is_active": true,
	}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		// Return empty array instead of error for database connection issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		// Return empty array instead of error for decoding issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	// If no products found, return empty array
	if len(products) == 0 {
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// ProductRecommendations handles GET /api/products/recommendations
func ProductRecommendations(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	filter := bson.M{"is_active": true}
	opts := options.Find().SetSort(bson.M{"price": 1}).SetLimit(5)
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		// Return empty array instead of error for database connection issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		// Return empty array instead of error for decoding issues
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	// If no products found, return empty array
	if len(products) == 0 {
		utils.JSONResponse(w, http.StatusOK, []models.Product{})
		return
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// UpdateProduct handles PUT /api/admin/products/{id}
func UpdateProduct(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Product ID not provided in URL path",
		)
		return
	}

	productID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format")
		return
	}

	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error parsing multipart form: "+err.Error(),
		)
		return
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	) // Increased timeout for potential multiple operations
	defer cancel()

	collection := db.Database.Collection("products")

	// Fetch the existing product
	var existingProduct models.Product
	err = collection.FindOne(ctx, bson.M{"_id": productID}).Decode(&existingProduct)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching product: "+err.Error())
		}
		return
	}

	update := bson.M{}
	somethingToUpdate := false

	// --- Form Data ---
	// Helper to update field if value is provided
	updateIfProvided := func(key string, value string, parseFunc func(string) (interface{}, error)) {
		if value != "" {
			parsedVal, err := parseFunc(value)
			if err != nil {
				// Consider logging this error or returning a more specific bad request
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					fmt.Sprintf("Invalid format for %s: %s", key, err.Error()),
				)
				return // Early exit or collect errors
			}
			update[key] = parsedVal
			somethingToUpdate = true
		}
	}

	stringParser := func(s string) (interface{}, error) { return s, nil }

	updateIfProvided("name", r.FormValue("name"), stringParser)
	updateIfProvided("description", r.FormValue("description"), stringParser)
	if priceStr := r.FormValue("price"); priceStr != "" {
		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid price format")
			return
		}
		update["price"] = price
		somethingToUpdate = true
	}

	if categoryIDsJSON := r.FormValue("categoryIds"); categoryIDsJSON != "" {
		var tempCategoryIDs []string
		if err := json.Unmarshal([]byte(categoryIDsJSON), &tempCategoryIDs); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid categoryIds JSON format: "+err.Error(),
			)
			return
		}
		var categoryIDs []primitive.ObjectID
		for _, idStr := range tempCategoryIDs {
			objID, err := primitive.ObjectIDFromHex(idStr)
			if err != nil {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					"Invalid ObjectID in categoryIds: "+idStr,
				)
				return
			}
			categoryIDs = append(categoryIDs, objID)
		}
		update["category_ids"] = categoryIDs
		somethingToUpdate = true
	}

	if brandIDStr := r.FormValue("brandId"); brandIDStr != "" {
		brandID, err := primitive.ObjectIDFromHex(brandIDStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId format")
			return
		}
		update["brand_id"] = brandID
		somethingToUpdate = true
	}

	// Variants and Attributes: For simplicity, we'll replace them entirely if provided.
	// More complex merging logic could be added if needed.
	if variantsJSON := r.FormValue("variants"); variantsJSON != "" {
		var variants []models.ProductVariant
		if err := json.Unmarshal([]byte(variantsJSON), &variants); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid variants JSON format: "+err.Error(),
			)
			return
		}
		update["variants"] = variants
		somethingToUpdate = true
	}

	if attributesJSON := r.FormValue("attributes"); attributesJSON != "" {
		var attributes []models.ProductAttribute
		if err := json.Unmarshal([]byte(attributesJSON), &attributes); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid attributes JSON format: "+err.Error(),
			)
			return
		}
		update["attributes"] = attributes
		somethingToUpdate = true
	}

	if isFlashSaleStr := r.FormValue("isFlashSale"); isFlashSaleStr != "" {
		isFlashSale, err := strconv.ParseBool(isFlashSaleStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid isFlashSale format")
			return
		}
		update["is_flash_sale"] = isFlashSale
		somethingToUpdate = true
	}

	if isActiveStr := r.FormValue("isActive"); isActiveStr != "" {
		isActive, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid isActive format")
			return
		}
		update["is_active"] = isActive
		somethingToUpdate = true
	}

	// --- Main Image Management ---
	var finalImagePaths []string
	var imagesToDelete []string
	newlyUploadedPaths := []string{}

	// 1. Process existing images to keep
	existingImagePathsJSON := r.FormValue(
		"existingImagePaths",
	) // JSON array of strings (paths)
	if existingImagePathsJSON != "" {
		var existingPathsToKeep []string
		if err := json.Unmarshal([]byte(existingImagePathsJSON), &existingPathsToKeep); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid existingImagePaths JSON format: "+err.Error(),
			)
			return
		}
		// Basic validation: ensure these paths are somewhat sane (e.g., start with /uploads/)
		for _, p := range existingPathsToKeep {
			if strings.HasPrefix(
				p,
				"/uploads/products/main/",
			) { // Check if they are from our main upload dir
				finalImagePaths = append(finalImagePaths, p)
			} else {
				// Potentially log this or return an error if strict path validation is needed
				// For now, we'll just skip non-conforming paths from existingImagePaths
			}
		}
	}

	// 2. Process new image uploads
	files := r.MultipartForm.File["mainImages"] // "mainImages" is the field for new uploads
	if len(finalImagePaths)+len(files) > MAX_MAIN_IMAGES {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			fmt.Sprintf(
				"Total main images (existing + new) cannot exceed %d.",
				MAX_MAIN_IMAGES,
			),
		)
		return
	}

	uploadDir := "./uploads/products/main"
	if len(files) > 0 {
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating main product uploads directory: "+err.Error(),
			)
			return
		}
	}

	for _, handler := range files {
		file, err := handler.Open()
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error opening new main image file: "+err.Error(),
			)
			return
		}
		defer file.Close()

		ext := filepath.Ext(handler.Filename)
		// Use product ID in filename for better organization
		filename := fmt.Sprintf(
			"%s-%d-%s%s",
			productID.Hex(),
			time.Now().UnixNano(),
			strings.ReplaceAll(filepath.Base(handler.Filename), ext, ""),
			ext,
		)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating new main image file on server: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			// Attempt to clean up partially created file
			_ = os.Remove(filePath)
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving new main image file: "+err.Error(),
			)
			return
		}
		serverPath := "/uploads/products/main/" + filename
		finalImagePaths = append(finalImagePaths, serverPath)
		newlyUploadedPaths = append(
			newlyUploadedPaths,
			filePath,
		) // Store full path for potential cleanup on DB error
		somethingToUpdate = true
	}

	// If existingImagePathsJSON was provided OR new files were uploaded, update "images"
	// This ensures "images" is only updated if the client intended to manage images.
	if existingImagePathsJSON != "" || len(files) > 0 {
		update["images"] = finalImagePaths
		// Determine images to delete from the filesystem
		existingImageMap := make(map[string]bool)
		for _, p := range finalImagePaths {
			existingImageMap[p] = true
		}
		for _, oldPath := range existingProduct.Images {
			if !existingImageMap[oldPath] {
				imagesToDelete = append(
					imagesToDelete,
					"."+oldPath,
				) // Add "." for server-side path
			}
		}
	}

	if !somethingToUpdate && len(files) == 0 && existingImagePathsJSON == "" {
		utils.JSONResponse(w, http.StatusOK, existingProduct) // Nothing to update
		return
	}

	update["updated_at"] = time.Now()

	updateDoc := bson.M{"$set": update}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": productID}, updateDoc)
	if err != nil {
		// If DB update fails, attempt to delete newly uploaded files
		for _, p := range newlyUploadedPaths {
			_ = os.Remove(p)
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating product: "+err.Error(),
		)
		return
	}

	// If DB update was successful, delete old images from filesystem
	for _, pathToDelete := range imagesToDelete {
		if err := os.Remove(pathToDelete); err != nil {
			// Log this error, but don't fail the entire request
			// as the main product update was successful.
			fmt.Printf("WARN: Failed to delete old image %s: %v\n", pathToDelete, err)
		}
	}

	// Fetch the updated product to return
	var updatedProduct models.Product
	err = collection.FindOne(ctx, bson.M{"_id": productID}).Decode(&updatedProduct)
	if err != nil {
		// This shouldn't ideally happen if update was successful
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated product: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedProduct)
}

// DeleteProduct handles DELETE /api/admin/products/{id}
func DeleteProduct(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Product ID not provided in URL path",
		)
		return
	}

	productID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")

	// Fetch the product to get its image paths before marking as inactive
	var productToDeactivate models.Product
	err = collection.FindOne(ctx, bson.M{"_id": productID, "is_active": true}).
		Decode(&productToDeactivate)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(
				w,
				http.StatusNotFound,
				"Active product not found or already inactive",
			)
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching product: "+err.Error())
		}
		return
	}

	// Soft delete: Set IsActive to false and update UpdatedAt
	update := bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": productID}, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deactivating product: "+err.Error(),
		)
		return
	}

	if result.ModifiedCount == 0 {
		// This could happen if the product was already inactive or if there was a race condition.
		// Or if the product was deleted between the FindOne and UpdateOne calls.
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Product not found or no changes made (possibly already inactive)",
		)
		return
	}

	// Delete associated main images from the filesystem
	// Note: Variant images are not handled here yet. If variants have their own images stored on the server,
	// that logic would need to be added.
	for _, imagePath := range productToDeactivate.Images {
		serverFilePath := "." + imagePath // Assuming imagePath is like /uploads/products/main/image.jpg
		if err := os.Remove(serverFilePath); err != nil {
			// Log this error, but don't fail the entire request as the product is already deactivated.
			fmt.Printf(
				"WARN: Failed to delete product image %s: %v\n",
				serverFilePath,
				err,
			)
		}
	}

	// Optionally, if variant images were stored on the server and their paths were in productToDeactivate.Variants[*].Images:
	// for _, variant := range productToDeactivate.Variants {
	// 	for _, vImagePath := range variant.Images {
	// 		serverVFilePath := "." + vImagePath
	// 		if err := os.Remove(serverVFilePath); err != nil {
	// 			fmt.Printf("WARN: Failed to delete variant image %s: %v\n", serverVFilePath, err)
	// 		}
	// 	}
	// }

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Product deactivated and associated images marked for deletion",
		},
	)
}
