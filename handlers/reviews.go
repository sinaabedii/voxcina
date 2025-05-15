package handlers

import (
	"context"
	"encoding/json"
	"net/http"
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

// GET /api/products/{id}/reviews
func GetReviews(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	productIDStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product ID not provided in path")
		return
	}

	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Product ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("reviews")
	cursor, err := collection.Find(
		ctx,
		bson.M{"product_id": productID},
		options.Find().SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching reviews: "+err.Error(),
		)
		return
	}
	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding reviews: "+err.Error(),
		)
		return
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	utils.JSONResponse(w, http.StatusOK, reviews)
}

// AddReview handles POST /api/products/{id}/reviews
// Requires authentication - UserID should be available in request context
func AddReview(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	productIDStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product ID not provided in path")
		return
	}

	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Product ID format")
		return
	}

	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().
		Value("userID")
		// Assuming "userID" is the key used by your middleware
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	var payload struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid review payload: "+err.Error(),
		)
		return
	}

	// --- Validate Rating ---
	if payload.Rating < 1 || payload.Rating > 5 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Rating must be between 1 and 5")
		return
	}
	// Comment can be empty if desired

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("reviews")

	// --- Check for existing review by this user for this product ---
	filter := bson.M{"user_id": userID, "product_id": productID}
	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error checking for existing review: "+err.Error(),
		)
		return
	}
	if count > 0 {
		utils.ErrorResponse(
			w,
			http.StatusConflict,
			"You have already reviewed this product",
		)
		return
	}

	// --- Check if Product actually exists (optional but good practice) ---
	productCollection := db.Database.Collection("products")
	productCount, err := productCollection.CountDocuments(
		ctx,
		bson.M{"_id": productID, "is_active": true},
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error checking product existence: "+err.Error(),
		)
		return
	}
	if productCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found or is not active")
		return
	}

	review := models.Review{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		ProductID: productID,
		Rating:    payload.Rating,
		Comment:   payload.Comment,
		CreatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, review)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error adding review: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusCreated, review) // Return the created review
}

// UpdateReview handles PUT /api/reviews/{reviewId}
// Requires authentication - UserID should be available in request context
func UpdateReview(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reviewIDStr, ok := vars["reviewId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Review ID not provided in path")
		return
	}

	reviewID, err := primitive.ObjectIDFromHex(reviewIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Review ID format")
		return
	}

	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	currentUserID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	var payload struct {
		Rating  *int    `json:"rating,omitempty"`  // Pointer to distinguish between 0 and not provided
		Comment *string `json:"comment,omitempty"` // Pointer to distinguish between "" and not provided
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid review update payload: "+err.Error(),
		)
		return
	}

	// --- Validate Rating if provided ---
	if payload.Rating != nil {
		if *payload.Rating < 1 || *payload.Rating > 5 {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Rating must be between 1 and 5",
			)
			return
		}
	}

	if payload.Rating == nil && payload.Comment == nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"No fields to update. Provide rating and/or comment.",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("reviews")

	// --- Fetch the existing review ---
	var existingReview models.Review
	filter := bson.M{"_id": reviewID}
	err = collection.FindOne(ctx, filter).Decode(&existingReview)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Review not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching review: "+err.Error())
		}
		return
	}

	// --- Check ownership or admin privileges ---
	currentUserRole := ""
	roleCtx := r.Context().
		Value("role")
		// Assuming role is set as string by AuthMiddleware
	if roleCtx != nil {
		if roleStr, ok := roleCtx.(string); ok {
			currentUserRole = roleStr
		}
	}

	if existingReview.UserID != currentUserID && currentUserRole != "admin" {
		utils.ErrorResponse(
			w,
			http.StatusForbidden,
			"You are not authorized to update this review",
		)
		return
	}

	// --- Prepare update document ---
	updateFields := bson.M{}
	if payload.Rating != nil {
		updateFields["rating"] = *payload.Rating
	}
	if payload.Comment != nil {
		updateFields["comment"] = *payload.Comment
	}

	if len(updateFields) == 0 { // Should be caught by earlier check, but as a safeguard
		utils.JSONResponse(w, http.StatusOK, existingReview) // Nothing to update
		return
	}

	updateFields["updated_at"] = time.Now()
	updateDoc := bson.M{"$set": updateFields}

	// --- Perform the update ---
	_, err = collection.UpdateOne(ctx, filter, updateDoc)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating review: "+err.Error(),
		)
		return
	}

	// --- Fetch and return the updated review ---
	var updatedReview models.Review
	err = collection.FindOne(ctx, bson.M{"_id": reviewID}).Decode(&updatedReview)
	if err != nil {
		// This is unlikely if the update succeeded, but handle defensively
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated review: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedReview)
}

// DeleteReview handles DELETE /api/reviews/{reviewId}
// Requires authentication - UserID should be available in request context
func DeleteReview(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reviewIDStr, ok := vars["reviewId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Review ID not provided in path")
		return
	}

	reviewID, err := primitive.ObjectIDFromHex(reviewIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Review ID format")
		return
	}

	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	currentUserID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("reviews")

	// --- Fetch the existing review to check ownership ---
	var existingReview models.Review
	filter := bson.M{"_id": reviewID}
	err = collection.FindOne(ctx, filter).Decode(&existingReview)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Review not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching review: "+err.Error())
		}
		return
	}

	// --- Check ownership or admin privileges ---
	currentUserRole := ""
	roleCtx := r.Context().
		Value("role")
		// Assuming role is set as string by AuthMiddleware
	if roleCtx != nil {
		if roleStr, ok := roleCtx.(string); ok {
			currentUserRole = roleStr
		}
	}

	if existingReview.UserID != currentUserID && currentUserRole != "admin" {
		utils.ErrorResponse(
			w,
			http.StatusForbidden,
			"You are not authorized to delete this review",
		)
		return
	}

	// --- Perform the delete operation ---
	result, err := collection.DeleteOne(
		ctx,
		filter,
	) // filter is still bson.M{"_id": reviewID}
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deleting review: "+err.Error(),
		)
		return
	}

	if result.DeletedCount == 0 {
		// This case should ideally be caught by the FindOne above, but as a safeguard
		utils.ErrorResponse(w, http.StatusNotFound, "Review not found or already deleted")
		return
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Review deleted successfully"},
	)
}
