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
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetFaqs returns active FAQs for the public site
func GetFaqs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("faqs")

	filter := bson.M{"is_active": true}
	findOptions := options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "created_at", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching FAQs")
		return
	}
	defer cursor.Close(ctx)

	var faqs []models.Faq
	if err := cursor.All(ctx, &faqs); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding FAQs")
		return
	}

	if faqs == nil {
		faqs = []models.Faq{}
	}

	utils.JSONResponse(w, http.StatusOK, faqs)
}

// AdminListFaqs returns all FAQs for admin (optionally including inactive)
// GET /api/admin/faqs
func AdminListFaqs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("faqs")

	includeInactive := r.URL.Query().Get("include_inactive")
	filter := bson.M{}
	if includeInactive != "true" && includeInactive != "1" {
		filter["is_active"] = true
	}

	findOptions := options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "created_at", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching FAQs")
		return
	}
	defer cursor.Close(ctx)

	var faqs []models.Faq
	if err := cursor.All(ctx, &faqs); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding FAQs")
		return
	}

	if faqs == nil {
		faqs = []models.Faq{}
	}

	utils.JSONResponse(w, http.StatusOK, faqs)
}

// CreateFaq creates a new FAQ (admin only)
// POST /api/admin/faqs
func CreateFaq(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var payload struct {
		Question string `json:"question"`
		Answer   string `json:"answer"`
		Category string `json:"category"`
		IsActive bool   `json:"is_active"`
		Order    int    `json:"order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Question == "" || payload.Answer == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Question and answer are required")
		return
	}

	now := time.Now()
	faq := models.Faq{
		ID:        primitive.NewObjectID(),
		Question:  payload.Question,
		Answer:    payload.Answer,
		Category:  payload.Category,
		IsActive:  payload.IsActive,
		Order:     payload.Order,
		CreatedAt: now,
		UpdatedAt: now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("faqs")

	if _, err := collection.InsertOne(ctx, faq); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating FAQ")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, faq)
}

// UpdateFaq updates an existing FAQ (admin only)
// PUT /api/admin/faqs/{id}
func UpdateFaq(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok || idStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "FAQ ID is required")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid FAQ ID")
		return
	}

	var payload struct {
		Question string `json:"question"`
		Answer   string `json:"answer"`
		Category string `json:"category"`
		IsActive bool   `json:"is_active"`
		Order    int    `json:"order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Question == "" || payload.Answer == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Question and answer are required")
		return
	}

	update := bson.M{
		"question":   payload.Question,
		"answer":     payload.Answer,
		"category":   payload.Category,
		"is_active":  payload.IsActive,
		"order":      payload.Order,
		"updated_at": time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("faqs")

	res, err := collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": update})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating FAQ")
		return
	}
	if res.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "FAQ not found")
		return
	}

	var updated models.Faq
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updated); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated FAQ")
		return
	}

	utils.JSONResponse(w, http.StatusOK, updated)
}

// DeleteFaq deletes an FAQ (admin only)
// DELETE /api/admin/faqs/{id}
func DeleteFaq(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok || idStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "FAQ ID is required")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid FAQ ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("faqs")

	res, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting FAQ")
		return
	}
	if res.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "FAQ not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "FAQ deleted successfully"})
}
