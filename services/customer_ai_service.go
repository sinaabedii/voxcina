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
	Colors       []string `json:"colors"`
	ProductTypes []string `json:"product_types"`
	Sizes        []string `json:"sizes"`
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

// AgentToolCall structure
type AgentToolCall struct {
	Tool      string          `json:"tool"`
	Arguments json.RawMessage `json:"arguments"`
}

// NewCustomerAIService creates a new customer AI service instance
func NewCustomerAIService(db *mongo.Database) (*CustomerAIService, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		log.Println(
			"OPENROUTER_API_KEY not set - CustomerAIService will use fallback responses only",
		)
	}

	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "openai/gpt-oss-20b:free" // Default model
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
			Timeout: 60 * time.Second,
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

// defaultCustomerAIConfig provides a safe fallback configuration
func defaultCustomerAIConfig() *CustomerAIConfig {
	return &CustomerAIConfig{
		SystemPrompt: `You are Voxcina, an intelligent and helpful AI shopping assistant for a Persian e-commerce store.
Your goal is to assist customers in finding products, understanding their needs, and providing personalized recommendations.
You speak Persian (Farsi) fluently and naturally.

You have access to the following tools to help the user. To use a tool, you MUST output a VALID JSON object in the format:
{"tool": "tool_name", "arguments": { ... }}

Tools available:
1. "search_products": Search for products based on a query and optional filters.
   Arguments:
   - "query" (string): The search query (e.g., "تیشرت مشکی", "کفش ورزشی").
   - "filters" (object, optional): { "colors": [string], "product_types": [string], "sizes": [string] }

2. "get_user_info": Get the current user's profile and activity summary.
   Arguments:
   - "user_id" (string): The user's ID.

3. "get_recent_orders": Get the user's recent order history.
   Arguments:
   - "user_id" (string): The user's ID.
   - "limit" (int): Number of orders to retrieve (default 3).

Guidelines:
- Always start by understanding the user's intent.
- If the user asks for product recommendations, use 'search_products'.
- If the user asks about their history or you need to know their style, use 'get_user_info' or 'get_recent_orders'.
- You can ask clarifying questions if the request is too vague.
- YOUR FINAL RESPONSE MUST BE IN PERSIAN.
- Only output JSON when calling a tool. Otherwise, write normal text.

CRITICAL RULES:
- You MUST ONLY mention products that were returned by the search_products tool.
- NEVER invent, fabricate, or hallucinate product names, prices, or details.
- If no products are found, say "متاسفانه محصولی با این مشخصات پیدا نشد" and suggest the user try different search terms.
- Only reference product IDs, names, and prices that appear in the tool results.
- If the tool returns "هیچ محصولی یافت نشد", do NOT make up products.
`,
		SearchStrategy: SearchStrategyConfig{
			MaxResults:        8,
			MinScoreThreshold: 0.3,
			UsePersianFields:  true,
		},
	}
}

