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
const MAX_MAIN_IMAGES = 10

const BaseUploadDir = "./uploads"

// AddProduct handles POST /api/admin/products
func AddProduct(w http.ResponseWriter, r *http.Request) {
	// Debug logging
	fmt.Println("=============== AddProduct handler called ===============")
	fmt.Printf("Content-Type: %s\n", r.Header.Get("Content-Type"))
	fmt.Printf("Content-Length: %s\n", r.Header.Get("Content-Length"))

	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		fmt.Printf("Error parsing multipart form: %v\n", err)
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error parsing multipart form: "+err.Error(),
		)
		return
	}

	// Log the form values for debugging
	fmt.Println("Form values:")
	for key, values := range r.Form {
		fmt.Printf("  %s: %v\n", key, values)
	}

	// Log the file headers for debugging
	fmt.Println("File headers:")
	for key, fileHeaders := range r.MultipartForm.File {
		fmt.Printf("  %s: %d files\n", key, len(fileHeaders))
		for i, header := range fileHeaders {
			fmt.Printf(
				"    File %d: %s, size: %d bytes\n",
				i,
				header.Filename,
				header.Size,
			)
		}
	}

	// --- Form Data ---
	name := r.FormValue("name")
	description := r.FormValue("description")
	priceStr := r.FormValue("price")
	originalPriceStr := r.FormValue("originalPrice")
	tryOnImage := strings.TrimSpace(r.FormValue("tryOnImage"))
	categoryIDsJSON := r.FormValue("categoryIds")
	brandIDStr := r.FormValue("brandId")
	variantsJSON := r.FormValue("variants")
	attributesJSON := r.FormValue("attributes")
	isFlashSaleStr := r.FormValue("isFlashSale")
	isActiveStr := r.FormValue("isActive")
	inStockStr := r.FormValue("inStock")

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

	// Set originalPrice, default to the same as price if not provided
	originalPrice := price
	if originalPriceStr != "" {
		originalPrice, err = strconv.ParseFloat(originalPriceStr, 64)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid originalPrice format")
			return
		}
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

	// Get brand name from database using brandID
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var brand models.Brand
	brandCollection := db.Database.Collection("brands")
	err = brandCollection.FindOne(ctx, bson.M{"_id": brandID}).Decode(&brand)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId: brand not found")
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
	if isActiveStr == "" {
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

	// Parse inStock value, default to true if not provided
	inStock := true
	if inStockStr != "" {
		inStock, err = strconv.ParseBool(inStockStr)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid boolean value for inStock",
			)
			return
		}
	}

	// Generate product ID early to use in filenames
	productID := primitive.NewObjectID()

	// --- Main Image Uploads ---
	var mainImagePaths []string
	var uploadedFilePaths []string // For cleanup on failure
	var tryOnServerPath string

	// Get the image files from the multipart form
	files := r.MultipartForm.File["mainImages"]
	fmt.Printf("Received file upload request. Number of main images: %d\n", len(files))

	if len(files) > MAX_MAIN_IMAGES {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			fmt.Sprintf("Too many main images. Maximum is %d.", MAX_MAIN_IMAGES),
		)
		return
	}

	// Create complete upload path
	uploadDir := filepath.Join(BaseUploadDir, "products", "main")
	fmt.Printf("Upload directory: %s\n", uploadDir)

	// Only proceed with directory creation if we have files to upload
	if len(files) > 0 {
		// Create recursive directory structure
		fmt.Printf("Creating directory: %s\n", uploadDir)
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			fmt.Printf("Error creating upload directory: %v\n", err)
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				fmt.Sprintf("Error creating upload directory %s: %v", uploadDir, err),
			)
			return
		}

		// Verify directory exists
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			fmt.Printf("Directory still doesn't exist after creation: %v\n", err)
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				fmt.Sprintf("Failed to create upload directory %s", uploadDir),
			)
			return
		}

		fmt.Printf("Directory created successfully: %s\n", uploadDir)
	}

	// Process each file
	for i, handler := range files {
		fmt.Printf("Processing file %d: %s\n", i, handler.Filename)

		file, err := handler.Open()
		if err != nil {
			fmt.Printf("Error opening file: %v\n", err)
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				fmt.Sprintf("Error opening file %s: %v", handler.Filename, err),
			)
			return
		}
		defer file.Close()

		// Create a unique filename
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf(
			"%s-%d-%d%s",
			productID.Hex(),
			time.Now().UnixNano(),
			i,
			ext,
		)
		filePath := filepath.Join(uploadDir, filename)
		fmt.Printf("Creating file at: %s\n", filePath)

		// Create the file
		dst, err := os.Create(filePath)
		if err != nil {
			fmt.Printf("Error creating file: %v\n", err)
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				fmt.Sprintf("Error creating file %s: %v", filePath, err),
			)
			return
		}

		// Copy the file contents
		bytesCopied, err := io.Copy(dst, file)
		dst.Close() // Close immediately after writing

		if err != nil {
			fmt.Printf("Error copying file content: %v\n", err)
			_ = os.Remove(filePath) // Clean up partially created file
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				fmt.Sprintf("Error saving file %s: %v", filePath, err),
			)
			return
		}

		fmt.Printf("Successfully wrote %d bytes to %s\n", bytesCopied, filePath)

		// Path that will be stored in the database and used in URLs
		serverPath := filepath.Join("/uploads/products/main", filename)
		mainImagePaths = append(mainImagePaths, serverPath)
		uploadedFilePaths = append(uploadedFilePaths, filePath)

		fmt.Printf("Added image path to product: %s\n", serverPath)
	}

	// After processing main images
	// --- Try-On Image Upload (optional single file) ---
	if headers, ok := r.MultipartForm.File["tryOnImage"]; ok && len(headers) > 0 {
		header := headers[0]
		// Ensure directory exists
		tryDir := filepath.Join(BaseUploadDir, "products", "tryon")
		_ = os.MkdirAll(tryDir, 0755)
		ext := filepath.Ext(header.Filename)
		filename := fmt.Sprintf("%s-%d%s", productID.Hex(), time.Now().UnixNano(), ext)
		filePath := filepath.Join(tryDir, filename)
		file, err := header.Open()
		if err == nil {
			dst, err2 := os.Create(filePath)
			if err2 == nil {
				_, _ = io.Copy(dst, file)
				dst.Close()
				tryOnServerPath = filepath.Join("/uploads/products/tryon", filename)
				uploadedFilePaths = append(uploadedFilePaths, filePath)
			}
			file.Close()
		}
	} else {
		tryOnServerPath = tryOnImage
	}

	product := models.Product{
		ID:            productID,
		Name:          name,
		Description:   description,
		Price:         price,
		OriginalPrice: originalPrice,
		Images:        mainImagePaths,
		TryOnImage:    tryOnServerPath,
		CategoryIDs:   categoryIDs,
		BrandID:       brandID,
		Brand:         brand.Name,
		Variants:      variants,
		Attributes:    attributes,
		IsFlashSale:   isFlashSale,
		IsActive:      isActive,
		InStock:       inStock,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	_, err = collection.InsertOne(ctx, product)
	if err != nil {
		// Clean up uploaded files if DB insert fails
		for _, p := range uploadedFilePaths {
			if err := os.Remove(p); err != nil {
				fmt.Printf("WARN: Failed to clean up file %s: %v\n", p, err)
			}
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			fmt.Sprintf("Error adding product to database: %v", err),
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

	// Ensure try-on image is not exposed in list
	for i := range products {
		products[i].TryOnImage = ""
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

	// Ensure try-on image is not exposed in list
	for i := range products {
		products[i].TryOnImage = ""
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

	// Ensure try-on image is not exposed in list
	for i := range products {
		products[i].TryOnImage = ""
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

	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)
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
	var imagesToDelete []string
	var finalImagePaths []string
	var newlyUploadedPaths []string

	// Check content type to determine how to process the request
	contentType := r.Header.Get("Content-Type")

	if strings.Contains(contentType, "application/json") {
		// Handle JSON request
		var productUpdate struct {
			Name          *string                   `json:"name"`
			Description   *string                   `json:"description"`
			Price         *float64                  `json:"price"`
			OriginalPrice *float64                  `json:"originalPrice"`
			CategoryIDs   []string                  `json:"categoryIds"`
			BrandID       *string                   `json:"brandId"`
			Variants      []models.ProductVariant   `json:"variants"`
			Attributes    []models.ProductAttribute `json:"attributes"`
			TryOnImage    *string                   `json:"tryOnImage"`
			IsFlashSale   *bool                     `json:"isFlashSale"`
			IsActive      *bool                     `json:"isActive"`
			InStock       *bool                     `json:"inStock"`
		}

		// Parse JSON request body
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&productUpdate); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid JSON format: "+err.Error(),
			)
			return
		}

		// Update fields only if they are provided in JSON
		if productUpdate.Name != nil {
			update["name"] = *productUpdate.Name
			somethingToUpdate = true
		}
		if productUpdate.Description != nil {
			update["description"] = *productUpdate.Description
			somethingToUpdate = true
		}
		if productUpdate.Price != nil {
			update["price"] = *productUpdate.Price
			somethingToUpdate = true
			
			// Update original price if not explicitly provided
			if productUpdate.OriginalPrice == nil {
				// Only update original price if it was previously equal to price
				if existingProduct.OriginalPrice == existingProduct.Price {
					update["original_price"] = *productUpdate.Price
				}
			}
		}

		if productUpdate.OriginalPrice != nil {
			update["original_price"] = *productUpdate.OriginalPrice
			somethingToUpdate = true
		}

		if len(productUpdate.CategoryIDs) > 0 {
			var categoryIDs []primitive.ObjectID
			for _, idStr := range productUpdate.CategoryIDs {
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
			update["categoryIds"] = categoryIDs
			somethingToUpdate = true
		}

		if productUpdate.BrandID != nil {
			brandID, err := primitive.ObjectIDFromHex(*productUpdate.BrandID)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId format")
				return
			}
			update["brandId"] = brandID

			// Fetch brand name and update it too
			var brand models.Brand
			brandCollection := db.Database.Collection("brands")
			err = brandCollection.FindOne(ctx, bson.M{"_id": brandID}).Decode(&brand)
			if err != nil {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					"Invalid brandId: brand not found",
				)
				return
			}
			update["brand"] = brand.Name

			somethingToUpdate = true
		}

		if len(productUpdate.Variants) > 0 {
			update["variants"] = productUpdate.Variants
			somethingToUpdate = true
		}

		if len(productUpdate.Attributes) > 0 {
			update["attributes"] = productUpdate.Attributes
			somethingToUpdate = true
		}

		if productUpdate.TryOnImage != nil {
			update["try_on_image"] = *productUpdate.TryOnImage
			somethingToUpdate = true
		}

		if productUpdate.IsFlashSale != nil {
			update["is_flash_sale"] = *productUpdate.IsFlashSale
			somethingToUpdate = true
		}

		if productUpdate.IsActive != nil {
			update["is_active"] = *productUpdate.IsActive
			somethingToUpdate = true
		}

		if productUpdate.InStock != nil {
			update["in_stock"] = *productUpdate.InStock
			somethingToUpdate = true
		}

		// Note: Image management is not included in JSON updates,
		// so existing images will remain untouched

	} else if strings.Contains(contentType, "multipart/form-data") {
		// Parse multipart form
		if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Error parsing multipart form: "+err.Error(),
			)
			return
		}

		// Helper to update field if value is provided
		updateIfProvided := func(key string, value string, parseFunc func(string) (interface{}, error)) {
			if value != "" {
				parsedVal, err := parseFunc(value)
				if err != nil {
					utils.ErrorResponse(
						w,
						http.StatusBadRequest,
						fmt.Sprintf("Invalid format for %s: %s", key, err.Error()),
					)
					return
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

			// If original price not provided, check if we should update it too
			originalPriceStr := r.FormValue("originalPrice")
			if originalPriceStr == "" {
				// Only update original price if it was previously equal to price
				if existingProduct.OriginalPrice == existingProduct.Price {
					update["original_price"] = price
				}
			}

			somethingToUpdate = true
		}

		if originalPriceStr := r.FormValue("originalPrice"); originalPriceStr != "" {
			originalPrice, err := strconv.ParseFloat(originalPriceStr, 64)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid originalPrice format")
				return
			}
			update["original_price"] = originalPrice
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
			update["categoryIds"] = categoryIDs
			somethingToUpdate = true
		}

		if brandIDStr := r.FormValue("brandId"); brandIDStr != "" {
			brandID, err := primitive.ObjectIDFromHex(brandIDStr)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId format")
				return
			}
			update["brandId"] = brandID

			// Fetch brand name and update it too
			var brand models.Brand
			brandCollection := db.Database.Collection("brands")
			err = brandCollection.FindOne(ctx, bson.M{"_id": brandID}).Decode(&brand)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid brandId: brand not found")
				return
			}
			update["brand"] = brand.Name

			somethingToUpdate = true
		}

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

		if inStockStr := r.FormValue("inStock"); inStockStr != "" {
			inStock, err := strconv.ParseBool(inStockStr)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid inStock format")
				return
			}
			update["in_stock"] = inStock
			somethingToUpdate = true
		}

		if tryOnImage := r.FormValue("tryOnImage"); tryOnImage != "" {
			update["try_on_image"] = tryOnImage
			somethingToUpdate = true
		}

		// Process existing images to keep
		existingImagePathsJSON := r.FormValue("existingImagePaths")
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
			for _, p := range existingPathsToKeep {
				if strings.HasPrefix(p, "/uploads/products/main/") {
					finalImagePaths = append(finalImagePaths, p)
				}
			}
		}

		// Process new image uploads
		files := r.MultipartForm.File["mainImages"]
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
			newlyUploadedPaths = append(newlyUploadedPaths, filePath)
			somethingToUpdate = true
		}

		// Determine images to delete
		if existingImagePathsJSON != "" || len(files) > 0 {
			update["images"] = finalImagePaths
			existingImageMap := make(map[string]bool)
			for _, p := range finalImagePaths {
				existingImageMap[p] = true
			}
			for _, oldPath := range existingProduct.Images {
				if !existingImageMap[oldPath] {
					imagesToDelete = append(imagesToDelete, "."+oldPath)
				}
			}
		}

		if tryHeaders := r.MultipartForm.File["tryOnImage"]; len(tryHeaders) > 0 {
			header := tryHeaders[0]
			tryDir := filepath.Join(BaseUploadDir, "products", "tryon")
			_ = os.MkdirAll(tryDir, 0755)
			ext := filepath.Ext(header.Filename)
			filename := fmt.Sprintf("%s-%d%s", productID.Hex(), time.Now().UnixNano(), ext)
			filePath := filepath.Join(tryDir, filename)
			file, err := header.Open()
			if err == nil {
				dst, err2 := os.Create(filePath)
				if err2 == nil {
					_, _ = io.Copy(dst, file)
					dst.Close()
					serverPath := filepath.Join("/uploads/products/tryon", filename)
					update["try_on_image"] = serverPath
					newlyUploadedPaths = append(newlyUploadedPaths, filePath)
					somethingToUpdate = true
					// mark old image for deletion
					if existingProduct.TryOnImage != "" {
						imagesToDelete = append(imagesToDelete, "."+existingProduct.TryOnImage)
					}
				}
				file.Close()
			}
		}

	} else {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unsupported Content-Type. Use application/json or multipart/form-data")
		return
	}

	if !somethingToUpdate {
		utils.JSONResponse(w, http.StatusOK, existingProduct)
		return
	}

	update["updatedAt"] = time.Now()
	updateDoc := bson.M{"$set": update}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": productID}, updateDoc)
	if err != nil {
		// Clean up newly uploaded files if DB update fails
		for _, path := range newlyUploadedPaths {
			if err := os.Remove(path); err != nil {
				fmt.Printf("WARN: Failed to clean up uploaded file %s: %v\n", path, err)
			}
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating product: "+err.Error(),
		)
		return
	}

	// Delete old images from filesystem after successful DB update
	for _, pathToDelete := range imagesToDelete {
		if err := os.Remove(pathToDelete); err != nil {
			fmt.Printf("WARN: Failed to delete old image %s: %v\n", pathToDelete, err)
		}
	}

	// Fetch the updated product to return
	var updatedProduct models.Product
	err = collection.FindOne(ctx, bson.M{"_id": productID}).Decode(&updatedProduct)
	if err != nil {
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
			"is_active": false,
			"updatedAt": time.Now(),
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
