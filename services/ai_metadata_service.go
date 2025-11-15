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
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// AIMetadataService handles AI-powered product metadata generation
type AIMetadataService struct {
	openRouterAPIKey string
	database         *mongo.Database
	httpClient       *http.Client
	promptConfig     *AIPromptConfig
}

// AIPromptConfig holds the prompt configuration
type AIPromptConfig struct {
	SystemPrompt        string                       `json:"system_prompt"`
	UserPromptTemplate  string                       `json:"user_prompt_template"`
	ExtractionRules     map[string]interface{}       `json:"extraction_rules"`
	FieldDescriptions   map[string]string            `json:"field_descriptions"`
	ValidationMessages  map[string]string            `json:"validation_messages"`
}

// ProductMetadataRequest represents the input for AI generation
type ProductMetadataRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Brand       string   `json:"brand"`
	Price       float64  `json:"price"`
	Gender      string   `json:"gender"`
	Images      []string `json:"images"` // URLs or base64
	Model       string   `json:"model"`  // AI model to use
}

// ProductMetadataResponse represents the AI-generated metadata
type ProductMetadataResponse struct {
	NamePersian        string   `json:"namePersian"`
	DescriptionPersian string   `json:"descriptionPersian"`
	Keywords           []string `json:"keywords"`
	Tags               []string `json:"tags"`
	MaterialPersian    string   `json:"materialPersian"`
	StylePersian       string   `json:"stylePersian"`
	OccasionTags       []string `json:"occasionTags"`
	Season             []string `json:"season"`
	FitType            string   `json:"fitType"`
	AgeGroup           string   `json:"ageGroup"`
	Confidence         float64  `json:"confidence"`
	Reasoning          string   `json:"reasoning"`
}

// Note: OpenRouter types are now defined in openrouter_types.go

// NewAIMetadataService creates a new AI metadata service
func NewAIMetadataService(db *mongo.Database) (*AIMetadataService, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set in environment")
	}

	// Load prompt configuration
	promptConfig, err := loadPromptConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt config: %v", err)
	}

	return &AIMetadataService{
		openRouterAPIKey: apiKey,
		database:         db,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		promptConfig: promptConfig,
	}, nil
}

// loadPromptConfig loads the AI prompt configuration from JSON file
func loadPromptConfig() (*AIPromptConfig, error) {
	data, err := os.ReadFile("config/ai_prompts.json")
	if err != nil {
		return nil, err
	}

	var config struct {
		ProductMetadataGeneration AIPromptConfig `json:"product_metadata_generation"`
	}

	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config.ProductMetadataGeneration, nil
}

// GenerateMetadata generates product metadata using AI
func (s *AIMetadataService) GenerateMetadata(ctx context.Context, req ProductMetadataRequest) (*ProductMetadataResponse, error) {
	// Get vocabulary options from database
	vocabularies, err := s.getVocabularies(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get vocabularies: %v", err)
	}

	// Build user prompt with vocabulary options
	userPrompt := s.buildUserPrompt(req, vocabularies)

	// Prepare messages for OpenRouter
	messages := []OpenRouterMessage{
		{
			Role:    "system",
			Content: s.promptConfig.SystemPrompt,
		},
	}

	// If images are provided, use vision model
	if len(req.Images) > 0 {
		messages = append(messages, s.buildVisionMessage(userPrompt, req.Images))
	} else {
		messages = append(messages, OpenRouterMessage{
			Role:    "user",
			Content: userPrompt,
		})
	}

	// Set default model if not specified
	if req.Model == "" {
		req.Model = "anthropic/claude-3.5-sonnet"
	}

	// Call OpenRouter API
	openRouterReq := OpenRouterRequest{
		Model:       req.Model,
		Messages:    messages,
		MaxTokens:   2000,
		Temperature: 0.3, // Lower temperature for more consistent output
	}

	response, err := s.callOpenRouter(openRouterReq)
	if err != nil {
		return nil, fmt.Errorf("OpenRouter API error: %v", err)
	}

	// Parse AI response
	metadata, err := s.parseAIResponse(response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %v", err)
	}

	// Validate metadata against vocabularies
	if err := s.validateMetadata(metadata, vocabularies); err != nil {
		return nil, fmt.Errorf("validation error: %v", err)
	}

	return metadata, nil
}

// getVocabularies retrieves vocabulary options from database
func (s *AIMetadataService) getVocabularies(ctx context.Context) (map[string][]models.VocabularyMapping, error) {
	collection := s.database.Collection("vocabulary_mappings")
	
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	vocabularies := make(map[string][]models.VocabularyMapping)
	
	for cursor.Next(ctx) {
		var vocab models.VocabularyMapping
		if err := cursor.Decode(&vocab); err != nil {
			continue
		}
		vocabularies[vocab.Type] = append(vocabularies[vocab.Type], vocab)
	}

	return vocabularies, nil
}

