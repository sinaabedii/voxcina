package handlers

import (
	"context"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// GetVocabularyMappings handles GET /api/vocabulary-mappings
func GetVocabularyMappings(w http.ResponseWriter, r *http.Request) {
	collection := db.Database.Collection("vocabulary_mappings")
	
	ctx := context.Background()
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch vocabularies: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var vocabularies []models.VocabularyMapping
	if err := cursor.All(ctx, &vocabularies); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decode vocabularies: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, vocabularies)
}
