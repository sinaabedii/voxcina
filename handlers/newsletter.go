package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NewsletterSubscription represents a newsletter subscription
type NewsletterSubscription struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Email string             `bson:"email" json:"email"`
}

// POST /api/newsletter/subscribe
func SubscribeNewsletter(w http.ResponseWriter, r *http.Request) {
	var sub NewsletterSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	sub.ID = primitive.NewObjectID()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("newsletter")
	_, err := collection.InsertOne(ctx, sub)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error subscribing to newsletter")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Subscribed to newsletter"})
}
