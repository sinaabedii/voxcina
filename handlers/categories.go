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

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// Category represents a product category.
type Category struct {
	ID   primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name string             `bson:"name"          json:"name"`
	// Add additional fields as needed (e.g., description, image URL, etc.)
}

// GetCategories returns a list of all categories.
// GET /api/categories
func GetCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		// It's often better to return an empty list on error for GET /plural resources
		// than a server error, unless it's a critical failure.
		utils.JSONResponse(w, http.StatusOK, []models.Category{})
		return
	}

	var categories []models.Category
	if err = cursor.All(ctx, &categories); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding categories: "+err.Error(),
		)
		return
	}

	if categories == nil { // Ensure we always return an array, not null
		categories = []models.Category{}
	}

	utils.JSONResponse(w, http.StatusOK, categories)
}

// GetCategoryProducts returns all products for a given category ID.
// GET /api/categories/{id}/products
func GetCategoryProducts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	categoryIDStr := vars["id"]

	// In case the ID is an ObjectID in the URL
	var filter bson.M
	categoryObjectID, err := primitive.ObjectIDFromHex(categoryIDStr)
	if err == nil {
		// First try finding by ObjectID
		filter = bson.M{"categoryId": categoryObjectID.Hex()}
	} else {
		// If not a valid ObjectID, try as a string
		filter = bson.M{"categoryId": categoryIDStr}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching products for category",
		)
		return
	}

	// Use a slice of bson.M to match the exact structure from TypeScript
	var products []bson.M
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}

	// Convert BSON ObjectIDs to string IDs for frontend compatibility
	for i := range products {
		if objID, ok := products[i]["_id"].(primitive.ObjectID); ok {
			products[i]["id"] = objID.Hex()
			delete(products[i], "_id")
		}
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// GetHomepageCategories returns homepage categories and banners.
// GET /api/categories/homepage
func GetHomepageCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("homepage")
	var data bson.M
	err := collection.FindOne(ctx, bson.M{}).Decode(&data)
	if err != nil {
		// Fallback to a static response if no homepage data is available.
		utils.JSONResponse(
			w,
			http.StatusOK,
			map[string]string{"message": "Homepage categories and banners"},
		)
		return
	}

	// Convert any ObjectIDs in the data to string IDs
	convertObjectIDsToString(data)

	utils.JSONResponse(w, http.StatusOK, data)
}

// Helper function to recursively convert ObjectIDs to strings in nested maps and slices
func convertObjectIDsToString(data interface{}) {
	switch v := data.(type) {
	case bson.M:
		// Process map fields
		for key, value := range v {
			if key == "_id" {
				if objID, ok := value.(primitive.ObjectID); ok {
					v["id"] = objID.Hex()
					delete(v, "_id")
				}
			} else {
				// Recursive call for nested objects
				convertObjectIDsToString(value)
			}
		}
	case []interface{}:
		// Process slice elements
		for _, item := range v {
			convertObjectIDsToString(item)
		}
	}
}

