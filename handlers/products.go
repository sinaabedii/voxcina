package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// AddProduct handles POST /api/admin/products
func AddProduct(w http.ResponseWriter, r *http.Request) {
	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product payload")
		return
	}

	// Create new ObjectID and set timestamps
	product.ID = primitive.NewObjectID()
	product.CreatedAt = time.Now()
	product.UpdatedAt = time.Now()

	// Default to active product if not specified
	if !product.IsActive {
		product.IsActive = true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("products")
	_, err := collection.InsertOne(ctx, product)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error adding product")
		return
	}

	utils.JSONResponse(
		w,
		http.StatusCreated,
		map[string]interface{}{
			"message": "Product added successfully",
			"product": product,
		},
	)
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
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching products")
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
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
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error searching products")
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
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
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching recommendations",
		)
		return
	}

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}

	utils.JSONResponse(w, http.StatusOK, products)
}
