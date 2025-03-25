package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Review represents a product review
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	ProductID string             `bson:"productId" json:"productId"`
	Rating    int                `bson:"rating" json:"rating"`
	Comment   string             `bson:"comment" json:"comment"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// GET /api/products/reviews?id=<productId>
func GetReviews(w http.ResponseWriter, r *http.Request) {
	productId := r.URL.Query().Get("id")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("reviews")
	cursor, err := collection.Find(ctx, bson.M{"productId": productId})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching reviews")
		return
	}
	var reviews []Review
	if err := cursor.All(ctx, &reviews); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding reviews")
		return
	}
	utils.JSONResponse(w, http.StatusOK, reviews)
}

// POST /api/products/reviews
func AddReview(w http.ResponseWriter, r *http.Request) {
	var review Review
	if err := json.NewDecoder(r.Body).Decode(&review); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid review payload")
		return
	}
	review.ID = primitive.NewObjectID()
	review.CreatedAt = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("reviews")
	_, err := collection.InsertOne(ctx, review)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error adding review")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, map[string]string{"message": "Review submitted"})
}
