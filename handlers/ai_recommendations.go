package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// AISearchRequest represents the request structure for AI-powered search
type AISearchRequest struct {
	Query  string `json:"query"`
	UserID string `json:"user_id,omitempty"`
}

// AISearchResponse represents the response from AI-powered search
type AISearchResponse struct {
	AIResponse     string            `json:"ai_response"`
	Products       []models.Product  `json:"products"`
	Success        bool              `json:"success"`
	IsAIGenerated  bool              `json:"is_ai_generated"`
	SearchQuery    string            `json:"search_query"`
}

// SmartSearch handles POST /api/search/smart
// This endpoint provides AI-powered product search and recommendations
func SmartSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse request body
	var searchReq AISearchRequest
	if err := json.NewDecoder(r.Body).Decode(&searchReq); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if searchReq.Query == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Search query is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize AI service
	aiService := utils.NewAIService()

	// Get AI recommendations
	aiResponse, err := aiService.GetRecommendation(ctx, searchReq.Query)
	if err != nil {
		log.Printf("Error getting AI recommendations: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get recommendations")
		return
	}

	// Get product details
	products, err := getProductsByIDs(ctx, aiResponse.ProductIDs)
	if err != nil {
		log.Printf("Error getting recommended products: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get product details")
		return
	}

	// Build response
	response := AISearchResponse{
		AIResponse:    aiResponse.Response,
		Products:      products,
		Success:       true,
		IsAIGenerated: aiResponse.Success,
		SearchQuery:   searchReq.Query,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// ChatRecommendation handles POST /api/chat/recommend
// This endpoint provides conversational AI recommendations
func ChatRecommendation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse request body
	var chatReq struct {
		Message string `json:"message"`
		UserID  string `json:"user_id,omitempty"`
		ChatID  string `json:"chat_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&chatReq); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if chatReq.Message == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Message is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize AI service
	aiService := utils.NewAIService()

	// Get AI recommendations
	aiResponse, err := aiService.GetRecommendation(ctx, chatReq.Message)
	if err != nil {
		log.Printf("Error getting chat recommendations: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get recommendations")
		return
	}

	// Get product details
	products, err := getProductsByIDs(ctx, aiResponse.ProductIDs)
	if err != nil {
		log.Printf("Error getting recommended products: %v", err)
		return
	}

	// Build chat response
	response := struct {
		Response      string           `json:"response"`
		Products      []models.Product `json:"products"`
		Success       bool             `json:"success"`
		IsAIGenerated bool             `json:"is_ai_generated"`
		ChatID        string           `json:"chat_id,omitempty"`
	}{
		Response:      aiResponse.Response,
		Products:      products,
		Success:       true,
		IsAIGenerated: aiResponse.Success,
		ChatID:        chatReq.ChatID,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// EnhancedProductRecommendations handles GET /api/products/smart-recommendations
// This provides AI-powered product recommendations based on query parameters
func EnhancedProductRecommendations(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		// If no query provided, fall back to regular recommendations
		ProductRecommendations(w, r)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize AI service
	aiService := utils.NewAIService()

	// Get AI recommendations
	aiResponse, err := aiService.GetRecommendation(ctx, query)
	if err != nil {
		log.Printf("Error getting enhanced recommendations: %v", err)
		// Fall back to regular recommendations
		ProductRecommendations(w, r)
		return
	}

	// Get product details
	products, err := getProductsByIDs(ctx, aiResponse.ProductIDs)
	if err != nil {
		log.Printf("Error getting recommended products: %v", err)
		// Fall back to regular recommendations
		ProductRecommendations(w, r)
		return
	}

	// Build response similar to regular recommendations but enhanced
	response := struct {
		Products      []models.Product `json:"products"`
		AIResponse    string           `json:"ai_response,omitempty"`
		IsAIGenerated bool             `json:"is_ai_generated"`
		Query         string           `json:"query"`
	}{
		Products:      products,
		AIResponse:    aiResponse.Response,
		IsAIGenerated: aiResponse.Success,
		Query:         query,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// Helper function to get products by IDs
func getProductsByIDs(ctx context.Context, productIDs []string) ([]models.Product, error) {
	if len(productIDs) == 0 {
		return []models.Product{}, nil
	}

	var objectIDs []primitive.ObjectID
	for _, id := range productIDs {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			log.Printf("Invalid product ID: %s", id)
			continue
		}
		objectIDs = append(objectIDs, objID)
	}

	if len(objectIDs) == 0 {
		return []models.Product{}, nil
	}

	collection := db.Database.Collection("products")
	filter := bson.M{
		"_id":       bson.M{"$in": objectIDs},
		"is_active": true,
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}

	return products, nil
}

// GetSearchSuggestions handles GET /api/search/suggestions/smart?q=<query>
// This provides AI-enhanced search suggestions
func GetSearchSuggestions(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if len(query) < 2 {
		utils.JSONResponse(w, http.StatusOK, []string{})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get basic suggestions from products
	collection := db.Database.Collection("products")
	
	// Search in product names and descriptions
	filter := bson.M{
		"is_active": true,
		"$or": []bson.M{
			{"name": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
			{"brand": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error getting search suggestions: %v", err)
		utils.JSONResponse(w, http.StatusOK, []string{})
		return
	}
	defer cursor.Close(ctx)

	var suggestions []string
	suggestionSet := make(map[string]bool) // To avoid duplicates

	for cursor.Next(ctx) {
		var product models.Product
		if err := cursor.Decode(&product); err != nil {
			continue
		}

		// Add product name as suggestion
		if !suggestionSet[product.Name] {
			suggestions = append(suggestions, product.Name)
			suggestionSet[product.Name] = true
		}

		// Add brand as suggestion
		if product.Brand != "" && !suggestionSet[product.Brand] {
			suggestions = append(suggestions, product.Brand)
			suggestionSet[product.Brand] = true
		}

		// Limit suggestions to 10
		if len(suggestions) >= 10 {
			break
		}
	}

	utils.JSONResponse(w, http.StatusOK, suggestions)
}