// RunAgenticChat executes the main agent loop
func (s *CustomerAIService) RunAgenticChat(
	ctx context.Context,
	req CustomerSearchRequest,
) (*CustomerSearchResponse, error) {
	if s.openRouterAPIKey == "" {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// 1. Build Initial Context
	messages := []OpenRouterMessage{
		{Role: "system", Content: s.config.SystemPrompt},
	}

	// Add chat history
	chatContext := s.buildChatContext(ctx, req)
	if chatContext != "" {
		messages = append(messages, OpenRouterMessage{
			Role: "user",
			Content: fmt.Sprintf(
				"Chat History:\n%s\n\nCurrent User Message: %s",
				chatContext,
				req.Query,
			),
		})
	} else {
		messages = append(messages, OpenRouterMessage{
			Role:    "user",
			Content: req.Query,
		})
	}

	var finalProducts []models.Product
	var finalProductIDs []string

	// Agent Loop (Max 5 turns to avoid infinite loops)
	for i := 0; i < 5; i++ {
		// Call LLM
		response, err := s.callOpenRouterWithMessages(messages)
		if err != nil {
			log.Printf("LLM Error: %v", err)
			return s.getFallbackResponse(ctx, req.Query)
		}

		// Check for tool call
		var toolCall AgentToolCall
		isToolCall := false

		// Try to parse JSON tool call from the response text
		// We look for the first valid JSON object
		jsonStart := strings.Index(response, "{")
		jsonEnd := strings.LastIndex(response, "}")

		if jsonStart >= 0 && jsonEnd > jsonStart {
			potentialJSON := response[jsonStart : jsonEnd+1]
			if err := json.Unmarshal([]byte(potentialJSON), &toolCall); err == nil &&
				toolCall.Tool != "" {
				isToolCall = true
			}
		}

		if !isToolCall {
			// Final text response
			// If no products were found but LLM generated a response, 
			// ensure we don't return hallucinated product info
			if len(finalProducts) == 0 && i > 0 {
				// LLM tried to search but found nothing - use a safe response
				response = "متاسفانه محصولی با این مشخصات پیدا نشد. لطفاً با کلمات کلیدی دیگری جستجو کنید یا دسته‌بندی‌های محصولات ما را مرور کنید."
			}
			return &CustomerSearchResponse{
				Response:      response,
				Products:      finalProducts,
				ProductIDs:    finalProductIDs,
				Success:       len(finalProducts) > 0 || i == 0,
				IsAIGenerated: true,
			}, nil
		}

		// Execute Tool
		messages = append(messages, OpenRouterMessage{
			Role:    "assistant",
			Content: response,
		})

		toolResult := ""

		switch toolCall.Tool {
		case "search_products":
			var args struct {
				Query   string        `json:"query"`
				Filters ParsedFilters `json:"filters"`
			}
			json.Unmarshal(toolCall.Arguments, &args)

			// If query is empty in args, use original query
			if args.Query == "" {
				args.Query = req.Query
			}

			products, ids, err := s.toolSearchProducts(ctx, args.Query, args.Filters)
			if err != nil {
				toolResult = fmt.Sprintf("Error searching products: %v", err)
			} else {
				finalProducts = products
				finalProductIDs = ids
				if len(products) == 0 {
					toolResult = "IMPORTANT: No products found matching the query. Tell the user: متاسفانه محصولی با این مشخصات پیدا نشد. Do NOT invent or make up any products."
				} else {
					toolResult = fmt.Sprintf("Found %d products. IMPORTANT: You may ONLY mention these exact products with their exact details. Do NOT invent any other products.\n\nProduct list:\n%s", len(products), s.buildProductsContext(products))
				}
			}

		case "get_user_info":
			var args struct {
				UserID string `json:"user_id"`
			}
			json.Unmarshal(toolCall.Arguments, &args)
			// Use request UserID if not provided
			if args.UserID == "" {
				args.UserID = req.UserID
			}

			info, err := s.toolGetUserContext(ctx, args.UserID)
			if err != nil {
				toolResult = fmt.Sprintf("Error getting user info: %v", err)
			} else {
				toolResult = info
			}

		case "get_recent_orders":
			var args struct {
				UserID string `json:"user_id"`
				Limit  int    `json:"limit"`
			}
			json.Unmarshal(toolCall.Arguments, &args)
			if args.UserID == "" {
				args.UserID = req.UserID
			}

			orders, err := s.toolGetRecentOrders(ctx, args.UserID, args.Limit)
			if err != nil {
				toolResult = fmt.Sprintf("Error getting orders: %v", err)
			} else {
				toolResult = orders
			}

		default:
			toolResult = "Unknown tool: " + toolCall.Tool
		}

		messages = append(messages, OpenRouterMessage{
			Role:    "user",
			Content: fmt.Sprintf("Tool '%s' result: %s", toolCall.Tool, toolResult),
		})

		// If we found products, we might want to break early or let the LLM summarize
		// We continue the loop to let LLM summarize
	}

	return s.getFallbackResponse(ctx, req.Query)
}

// toolSearchProducts implements the search logic
func (s *CustomerAIService) toolSearchProducts(
	ctx context.Context,
	query string,
	filters ParsedFilters,
) ([]models.Product, []string, error) {
	// Use existing hybrid search logic but with explicit filters if provided
	productIDs, err := s.hybridSemanticProductSearch(ctx, query)
	if err != nil {
		return nil, nil, err
	}

	// TODO: Apply extra filters manually if hybrid search didn't cover them perfectly
	// For now, we rely on hybrid search which supposedly handles filters

	products, err := s.getProductsByIDs(ctx, productIDs)
	if err != nil {
		return nil, nil, err
	}

	return products, productIDs, nil
}

// toolGetUserContext implements user info retrieval
func (s *CustomerAIService) toolGetUserContext(
	ctx context.Context,
	userIDStr string,
) (string, error) {
	if userIDStr == "" {
		return "User ID not provided", nil
	}
	return s.buildUserContext(ctx, CustomerSearchRequest{UserID: userIDStr}), nil
}

// toolGetRecentOrders implements order history retrieval
func (s *CustomerAIService) toolGetRecentOrders(
	ctx context.Context,
	userIDStr string,
	limit int,
) (string, error) {
	if userIDStr == "" {
		return "User ID not provided", nil
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return "Invalid User ID", nil
	}

	productIDs, err := s.getUserRecentOrderProductIDs(ctx, userID, limit)
	if err != nil {
		return "", err
	}

	products, err := s.getProductsByIDs(ctx, productIDs)
	if err != nil {
		return "", err
	}

	return s.buildProductsContext(products), nil
}

// Helper to get fallback response
func (s *CustomerAIService) getFallbackResponse(
	ctx context.Context,
	query string,
) (*CustomerSearchResponse, error) {
	// Basic search fallback
	productIDs, _ := s.semanticProductSearch(ctx, query)
	products, _ := s.getProductsByIDs(ctx, productIDs)

	msg := "متاسفانه در حال حاضر نمی‌توانم ارتباط برقرار کنم. اما این محصولات شاید برای شما جالب باشند:"
	if len(s.config.FallbackMessages) > 0 {
		msg = s.config.FallbackMessages[0]
	}

	return &CustomerSearchResponse{
		Response:      msg,
		Products:      products,
		ProductIDs:    productIDs,
		Success:       len(products) > 0,
		IsAIGenerated: false,
	}, nil
}

// callOpenRouterWithMessages handles the raw API call
func (s *CustomerAIService) callOpenRouterWithMessages(
	messages []OpenRouterMessage,
) (string, error) {
	requestData := OpenRouterRequest{
		Model:       s.openRouterModel,
		Messages:    messages,
		MaxTokens:   1000,
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
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openRouterAPIKey)
	req.Header.Set("HTTP-Referer", "https://github.com/sinaabedii/shop")
	req.Header.Set("X-Title", "Voxcina Shop")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var result OpenRouterResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response choices")
	}

	return result.Choices[0].Message.Content, nil
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

	aiResponse, err := s.callOpenRouterWithMessages([]OpenRouterMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	})
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

	// Extract JSON from response
	jsonStart := strings.Index(aiResponse, "{")
	jsonEnd := strings.LastIndex(aiResponse, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		if err := json.Unmarshal([]byte(aiResponse[jsonStart:jsonEnd+1]), &parsed); err != nil {
			log.Printf("Warning: failed to unmarshal support agent JSON: %v", err)
			return result
		}
	} else {
		return result
	}

	parsed.Reply = strings.TrimSpace(parsed.Reply)
	parsed.TicketSubject = strings.TrimSpace(parsed.TicketSubject)
	parsed.TicketBody = strings.TrimSpace(parsed.TicketBody)

	if !isLoggedIn && parsed.ShouldCreateTicket {
		parsed.ShouldCreateTicket = false
		if parsed.Reply != "" {
			if !strings.Contains(parsed.Reply, "ورود") &&
				!strings.Contains(parsed.Reply, "حساب") {
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

// SearchProducts - DEPRECATED WRAPPER for backward compatibility
func (s *CustomerAIService) SearchProducts(
	ctx context.Context,
	req CustomerSearchRequest,
) (*CustomerSearchResponse, error) {
	return s.RunAgenticChat(ctx, req)
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
	if os.Getenv("OPENROUTER_API_KEY") == "" ||
		os.Getenv("OPENROUTER_EMBEDDING_MODEL") == "" {
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

	// Helper callOpenRouter (simple version)
	resp, err := s.callOpenRouterWithMessages([]OpenRouterMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	})

	if err != nil {
		log.Printf("Warning: failed to parse filters with LLM: %v", err)
		return filters
	}

	var parsed struct {
		Colors       []string `json:"colors"`
		ProductTypes []string `json:"product_types"`
		Sizes        []string `json:"sizes"`
	}

	// Extract JSON from response
	jsonStart := strings.Index(resp, "{")
	jsonEnd := strings.LastIndex(resp, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		if err := json.Unmarshal([]byte(resp[jsonStart:jsonEnd+1]), &parsed); err != nil {
			log.Printf("Warning: failed to unmarshal filter JSON: %v", err)
			return filters
		}
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

// Helper for price formatting
func formatPrice(p float64) string {
	return fmt.Sprintf("%.0f", p)
}