// CreateCategory adds a new category, handling image upload.
// POST /api/categories
func CreateCategory(w http.ResponseWriter, r *http.Request) {
	// Max file size for image: 5MB
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
	parentIDStr := r.FormValue("parent_id") // Corrected to snake_case

	if name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Category name is required")
		return
	}
	// Auto-generate slug if not provided and name is present
	if slug == "" && name != "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(name), " ", "-"))
		// Add more robust slug generation if needed (e.g., handling special chars, ensuring uniqueness)
	}

	var parentID primitive.ObjectID
	var err error
	if parentIDStr != "" && parentIDStr != "0" &&
		parentIDStr != "null" { // Handle common ways of saying no parent
		parentID, err = primitive.ObjectIDFromHex(parentIDStr)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid parent_id format: "+err.Error(),
			)
			return
		}
	}

	// Handle image upload
	file, handler, err := r.FormFile("image")
	var imagePath string

	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error retrieving image file: "+err.Error(),
		)
		return
	}

	if file != nil {
		defer file.Close()
		uploadDir := "./uploads/categories"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating uploads directory: "+err.Error(),
			)
			return
		}
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf("%s-%d%s", slug, time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating image file: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving image file: "+err.Error(),
			)
			return
		}
		imagePath = "/uploads/categories/" + filename
	}

	now := time.Now()
	category := models.Category{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Slug:        slug,
		Description: description,
		Image:       imagePath,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if !parentID.IsZero() {
		category.ParentID = parentID
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	_, err = collection.InsertOne(ctx, category)
	if err != nil {
		// Handle potential duplicate slug error (requires unique index on slug)
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error creating category: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusCreated, category)
}

// GetCategoryByID returns a single category by its ID.
// GET /api/categories/{id}
func GetCategoryByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Category ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Category ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	var category models.Category

	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&category); err != nil {
		if err.Error() == "mongo: no documents in result" { // Replace with errors.Is(err, mongo.ErrNoDocuments)
			utils.ErrorResponse(w, http.StatusNotFound, "Category not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching category: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, category)
}

// UpdateCategory updates an existing category, handling optional image upload.
// PUT /api/categories/{id}
func UpdateCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Category ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Category ID format")
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5MB max file size
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
	parentIDStr := r.FormValue("parent_id")
	isActiveStr := r.FormValue("is_active") // Get is_active string value

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	var existingCategory models.Category
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingCategory); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Category not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching category for update: "+err.Error())
		}
		return
	}

	update := bson.M{}
	if name != "" {
		update["name"] = name
		existingCategory.Name = name
	}
	if slug != "" {
		update["slug"] = slug
		existingCategory.Slug = slug
	} else if name != "" { // Auto-generate slug if name changes and slug is not explicitly provided
		newSlug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(name), " ", "-"))
		update["slug"] = newSlug
		existingCategory.Slug = newSlug
	}

	if description != "" {
		update["description"] = description
		existingCategory.Description = description
	}

	// Handle parent_id more explicitly
	fmt.Printf(
		"Received parent_id string from form: '%s'\n",
		parentIDStr,
	) // Log received string
	if parentIDStr != "" && parentIDStr != "0" && parentIDStr != "null" {
		parsedParentID, err := primitive.ObjectIDFromHex(parentIDStr)
		if err != nil {
			fmt.Printf(
				"Error parsing parent_id '%s': %v\n",
				parentIDStr,
				err,
			) // Log error
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid parent_id format: "+err.Error(),
			)
			return
		}
		update["parent_id"] = parsedParentID
		existingCategory.ParentID = parsedParentID
		fmt.Printf(
			"Successfully parsed parent_id to ObjectID: %s\n",
			parsedParentID.Hex(),
		) // Log success
	} else {
		// If parentIDStr is empty, "0", or "null", it means set to no parent
		update["parent_id"] = primitive.NilObjectID       // Explicitly set to NilObjectID for BSON
		existingCategory.ParentID = primitive.NilObjectID // Update for response struct
		fmt.Println("Setting parent_id to NilObjectID")
	}

	// Handle is_active
	if isActiveStr != "" {
		parsedIsActive := isActiveStr == "true" // Simple conversion for "true" string
		update["is_active"] = parsedIsActive
		existingCategory.IsActive = parsedIsActive // Update for response
	}

	file, handler, err := r.FormFile("image")
	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Error retrieving image file: "+err.Error(),
		)
		return
	}

	if file != nil {
		defer file.Close()
		// Delete old image if it exists
		if existingCategory.Image != "" {
			oldImageServerPath := "." + existingCategory.Image
			if err := os.Remove(oldImageServerPath); err != nil {
				// Log error but don't fail the update
				fmt.Printf(
					"Warning: could not delete old category image %s: %v\n",
					oldImageServerPath,
					err,
				)
			}
		}

		uploadDir := "./uploads/categories"
		_ = os.MkdirAll(
			uploadDir,
			os.ModePerm,
		) // Ignore error for MkdirAll here, os.Create will fail if problematic
		ext := filepath.Ext(handler.Filename)
		// Use existing slug or new slug for filename base
		filenameSlug := existingCategory.Slug
		if us, ok := update["slug"].(string); ok {
			filenameSlug = us
		}
		filename := fmt.Sprintf("%s-%d%s", filenameSlug, time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error creating new image file: "+err.Error(),
			)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error saving new image file: "+err.Error(),
			)
			return
		}
		update["image"] = "/uploads/categories/" + filename
		existingCategory.Image = "/uploads/categories/" + filename
	}

	if len(update) == 0 {
		utils.JSONResponse(w, http.StatusOK, existingCategory) // No changes
		return
	}

	now := time.Now()
	update["updated_at"] = now
	existingCategory.UpdatedAt = now

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating category: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, existingCategory)
}

// DeleteCategory deletes a category and its image.
// DELETE /api/categories/{id}
func DeleteCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Category ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Category ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	var categoryToDelete models.Category
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&categoryToDelete); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Category not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error finding category to delete: "+err.Error())
		}
		return
	}

	// TODO: Consider implications of deleting a category with children or products.
	// For now, we just delete the category itself.
	// Option 1: Prevent deletion if it has children or products.
	// Option 2: Set child categories ParentID to null, or re-parent them.
	// Option 3: Delete/un-categorize associated products.

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deleting category: "+err.Error(),
		)
		return
	}

	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Category not found, nothing deleted")
		return
	}

	if categoryToDelete.Image != "" {
		imageServerPath := "." + categoryToDelete.Image
		if err := os.Remove(imageServerPath); err != nil {
			utils.JSONResponse(
				w,
				http.StatusOK,
				map[string]string{
					"message": "Category deleted successfully, but failed to delete image file: " + err.Error(),
				},
			)
			return
		}
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Category deleted successfully"},
	)
}
