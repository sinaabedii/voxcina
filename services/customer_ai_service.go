package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// CustomerAIService handles AI-powered product search and recommendations for customers
type CustomerAIService struct {
	openRouterAPIKey string
	openRouterModel  string
	database         *mongo.Database
	httpClient       *http.Client
	config           *CustomerAIConfig
}

// CustomerAIConfig holds the customer AI agent configuration
type CustomerAIConfig struct {
	SystemPrompt       string                 `json:"system_prompt"`
	UserPromptTemplate string                 `json:"user_prompt_template"`
	FallbackMessages   []string               `json:"fallback_messages"`
	SearchStrategy     SearchStrategyConfig   `json:"search_strategy"`
}

// SearchStrategyConfig holds search strategy configuration
type SearchStrategyConfig struct {
	MaxResults         int                `json:"max_results"`
	MinScoreThreshold  float64            `json:"min_score_threshold"`
	UsePersianFields   bool               `json:"use_persian_fields"`
	BoostFactors       map[string]float64 `json:"boost_factors"`
}

// CustomerSearchRequest represents a customer search request
type CustomerSearchRequest struct {
	Query  string `json:"query"`
	UserID string `json:"user_id,omitempty"`
}

// CustomerSearchResponse represents the AI response with products
type CustomerSearchResponse struct {
	Response      string            `json:"response"`
	Products      []models.Product  `json:"products"`
	ProductIDs    []string          `json:"product_ids"`
	Success       bool              `json:"success"`
	IsAIGenerated bool              `json:"is_ai_generated"`
}

// Note: OpenRouter types are defined in openrouter_types.go

// NewCustomerAIService creates a new customer AI service instance
func NewCustomerAIService(db *mongo.Database) (*CustomerAIService, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set in environment")
	}

	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "deepseek/deepseek-r1:free" // Default model
	}

	// Load configuration
	config, err := loadCustomerAIConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load customer AI config: %v", err)
	}

	return &CustomerAIService{
		openRouterAPIKey: apiKey,
		openRouterModel:  model,
		database:         db,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		config: config,
	}, nil
}

// loadCustomerAIConfig loads the customer AI configuration from JSON file
func loadCustomerAIConfig() (*CustomerAIConfig, error) {
	data, err := os.ReadFile("config/ai_prompts.json")
	if err != nil {
		return nil, err
	}

	var config struct {
		CustomerSearchAgent CustomerAIConfig `json:"customer_search_agent"`
	}

	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config.CustomerSearchAgent, nil
}

