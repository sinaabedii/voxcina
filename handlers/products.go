package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"mime/multipart"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_MAIN_IMAGES = 10
const MAX_VARIANT_IMAGES = 5 // Maximum images per variant

const BaseUploadDir = "./uploads"

// processVariantImages handles uploading multiple images for a specific variant
func processVariantImages(
	files []*multipart.FileHeader,
	productID primitive.ObjectID,
	variantIndex int,
	imageType string,
	uploadedFilePaths *[]string,
) ([]string, error) {
	if len(files) > MAX_VARIANT_IMAGES {
		return nil, fmt.Errorf(
			"too many variant images. Maximum is %d",
			MAX_VARIANT_IMAGES,
		)
	}

	var imagePaths []string

	// Create variant-specific upload directory
	uploadDir := filepath.Join(
		BaseUploadDir,
		"products",
		"variants",
		productID.Hex(),
		fmt.Sprintf("variant_%d", variantIndex),
		imageType,
	)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf(
			"error creating variant upload directory %s: %v",
			uploadDir,
			err,
		)
	}

	for i, handler := range files {
		file, err := handler.Open()
		if err != nil {
			return nil, fmt.Errorf(
				"error opening variant image file %s: %v",
				handler.Filename,
				err,
			)
		}
		defer file.Close()

		// Create unique filename
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf(
			"%s-%d-%d-%d%s",
			productID.Hex(),
			variantIndex,
			time.Now().UnixNano(),
			i,
			ext,
		)
		filePath := filepath.Join(uploadDir, filename)

		// Create and save file
		dst, err := os.Create(filePath)
		if err != nil {
			return nil, fmt.Errorf(
				"error creating variant image file %s: %v",
				filePath,
				err,
			)
		}

		bytesCopied, err := io.Copy(dst, file)
		dst.Close()
		if err != nil {
			_ = os.Remove(filePath) // Clean up
			return nil, fmt.Errorf(
				"error saving variant image file %s: %v",
				filePath,
				err,
			)
		}

		// Convert to web path - ensure it starts with /uploads/
		webPath := "/" + filePath
		imagePaths = append(imagePaths, webPath)
		*uploadedFilePaths = append(*uploadedFilePaths, filePath)

		fmt.Printf("Uploaded variant image: %s (%d bytes)\n", webPath, bytesCopied)
	}

	return imagePaths, nil
}

// processVariantTryOnImage handles uploading a try-on image for a specific variant
func processVariantTryOnImage(
	handler *multipart.FileHeader,
	productID primitive.ObjectID,
	variantIndex int,
	uploadedFilePaths *[]string,
) (string, error) {
	file, err := handler.Open()
	if err != nil {
		return "", fmt.Errorf(
			"error opening variant try-on image file %s: %v",
			handler.Filename,
			err,
		)
	}
	defer file.Close()

	// Create variant-specific upload directory for try-on images
	uploadDir := filepath.Join(
		BaseUploadDir,
		"products",
		"variants",
		productID.Hex(),
		fmt.Sprintf("variant_%d", variantIndex),
		"tryon",
	)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf(
			"error creating variant try-on upload directory %s: %v",
			uploadDir,
			err,
		)
	}

	// Create unique filename
	ext := filepath.Ext(handler.Filename)
	filename := fmt.Sprintf(
		"%s-%d-tryon-%d%s",
		productID.Hex(),
		variantIndex,
		time.Now().UnixNano(),
		ext,
	)
	filePath := filepath.Join(uploadDir, filename)

	// Create and save file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf(
			"error creating variant try-on image file %s: %v",
			filePath,
			err,
		)
	}

	bytesCopied, err := io.Copy(dst, file)
	dst.Close()
	if err != nil {
		_ = os.Remove(filePath) // Clean up
		return "", fmt.Errorf(
			"error saving variant try-on image file %s: %v",
			filePath,
			err,
		)
	}

	// Convert to web path - ensure it starts with /uploads/
	webPath := "/" + filePath
	*uploadedFilePaths = append(*uploadedFilePaths, filePath)

	fmt.Printf("Uploaded variant try-on image: %s (%d bytes)\n", webPath, bytesCopied)
	return webPath, nil
}

