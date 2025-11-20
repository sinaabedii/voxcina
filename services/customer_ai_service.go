package services

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
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

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
	SystemPrompt       string               `json:"system_prompt"`
	UserPromptTemplate string               `json:"user_prompt_template"`
	FallbackMessages   []string             `json:"fallback_messages"`
	SearchStrategy     SearchStrategyConfig `json:"search_strategy"`
}

// SearchStrategyConfig holds search strategy configuration
type SearchStrategyConfig struct {
	MaxResults        int                `json:"max_results"`
	MinScoreThreshold float64            `json:"min_score_threshold"`
	UsePersianFields  bool               `json:"use_persian_fields"`
	BoostFactors      map[string]float64 `json:"boost_factors"`
}

// CustomerSearchRequest represents a customer search request
type CustomerSearchRequest struct {
	Query  string `json:"query"`
	UserID string `json:"user_id,omitempty"`
	ChatID string `json:"chat_id,omitempty"`
}

// CustomerSearchResponse represents the AI response with products
type CustomerSearchResponse struct {
	Response      string           `json:"response"`
	Products      []models.Product `json:"products"`
	ProductIDs    []string         `json:"product_ids"`
	Success       bool             `json:"success"`
	IsAIGenerated bool             `json:"is_ai_generated"`
}

type ParsedFilters struct {
	Colors       []string
	ProductTypes []string
	Sizes        []string
}

type SupportAgentRequest struct {
	Query  string
	UserID string
	ChatID string
}

type SupportAgentResult struct {
	Reply              string
	ShouldCreateTicket bool
	TicketSubject      string
	TicketBody         string
}

// Note: OpenRouter types are defined in openrouter_types.go

