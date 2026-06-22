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
	productIDStr, ok := vars["productId"]
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
		bson.M{"product_id": productID, "status": "approved"},
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
	productIDStr, ok := vars["productId"]
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
		Rating        int    `json:"rating"`
		Comment       string `json:"comment"`
		IsRecommended bool   `json:"isRecommended"`
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

	// --- Fetch user name for snapshot ---
	var userDoc struct{ Name string `bson:"name"` }
	userCollection := db.Database.Collection("users")
	_ = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&userDoc)

	review := models.Review{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		UserName:  userDoc.Name,
		ProductID: productID,
		Rating:    payload.Rating,
		Comment:   payload.Comment,
		IsRecommended: payload.IsRecommended,
		Status:    "pending",
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

	// --- Update product rating stats (best effort) ---
	updateProductRatingStats(ctx, productID)

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
		Comment *string `json:"comment,omitempty"`
		IsRecommended *bool `json:"isRecommended,omitempty"`
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

	if payload.Rating == nil && payload.Comment == nil && payload.IsRecommended == nil {
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
	if payload.IsRecommended != nil {
		updateFields["is_recommended"] = *payload.IsRecommended
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

	// --- Update product rating stats (best effort) ---
	updateProductRatingStats(ctx, existingReview.ProductID)

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

	// --- Update product rating stats (best effort) ---
	updateProductRatingStats(ctx, existingReview.ProductID)

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Review deleted successfully"},
	)
}

// updateProductRatingStats recalculates and persists the average rating and review count
// for a given product based on its reviews collection. It is intentionally best-effort
// (errors are logged but not surfaced to the client) so it never breaks the main
// review flow.
func updateProductRatingStats(ctx context.Context, productID primitive.ObjectID) {
	reviewsColl := db.Database.Collection("reviews")
	pipeline := mongo.Pipeline{
		bson.D{
			{
				Key: "$match",
				Value: bson.D{
					{Key: "product_id", Value: productID},
					{Key: "status", Value: "approved"},
				},
			},
		},
		bson.D{
			{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "average", Value: bson.D{{Key: "$avg", Value: "$rating"}}},
				{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			}},
		},
	}

	cursor, err := reviewsColl.Aggregate(ctx, pipeline)
	if err != nil {
		return // silently ignore; stats won't update this time
	}
	var result []bson.M
	if err := cursor.All(ctx, &result); err != nil {
		return
	}

	avg := 0.0
	count := 0
	if len(result) > 0 {
		if v, ok := result[0]["average"].(float64); ok {
			avg = v
		} else if v, ok := result[0]["average"].(int32); ok {
			avg = float64(v)
		} else if v, ok := result[0]["average"].(int64); ok {
			avg = float64(v)
		}

		switch c := result[0]["count"].(type) {
		case int32:
			count = int(c)
		case int64:
			count = int(c)
		case float64:
			count = int(c)
		}
	}

	productsColl := db.Database.Collection("products")
	productsColl.UpdateOne(
		ctx,
		bson.M{"_id": productID},
		bson.M{"$set": bson.M{"average_rating": avg, "review_count": count}},
	)
}

// GetUserReviews handles GET /api/users/{userId}/reviews and returns all reviews written by a specific user.
func GetUserReviews(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userIDStr, ok := vars["userId"]
	if !ok || userIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided in path")
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid User ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("reviews")
	cursor, err := collection.Find(
		ctx,
		bson.M{"user_id": userID},
		options.Find().SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching user reviews: "+err.Error(),
		)
		return
	}

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding user reviews: "+err.Error(),
		)
		return
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	utils.JSONResponse(w, http.StatusOK, reviews)
}

// UpdateReviewStatusAdmin handles PUT /api/admin/reviews/{reviewId}/status
// Allows admin to approve or reject a review. Payload example: {"status": "approved"}
func UpdateReviewStatusAdmin(w http.ResponseWriter, r *http.Request) {
	// Ensure admin auth via middleware (route should be under adminRouter)

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

	var payload struct {
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid payload: "+err.Error())
		return
	}

	allowed := map[string]bool{"approved": true, "rejected": true, "pending": true}
	if !allowed[payload.Status] {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid status. Must be 'approved', 'rejected', or 'pending'",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reviewsColl := db.Database.Collection("reviews")

	// Update status and updated_at
	res, err := reviewsColl.UpdateOne(
		ctx,
		bson.M{"_id": reviewID},
		bson.M{"$set": bson.M{"status": payload.Status, "updated_at": time.Now()}},
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating review status: "+err.Error(),
		)
		return
	}
	if res.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Review not found")
		return
	}

	// Fetch updated review to include in response
	var updatedReview models.Review
	if err := reviewsColl.FindOne(ctx, bson.M{"_id": reviewID}).Decode(&updatedReview); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated review: "+err.Error(),
		)
		return
	}

	// Recalculate product stats
	updateProductRatingStats(ctx, updatedReview.ProductID)

	utils.JSONResponse(w, http.StatusOK, updatedReview)
}

// AdminListReviews handles GET /api/admin/reviews?productId=&userId=&status=
func AdminListReviews(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := bson.M{}
	productIDStr := r.URL.Query().Get("productId")
	if productIDStr != "" {
		if pid, err := primitive.ObjectIDFromHex(productIDStr); err == nil {
			query["product_id"] = pid
		}
	}
	userIDStr := r.URL.Query().Get("userId")
	if userIDStr != "" {
		if uid, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
			query["user_id"] = uid
		}
	}
	status := r.URL.Query().Get("status")
	if status != "" {
		query["status"] = status
	}

	coll := db.Database.Collection("reviews")
	cursor, err := coll.Find(ctx, query, options.Find().SetSort(bson.M{"created_at": -1}))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching reviews: "+err.Error())
		return
	}

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding reviews: "+err.Error())
		return
	}

	// Transform to response with string IDs for frontend compatibility
	type reviewDTO struct {
		ID        string    `json:"id"`
		UserID    string    `json:"userId"`
		UserName  string    `json:"userName"`
		ProductID string    `json:"productId"`
		Rating    int       `json:"rating"`
		Comment   string    `json:"comment"`
		IsRecommended bool  `json:"isRecommended"`
		Status    string    `json:"status"`
		CreatedAt time.Time `json:"date"`
	}

	var resp []reviewDTO
	for _, r := range reviews {
		dto := reviewDTO{
			ID:        r.ID.Hex(),
			UserID:    r.UserID.Hex(),
			UserName:  r.UserName,
			ProductID: r.ProductID.Hex(),
			Rating:    r.Rating,
			Comment:   r.Comment,
			IsRecommended: r.IsRecommended,
			Status:    r.Status,
			CreatedAt: r.CreatedAt,
		}
		resp = append(resp, dto)
	}

	if resp == nil {
		resp = []reviewDTO{}
	}

	utils.JSONResponse(w, http.StatusOK, resp)
}