func processVariantSwatchImage(
	handler *multipart.FileHeader,
	productID primitive.ObjectID,
	variantIndex int,
	uploadedFilePaths *[]string,
) (string, error) {
	file, err := handler.Open()
	if err != nil {
		return "", fmt.Errorf(
			"error opening variant swatch image file %s: %v",
			handler.Filename,
			err,
		)
	}
	defer file.Close()

	uploadDir := filepath.Join(
		BaseUploadDir,
		"products",
		"variants",
		productID.Hex(),
		fmt.Sprintf("variant_%d", variantIndex),
		"swatch",
	)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf(
			"error creating variant swatch upload directory %s: %v",
			uploadDir,
			err,
		)
	}

	ext := filepath.Ext(handler.Filename)
	filename := fmt.Sprintf(
		"%s-%d-swatch-%d%s",
		productID.Hex(),
		variantIndex,
		time.Now().UnixNano(),
		ext,
	)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf(
			"error creating variant swatch image file %s: %v",
			filePath,
			err,
		)
	}

	bytesCopied, err := io.Copy(dst, file)
	dst.Close()
	if err != nil {
		_ = os.Remove(filePath)
		return "", fmt.Errorf(
			"error saving variant swatch image file %s: %v",
			filePath,
			err,
		)
	}

	webPath := "/" + filePath
	*uploadedFilePaths = append(*uploadedFilePaths, filePath)

	fmt.Printf("Uploaded variant swatch image: %s (%d bytes)\n", webPath, bytesCopied)
	return webPath, nil
}

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
	categoryIDsJSON := r.FormValue("categoryIds")
	brandIDStr := r.FormValue("brandId")
	collection := strings.TrimSpace(r.FormValue("collection"))
	gender := strings.TrimSpace(r.FormValue("gender"))
	colorVariantsJSON := r.FormValue("colorVariants") // Changed from variantsJSON
	attributesJSON := r.FormValue("attributes")
	searchMetadataJSON := r.FormValue("searchMetadata")
	isFlashSaleStr := r.FormValue("isFlashSale")
	isActiveStr := r.FormValue("isActive")
	inStockStr := r.FormValue("inStock")

	// Extract name from searchMetadata if name field is empty
	if name == "" && searchMetadataJSON != "" {
		var meta models.ProductSearchMetadata
		if err := json.Unmarshal([]byte(searchMetadataJSON), &meta); err == nil {
			name = meta.NamePersian
			// Also extract description if missing
			if description == "" && meta.DescriptionPersian != "" {
				description = meta.DescriptionPersian
			}
		}
	}

	// Validate collection is one of the allowed seasons
	validCollections := []string{"بهار", "تابستان", "پاییز", "زمستان"}
	if collection != "" {
		valid := false
		for _, validCol := range validCollections {
			if collection == validCol {
				valid = true
				break
			}
		}
		if !valid {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid collection. Must be one of: بهار, تابستان, پاییز, زمستان",
			)
			return
		}
	}

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

	// Ingest per-variant AI metadata (variantAIMetadata[]) — AI-only fields, no admin burden.
	variantAIMetadataJSON := r.FormValue("variantAIMetadata")
	var variantAIMetadataList []models.VariantAIMetadata
	if variantAIMetadataJSON != "" {
		if err := json.Unmarshal([]byte(variantAIMetadataJSON), &variantAIMetadataList); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid variantAIMetadata JSON: "+err.Error())
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

	// Optional AI search metadata (for chatbot/recommender)
	var searchMetadata *models.ProductSearchMetadata
	if searchMetadataJSON != "" {
		var meta models.ProductSearchMetadata
		if err := json.Unmarshal([]byte(searchMetadataJSON), &meta); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid searchMetadata JSON format: "+err.Error(),
			)
			return
		}
		meta.UpdatedAt = time.Now()
		searchMetadata = &meta
	}

	// Generate embedding for AI search (best-effort, non-fatal on error)
	embeddingCtx, embedCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer embedCancel()

	embeddingText := services.BuildProductEmbeddingText(
		name,
		description,
		brand.Name,
		searchMetadata,
	)
	if strings.TrimSpace(embeddingText) != "" {
		if vec, modelName, err := services.GenerateEmbedding(embeddingCtx, embeddingText); err != nil {
			fmt.Printf("Warning: failed to generate product embedding: %v\n", err)
		} else {
			if searchMetadata == nil {
				searchMetadata = &models.ProductSearchMetadata{}
			}
			searchMetadata.EmbeddingVector = vec
			searchMetadata.EmbeddingModel = modelName
			searchMetadata.UpdatedAt = time.Now()
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

	// Process color variant images and try-on images
	var colorVariants []models.ColorVariant
	if colorVariantsJSON != "" {
		if err := json.Unmarshal([]byte(colorVariantsJSON), &colorVariants); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid colorVariants JSON format: "+err.Error(),
			)
			return
		}
	}
	ensureColorVariantIDs(colorVariants)

	// Normalize Persian/Arabic digits in size strings to prevent duplicates
	for i := range colorVariants {
		for j := range colorVariants[i].Sizes {
			colorVariants[i].Sizes[j].Size = utils.NormalizePersianDigits(colorVariants[i].Sizes[j].Size)
		}
	}

	// Process color variant images and try-on images
	for i := range colorVariants {
		colorVariant := &colorVariants[i]

		// Process color variant images (e.g., colorImages_0, colorImages_1, etc.)
		colorImageKey := fmt.Sprintf("colorImages_%d", i)
		if files, exists := r.MultipartForm.File[colorImageKey]; exists {
			colorImagePaths, err := processVariantImages(
				files,
				productID,
				i,
				"images",
				&uploadedFilePaths,
			)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
				return
			}
			colorVariant.Images = append(colorVariant.Images, colorImagePaths...)
		}

		// Process color variant try-on image (e.g., colorTryOn_0, colorTryOn_1, etc.)
		colorTryOnKey := fmt.Sprintf("colorTryOn_%d", i)
		if files, exists := r.MultipartForm.File[colorTryOnKey]; exists &&
			len(files) > 0 {
			tryOnPath, err := processVariantTryOnImage(
				files[0],
				productID,
				i,
				&uploadedFilePaths,
			)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
				return
			}
			colorVariant.TryOnImage = tryOnPath
		}

		// Read try-on garment type for this variant
		garmentTypeKey := fmt.Sprintf("colorTryOnGarmentType_%d", i)
		if gt := r.FormValue(garmentTypeKey); gt != "" {
			colorVariant.TryOnGarmentType = gt
		}

		// Process color variant swatch image (e.g., colorSwatch_0, colorSwatch_1, etc.)
		colorSwatchKey := fmt.Sprintf("colorSwatch_%d", i)
		if files, exists := r.MultipartForm.File[colorSwatchKey]; exists &&
			len(files) > 0 {
			swatchPath, err := processVariantSwatchImage(
				files[0],
				productID,
				i,
				&uploadedFilePaths,
			)
			if err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
				return
			}
			colorVariant.SwatchImage = swatchPath
		}
	}

	product := models.Product{
		ID:             productID,
		Name:           name,
		Description:    description,
		Price:          price,
		OriginalPrice:  originalPrice,
		MainImages:     mainImagePaths, // Changed from Images
		CategoryIDs:    categoryIDs,
		BrandID:        brandID,
		Brand:          brand.Name,
		Collection:     collection,
		ColorVariants:  colorVariants, // Changed from Variants
		Attributes:     attributes,
		IsFlashSale:    isFlashSale,
		IsActive:       isActive,
		InStock:        inStock,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		SearchMetadata: searchMetadata,
	}

	// Attach per-variant AI metadata when the admin supplied it (variantAIMetadata[i]).
	if len(variantAIMetadataList) > 0 {
		for i := range product.ColorVariants {
			if i < len(variantAIMetadataList) && hasVariantAIMetadata(variantAIMetadataList[i]) {
				now := time.Now()
				m := variantAIMetadataList[i]
				// Admin-editable fields: only fall back to the collection/product
				// defaults when the admin left them empty.
				if len(m.Season) == 0 && collection != "" {
					m.Season = []string{collection}
				}
				if m.Gender == "" && gender != "" {
					m.Gender = gender
				}
				m.UpdatedAt = now
				product.ColorVariants[i].AIMetadata = &m
			}
		}
	}

	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	productsCollection := db.Database.Collection("products")
	_, err = productsCollection.InsertOne(ctx, product)
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

	// Best-effort: upsert product embedding into FAISS vector index
	if product.SearchMetadata != nil && len(product.SearchMetadata.EmbeddingVector) > 0 {
		faissClient := services.NewFaissClientFromEnv()
		if faissClient != nil {
			faissCtx, faissCancel := context.WithTimeout(
				context.Background(),
				3*time.Second,
			)
			defer faissCancel()
			if faissErr := faissClient.UpsertProductEmbedding(
				faissCtx,
				product.ID.Hex(),
				product.SearchMetadata.EmbeddingVector,
			); faissErr != nil {
				fmt.Printf(
					"Warning: failed to upsert FAISS embedding for product %s: %v\n",
					product.ID.Hex(),
					faissErr,
				)
			}
		}
	}
	upsertVariantEmbeddings(context.Background(), &product)

	// Best-effort: upsert per-variant embeddings so negotiator search_catalog
	// can run variant-level KNN on this product immediately.
	if len(product.ColorVariants) > 0 {
		faissClient := services.NewFaissClientFromEnv()
		if faissClient != nil {
			vctx, vcancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer vcancel()
			for _, cv := range product.ColorVariants {
				if cv.AIMetadata == nil || len(cv.AIMetadata.EmbeddingVector) == 0 {
					continue
				}
				if vErr := faissClient.UpsertVariantEmbedding(vctx, product.ID.Hex(), cv.VariantID, cv.AIMetadata.EmbeddingVector); vErr != nil {
					fmt.Printf("Warning: failed to upsert FAISS variant embedding %s: %v\n", product.ID.Hex(), vErr)
				}
			}
		}
	}

	utils.JSONResponse(w, http.StatusCreated, product)
}

