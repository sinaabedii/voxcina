package handlers

import (
	"encoding/json"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestProductResponseIncludesCategoryIDs(t *testing.T) {
	categoryID := primitive.NewObjectID()
	data, err := json.Marshal(ProductResponse{CategoryIDs: []primitive.ObjectID{categoryID}})
	if err != nil {
		t.Fatalf("failed to marshal product response: %v", err)
	}

	var payload struct {
		CategoryIDs []string `json:"category_ids"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("failed to decode product response: %v", err)
	}
	if len(payload.CategoryIDs) != 1 || payload.CategoryIDs[0] != categoryID.Hex() {
		t.Fatalf("category_ids = %v, want [%s]", payload.CategoryIDs, categoryID.Hex())
	}
}
