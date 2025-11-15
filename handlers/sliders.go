package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GetSliders returns all sliders.
// GET /api/sliders
func GetSliders(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sliders")
		return
	}
	defer cursor.Close(ctx)

	var sliders []models.Slider
	if err = cursor.All(ctx, &sliders); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding sliders")
		return
	}

	utils.JSONResponse(w, http.StatusOK, sliders)
}

// GetSliderByID returns a single slider by its ID.
// GET /api/sliders/{id}
func GetSliderByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	var slider models.Slider

	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&slider); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching slider: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, slider)
}

// CreateSlider adds a new slider.
// POST /api/sliders
func CreateSlider(w http.ResponseWriter, r *http.Request) {
	var slider models.Slider
	if err := json.NewDecoder(r.Body).Decode(&slider); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	slider.ID = primitive.NewObjectID()
	slider.CreatedAt = time.Now()
	slider.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	_, err := collection.InsertOne(ctx, slider)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating slider: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, slider)
}

// UpdateSlider updates an existing slider.
// PUT /api/sliders/{id}
func UpdateSlider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID")
		return
	}

	var slider models.Slider
	if err := json.NewDecoder(r.Body).Decode(&slider); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	slider.UpdatedAt = time.Now()

	update := bson.M{
		"$set": bson.M{
			"title":       slider.Title,
			"subtitle":    slider.Subtitle,
			"description": slider.Description,
			"image":       slider.Image,
			"buttonText":  slider.ButtonText,
			"buttonLink":  slider.ButtonLink,
			"badge":       slider.Badge,
			"bgColor":     slider.BgColor,
			"accentColor": slider.AccentColor,
			"discount":    slider.Discount,
			"features":    slider.Features,
			"stats":       slider.Stats,
			"isActive":    slider.IsActive,
			"updatedAt":   slider.UpdatedAt,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating slider: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, slider)
}

// DeleteSlider deletes a slider by its ID.
// DELETE /api/sliders/{id}
func DeleteSlider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting slider")
		return
	}

	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Slider deleted successfully"})
} 