// ListProducts handles GET /api/products
// Returns paginated color variants as separate items (not full products)
func ListProducts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")

	// Pagination parameters
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 20 // default page size
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	// Build base filter (only active products)
	filter := bson.M{"is_active": true}

	// Optional filters
	if r.URL.Query().Get("is_flash_sale") == "true" {
		filter["is_flash_sale"] = true
	}

	// Filter by in_stock (only products with inventory > 0)
	if r.URL.Query().Get("in_stock") == "true" {
		filter["in_stock"] = true
	}

	// Filter by search term (basic text search on name and description)
	if searchTerm := r.URL.Query().Get("search"); searchTerm != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": searchTerm, "$options": "i"}},
			{"description": bson.M{"$regex": searchTerm, "$options": "i"}},
		}
	}

	// Filter by is_new (for newest products - sort by created_at desc)
	// Note: is_new doesn't filter, it's handled by sorting below

	// Filter by brand name
	if brandName := r.URL.Query().Get("brand"); brandName != "" {
		filter["brand"] = brandName
	}

	// Filter by brand ID
	if brandID := r.URL.Query().Get("brandId"); brandID != "" {
		if oid, err := primitive.ObjectIDFromHex(brandID); err == nil {
			filter["brandId"] = oid
		}
	}

	// Filter by category ID or name (support both "categoryId" and "category" params)
	categoryID := r.URL.Query().Get("categoryId")
	if categoryID == "" {
		categoryID = r.URL.Query().Get("category")
	}
	if categoryID != "" {
		// Try to parse as ObjectID first
		if oid, err := primitive.ObjectIDFromHex(categoryID); err == nil {
			filter["category_ids"] = oid
		} else {
			// If not a valid ObjectID, look up category by name
			categoriesCollection := db.Database.Collection("categories")
			var category models.Category
			err := categoriesCollection.FindOne(ctx, bson.M{"name": categoryID}).Decode(&category)
			if err == nil {
				filter["category_ids"] = category.ID
			}
		}
	}

	// Build find options with sorting
	findOptions := options.Find()

	// Handle sort parameter
	sortParam := r.URL.Query().Get("sort")
	switch sortParam {
	case "newest":
		findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})
	case "price-asc":
		findOptions.SetSort(bson.D{{Key: "price", Value: 1}})
	case "price-desc":
		findOptions.SetSort(bson.D{{Key: "price", Value: -1}})
	case "popular":
		findOptions.SetSort(bson.D{{Key: "review_count", Value: -1}, {Key: "average_rating", Value: -1}})
	case "discount":
		// Sort by discount percentage (original_price - price) / original_price
		// Since MongoDB doesn't easily compute this, sort by original_price desc as proxy
		findOptions.SetSort(bson.D{{Key: "original_price", Value: -1}})
	default:
		// Also support legacy is_new parameter
		if r.URL.Query().Get("is_new") == "true" {
			findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})
		}
	}

	// Fetch all active products matching filters
	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		response := map[string]interface{}{
			"data":       []models.ColorVariantListItem{},
			"pagination": map[string]interface{}{},
		}
		utils.JSONResponse(w, http.StatusOK, response)
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		response := map[string]interface{}{
			"data":       []models.ColorVariantListItem{},
			"pagination": map[string]interface{}{},
		}
		utils.JSONResponse(w, http.StatusOK, response)
		return
	}

	// Expand every matching product into one row per color variant. Each
	// color variant is treated as its own independent "product card" for
	// pagination purposes, matching the product grid where every card is a
	// single color variant - so a page boundary can legitimately land in
	// the middle of one product's variants, same as it can between any two
	// unrelated cards.
	var colorVariantItems []models.ColorVariantListItem
	for _, product := range products {
		for _, colorVariant := range product.ColorVariants {
			// Normalize Persian/Arabic digits in size strings
			for j := range colorVariant.Sizes {
				colorVariant.Sizes[j].Size = utils.NormalizePersianDigits(colorVariant.Sizes[j].Size)
			}
			// Calculate total inventory for this color
			totalInventory := 0
			for _, size := range colorVariant.Sizes {
				totalInventory += size.Quantity
			}

			// Convert ObjectIDs to strings
			categoryIDStrs := make([]string, len(product.CategoryIDs))
			for i, id := range product.CategoryIDs {
				categoryIDStrs[i] = id.Hex()
			}

			// Create list item for this color variant
			item := models.ColorVariantListItem{
				ProductID:      product.ID.Hex(),
				ColorVariant:   colorVariant,
				Name:           product.Name,
				Description:    product.Description,
				Price:          product.Price,
				OriginalPrice:  product.OriginalPrice,
				Brand:          product.Brand,
				BrandID:        product.BrandID.Hex(),
				CategoryIDs:    categoryIDStrs,
				Collection:     product.Collection,
				IsFlashSale:    product.IsFlashSale,
				AverageRating:  product.AverageRating,
				ReviewCount:    product.ReviewCount,
				CreatedAt:      product.CreatedAt,
				TotalInventory: totalInventory,
				InStock:        totalInventory > 0,
			}
			colorVariantItems = append(colorVariantItems, item)
		}
	}

	// Paginate the flattened variant rows so each page holds exactly
	// `limit` cards.
	totalItems := len(colorVariantItems)
	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))

	skip := (page - 1) * limit
	start := skip
	end := skip + limit
	if start > totalItems {
		start = totalItems
	}
	if end > totalItems {
		end = totalItems
	}
	paginatedItems := colorVariantItems[start:end]

	// Determine next/prev pages
	var nextPage *int
	if page < totalPages {
		n := page + 1
		nextPage = &n
	}
	var prevPage *int
	if page > 1 {
		p := page - 1
		prevPage = &p
	}

	type paginationInfo struct {
		TotalPages         int  `json:"totalPages"`
		CurrentPage        int  `json:"currentPage"`
		NextPage           *int `json:"nextPage,omitempty"`
		PrevPage           *int `json:"prevPage,omitempty"`
		TotalItems         int  `json:"totalItems"`         // Total color variant cards (one per color variant)
		TotalColorVariants int  `json:"totalColorVariants"` // Same as totalItems, kept for API compatibility
	}

	type colorVariantsResponse struct {
		Data       []models.ColorVariantListItem `json:"data"`
		Pagination paginationInfo                `json:"pagination"`
	}

	resp := colorVariantsResponse{
		Data: paginatedItems,
		Pagination: paginationInfo{
			TotalPages:         totalPages,
			CurrentPage:        page,
			NextPage:           nextPage,
			PrevPage:           prevPage,
			TotalItems:         totalItems,
			TotalColorVariants: totalItems,
		},
	}

	utils.JSONResponse(w, http.StatusOK, resp)
}