// NewCustomerAIService creates a new customer AI service instance
func NewCustomerAIService(db *mongo.Database) (*CustomerAIService, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		// Run in fallback-only mode when no API key is configured
		log.Println(
			"OPENROUTER_API_KEY not set - CustomerAIService will use fallback responses only",
		)
	}

	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "deepseek/deepseek-r1:free" // Default model
	}

	// Load configuration
	config, err := loadCustomerAIConfig()
	if err != nil {
		log.Printf(
			"Warning: failed to load customer AI config: %v; using built-in defaults",
			err,
		)
		config = defaultCustomerAIConfig()
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

// defaultCustomerAIConfig provides a safe fallback configuration when the JSON file is missing
func defaultCustomerAIConfig() *CustomerAIConfig {
	return &CustomerAIConfig{
		SystemPrompt:       "You are Voxcina Shopping Assistant, a helpful Persian e-commerce assistant. You receive the customer's query, a summary of their browsing and purchase activity, recent chat history, and a list of candidate products from the catalog. Use this information to give highly personalized, concise recommendations in Persian/Farsi.",
		UserPromptTemplate: "Customer query: {query}\n\nUser context:\n{user_context}\n\nChat history:\n{chat_context}\n\nProducts:\n{products_context}",
		FallbackMessages: []string{
			"بر اساس جستجوی شما، این محصولات را پیشنهاد می‌کنم:",
			"محصولات مناسب برای شما پیدا کردم:",
		},
		SearchStrategy: SearchStrategyConfig{
			MaxResults:        8,
			MinScoreThreshold: 0.3,
			UsePersianFields:  true,
			BoostFactors: map[string]float64{
				"exact_keyword_match": 2.0,
			},
		},
	}
}

// SearchProducts performs AI-powered product search
func (s *CustomerAIService) SearchProducts(
	ctx context.Context,
	req CustomerSearchRequest,
) (*CustomerSearchResponse, error) {
	// Step 1: Perform semantic search using AI-specific metadata fields
	productIDs, err := s.personalizedSemanticProductSearch(ctx, req)
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

	// If OpenRouter API key is not configured, use fallback-only mode (no external LLM)
	if s.openRouterAPIKey == "" {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// Step 3: Build products context for AI
	productsContext := s.buildProductsContext(products)
	userContext := s.buildUserContext(ctx, req)
	chatContext := s.buildChatContext(ctx, req)

	// Step 4: Get AI recommendation
	userPrompt := strings.ReplaceAll(s.config.UserPromptTemplate, "{query}", req.Query)
	userPrompt = strings.ReplaceAll(userPrompt, "{products_context}", productsContext)
	userPrompt = strings.ReplaceAll(userPrompt, "{user_context}", userContext)
	userPrompt = strings.ReplaceAll(userPrompt, "{chat_context}", chatContext)

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

func (s *CustomerAIService) MaybeAskClarification(
	ctx context.Context,
	req CustomerSearchRequest,
) (bool, string) {
	if s.openRouterAPIKey == "" {
		return false, ""
	}

	trimmed := strings.TrimSpace(req.Query)
	if trimmed == "" {
		return false, ""
	}

	chatContext := s.buildChatContext(ctx, req)

	systemPrompt := `You are Voxcina AI shopping assistant orchestrator.
You decide whether a clarifying question is needed before searching for products.

You receive the latest user query and recent chat history (in Persian or English).

Your output MUST be ONLY a valid JSON object with this exact shape:
{
  "needs_clarification": true or false,
  "clarification_question": "..."
}

Rules:
- If the user has already provided enough concrete details (for example clear product type and at least one of size, color, or style), set "needs_clarification" to false and "clarification_question" to an empty string.
- If important information is missing (for example size, color, gender, product type, occasion, or budget) and asking one short question would significantly improve the recommendation, set "needs_clarification" to true and ask exactly ONE concise clarifying question in Persian.
- The clarifying question must be in Persian and suitable to show directly to the user.
- If "needs_clarification" is false, "clarification_question" MUST be an empty string.
- Do not include any text before or after the JSON.`

	userPrompt := fmt.Sprintf(
		"Current user query:\n%s\n\nRecent chat history (most recent last):\n%s",
		trimmed,
		chatContext,
	)

	aiResponse, err := s.callOpenRouter(systemPrompt, userPrompt)
	if err != nil {
		log.Printf("Warning: failed to run clarification agent: %v", err)
		return false, ""
	}

	var parsed struct {
		NeedsClarification    bool   `json:"needs_clarification"`
		ClarificationQuestion string `json:"clarification_question"`
	}
	if err := json.Unmarshal([]byte(aiResponse), &parsed); err != nil {
		log.Printf("Warning: failed to unmarshal clarification JSON: %v", err)
		return false, ""
	}

	if parsed.NeedsClarification {
		q := strings.TrimSpace(parsed.ClarificationQuestion)
		if q == "" {
			return false, ""
		}
		return true, q
	}

	return false, ""
}

func (s *CustomerAIService) RunSupportAgent(
	ctx context.Context,
	req SupportAgentRequest,
) SupportAgentResult {
	defaultReply := "در حال حاضر پشتیبانی هوشمند در دسترس نیست. لطفاً در صورت نیاز از بخش تیکت‌ها یا فرم تماس با ما استفاده کنید."
	result := SupportAgentResult{
		Reply:              defaultReply,
		ShouldCreateTicket: false,
	}

	if s.openRouterAPIKey == "" {
		return result
	}

	trimmed := strings.TrimSpace(req.Query)
	if trimmed == "" {
		return result
	}

	chatCtx := s.buildChatContext(
		ctx,
		CustomerSearchRequest{Query: req.Query, UserID: req.UserID, ChatID: req.ChatID},
	)

	isLoggedIn := strings.TrimSpace(req.UserID) != ""
	loginStatus := "guest"
	if isLoggedIn {
		loginStatus = "logged_in"
	}

	systemPrompt := `You are Voxcina Smart Support Chatbot, an assistant for a Persian e-commerce website.
Your tasks:
- Understand the customer's message and recent chat history.
- Provide a helpful, concise reply in Persian (Farsi) only.
- Decide whether this issue should be escalated to a human support ticket.

You MUST respond ONLY with a valid JSON object using this exact schema:
{
  "reply": "<Persian reply to show to the user>",
  "should_create_ticket": true or false,
  "ticket_subject": "<short Persian subject for the ticket>",
  "ticket_body": "<longer Persian description of the issue and context>"
}

Rules:
- You will receive the user's login status as a line like: "login_status: logged_in" or "login_status: guest".
- If the login status is "guest", you MUST set "should_create_ticket" to false and clearly tell the user in Persian that they must log in or register before a ticket can be created.
- Only when the login status is "logged_in" may you set "should_create_ticket" to true.
- If you can fully answer the question and no further manual follow-up is needed, set "should_create_ticket" to false and leave "ticket_subject" and "ticket_body" as empty strings.
- If the user explicitly asks for follow-up, complaint handling, or manual investigation OR the issue clearly requires human review (complex problem, missing system information, unclear status), set "should_create_ticket" to true and fill both "ticket_subject" and "ticket_body" in Persian.
- "ticket_subject" must be a short title (max ~60 characters) that summarizes the user's issue.
- "ticket_body" should include a clear summary of the problem, any important details (like order number if mentioned), and what the user expects.
- Always write "reply", "ticket_subject" and "ticket_body" in natural, polite Persian.
- Do NOT include anything outside the JSON object. Do NOT add explanations or markdown.`

	userPrompt := fmt.Sprintf(
		"login_status: %s\n\nپیام کاربر:\n%s\n\nچت‌های اخیر (جدیدترین در انتها):\n%s",
		loginStatus,
		trimmed,
		chatCtx,
	)

	aiResponse, err := s.callOpenRouter(systemPrompt, userPrompt)
	if err != nil {
		log.Printf("Warning: support agent LLM error: %v", err)
		return result
	}

	var parsed struct {
		Reply              string `json:"reply"`
		ShouldCreateTicket bool   `json:"should_create_ticket"`
		TicketSubject      string `json:"ticket_subject"`
		TicketBody         string `json:"ticket_body"`
	}
	if err := json.Unmarshal([]byte(aiResponse), &parsed); err != nil {
		log.Printf(
			"Warning: failed to unmarshal support agent JSON: %v; raw=%s",
			err,
			aiResponse,
		)
		return result
	}

	parsed.Reply = strings.TrimSpace(parsed.Reply)
	parsed.TicketSubject = strings.TrimSpace(parsed.TicketSubject)
	parsed.TicketBody = strings.TrimSpace(parsed.TicketBody)

	if !isLoggedIn && parsed.ShouldCreateTicket {
		parsed.ShouldCreateTicket = false
		if parsed.Reply != "" {
			if !strings.Contains(parsed.Reply, "ورود") && !strings.Contains(parsed.Reply, "حساب") {
				parsed.Reply = parsed.Reply + "\n\nبرای ثبت تیکت، ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید."
			}
		}
	}

	if parsed.Reply == "" {
		return result
	}

	return SupportAgentResult{
		Reply:              parsed.Reply,
		ShouldCreateTicket: parsed.ShouldCreateTicket,
		TicketSubject:      parsed.TicketSubject,
		TicketBody:         parsed.TicketBody,
	}
}

// semanticProductSearch performs intelligent search using AI-specific metadata fields
func (s *CustomerAIService) semanticProductSearch(
	ctx context.Context,
	query string,
) ([]string, error) {
	collection := s.database.Collection("products")

	// Extract search terms
	searchTerms := strings.Fields(strings.ToLower(query))

	// Build advanced filter using AI metadata fields
	var orConditions []bson.M

	for _, term := range searchTerms {
		// Search in Persian metadata fields (CRITICAL for Persian queries)
		orConditions = append(
			orConditions,
			bson.M{
				"search_metadata.namePersian": bson.M{"$regex": term, "$options": "i"},
			},
			bson.M{
				"search_metadata.descriptionPersian": bson.M{
					"$regex":   term,
					"$options": "i",
				},
			},
			bson.M{"search_metadata.keywords": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.tags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{
				"search_metadata.materialPersian": bson.M{
					"$regex":   term,
					"$options": "i",
				},
			},
			bson.M{
				"search_metadata.stylePersian": bson.M{"$regex": term, "$options": "i"},
			},
			bson.M{
				"search_metadata.colorsPersian": bson.M{"$regex": term, "$options": "i"},
			},
			bson.M{
				"search_metadata.occasionTags": bson.M{"$regex": term, "$options": "i"},
			},
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

	filters := s.parseFiltersFromQuery(ctx, query)
	andConditions := []bson.M{
		{"$or": orConditions},
		{"is_active": true},
		{"in_stock": true},
	}

	if len(filters.Colors) > 0 {
		var colorOr []bson.M
		for _, color := range filters.Colors {
			if color == "" {
				continue
			}
			colorOr = append(
				colorOr,
				bson.M{
					"search_metadata.colorsPersian.name_persian": bson.M{
						"$regex":   color,
						"$options": "i",
					},
				},
				bson.M{
					"search_metadata.colorsPersian.synonyms": bson.M{
						"$regex":   color,
						"$options": "i",
					},
				},
				bson.M{"variants.color_name": bson.M{"$regex": color, "$options": "i"}},
				bson.M{"variants.color": bson.M{"$regex": color, "$options": "i"}},
			)
		}
		if len(colorOr) > 0 {
			andConditions = append(andConditions, bson.M{"$or": colorOr})
		}
	}

	if len(filters.ProductTypes) > 0 {
		var typeOr []bson.M
		for _, t := range filters.ProductTypes {
			if t == "" {
				continue
			}
			typeOr = append(
				typeOr,
				bson.M{"search_metadata.tags": bson.M{"$regex": t, "$options": "i"}},
				bson.M{"search_metadata.keywords": bson.M{"$regex": t, "$options": "i"}},
				bson.M{
					"search_metadata.namePersian": bson.M{"$regex": t, "$options": "i"},
				},
				bson.M{"name": bson.M{"$regex": t, "$options": "i"}},
			)
		}
		if len(typeOr) > 0 {
			andConditions = append(andConditions, bson.M{"$or": typeOr})
		}
	}

	if len(filters.Sizes) > 0 {
		var sizeOr []bson.M
		for _, size := range filters.Sizes {
			if size == "" {
				continue
			}
			sizeOr = append(
				sizeOr,
				bson.M{
					"variants.size": bson.M{"$regex": "^" + size + "$", "$options": "i"},
				},
			)
		}
		if len(sizeOr) > 0 {
			andConditions = append(andConditions, bson.M{"$or": sizeOr})
		}
	}

	filter := bson.M{
		"$and": andConditions,
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

// hybridSemanticProductSearch combines vector-based KNN search with the existing
// metadata/text-based semantic search. Vector search is attempted first; if it
// fails or returns no results, the method falls back to semanticProductSearch.
// When both succeed, results are merged with vector results taking precedence.
func (s *CustomerAIService) hybridSemanticProductSearch(
	ctx context.Context,
	query string,
) ([]string, error) {
	maxResults := s.config.SearchStrategy.MaxResults
	if maxResults <= 0 {
		maxResults = 8
	}

	vectorIDs, _ := s.vectorProductSearch(ctx, query)

	textIDs, err := s.semanticProductSearch(ctx, query)
	if err != nil {
		// If semantic search fails but we have vector results, use them
		if len(vectorIDs) > 0 {
			if len(vectorIDs) > maxResults {
				return vectorIDs[:maxResults], nil
			}
			return vectorIDs, nil
		}
		return nil, err
	}

	// Merge vector-first, then fill from text-based IDs
	idSet := make(map[string]struct{})
	merged := make([]string, 0, maxResults*2)

	for _, id := range vectorIDs {
		if _, exists := idSet[id]; exists {
			continue
		}
		merged = append(merged, id)
		idSet[id] = struct{}{}
		if len(merged) >= maxResults {
			return merged, nil
		}
	}

	for _, id := range textIDs {
		if _, exists := idSet[id]; exists {
			continue
		}
		merged = append(merged, id)
		idSet[id] = struct{}{}
		if len(merged) >= maxResults {
			return merged, nil
		}
	}

	return merged, nil
}

// vectorProductSearch performs KNN search over product embeddings using
// MongoDB Atlas Vector Search (configured separately) and OpenRouter
// embeddings for the query text. Failures are logged and treated as
// non-fatal; callers can fall back to other strategies.
func (s *CustomerAIService) vectorProductSearch(
	ctx context.Context,
	query string,
) ([]string, error) {
	// If OpenRouter API key or embedding model is not configured, skip
	if os.Getenv("OPENROUTER_API_KEY") == "" || os.Getenv("OPENROUTER_EMBEDDING_MODEL") == "" {
		return nil, nil
	}

	faissClient := NewFaissClientFromEnv()
	if faissClient == nil {
		return nil, nil
	}

	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return nil, nil
	}

	embedVec, _, err := GenerateEmbedding(ctx, trimmed)
	if err != nil {
		log.Printf("Warning: vectorProductSearch embedding generation failed: %v", err)
		return nil, nil
	}

	if len(embedVec) == 0 {
		return nil, nil
	}

	maxResults := s.config.SearchStrategy.MaxResults
	if maxResults <= 0 {
		maxResults = 8
	}
	k := maxResults * 3
	if k <= 0 {
		k = 24
	}

	ids, err := faissClient.SearchSimilarProducts(ctx, embedVec, k)
	if err != nil {
		log.Printf("Warning: FAISS vector search failed: %v", err)
		return nil, nil
	}

	if len(ids) > k {
		ids = ids[:k]
	}

	return ids, nil
}

func (s *CustomerAIService) parseFiltersFromQuery(
	ctx context.Context,
	query string,
) ParsedFilters {
	filters := ParsedFilters{}
	if s.openRouterAPIKey == "" {
		return filters
	}
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return filters
	}
	systemPrompt := "You are a specialized Persian e-commerce search filter parser. You receive a customer's query in Persian or English about clothing or fashion products. Your task is to extract structured filters that describe the desired products. Return ONLY a valid JSON object with this exact shape:\n{\n  \"colors\": [\"...\"],\n  \"product_types\": [\"...\"],\n  \"sizes\": [\"...\"]\n}\nRules:\n- Respond in JSON only, with no surrounding text.\n- Use Persian words for colors and product types if present (for example: \"مشکی\", \"پیراهن\", \"تیشرت\").\n- For sizes, use raw size tokens such as \"M\", \"L\", \"XL\" or numeric sizes like \"38\".\n- If something is not specified in the query, return an empty array for that field."
	userPrompt := fmt.Sprintf("Customer query: %s", trimmed)
	aiResponse, err := s.callOpenRouter(systemPrompt, userPrompt)
	if err != nil {
		log.Printf("Warning: failed to parse filters with LLM: %v", err)
		return filters
	}
	var parsed struct {
		Colors       []string `json:"colors"`
		ProductTypes []string `json:"product_types"`
		Sizes        []string `json:"sizes"`
	}
	if err := json.Unmarshal([]byte(aiResponse), &parsed); err != nil {
		log.Printf("Warning: failed to unmarshal filter JSON: %v", err)
		return filters
	}
	for _, c := range parsed.Colors {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		filters.Colors = appendUnique(filters.Colors, c)
	}
	for _, t := range parsed.ProductTypes {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		filters.ProductTypes = appendUnique(filters.ProductTypes, t)
	}
	for _, sz := range parsed.Sizes {
		sz = strings.TrimSpace(sz)
		if sz == "" {
			continue
		}
		filters.Sizes = appendUnique(filters.Sizes, sz)
	}
	return filters
}

func appendUnique(items []string, value string) []string {
	for _, v := range items {
		if v == value {
			return items
		}
	}
	return append(items, value)
}

func (s *CustomerAIService) personalizedSemanticProductSearch(
	ctx context.Context,
	req CustomerSearchRequest,
) ([]string, error) {
	productIDs, err := s.hybridSemanticProductSearch(ctx, req.Query)
	if err != nil {
		return nil, err
	}

	if req.UserID == "" {
		return productIDs, nil
	}

	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		return productIDs, nil
	}

	idSet := make(map[string]struct{}, len(productIDs))
	for _, id := range productIDs {
		idSet[id] = struct{}{}
	}

	activityService := NewUserActivityService(s.database)
	recentlyViewed, err := activityService.GetRecentlyViewedProducts(ctx, userID, 8)
	if err == nil {
		for _, p := range recentlyViewed {
			idStr := p.ProductID.Hex()
			if _, exists := idSet[idStr]; !exists {
				productIDs = append(productIDs, idStr)
				idSet[idStr] = struct{}{}
			}
		}
	}

	recentOrderProducts, err := s.getUserRecentOrderProductIDs(ctx, userID, 3)
	if err == nil {
		for _, idStr := range recentOrderProducts {
			if _, exists := idSet[idStr]; !exists {
				productIDs = append(productIDs, idStr)
				idSet[idStr] = struct{}{}
			}
		}
	}

	return productIDs, nil
}

func (s *CustomerAIService) getUserRecentOrderProductIDs(
	ctx context.Context,
	userID primitive.ObjectID,
	limit int,
) ([]string, error) {
	if limit <= 0 {
		limit = 3
	}

	collection := s.database.Collection("orders")
	filter := bson.M{
		"user_id":   userID,
		"is_active": true,
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}

	idSet := make(map[string]struct{})
	for _, order := range orders {
		for _, item := range order.Items {
			idStr := item.ProductID.Hex()
			idSet[idStr] = struct{}{}
		}
	}

	result := make([]string, 0, len(idSet))
	for idStr := range idSet {
		result = append(result, idStr)
	}

	return result, nil
}

func (s *CustomerAIService) buildUserContext(
	ctx context.Context,
	req CustomerSearchRequest,
) string {
	if req.UserID == "" {
		return "کاربر ناشناس است یا وارد حساب کاربری نشده است."
	}

	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		return "شناسه کاربر نامعتبر است."
	}

	activityService := NewUserActivityService(s.database)
	summary, err := activityService.GetUserActivitySummary(
		ctx,
		userID,
		time.Time{},
		time.Time{},
	)
	if err != nil {
		log.Printf("Warning: failed to get user activity summary: %v", err)
	}

	recentlyViewed, err := activityService.GetRecentlyViewedProducts(ctx, userID, 8)
	if err != nil {
		log.Printf("Warning: failed to get recently viewed products: %v", err)
	}

	var builder strings.Builder

	if summary != nil {
		builder.WriteString(
			fmt.Sprintf(
				"تعداد سفارش‌ها: %d، مجموع خرید: %.0f تومان.\n",
				summary.Orders,
				summary.TotalSpent,
			),
		)
		builder.WriteString(
			fmt.Sprintf(
				"نمایش محصول: %d، اضافه به سبد: %d، جستجوها: %d.\n",
				summary.ProductViews,
				summary.CartAdditions,
				summary.Searches,
			),
		)
		if len(summary.MostViewedCategories) > 0 {
			builder.WriteString("دسته‌بندی‌های مورد علاقه: ")
			for i, c := range summary.MostViewedCategories {
				if i > 0 {
					builder.WriteString("، ")
				}
				builder.WriteString(c.CategoryName)
			}
			builder.WriteString(".\n")
		}
	}

	if len(recentlyViewed) > 0 {
		builder.WriteString("آخرین محصولات دیده‌شده:\n")
		for i, p := range recentlyViewed {
			if i >= 5 {
				break
			}
			builder.WriteString(
				fmt.Sprintf("%d. %s - %.0f تومان\n", i+1, p.ProductName, p.Price),
			)
		}
	}

	if builder.Len() == 0 {
		return "اطلاعات خاصی از فعالیت کاربر در دسترس نیست."
	}

	return builder.String()
}

func (s *CustomerAIService) buildChatContext(
	ctx context.Context,
	req CustomerSearchRequest,
) string {
	if req.ChatID == "" {
		return ""
	}

	chatSvc := NewChatService(s.database)
	chat, err := chatSvc.GetChatByChatID(ctx, req.ChatID)
	if err != nil {
		log.Printf("Warning: failed to get chat history: %v", err)
		return ""
	}

	if len(chat.Messages) == 0 {
		return ""
	}

	start := 0
	if len(chat.Messages) > 10 {
		start = len(chat.Messages) - 10
	}

	var builder strings.Builder
	for i := start; i < len(chat.Messages); i++ {
		m := chat.Messages[i]
		role := "کاربر"
		if m.Sender == "bot" {
			role = "دستیار"
		}
		builder.WriteString(fmt.Sprintf("%s: %s\n", role, m.Text))
	}

	return builder.String()
}

// getProductsByIDs retrieves full product details by IDs
func (s *CustomerAIService) getProductsByIDs(
	ctx context.Context,
	productIDs []string,
) ([]models.Product, error) {
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
			context.WriteString(
				fmt.Sprintf("   نام فارسی: %s\n", product.SearchMetadata.NamePersian),
			)
		}

		context.WriteString(
			fmt.Sprintf("   قیمت: %s تومان\n", formatPrice(product.Price)),
		)
		context.WriteString(fmt.Sprintf("   برند: %s\n", product.Brand))

		// Add AI metadata if available
		if product.SearchMetadata != nil {
			if product.SearchMetadata.MaterialPersian != "" {
				context.WriteString(
					fmt.Sprintf("   جنس: %s\n", product.SearchMetadata.MaterialPersian),
				)
			}
			if product.SearchMetadata.StylePersian != "" {
				context.WriteString(
					fmt.Sprintf("   استایل: %s\n", product.SearchMetadata.StylePersian),
				)
			}
			if len(product.SearchMetadata.ColorsPersian) > 0 {
				var colorNames []string
				for _, color := range product.SearchMetadata.ColorsPersian {
					colorNames = append(colorNames, color.NamePersian)
				}
				context.WriteString(
					fmt.Sprintf("   رنگ‌ها: %s\n", strings.Join(colorNames, "، ")),
				)
			}
			if len(product.SearchMetadata.OccasionTags) > 0 {
				context.WriteString(
					fmt.Sprintf(
						"   مناسب برای: %s\n",
						strings.Join(product.SearchMetadata.OccasionTags, "، "),
					),
				)
			}
			if len(product.SearchMetadata.Season) > 0 {
				context.WriteString(
					fmt.Sprintf(
						"   فصل: %s\n",
						strings.Join(product.SearchMetadata.Season, "، "),
					),
				)
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
func (s *CustomerAIService) callOpenRouter(
	systemPrompt, userPrompt string,
) (string, error) {
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

	req, err := http.NewRequest(
		"POST",
		"https://openrouter.ai/api/v1/chat/completions",
		bytes.NewBuffer(jsonData),
	)
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
		return "", fmt.Errorf(
			"OpenRouter API error (status %d): %s",
			resp.StatusCode,
			string(body),
		)
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
func (s *CustomerAIService) getFallbackResponse(
	ctx context.Context,
	query string,
) (*CustomerSearchResponse, error) {
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
func (s *CustomerAIService) getPopularProductIDs(
	ctx context.Context,
	limit int,
) ([]string, error) {
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