// buildUserPrompt creates the user prompt with vocabulary options
func (s *AIMetadataService) buildUserPrompt(req ProductMetadataRequest, vocabularies map[string][]models.VocabularyMapping) string {
	prompt := s.promptConfig.UserPromptTemplate

	// Replace placeholders
	prompt = strings.ReplaceAll(prompt, "{name}", req.Name)
	prompt = strings.ReplaceAll(prompt, "{description}", req.Description)
	prompt = strings.ReplaceAll(prompt, "{category}", req.Category)
	prompt = strings.ReplaceAll(prompt, "{brand}", req.Brand)
	prompt = strings.ReplaceAll(prompt, "{price}", fmt.Sprintf("%.0f", req.Price))
	prompt = strings.ReplaceAll(prompt, "{gender}", req.Gender)

	// Build vocabulary lists
	prompt = strings.ReplaceAll(prompt, "{materials_vocab}", s.formatVocabulary(vocabularies["material"]))
	prompt = strings.ReplaceAll(prompt, "{styles_vocab}", s.formatVocabulary(vocabularies["style"]))
	prompt = strings.ReplaceAll(prompt, "{colors_vocab}", s.formatVocabulary(vocabularies["color"]))
	prompt = strings.ReplaceAll(prompt, "{occasions_vocab}", s.formatVocabulary(vocabularies["occasion"]))

	return prompt
}

// formatVocabulary formats vocabulary entries for the prompt
func (s *AIMetadataService) formatVocabulary(vocabs []models.VocabularyMapping) string {
	var lines []string
	for _, v := range vocabs {
		persianTerms := strings.Join(v.PersianTerms, ", ")
		lines = append(lines, fmt.Sprintf("- %s (%s)", persianTerms, v.Category))
	}
	return strings.Join(lines, "\n")
}

// buildVisionMessage creates a message with images for vision models
func (s *AIMetadataService) buildVisionMessage(textContent string, images []string) OpenRouterMessage {
	content := []map[string]interface{}{
		{
			"type": "text",
			"text": textContent,
		},
	}

	// Add up to 3 images (most models have limits)
	maxImages := 3
	if len(images) > maxImages {
		images = images[:maxImages]
	}

	for _, imgURL := range images {
		content = append(content, map[string]interface{}{
			"type": "image_url",
			"image_url": map[string]string{
				"url": imgURL,
			},
		})
	}

	return OpenRouterMessage{
		Role:    "user",
		Content: content,
	}
}

// callOpenRouter makes the API call to OpenRouter
func (s *AIMetadataService) callOpenRouter(req OpenRouterRequest) (string, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.openRouterAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
	httpReq.Header.Set("X-Title", "Product Metadata Generator")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var openRouterResp OpenRouterResponse
	if err := json.Unmarshal(body, &openRouterResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	if openRouterResp.Error != nil {
		return "", fmt.Errorf("OpenRouter error: %s", openRouterResp.Error.Message)
	}

	if len(openRouterResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return openRouterResp.Choices[0].Message.Content, nil
}

// parseAIResponse parses the AI response into structured metadata
func (s *AIMetadataService) parseAIResponse(response string) (*ProductMetadataResponse, error) {
	// Remove markdown code blocks if present
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	var metadata ProductMetadataResponse
	if err := json.Unmarshal([]byte(response), &metadata); err != nil {
		return nil, fmt.Errorf("invalid JSON response: %v\nResponse: %s", err, response)
	}

	return &metadata, nil
}

// validateMetadata validates the generated metadata against vocabularies
func (s *AIMetadataService) validateMetadata(metadata *ProductMetadataResponse, vocabularies map[string][]models.VocabularyMapping) error {
	// Validate material
	if !s.isValidVocabularyTerm(metadata.MaterialPersian, vocabularies["material"]) {
		return fmt.Errorf("invalid material: %s", metadata.MaterialPersian)
	}

	// Validate style
	if !s.isValidVocabularyTerm(metadata.StylePersian, vocabularies["style"]) {
		return fmt.Errorf("invalid style: %s", metadata.StylePersian)
	}

	// Validate occasions
	for _, occasion := range metadata.OccasionTags {
		if !s.isValidVocabularyTerm(occasion, vocabularies["occasion"]) {
			return fmt.Errorf("invalid occasion: %s", occasion)
		}
	}

	// Validate seasons
	validSeasons := []string{"بهار", "تابستان", "پاییز", "زمستان"}
	for _, season := range metadata.Season {
		if !contains(validSeasons, season) {
			return fmt.Errorf("invalid season: %s", season)
		}
	}

	// Validate fit type
	validFitTypes := []string{"معمولی", "تنگ", "گشاد"}
	if !contains(validFitTypes, metadata.FitType) {
		return fmt.Errorf("invalid fit type: %s", metadata.FitType)
	}

	// Validate age group
	validAgeGroups := []string{"بزرگسال", "نوجوان", "کودک"}
	if !contains(validAgeGroups, metadata.AgeGroup) {
		return fmt.Errorf("invalid age group: %s", metadata.AgeGroup)
	}

	return nil
}

// isValidVocabularyTerm checks if a term exists in the vocabulary
func (s *AIMetadataService) isValidVocabularyTerm(term string, vocabs []models.VocabularyMapping) bool {
	for _, vocab := range vocabs {
		for _, persianTerm := range vocab.PersianTerms {
			if persianTerm == term {
				return true
			}
		}
	}
	return false
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// GetAvailableModels returns the list of available AI models
func (s *AIMetadataService) GetAvailableModels() ([]map[string]interface{}, error) {
	data, err := os.ReadFile("config/ai_prompts.json")
	if err != nil {
		return nil, err
	}

	var config struct {
		RecommendedModels []map[string]interface{} `json:"recommended_models"`
	}

	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return config.RecommendedModels, nil
}
