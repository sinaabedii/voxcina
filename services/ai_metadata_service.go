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
	ollamaEndpoint   string
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
	ollamaEndpoint := os.Getenv("OLLAMA_ENDPOINT")
	if ollamaEndpoint == "" {
		ollamaEndpoint = "http://host.docker.internal:10803" // Default local Ollama (bypass nginx auth)
	}

	// Load prompt configuration
	promptConfig, err := loadPromptConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt config: %v", err)
	}

	return &AIMetadataService{
		openRouterAPIKey: apiKey,
		ollamaEndpoint:   ollamaEndpoint,
		database:         db,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // Longer timeout for local models
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

	// Prepare messages
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
		req.Model = "qwen/qwen3.7-plus"
	}

	// Route to appropriate provider based on model
	var response string
	if s.isLocalModel(req.Model) {
		response, err = s.callOllama(req, messages)
		if err != nil {
			return nil, fmt.Errorf("Ollama API error: %v", err)
		}
	} else {
		// Call OpenRouter API
		openRouterReq := OpenRouterRequest{
			Model:       req.Model,
			Messages:    messages,
			MaxTokens:   2000,
			Temperature: 0.3,
		}

		response, err = s.callOpenRouter(openRouterReq)
		if err != nil {
			return nil, fmt.Errorf("OpenRouter API error: %v", err)
		}
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

// isLocalModel checks if the model should use local Ollama
func (s *AIMetadataService) isLocalModel(model string) bool {
	localModels := []string{
		"qwen3.5:9b",
		"gemma4:31b",
		"qwen3.6.1-27b-4b",
		"qwen3.6:27b-q4_K_M",
	}
	for _, m := range localModels {
		if strings.Contains(model, m) {
			return true
		}
	}
	return false
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

// OllamaRequest represents the request structure for Ollama API
type OllamaRequest struct {
	Model  string        `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Stream bool          `json:"stream"`
	Options map[string]interface{} `json:"options,omitempty"`
}

// OllamaMessage represents a message in Ollama chat
type OllamaMessage struct {
	Role    string      `json:"role"`
	Content string      `json:"content"`
	Images  []string    `json:"images,omitempty"` // Base64 encoded images
}

// OllamaResponse represents the response from Ollama API
type OllamaResponse struct {
	Message OllamaMessage `json:"message"`
	Done    bool          `json:"done"`
	Error   string        `json:"error,omitempty"`
}

// callOllama makes the API call to local Ollama
func (s *AIMetadataService) callOllama(req ProductMetadataRequest, messages []OpenRouterMessage) (string, error) {
	// Convert OpenRouter messages to Ollama format
	ollamaMessages := make([]OllamaMessage, 0, len(messages))
	for _, msg := range messages {
		// Handle content which could be string or array (for vision)
		content := ""
		var images []string
		
		switch c := msg.Content.(type) {
		case string:
			content = c
		case []interface{}:
			for _, item := range c {
				if m, ok := item.(map[string]interface{}); ok {
					if m["type"] == "text" {
						content = m["text"].(string)
					} else if m["type"] == "image_url" {
						if urlMap, ok := m["image_url"].(map[string]interface{}); ok {
							if url, ok := urlMap["url"].(string); ok {
								images = append(images, url)
							}
						}
					}
				}
			}
		}
		
		ollamaMessages = append(ollamaMessages, OllamaMessage{
			Role:    msg.Role,
			Content: content,
			Images:  images,
		})
	}

	ollamaReq := OllamaRequest{
		Model:    req.Model,
		Messages: ollamaMessages,
		Stream:   false,
		Options: map[string]interface{}{
			"temperature": 0.3,
			"num_predict": 2000,
		},
	}

	jsonData, err := json.Marshal(ollamaReq)
	if err != nil {
		return "", err
	}

	url := strings.TrimSuffix(s.ollamaEndpoint, "/") + "/api/chat"
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var ollamaResp OllamaResponse
	if err := json.Unmarshal(body, &ollamaResp); err != nil {
		return "", fmt.Errorf("failed to parse Ollama response: %v\nBody: %s", err, string(body))
	}

	if ollamaResp.Error != "" {
		return "", fmt.Errorf("Ollama error: %s", ollamaResp.Error)
	}

	return ollamaResp.Message.Content, nil
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

// validateMetadata validates and normalizes the generated metadata against vocabularies
func (s *AIMetadataService) validateMetadata(metadata *ProductMetadataResponse, vocabularies map[string][]models.VocabularyMapping) error {
	// Normalize material (find closest match, don't fail)
	if metadata.MaterialPersian != "" {
		normalized := s.findClosestVocabularyTerm(metadata.MaterialPersian, vocabularies["material"])
		if normalized != "" {
			metadata.MaterialPersian = normalized
		}
	}

	// Normalize style
	if metadata.StylePersian != "" {
		normalized := s.findClosestVocabularyTerm(metadata.StylePersian, vocabularies["style"])
		if normalized != "" {
			metadata.StylePersian = normalized
		}
	}

	// Normalize occasions
	var normalizedOccasions []string
	for _, occasion := range metadata.OccasionTags {
		normalized := s.findClosestVocabularyTerm(occasion, vocabularies["occasion"])
		if normalized != "" {
			normalizedOccasions = append(normalizedOccasions, normalized)
		}
	}
	if len(normalizedOccasions) > 0 {
		metadata.OccasionTags = normalizedOccasions
	}

	// Validate seasons (strict - fixed list)
	validSeasons := []string{"بهار", "تابستان", "پاییز", "زمستان"}
	var validSeasonList []string
	for _, season := range metadata.Season {
		if contains(validSeasons, season) {
			validSeasonList = append(validSeasonList, season)
		}
	}
	metadata.Season = validSeasonList

	// Validate fit type (strict - fixed list)
	validFitTypes := []string{"معمولی", "تنگ", "گشاد"}
	if !contains(validFitTypes, metadata.FitType) {
		metadata.FitType = "معمولی"
	}

	// Validate age group (strict - fixed list)
	validAgeGroups := []string{"بزرگسال", "نوجوان", "کودک"}
	if !contains(validAgeGroups, metadata.AgeGroup) {
		metadata.AgeGroup = "بزرگسال"
	}

	return nil
}

// findClosestVocabularyTerm finds the best matching vocabulary term using fuzzy matching
// Returns the StandardValue of the best match, or empty string if no reasonable match
func (s *AIMetadataService) findClosestVocabularyTerm(term string, vocabs []models.VocabularyMapping) string {
	term = strings.TrimSpace(term)
	if term == "" {
		return ""
	}

	// 1. Try exact match first
	for _, vocab := range vocabs {
		for _, persianTerm := range vocab.PersianTerms {
			if persianTerm == term {
				return vocab.StandardValue
			}
		}
	}

	// 2. Try partial match (term contains vocab term or vice versa)
	bestMatch := ""
	bestScore := 0
	for _, vocab := range vocabs {
		for _, persianTerm := range vocab.PersianTerms {
			score := s.calculateMatchScore(term, persianTerm)
			if score > bestScore {
				bestScore = score
				bestMatch = vocab.StandardValue
			}
		}
	}

	// Only return match if score is reasonably high (threshold: 3)
	if bestScore >= 3 {
		return bestMatch
	}

	// 3. No good match found - return original term (let it through)
	return term
}

// calculateMatchScore calculates similarity between two Persian terms
// Higher score = better match
func (s *AIMetadataService) calculateMatchScore(term1, term2 string) int {
	term1 = strings.TrimSpace(term1)
	term2 = strings.TrimSpace(term2)

	if term1 == term2 {
		return 10 // Exact match
	}

	if strings.Contains(term1, term2) || strings.Contains(term2, term1) {
		return 5 // Substring match
	}

	// Check word overlap
	words1 := strings.Fields(term1)
	words2 := strings.Fields(term2)
	overlap := 0
	for _, w1 := range words1 {
		for _, w2 := range words2 {
			if w1 == w2 {
				overlap++
			}
		}
	}
	if overlap > 0 {
		return 3 + overlap // Word overlap
	}

	return 0
}

// isValidVocabularyTerm checks if a term exists in the vocabulary (kept for backward compatibility)
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
