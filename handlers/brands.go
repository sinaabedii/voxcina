package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	// "encoding/json" //	 Will be needed for POST/PUT
	// "os" // Will be needed for file operations
	// "path/filepath" // Will be needed for file operations

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	// "github.com/gorilla/mux" // Will be needed for path parameters

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// Helper: Get the number of products for a brand
func getProductsCountForBrand(ctx context.Context, brandID primitive.ObjectID) int {
	productCollection := db.Database.Collection("products")
	count, err := productCollection.CountDocuments(ctx, bson.M{"brand_id": brandID})
	if err != nil {
		return 0
	}
	return int(count)
}

// Helper: Get the most recently created product's name for a brand
func getFeaturedProductForBrand(ctx context.Context, brandID primitive.ObjectID) string {
	productCollection := db.Database.Collection("products")
	var product models.Product
	err := productCollection.FindOne(ctx, bson.M{"brand_id": brandID}, options.FindOne().SetSort(bson.D{{"created_at", -1}})).Decode(&product)
	if err != nil {
		return ""
	}
	return product.Name
}

// GetBrands returns a list of all brands.
// GET /api/brands
func GetBrands(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("brands")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching brands")
		return
	}

	var brands []models.Brand
	if err := cursor.All(ctx, &brands); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding brands")
		return
	}

	type BrandWithExtras struct {
		models.Brand
		ProductsCount   int    `json:"productsCount"`
		FeaturedProduct string `json:"featuredProduct,omitempty"`
	}

	var brandsWithExtras []BrandWithExtras
	for _, brand := range brands {
		brandsWithExtras = append(brandsWithExtras, BrandWithExtras{
			Brand:          brand,
			ProductsCount:  getProductsCountForBrand(ctx, brand.ID),
			FeaturedProduct: getFeaturedProductForBrand(ctx, brand.ID),
		})
	}

	utils.JSONResponse(w, http.StatusOK, brandsWithExtras)
}

// CreateBrand adds a new brand, handling logo image upload.
// POST /api/brands
func CreateBrand(w http.ResponseWriter, r *http.Request) {
	// Max file size: 5MB
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error parsing multipart form: "+err.Error(),
		)
		return
	}

	name := r.FormValue("name")
	slug := r.FormValue("slug") // Consider auto-generating slug if not provided
	description := r.FormValue("description")

	if name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Brand name is required")
		return
	}

	// Handle logo upload
	file, handler, err := r.FormFile("logo")
	var logoPath string

	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error retrieving logo file: "+err.Error(),
		)
		return
	}

	if file != nil {
		defer file.Close()

		// Create uploads directory if it doesn't exist
		uploadDir := "./uploads/brands"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating uploads directory: "+err.Error(),
			)
			return
		}

		// Create a unique filename to prevent overwrites
		ext := filepath.Ext(handler.Filename)
		// Sanitize slug for filename or use brand name if slug is empty
		baseFilename := slug
		if baseFilename == "" {
			baseFilename = strings.ToLower(strings.ReplaceAll(name, " ", "-"))
		}
		filename := fmt.Sprintf("%s-%d%s", baseFilename, time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating logo file: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving logo file: "+err.Error(),
			)
			return
		}
		logoPath = "/uploads/brands/" + filename // Store the web-accessible path
	}

	brand := models.Brand{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Slug:        slug,
		Description: description,
		Logo:        logoPath, // This will be empty if no logo was uploaded
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("brands")
	_, err = collection.InsertOne(ctx, brand)
	if err != nil {
		// Consider MongoDB duplicate key error for name/slug if they are unique indexes
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error creating brand: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusCreated, brand)
}

// GetBrandByID returns a single brand by its ID.
// GET /api/brands/{id}
func GetBrandByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Brand ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Brand ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("brands")
	var brand models.Brand

	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&brand); err != nil {
		// Check if the error is because the brand was not found
		if err.Error() == "mongo: no documents in result" { // Or use errors.Is(err, mongo.ErrNoDocuments) if mongo imported
			utils.ErrorResponse(w, http.StatusNotFound, "Brand not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching brand: "+err.Error())
		}
		return
	}

	type BrandWithExtras struct {
		models.Brand
		ProductsCount   int    `json:"productsCount"`
		FeaturedProduct string `json:"featuredProduct,omitempty"`
	}

	brandWithExtras := BrandWithExtras{
		Brand:          brand,
		ProductsCount:  getProductsCountForBrand(ctx, brand.ID),
		FeaturedProduct: getFeaturedProductForBrand(ctx, brand.ID),
	}

	utils.JSONResponse(w, http.StatusOK, brandWithExtras)
}