// AdminListProducts handles GET /api/admin/products
// Returns full Product objects (not color variant list items) for admin dashboard
func AdminListProducts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")

	// For admin, show all products including inactive ones
	filter := bson.M{}

	// Optional: filter by active status if requested
	if activeOnly := r.URL.Query().Get("active_only"); activeOnly == "true" {
		filter["is_active"] = true
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching products")
		return
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}

	// Return empty array instead of null
	if products == nil {
		products = []models.Product{}
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// ProductCartUsage reports how many active shopping carts still hold a
// product. The admin product form disables its update button while a product
// sits in a cart, so a shopper's cart cannot change under them.
type ProductCartUsage struct {
	ProductID string `json:"product_id"`
	Carts     int64  `json:"carts"`
}

// GetProductCartUsage handles GET /api/admin/products/{id}/cart-usage
func GetProductCartUsage(w http.ResponseWriter, r *http.Request) {
	productID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID format")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	carts, err := db.Database.Collection("carts").CountDocuments(ctx, bson.M{
		"is_active":        true,
		"items.product_id": productID,
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting carts holding the product: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, ProductCartUsage{ProductID: productID.Hex(), Carts: carts})
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

	// Calculate InStock based on all color variants
	// Also normalize Persian/Arabic digits in size strings
	product.InStock = false
	for i := range product.ColorVariants {
		for j := range product.ColorVariants[i].Sizes {
			size := &product.ColorVariants[i].Sizes[j]
			size.Size = utils.NormalizePersianDigits(size.Size)
			if size.Quantity > 0 {
				product.InStock = true
			}
		}
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

	// Try-on images are now in ColorVariants, no need to hide them here

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
			Name           *string                       `json:"name"`
			Description    *string                       `json:"description"`
			Price          *float64                      `json:"price"`
			OriginalPrice  *float64                      `json:"originalPrice"`
			CategoryIDs    []string                      `json:"categoryIds"`
			BrandID        *string                       `json:"brandId"`
			Collection     *string                       `json:"collection"`
			ColorVariants  []models.ColorVariant         `json:"colorVariants"`
			Attributes     []models.ProductAttribute     `json:"attributes"`
			IsFlashSale    *bool                         `json:"isFlashSale"`
			IsActive       *bool                         `json:"isActive"`
			InStock        *bool                         `json:"inStock"`
			SearchMetadata *models.ProductSearchMetadata `json:"searchMetadata"`
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

		if productUpdate.Collection != nil {
			// Validate collection is one of the allowed seasons
			validCollections := []string{"بهار", "تابستان", "پاییز", "زمستان"}
			valid := false
			for _, validCol := range validCollections {
				if *productUpdate.Collection == validCol {
					valid = true
					break
				}
			}
			if !valid {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					"Invalid collection. Must be one of: بهار, تابستان, پاییز, زمستان",
				)
				return
			}
			update["collection"] = *productUpdate.Collection
			somethingToUpdate = true
		}

		if len(productUpdate.ColorVariants) > 0 {
			preserveColorVariantIDs(productUpdate.ColorVariants, existingProduct.ColorVariants)
			// Normalize Persian/Arabic digits in size strings to prevent duplicates
			for i := range productUpdate.ColorVariants {
				for j := range productUpdate.ColorVariants[i].Sizes {
					productUpdate.ColorVariants[i].Sizes[j].Size = utils.NormalizePersianDigits(productUpdate.ColorVariants[i].Sizes[j].Size)
				}
			}
			update["color_variants"] = productUpdate.ColorVariants
			somethingToUpdate = true
		}

		if len(productUpdate.Attributes) > 0 {
			update["attributes"] = productUpdate.Attributes
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

		if productUpdate.SearchMetadata != nil {
			productUpdate.SearchMetadata.UpdatedAt = time.Now()
			update["search_metadata"] = productUpdate.SearchMetadata
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

		if collectionStr := r.FormValue("collection"); collectionStr != "" {
			// Validate collection is one of the allowed seasons
			validCollections := []string{"بهار", "تابستان", "پاییز", "زمستان"}
			valid := false
			for _, validCol := range validCollections {
				if collectionStr == validCol {
					valid = true
					break
				}
			}
			if !valid {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					"Invalid collection. Must be one of: بهار, تابستان, پاییز, زمستان",
				)
				return
			}
			update["collection"] = collectionStr
			somethingToUpdate = true
		}

		// Note: colorVariants is handled later with image ordering support

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

		if searchMetadataJSON := r.FormValue("searchMetadata"); searchMetadataJSON != "" {
			var meta models.ProductSearchMetadata
			if err := json.Unmarshal([]byte(searchMetadataJSON), &meta); err != nil {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					"Invalid searchMetadata JSON format: "+err.Error(),
				)
				return
			}
			meta.UpdatedAt = time.Now()
			update["search_metadata"] = &meta
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

		// Process main image order (supports reordering, adding, and removing)
		mainImageOrderJSON := r.FormValue("mainImageOrder")
		files := r.MultipartForm.File["mainImages"]

		if mainImageOrderJSON != "" || len(files) > 0 {
			// Parse image order info
			type ImageOrderItem struct {
				IsExisting bool   `json:"isExisting"`
				Path       string `json:"path,omitempty"`
				NewIndex   int    `json:"newIndex"`
			}
			var imageOrder []ImageOrderItem

			if mainImageOrderJSON != "" {
				if err := json.Unmarshal([]byte(mainImageOrderJSON), &imageOrder); err != nil {
					utils.ErrorResponse(
						w,
						http.StatusBadRequest,
						"Invalid mainImageOrder JSON format: "+err.Error(),
					)
					return
				}
			}

			// Upload new files first
			var newFilePaths []string
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
					newFilePaths = append(newFilePaths, serverPath)
					newlyUploadedPaths = append(newlyUploadedPaths, filePath)
				}
			}

			// Build final image paths in the specified order
			newFileIdx := 0
			for _, item := range imageOrder {
				if item.IsExisting && item.Path != "" {
					finalImagePaths = append(finalImagePaths, item.Path)
				} else if !item.IsExisting && newFileIdx < len(newFilePaths) {
					finalImagePaths = append(finalImagePaths, newFilePaths[newFileIdx])
					newFileIdx++
				}
			}

			// If no order info provided but files uploaded, just append new files
			if len(imageOrder) == 0 && len(newFilePaths) > 0 {
				finalImagePaths = append(existingProduct.MainImages, newFilePaths...)
			}

			// Validate total count
			if len(finalImagePaths) > MAX_MAIN_IMAGES {
				utils.ErrorResponse(
					w,
					http.StatusBadRequest,
					fmt.Sprintf("Total main images cannot exceed %d.", MAX_MAIN_IMAGES),
				)
				return
			}

			update["main_images"] = finalImagePaths
			somethingToUpdate = true

			// Determine images to delete
			existingImageMap := make(map[string]bool)
			for _, p := range finalImagePaths {
				existingImageMap[p] = true
			}
			for _, oldPath := range existingProduct.MainImages {
				if !existingImageMap[oldPath] {
					imagesToDelete = append(imagesToDelete, "."+oldPath)
				}
			}
		}

		// Handle color variant images with ordering
		if colorVariantsJSON := r.FormValue("colorVariants"); colorVariantsJSON != "" {
			var colorVariants []models.ColorVariant
			if err := json.Unmarshal([]byte(colorVariantsJSON), &colorVariants); err == nil {
				preserveColorVariantIDs(colorVariants, existingProduct.ColorVariants)
				var variantAIMetadataList []models.VariantAIMetadata
				if metadataJSON := r.FormValue("variantAIMetadata"); metadataJSON != "" {
					if err := json.Unmarshal([]byte(metadataJSON), &variantAIMetadataList); err != nil {
						utils.ErrorResponse(w, http.StatusBadRequest, "Invalid variantAIMetadata JSON: "+err.Error())
						return
					}
				}
				// Normalize Persian/Arabic digits in size strings to prevent duplicates
				for i := range colorVariants {
					for j := range colorVariants[i].Sizes {
						colorVariants[i].Sizes[j].Size = utils.NormalizePersianDigits(colorVariants[i].Sizes[j].Size)
					}
					if i < len(variantAIMetadataList) && hasVariantAIMetadata(variantAIMetadataList[i]) {
						metadata := variantAIMetadataList[i]
						colorVariants[i].AIMetadata = &metadata
					}
				}
				// Process each color variant's images
				for idx := range colorVariants {
					colorImageOrderJSON := r.FormValue(fmt.Sprintf("colorImageOrder_%d", idx))
					colorFiles := r.MultipartForm.File[fmt.Sprintf("colorImages_%d", idx)]

					if colorImageOrderJSON != "" || len(colorFiles) > 0 {
						type ImageOrderItem struct {
							IsExisting bool   `json:"isExisting"`
							Path       string `json:"path,omitempty"`
							NewIndex   int    `json:"newIndex"`
						}
						var colorImageOrder []ImageOrderItem

						if colorImageOrderJSON != "" {
							json.Unmarshal([]byte(colorImageOrderJSON), &colorImageOrder)
						}

						// Upload new color variant files
						var newColorFilePaths []string
						if len(colorFiles) > 0 {
							uploadedPaths, err := processVariantImages(
								colorFiles,
								productID,
								idx,
								"images",
								&newlyUploadedPaths,
							)
							if err != nil {
								utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
								return
							}
							newColorFilePaths = uploadedPaths
						}

						// Build final color image paths in order
						var finalColorPaths []string
						newColorFileIdx := 0
						for _, item := range colorImageOrder {
							if item.IsExisting && item.Path != "" {
								finalColorPaths = append(finalColorPaths, item.Path)
							} else if !item.IsExisting && newColorFileIdx < len(newColorFilePaths) {
								finalColorPaths = append(finalColorPaths, newColorFilePaths[newColorFileIdx])
								newColorFileIdx++
							}
						}

						// If no order but files uploaded, append to existing
						if len(colorImageOrder) == 0 && len(newColorFilePaths) > 0 {
							if idx < len(existingProduct.ColorVariants) {
								finalColorPaths = append(existingProduct.ColorVariants[idx].Images, newColorFilePaths...)
							} else {
								finalColorPaths = newColorFilePaths
							}
						}

						colorVariants[idx].Images = finalColorPaths
					} else if idx < len(existingProduct.ColorVariants) {
						// Keep existing images if no changes
						colorVariants[idx].Images = existingProduct.ColorVariants[idx].Images
					}

					// Handle try-on image
					tryOnFiles := r.MultipartForm.File[fmt.Sprintf("colorTryOn_%d", idx)]
					if len(tryOnFiles) > 0 {
						tryOnPath, err := processVariantTryOnImage(
							tryOnFiles[0],
							productID,
							idx,
							&newlyUploadedPaths,
						)
						if err != nil {
							utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
							return
						}
						colorVariants[idx].TryOnImage = tryOnPath
					} else if idx < len(existingProduct.ColorVariants) {
						// Keep existing try-on image
						colorVariants[idx].TryOnImage = existingProduct.ColorVariants[idx].TryOnImage
					}

					// Read try-on garment type for this variant
					garmentTypeKey := fmt.Sprintf("colorTryOnGarmentType_%d", idx)
					if gt := r.FormValue(garmentTypeKey); gt != "" {
						colorVariants[idx].TryOnGarmentType = gt
					} else if idx < len(existingProduct.ColorVariants) {
						// Keep existing garment type
						colorVariants[idx].TryOnGarmentType = existingProduct.ColorVariants[idx].TryOnGarmentType
					}

					// Handle swatch image
					swatchFiles := r.MultipartForm.File[fmt.Sprintf("colorSwatch_%d", idx)]
					if len(swatchFiles) > 0 {
						swatchPath, err := processVariantSwatchImage(
							swatchFiles[0],
							productID,
							idx,
							&newlyUploadedPaths,
						)
						if err != nil {
							utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
							return
						}
						colorVariants[idx].SwatchImage = swatchPath
					} else if idx < len(existingProduct.ColorVariants) {
						// Keep existing swatch image
						colorVariants[idx].SwatchImage = existingProduct.ColorVariants[idx].SwatchImage
					}
				}

				update["color_variants"] = colorVariants
				somethingToUpdate = true
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

	// Best-effort: upsert (or refresh) embedding in FAISS vector index
	if updatedProduct.SearchMetadata != nil &&
		len(updatedProduct.SearchMetadata.EmbeddingVector) > 0 {
		faissClient := services.NewFaissClientFromEnv()
		if faissClient != nil {
			faissCtx, faissCancel := context.WithTimeout(
				context.Background(),
				3*time.Second,
			)
			defer faissCancel()
			if faissErr := faissClient.UpsertProductEmbedding(
				faissCtx,
				updatedProduct.ID.Hex(),
				updatedProduct.SearchMetadata.EmbeddingVector,
			); faissErr != nil {
				fmt.Printf(
					"Warning: failed to upsert FAISS embedding for product %s: %v\n",
					updatedProduct.ID.Hex(),
					faissErr,
				)
			}
		}
	}
	upsertVariantEmbeddings(context.Background(), &updatedProduct)

	utils.JSONResponse(w, http.StatusOK, updatedProduct)
}

func hasVariantAIMetadata(metadata models.VariantAIMetadata) bool {
	return metadata.ProductTypePersian != "" ||
		metadata.ProductTypeStandard != "" ||
		metadata.MaterialPersian != "" ||
		metadata.StylePersian != "" ||
		metadata.PatternPersian != "" ||
		metadata.FitType != "" ||
		metadata.ColorFamily != "" ||
		metadata.Gender != "" ||
		len(metadata.Season) > 0 ||
		len(metadata.Keywords) > 0 ||
		len(metadata.Tags) > 0 ||
		len(metadata.OccasionTags) > 0
}

// upsertVariantEmbeddings creates one embedding per AI-enriched color variant
// and persists it beside the variant. FAISS receives the same stable
// productID:variantID key, allowing search_catalog to return a color-level hit.
// This is best-effort: product writes remain successful when embeddings or
// FAISS are temporarily unavailable.
func upsertVariantEmbeddings(ctx context.Context, product *models.Product) {
	if product == nil || db.Database == nil {
		return
	}
	workCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	changed := false
	for i := range product.ColorVariants {
		cv := &product.ColorVariants[i]
		if cv.AIMetadata == nil {
			continue
		}
		text := services.BuildVariantEmbeddingText(
			product.Name,
			product.Description,
			product.Brand,
			*cv,
			cv.AIMetadata,
			product.SearchMetadata,
		)
		if strings.TrimSpace(text) == "" {
			continue
		}
		vector, modelName, err := services.GenerateEmbedding(workCtx, text)
		if err != nil {
			fmt.Printf("Warning: failed to generate variant embedding %s/%s: %v\n", product.ID.Hex(), cv.VariantID, err)
			continue
		}
		cv.AIMetadata.EmbeddingVector = vector
		cv.AIMetadata.EmbeddingModel = modelName
		cv.AIMetadata.UpdatedAt = time.Now()
		changed = true
	}

	if changed {
		if _, err := db.Database.Collection("products").UpdateOne(workCtx, bson.M{"_id": product.ID}, bson.M{"$set": bson.M{"color_variants": product.ColorVariants}}); err != nil {
			fmt.Printf("Warning: failed to persist variant embeddings for product %s: %v\n", product.ID.Hex(), err)
		}
	}

	if client := services.NewFaissClientFromEnv(); client != nil {
		for _, cv := range product.ColorVariants {
			if cv.AIMetadata == nil || len(cv.AIMetadata.EmbeddingVector) == 0 {
				continue
			}
			if err := client.UpsertVariantEmbedding(workCtx, product.ID.Hex(), cv.VariantID, cv.AIMetadata.EmbeddingVector); err != nil {
				fmt.Printf("Warning: failed to upsert variant FAISS vector %s/%s: %v\n", product.ID.Hex(), cv.VariantID, err)
			}
		}
	}
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
	err = collection.FindOne(ctx, bson.M{"_id": productID}).
		Decode(&productToDeactivate)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(
				w,
				http.StatusNotFound,
				"Product not found",
			)
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching product: "+err.Error())
		}
		return
	}

	// Check if already inactive
	if !productToDeactivate.IsActive {
		utils.JSONResponse(w, http.StatusOK, map[string]string{
			"message": "Product is already inactive",
		})
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
	for _, imagePath := range productToDeactivate.MainImages {
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

	// Delete color variant images
	for _, colorVariant := range productToDeactivate.ColorVariants {
		for _, vImagePath := range colorVariant.Images {
			serverVFilePath := "." + vImagePath
			if err := os.Remove(serverVFilePath); err != nil {
				fmt.Printf("WARN: Failed to delete color variant image %s: %v\n", serverVFilePath, err)
			}
		}
		// Delete try-on image for this color variant
		if colorVariant.TryOnImage != "" {
			serverTryOnPath := "." + colorVariant.TryOnImage
			if err := os.Remove(serverTryOnPath); err != nil {
				fmt.Printf("WARN: Failed to delete try-on image %s: %v\n", serverTryOnPath, err)
			}
		}
		// Delete swatch image for this color variant
		if colorVariant.SwatchImage != "" {
			serverSwatchPath := "." + colorVariant.SwatchImage
			if err := os.Remove(serverSwatchPath); err != nil {
				fmt.Printf("WARN: Failed to delete swatch image %s: %v\n", serverSwatchPath, err)
			}
		}
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Product deactivated and associated images marked for deletion",
		},
	)
}

