package handlers

import (
	"context"
	// "encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category represents a product category.
type Category struct {
	ID   primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name string             `bson:"name" json:"name"`
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
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching categories")
		return
	}

	var categories []Category
	if err := cursor.All(ctx, &categories); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding categories")
		return
	}
	utils.JSONResponse(w, http.StatusOK, categories)
}

// GetCategoryProducts returns all products for a given category ID.
// GET /api/categories/{id}/products
func GetCategoryProducts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	categoryIDStr := vars["id"]

	// Assuming category IDs are stored as hex strings.
	categoryID, err := primitive.ObjectIDFromHex(categoryIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	// Here we assume that products have a "categoryId" field stored as a string.
	cursor, err := collection.Find(ctx, bson.M{"categoryId": categoryID.Hex()})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching products for category")
		return
	}

	// For simplicity, we decode the products into a slice of interface{}.
	var products []interface{}
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
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

	// Decode brands into a generic slice; you could define a Brand struct.
	var brands []interface{}
	if err := cursor.All(ctx, &brands); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding brands")
		return
	}
	utils.JSONResponse(w, http.StatusOK, brands)
}

// GetHomepageCategories returns homepage categories and banners.
// GET /api/categories/homepage
func GetHomepageCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("homepage")
	var data interface{}
	err := collection.FindOne(ctx, bson.M{}).Decode(&data)
	if err != nil {
		// Fallback to a static response if no homepage data is available.
		utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Homepage categories and banners"})
		return
	}
	utils.JSONResponse(w, http.StatusOK, data)
}
