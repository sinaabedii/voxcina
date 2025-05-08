package handlers

import (
	"context"
	// "encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("categories")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		// Return empty array instead of error for database connection issues
		utils.JSONResponse(w, http.StatusOK, []interface{}{})
		return
	}

	// Use a slice of bson.M to match the exact structure from TypeScript
	var categories []bson.M
	if err := cursor.All(ctx, &categories); err != nil {
		// Return empty array instead of error for decoding issues
		utils.JSONResponse(w, http.StatusOK, []interface{}{})
		return
	}

	// If no categories found, return empty array
	if len(categories) == 0 {
		utils.JSONResponse(w, http.StatusOK, []interface{}{})
		return
	}

	// Convert BSON ObjectIDs to string IDs for frontend compatibility
	// and ensure all required fields are present
	for i := range categories {
		// Convert _id to id
		if objID, ok := categories[i]["_id"].(primitive.ObjectID); ok {
			categories[i]["id"] = objID.Hex()
			delete(categories[i], "_id")
		}

		// Ensure name field exists
		if _, ok := categories[i]["name"]; !ok {
			categories[i]["name"] = ""
		}

		// Remove any null values
		for k, v := range categories[i] {
			if v == nil {
				delete(categories[i], k)
			}
		}
	}

	// Return the categories as a valid, non-null array
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

	// Use a slice of bson.M to match the exact structure from TypeScript
	var brands []bson.M
	if err := cursor.All(ctx, &brands); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding brands")
		return
	}

	// Convert BSON ObjectIDs to string IDs for frontend compatibility
	for i := range brands {
		if objID, ok := brands[i]["_id"].(primitive.ObjectID); ok {
			brands[i]["id"] = objID.Hex()
			delete(brands[i], "_id")
		}
	}

	utils.JSONResponse(w, http.StatusOK, brands)
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
