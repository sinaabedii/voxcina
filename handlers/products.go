package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"
	"backEnd/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Product represents a product document
type Product struct {
	ID         string  `json:"id" bson:"_id,omitempty"`
	Name       string  `json:"name" bson:"name"`
	Price      float64 `json:"price" bson:"price"`
	CategoryID string  `json:"categoryId" bson:"categoryId"`
}


// POST /api/admin/products
func AddProduct(w http.ResponseWriter, r *http.Request) {
	var product models.Product
	// Decode the request payload into product struct
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product payload")
		return
	}
	// Create a new ObjectID and set CreatedAt timestamp
	product.ID = primitive.NewObjectID()
	product.CreatedAt = time.Now()

	// Insert the product into the "products" collection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	_, err := collection.InsertOne(ctx, product)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error adding product")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, map[string]string{"message": "Product added successfully"})
}

// GET /api/products
func ListProducts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching products")
		return
	}
	var products []Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}
	utils.JSONResponse(w, http.StatusOK, products)
}

// GET /api/products?id=<productId>
func GetProduct(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	var product Product
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&product)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, product)
}

// GET /api/products/search?q=<query>
func SearchProducts(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	filter := bson.M{"name": bson.M{"$regex": query, "$options": "i"}}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error searching products")
		return
	}
	var products []Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}
	utils.JSONResponse(w, http.StatusOK, products)
}

// GET /api/products/recommendations
func ProductRecommendations(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	opts := options.Find().SetSort(bson.M{"price": 1}).SetLimit(5)
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching recommendations")
		return
	}
	var products []Product
	if err := cursor.All(ctx, &products); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding products")
		return
	}
	utils.JSONResponse(w, http.StatusOK, products)
}