// GetProductsByCollection handles GET /api/products/collection/{collectionValue}
func GetProductsByCollection(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	collectionValue := vars["collectionValue"]

	if collectionValue == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Collection value is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	productsCollection := db.Database.Collection("products")

	// Pagination parameters
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 20 // default page size
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	skip := (page - 1) * limit

	// Build filter for collection and active products
	filter := bson.M{
		"collection": collectionValue,
		"is_active":  true,
	}

	// Filter by in_stock (only products with inventory > 0)
	if r.URL.Query().Get("in_stock") == "true" || r.URL.Query().Get("inStockOnly") == "true" {
		filter["in_stock"] = true
	}

	totalProducts, err := productsCollection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting products")
		return
	}

	// Prepare find options (pagination & sorting)
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	// Handle sort parameter (mirrors ListProducts sorting logic)
	sortParam := r.URL.Query().Get("sort")
	switch sortParam {
	case "newest":
		opts.SetSort(bson.D{{Key: "created_at", Value: -1}})
	case "price-asc":
		opts.SetSort(bson.D{{Key: "price", Value: 1}})
	case "price-desc":
		opts.SetSort(bson.D{{Key: "price", Value: -1}})
	case "popular":
		opts.SetSort(bson.D{{Key: "review_count", Value: -1}, {Key: "average_rating", Value: -1}})
	case "discount":
		opts.SetSort(bson.D{{Key: "original_price", Value: -1}})
	default:
		// Default: sort by newest
		opts.SetSort(bson.D{{Key: "created_at", Value: -1}})
	}

	cursor, err := productsCollection.Find(ctx, filter, opts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching products")
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}

	// Expand products into color variant list items (same as ListProducts)
	var colorVariantItems []models.ColorVariantListItem
	for _, product := range products {
		for _, colorVariant := range product.ColorVariants {
			// Normalize Persian/Arabic digits in size strings
			for j := range colorVariant.Sizes {
				colorVariant.Sizes[j].Size = utils.NormalizePersianDigits(colorVariant.Sizes[j].Size)
			}
			// Calculate total inventory for this color
			totalInventory := 0
			for _, size := range colorVariant.Sizes {
				totalInventory += size.Quantity
			}

			// Convert ObjectIDs to strings
			categoryIDStrs := make([]string, len(product.CategoryIDs))
			for i, id := range product.CategoryIDs {
				categoryIDStrs[i] = id.Hex()
			}

			// Create list item for this color variant
			item := models.ColorVariantListItem{
				ProductID:      product.ID.Hex(),
				ColorVariant:   colorVariant,
				Name:           product.Name,
				Description:    product.Description,
				Price:          product.Price,
				OriginalPrice:  product.OriginalPrice,
				Brand:          product.Brand,
				BrandID:        product.BrandID.Hex(),
				CategoryIDs:    categoryIDStrs,
				Collection:     product.Collection,
				IsFlashSale:    product.IsFlashSale,
				AverageRating:  product.AverageRating,
				ReviewCount:    product.ReviewCount,
				CreatedAt:      product.CreatedAt,
				TotalInventory: totalInventory,
				InStock:        totalInventory > 0,
			}
			colorVariantItems = append(colorVariantItems, item)
		}
	}

	totalPages := int(math.Ceil(float64(totalProducts) / float64(limit)))

	// Determine next/prev pages
	var nextPage *int
	if page < totalPages {
		n := page + 1
		nextPage = &n
	}
	var prevPage *int
	if page > 1 {
		p := page - 1
		prevPage = &p
	}

	type paginationInfo struct {
		TotalPages    int   `json:"totalPages"`
		CurrentPage   int   `json:"currentPage"`
		NextPage      *int  `json:"nextPage,omitempty"`
		PrevPage      *int  `json:"prevPage,omitempty"`
		TotalProducts int64 `json:"totalProducts"`
		TotalItems    int64 `json:"totalItems"`
	}

	type collectionResponse struct {
		Data       []models.ColorVariantListItem `json:"data"`
		Pagination paginationInfo                `json:"pagination"`
		Collection string                        `json:"collection"`
	}

	resp := collectionResponse{
		Data: colorVariantItems,
		Pagination: paginationInfo{
			TotalPages:    totalPages,
			CurrentPage:   page,
			NextPage:      nextPage,
			PrevPage:      prevPage,
			TotalProducts: totalProducts,
			TotalItems:    totalProducts,
		},
		Collection: collectionValue,
	}

	utils.JSONResponse(w, http.StatusOK, resp)
}
