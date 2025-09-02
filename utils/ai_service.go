package utils

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
)

// OpenRouterRequest represents the request structure for OpenRouter API
type OpenRouterRequest struct {
	Model     string                   `json:"model"`
	Messages  []OpenRouterMessage      `json:"messages"`
	MaxTokens int                      `json:"max_tokens"`
	Temperature float64                `json:"temperature"`
}

// OpenRouterMessage represents a message in the conversation
type OpenRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenRouterResponse represents the response from OpenRouter API
type OpenRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// AIRecommendationRequest represents the input for AI recommendations
type AIRecommendationRequest struct {
	UserMessage string `json:"user_message"`
	UserID      string `json:"user_id,omitempty"`
}

// AIRecommendationResponse represents the AI response with product recommendations
type AIRecommendationResponse struct {
	Response   string   `json:"response"`
	ProductIDs []string `json:"product_ids"`
	Success    bool     `json:"success"`
}

// AIService handles LLM-powered product recommendations
type AIService struct {
	openRouterAPIKey string
	openRouterModel  string
	baseURL          string
	httpClient       *http.Client
}

// NewAIService creates a new AI service instance
func NewAIService() *AIService {
	return &AIService{
		openRouterAPIKey: getEnv("OPENROUTER_API_KEY", ""),
		openRouterModel:  getEnv("OPENROUTER_MODEL", "deepseek/deepseek-r1:free"),
		baseURL:          "https://openrouter.ai/api/v1",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetRecommendation generates AI-powered product recommendations
func (ai *AIService) GetRecommendation(ctx context.Context, userMessage string) (*AIRecommendationResponse, error) {
	// First, perform semantic search to get relevant products
	productIDs, err := ai.semanticProductSearch(ctx, userMessage)
	if err != nil {
		log.Printf("Error in semantic search: %v", err)
		return ai.getFallbackRecommendation(ctx, userMessage)
	}

	// If no OpenRouter API key, return fallback
	if ai.openRouterAPIKey == "" {
		log.Println("No OpenRouter API key configured, using fallback recommendations")
		return ai.getFallbackRecommendation(ctx, userMessage)
	}

	// Get product details for context
	products, err := ai.getProductsByIDs(ctx, productIDs)
	if err != nil {
		log.Printf("Error getting products: %v", err)
		return ai.getFallbackRecommendation(ctx, userMessage)
	}

	// Build context for LLM
	productsContext := ai.buildProductsContext(products)

	// Create system prompt
	systemPrompt := fmt.Sprintf(`You are a helpful and knowledgeable sales assistant for an Iranian ecommerce store called Voxcina.
Based on the customer's message and the available products below, provide personalized product recommendations in Persian/Farsi.

Available Products:
%s

Guidelines:
- Respond in Persian/Farsi language
- Be conversational and helpful
- Focus on products that best match their needs
- Explain why you're recommending specific products
- If no products match well, suggest alternatives
- Keep responses concise but informative
- Use a friendly, professional tone

Customer Message: %s`, productsContext, userMessage)

	// Call OpenRouter API
	aiResponse, err := ai.callOpenRouter(systemPrompt, userMessage)
	if err != nil {
		log.Printf("Error calling OpenRouter API: %v", err)
		return ai.getFallbackRecommendation(ctx, userMessage)
	}

	return &AIRecommendationResponse{
		Response:   aiResponse,
		ProductIDs: productIDs,
		Success:    true,
	}, nil
}

// semanticProductSearch performs semantic search on products
func (ai *AIService) semanticProductSearch(ctx context.Context, query string) ([]string, error) {
	// For now, implement a simple keyword-based search
	// In production, this would use vector embeddings like in SellerAgent
	collection := db.Database.Collection("products")
	
	// Create search filter
	searchTerms := strings.Fields(strings.ToLower(query))
	var orFilters []bson.M
	
	for _, term := range searchTerms {
		orFilters = append(orFilters, bson.M{
			"$or": []bson.M{
				{"name": bson.M{"$regex": term, "$options": "i"}},
				{"description": bson.M{"$regex": term, "$options": "i"}},
				{"brand": bson.M{"$regex": term, "$options": "i"}},
			},
		})
	}
	
	filter := bson.M{
		"is_active": true,
		"in_stock": true,
	}
	
	if len(orFilters) > 0 {
		filter["$or"] = orFilters
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

	// Convert to string IDs and limit to top 8
	var productIDs []string
	for i, product := range products {
		if i >= 8 { // Limit to top 8 products
			break
		}
		productIDs = append(productIDs, product.ID.Hex())
	}

	return productIDs, nil
}

// getProductsByIDs retrieves products by their IDs
func (ai *AIService) getProductsByIDs(ctx context.Context, productIDs []string) ([]models.Product, error) {
	if len(productIDs) == 0 {
		return []models.Product{}, nil
	}

	var objectIDs []primitive.ObjectID
	for _, id := range productIDs {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		objectIDs = append(objectIDs, objID)
	}

	collection := db.Database.Collection("products")
	filter := bson.M{
		"_id": bson.M{"$in": objectIDs},
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

// buildProductsContext creates a formatted string of products for LLM context
func (ai *AIService) buildProductsContext(products []models.Product) string {
	if len(products) == 0 {
		return "No products available."
	}

	var context strings.Builder
	for i, product := range products {
		context.WriteString(fmt.Sprintf("%d. نام: %s\n", i+1, product.Name))
		context.WriteString(fmt.Sprintf("   قیمت: %d تومان\n", int(product.Price)))
		context.WriteString(fmt.Sprintf("   برند: %s\n", product.Brand))
		if product.Description != "" {
			// Limit description to 100 characters
			desc := product.Description
			if len(desc) > 100 {
				desc = desc[:100] + "..."
			}
			context.WriteString(fmt.Sprintf("   توضیحات: %s\n", desc))
		}
		context.WriteString(fmt.Sprintf("   شناسه محصول: %s\n\n", product.ID.Hex()))
	}

	return context.String()
}

// callOpenRouter makes a request to OpenRouter API
func (ai *AIService) callOpenRouter(systemPrompt, userMessage string) (string, error) {
	requestData := OpenRouterRequest{
		Model: ai.openRouterModel,
		Messages: []OpenRouterMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
		},
		MaxTokens:   500,
		Temperature: 0.7,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", fmt.Errorf("error marshaling request: %v", err)
	}

	req, err := http.NewRequest("POST", ai.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ai.openRouterAPIKey)
	req.Header.Set("HTTP-Referer", "https://voxcina.com")
	req.Header.Set("X-Title", "Voxcina E-commerce")

	resp, err := ai.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenRouter API error (status %d): %s", resp.StatusCode, string(body))
	}

	var openRouterResp OpenRouterResponse
	if err := json.Unmarshal(body, &openRouterResp); err != nil {
		return "", fmt.Errorf("error unmarshaling response: %v", err)
	}

	if len(openRouterResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in OpenRouter response")
	}

	return openRouterResp.Choices[0].Message.Content, nil
}

// getFallbackRecommendation provides fallback recommendations when AI is unavailable
func (ai *AIService) getFallbackRecommendation(ctx context.Context, userMessage string) (*AIRecommendationResponse, error) {
	// Simple keyword-based fallback
	productIDs, err := ai.semanticProductSearch(ctx, userMessage)
	if err != nil {
		return nil, err
	}

	// If no products found, get some popular products
	if len(productIDs) == 0 {
		products, err := ai.getPopularProducts(ctx, 4)
		if err != nil {
			return nil, err
		}
		
		for _, product := range products {
			productIDs = append(productIDs, product.ID.Hex())
		}
	}

	responses := []string{
		"بر اساس جستجوی شما، این محصولات را پیشنهاد می‌کنم:",
		"محصولات مناسب برای شما پیدا کردم:",
		"این گزینه‌ها ممکن است مورد علاقه شما باشند:",
		"بهترین محصولات متناسب با نیاز شما:",
	}

	// Simple random selection
	responseIndex := len(responses) % len(responses)
	
	return &AIRecommendationResponse{
		Response:   responses[responseIndex],
		ProductIDs: productIDs,
		Success:    false, // Mark as fallback
	}, nil
}

// getPopularProducts gets popular products as fallback
func (ai *AIService) getPopularProducts(ctx context.Context, limit int) ([]models.Product, error) {
	collection := db.Database.Collection("products")
	filter := bson.M{
		"is_active": true,
		"in_stock":  true,
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	count := 0
	for cursor.Next(ctx) && count < limit {
		var product models.Product
		if err := cursor.Decode(&product); err != nil {
			continue
		}
		products = append(products, product)
		count++
	}

	return products, nil
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
