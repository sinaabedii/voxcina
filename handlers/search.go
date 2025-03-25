package handlers

import (
	"context"
	// "encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// GET /api/search/suggestions?q=<query>
func SearchSuggestions(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("products")
	filter := bson.M{"name": bson.M{"$regex": query, "$options": "i"}}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching suggestions")
		return
	}
	var suggestions []struct {
		Name string `json:"name" bson:"name"`
	}
	if err := cursor.All(ctx, &suggestions); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding suggestions")
		return
	}
	utils.JSONResponse(w, http.StatusOK, suggestions)
}

// GET /api/search/history
func SearchHistory(w http.ResponseWriter, r *http.Request) {
	// For demonstration, returning a static list.
	history := []string{"shirt", "pants", "shoes"}
	utils.JSONResponse(w, http.StatusOK, history)
}