// UpdateBrand updates an existing brand, handling logo image upload if provided.
// PUT /api/brands/{id}
func UpdateBrand(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Brand ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Brand ID format")
		return
	}

	// Max file size: 5MB
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error parsing multipart form: "+err.Error(),
		)
		return
	}

	name := r.FormValue("name")
	slug := r.FormValue("slug")
	description := r.FormValue("description")

	// Fetch existing brand to get old logo path for deletion and to update
	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	) // Increased timeout for DB fetch + update
	defer cancel()

	collection := db.Database.Collection("brands")
	var existingBrand models.Brand
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingBrand); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Brand not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching brand for update: "+err.Error())
		}
		return
	}

	update := bson.M{}
	if name != "" {
		update["name"] = name
		existingBrand.Name = name // Update for response
	}
	if slug != "" {
		update["slug"] = slug
		existingBrand.Slug = slug // Update for response
	}
	if description != "" {
		update["description"] = description
		existingBrand.Description = description // Update for response
	}

	// Handle logo upload
	file, handler, err := r.FormFile("logo")
	var newLogoPath string

	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error retrieving new logo file: "+err.Error(),
		)
		return
	}

	if file != nil {
		defer file.Close()

		// Delete old logo if it exists
		if existingBrand.Logo != "" {
			oldLogoServerPath := "." + existingBrand.Logo // Assuming paths are like /uploads/brands/file.jpg
			if err := os.Remove(oldLogoServerPath); err != nil {
				// Log error but don't necessarily fail the whole update if old logo deletion fails
				// Consider logging: log.Printf("Warning: could not delete old logo %s: %v", oldLogoServerPath, err)
			}
		}

		uploadDir := "./uploads/brands"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating uploads directory: "+err.Error(),
			)
			return
		}

		ext := filepath.Ext(handler.Filename)
		baseFilename := slug
		if baseFilename == "" {
			baseFilename = strings.ToLower(strings.ReplaceAll(name, " ", "-"))
			if baseFilename == "" { // Fallback to existing slug or name if new ones are empty
				baseFilename = existingBrand.Slug
				if baseFilename == "" {
					baseFilename = strings.ToLower(
						strings.ReplaceAll(existingBrand.Name, " ", "-"),
					)
				}
			}
		}
		filename := fmt.Sprintf("%s-%d%s", baseFilename, time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating new logo file: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving new logo file: "+err.Error(),
			)
			return
		}
		newLogoPath = "/uploads/brands/" + filename
		update["logo"] = newLogoPath
		existingBrand.Logo = newLogoPath // Update for response
	}

	if len(update) == 0 {
		utils.JSONResponse(
			w,
			http.StatusOK,
			existingBrand,
		) // Nothing to update, return existing
		return
	}

	update["updatedAt"] = time.Now()

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating brand: "+err.Error(),
		)
		return
	}

	// Update existingBrand with the timestamp from the update map for the response
	if updatedAt, ok := update["updatedAt"].(time.Time); ok {
		existingBrand.UpdatedAt = updatedAt
	}

	utils.JSONResponse(w, http.StatusOK, existingBrand) // Return the updated brand object
}

// DeleteBrand deletes a brand by its ID and its associated logo image.
// DELETE /api/brands/{id}
func DeleteBrand(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Brand ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Brand ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("brands")

	// First, find the brand to get its logo path
	var brandToDelete models.Brand
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&brandToDelete); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Brand not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error finding brand to delete: "+err.Error())
		}
		return
	}

	// Delete the brand document from MongoDB
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deleting brand: "+err.Error(),
		)
		return
	}

	if result.DeletedCount == 0 {
		// This case should ideally be caught by the FindOne above, but as a safeguard:
		utils.ErrorResponse(w, http.StatusNotFound, "Brand not found, nothing deleted")
		return
	}

	// If the brand had a logo, delete it from the server
	if brandToDelete.Logo != "" {
		logoServerPath := "." + brandToDelete.Logo // Assuming paths are /uploads/brands/file.jpg
		if err := os.Remove(logoServerPath); err != nil {
			// Log the error but still return success for the DB deletion part
			// log.Printf("Warning: could not delete logo file %s: %v", logoServerPath, err)
			utils.JSONResponse(
				w,
				http.StatusOK,
				map[string]string{
					"message": "Brand deleted successfully, but failed to delete logo file: " + err.Error(),
				},
			)
			return
		}
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Brand deleted successfully"},
	)
}
