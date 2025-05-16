package handlers

import (
	"context"
	// "encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"backEnd/db"
	"backEnd/utils"
)

// Page represents a static page document
type Page struct {
	Slug    string `bson:"slug"    json:"slug"`
	Content string `bson:"content" json:"content"`
}

// GET /api/pages?slug=<slug>
func GetPage(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("pages")
	var page Page
	err := collection.FindOne(ctx, bson.M{"slug": slug}).Decode(&page)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Page not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, page)
}

// GET /api/footer
func GetFooter(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("footer")
	var footer map[string]interface{}
	err := collection.FindOne(ctx, bson.M{}).Decode(&footer)
	if err != nil {
		// fallback to a static response if no footer is in DB
		utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Footer data"})
		return
	}
	utils.JSONResponse(w, http.StatusOK, footer)
}