// SearchProducts performs AI-powered product search
func (s *CustomerAIService) SearchProducts(ctx context.Context, req CustomerSearchRequest) (*CustomerSearchResponse, error) {
	// Step 1: Perform semantic search using AI-specific metadata fields
	productIDs, err := s.semanticProductSearch(ctx, req.Query)
	if err != nil {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// Step 2: Get full product details
	products, err := s.getProductsByIDs(ctx, productIDs)
	if err != nil {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// If no products found, try fallback
	if len(products) == 0 {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// Step 3: Build products context for AI
	productsContext := s.buildProductsContext(products)

	// Step 4: Get AI recommendation
	userPrompt := strings.ReplaceAll(s.config.UserPromptTemplate, "{query}", req.Query)
	userPrompt = strings.ReplaceAll(userPrompt, "{products_context}", productsContext)

	aiResponse, err := s.callOpenRouter(s.config.SystemPrompt, userPrompt)
	if err != nil {
		return s.getFallbackResponse(ctx, req.Query)
	}

	return &CustomerSearchResponse{
		Response:      aiResponse,
		Products:      products,
		ProductIDs:    productIDs,
		Success:       true,
		IsAIGenerated: true,
	}, nil
}

// semanticProductSearch performs intelligent search using AI-specific metadata fields
func (s *CustomerAIService) semanticProductSearch(ctx context.Context, query string) ([]string, error) {
	collection := s.database.Collection("products")
	
	// Extract search terms
	searchTerms := strings.Fields(strings.ToLower(query))
	
	// Build advanced filter using AI metadata fields
	var orConditions []bson.M
	
	for _, term := range searchTerms {
		// Search in Persian metadata fields (CRITICAL for Persian queries)
		orConditions = append(orConditions, 
			bson.M{"search_metadata.namePersian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.descriptionPersian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.keywords": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.tags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.materialPersian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.stylePersian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.colorsPersian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.occasionTags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.season": bson.M{"$regex": term, "$options": "i"}},
		)
		
		// Also search in English fields
		orConditions = append(orConditions,
			bson.M{"name": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"description": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"brand": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"category": bson.M{"$regex": term, "$options": "i"}},
		)
	}

	filter := bson.M{
		"$and": []bson.M{
			{"$or": orConditions},
			{"is_active": true},
		},
	}

	// Add limit
	limit := int64(s.config.SearchStrategy.MaxResults)
	
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var productIDs []string
	count := 0
	
	for cursor.Next(ctx) && count < int(limit) {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		productIDs = append(productIDs, result.ID.Hex())
		count++
	}

	return productIDs, nil
}

// getProductsByIDs retrieves full product details by IDs
func (s *CustomerAIService) getProductsByIDs(ctx context.Context, productIDs []string) ([]models.Product, error) {
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

	if len(objectIDs) == 0 {
		return []models.Product{}, nil
	}

	collection := s.database.Collection("products")
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

// buildProductsContext creates formatted product context for AI
func (s *CustomerAIService) buildProductsContext(products []models.Product) string {
	if len(products) == 0 {
		return "هیچ محصولی یافت نشد."
	}

	var context strings.Builder
	for i, product := range products {
		context.WriteString(fmt.Sprintf("%d. **%s**\n", i+1, product.Name))
		
		// Add Persian name if available
		if product.SearchMetadata != nil && product.SearchMetadata.NamePersian != "" {
			context.WriteString(fmt.Sprintf("   نام فارسی: %s\n", product.SearchMetadata.NamePersian))
		}
		
		context.WriteString(fmt.Sprintf("   قیمت: %s تومان\n", formatPrice(product.Price)))
		context.WriteString(fmt.Sprintf("   برند: %s\n", product.Brand))
		
		// Add AI metadata if available
		if product.SearchMetadata != nil {
			if product.SearchMetadata.MaterialPersian != "" {
				context.WriteString(fmt.Sprintf("   جنس: %s\n", product.SearchMetadata.MaterialPersian))
			}
			if product.SearchMetadata.StylePersian != "" {
				context.WriteString(fmt.Sprintf("   استایل: %s\n", product.SearchMetadata.StylePersian))
			}
			if len(product.SearchMetadata.ColorsPersian) > 0 {
				var colorNames []string
				for _, color := range product.SearchMetadata.ColorsPersian {
					colorNames = append(colorNames, color.NamePersian)
				}
				context.WriteString(fmt.Sprintf("   رنگ‌ها: %s\n", strings.Join(colorNames, "، ")))
			}
			if len(product.SearchMetadata.OccasionTags) > 0 {
				context.WriteString(fmt.Sprintf("   مناسب برای: %s\n", strings.Join(product.SearchMetadata.OccasionTags, "، ")))
			}
			if len(product.SearchMetadata.Season) > 0 {
				context.WriteString(fmt.Sprintf("   فصل: %s\n", strings.Join(product.SearchMetadata.Season, "، ")))
			}
		}
		
		// Add short description
		if product.Description != "" {
			desc := product.Description
			if len(desc) > 100 {
				desc = desc[:100] + "..."
			}
			context.WriteString(fmt.Sprintf("   توضیحات: %s\n", desc))
		}
		
		context.WriteString(fmt.Sprintf("   شناسه: %s\n\n", product.ID.Hex()))
	}

	return context.String()
}

// callOpenRouter makes a request to OpenRouter API
func (s *CustomerAIService) callOpenRouter(systemPrompt, userPrompt string) (string, error) {
	requestData := OpenRouterRequest{
		Model: s.openRouterModel,
		Messages: []OpenRouterMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   500,
		Temperature: 0.7,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", fmt.Errorf("error marshaling request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openRouterAPIKey)
	req.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
	req.Header.Set("X-Title", "Voxcina Customer Search")

	resp, err := s.httpClient.Do(req)
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

	if openRouterResp.Error != nil {
		return "", fmt.Errorf("OpenRouter error: %s", openRouterResp.Error.Message)
	}

	if len(openRouterResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return openRouterResp.Choices[0].Message.Content, nil
}

// getFallbackResponse provides fallback when AI is unavailable
func (s *CustomerAIService) getFallbackResponse(ctx context.Context, query string) (*CustomerSearchResponse, error) {
	// Simple search fallback
	productIDs, err := s.semanticProductSearch(ctx, query)
	if err != nil {
		return nil, err
	}

	// If still no products, get popular ones
	if len(productIDs) == 0 {
		productIDs, err = s.getPopularProductIDs(ctx, 4)
		if err != nil {
			return nil, err
		}
	}

	products, err := s.getProductsByIDs(ctx, productIDs)
	if err != nil {
		return nil, err
	}

	// Random fallback message
	fallbackMsg := s.config.FallbackMessages[0]
	if len(s.config.FallbackMessages) > 1 {
		fallbackMsg = s.config.FallbackMessages[time.Now().Second()%len(s.config.FallbackMessages)]
	}

	return &CustomerSearchResponse{
		Response:      fallbackMsg,
		Products:      products,
		ProductIDs:    productIDs,
		Success:       false,
		IsAIGenerated: false,
	}, nil
}

// getPopularProductIDs gets popular product IDs as fallback
func (s *CustomerAIService) getPopularProductIDs(ctx context.Context, limit int) ([]string, error) {
	collection := s.database.Collection("products")
	filter := bson.M{
		"is_active": true,
	}

	// Sort by rating and review count
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var productIDs []string
	count := 0
	
	for cursor.Next(ctx) && count < limit {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		productIDs = append(productIDs, result.ID.Hex())
		count++
	}

	return productIDs, nil
}

// formatPrice formats price with thousand separators
func formatPrice(price float64) string {
	priceStr := fmt.Sprintf("%.0f", price)
	// Add thousand separators
	n := len(priceStr)
	if n <= 3 {
		return priceStr
	}
	
	var result strings.Builder
	for i, c := range priceStr {
		if i > 0 && (n-i)%3 == 0 {
			result.WriteString(",")
		}
		result.WriteRune(c)
	}
	return result.String()
}
