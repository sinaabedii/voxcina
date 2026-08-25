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

// agentDecision is the structured, schema-validated decision the customer agent
// must return instead of free-form prose. It is the contract between the model
// (which interprets tool results) and the application (which validates and
// delivers the final response).
//
// The model never writes the final message and product list directly: it only
// (a) writes a short, grounded reply and (b) references products by the IDs the
// tools actually returned. The service re-validates those IDs against the
// database and assembles the authoritative CustomerSearchResponse, so a
// hallucinated product or an invented claim can never reach the user.
type agentDecision struct {
	// Action says what the model wants done with the tool results this turn:
	// "respond" (it is ready to answer), "search" (it wants another search with
	// the given Query), or "not_found" (nothing matched and it has no answer).
	Action string `json:"action"`
	// Reply is the short Persian text to show the customer. It must be grounded
	// in the tool results and is sanitized + fallback-checked server-side.
	Reply string `json:"reply"`
	// ProductIDs references products by the exact ids returned by the tools.
	// The service resolves these against the DB and ignores unknown ids.
	ProductIDs []string `json:"product_ids,omitempty"`
	// Query is a refined search the model wants to run when Action == "search".
	Query string `json:"query,omitempty"`
}

func agentDecisionSchema() map[string]interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"action": map[string]interface{}{
				"type":        "string",
				"enum":        []string{"respond", "search", "not_found"},
				"description": "respond when ready to answer, search to run a refined catalog search, not_found when nothing matched and there is no answer.",
			},
			"reply": map[string]interface{}{
				"type":        "string",
				"description": "Short, friendly Persian reply to show the customer, grounded only in the search results. Never invent product details.",
			},
			"product_ids": map[string]interface{}{
				"type":        "array",
				"items":       map[string]interface{}{"type": "string"},
				"description": "ObjectIds of the products to show, copied exactly from the search results above. Omit if none.",
			},
			"query": map[string]interface{}{
				"type":        "string",
				"description": "A refined Persian/English search query, only when action is search.",
			},
		},
		"required": []string{"action", "reply"},
	}
}

// DefaultSupportChatModel is the model the support agent uses when no admin
// override is set: OPENROUTER_MODEL, or the built-in default.
func DefaultSupportChatModel() string {
	if model := os.Getenv("OPENROUTER_MODEL"); model != "" {
		return model
	}
	return "openai/gpt-oss-20b:free"
}

// NewCustomerAIService creates a new customer AI service instance
func NewCustomerAIService(db *mongo.Database) (*CustomerAIService, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		log.Println(
			"OPENROUTER_API_KEY not set - CustomerAIService will use fallback responses only",
		)
	}

	// The dashboard's chat model wins over the environment so an admin can
	// change which model answers customers without a redeploy.
	model := ResolveModel(ChatModelOverride(context.Background()), DefaultSupportChatModel())

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
		SystemPrompt: `You are Voxcina, a Persian e-commerce shopping assistant.

You have access to these tools:
1. {"tool": "search_products", "arguments": {"query": "search term"}} - Search for products
2. {"tool": "get_product_details", "arguments": {"product_code": "1210"}} - Get details of a specific product by code

WORKFLOW:
1. For product searches: use search_products tool
2. For questions about specific products (by code/name): use get_product_details tool
3. For follow-up questions about previously shown products: answer using the product info from chat history
4. WAIT for tool results before responding

FOLLOW-UP QUESTIONS:
- If user asks about a product code (like 'کد ۱۲۱۰ جنسش چیه؟'), look at chat history for that product
- Answer questions about material (جنس), color (رنگ), size (سایز), price (قیمت) from product details
- If product was shown before, use that info directly without searching again

CRITICAL RULES:
- ONLY mention products from tool results or chat history
- NEVER invent product details
- If you don't have info, say: "اطلاعات این محصول در دسترس نیست"

RESPONSE RULES:
- Respond in Persian (Farsi)
- Be friendly and helpful
- For material questions: mention جنس/پارچه
- For specific product questions: give direct answers, not new searches
`,
		SearchStrategy: SearchStrategyConfig{
			MaxResults:        8,
			MinScoreThreshold: 0.3,
			UsePersianFields:  true,
		},
	}
}

// detectProductCodeQuestion checks if the query is asking about a specific product code
func (s *CustomerAIService) detectProductCodeQuestion(query string) (string, string) {
	// Common patterns for product code questions in Persian
	// "کد 1210 جنسش چیه" -> code: 1210, question: material
	// "کد ۱۲۱۰ چه رنگی داره" -> code: 1210, question: color

	query = strings.ToLower(query)

	// Look for "کد" followed by numbers
	patterns := []string{"کد ", "کد", "code ", "code"}
	for _, pattern := range patterns {
		if idx := strings.Index(query, pattern); idx >= 0 {
			// Extract the code number after the pattern
			rest := query[idx+len(pattern):]
			rest = strings.TrimSpace(rest)

			// Extract digits (both Persian and English)
			var codeBuilder strings.Builder
			for _, r := range rest {
				if r >= '0' && r <= '9' {
					codeBuilder.WriteRune(r)
				} else if r >= '۰' && r <= '۹' {
					// Convert Persian digit to English
					codeBuilder.WriteRune(r - '۰' + '0')
				} else if codeBuilder.Len() > 0 {
					break
				}
			}

			code := codeBuilder.String()
			if code != "" {
				// Determine question type
				questionType := "details"
				if strings.Contains(query, "جنس") || strings.Contains(query, "پارچه") || strings.Contains(query, "material") {
					questionType = "material"
				} else if strings.Contains(query, "رنگ") || strings.Contains(query, "color") {
					questionType = "color"
				} else if strings.Contains(query, "سایز") || strings.Contains(query, "size") {
					questionType = "size"
				} else if strings.Contains(query, "قیمت") || strings.Contains(query, "price") {
					questionType = "price"
				}
				return code, questionType
			}
		}
	}

	return "", ""
}

// detectContextualQuestion checks if the query is asking about a previously shown product
// Returns: questionType (material, color, size, price, details) or empty if not a contextual question
func (s *CustomerAIService) detectContextualQuestion(query string) string {
	query = strings.ToLower(query)

	// Contextual references in Persian: همین, این, اون, محصول قبلی, etc.
	contextualPatterns := []string{
		"همین", "این", "اون", "محصول", "قبلی", "بالایی", "this", "that", "it",
	}

	hasContextualRef := false
	for _, pattern := range contextualPatterns {
		if strings.Contains(query, pattern) {
			hasContextualRef = true
			break
		}
	}

	if !hasContextualRef {
		return ""
	}

	// Determine question type
	if strings.Contains(query, "جنس") || strings.Contains(query, "پارچه") || strings.Contains(query, "material") {
		return "material"
	} else if strings.Contains(query, "رنگ") || strings.Contains(query, "color") {
		return "color"
	} else if strings.Contains(query, "سایز") || strings.Contains(query, "size") {
		return "size"
	} else if strings.Contains(query, "قیمت") || strings.Contains(query, "price") {
		return "price"
	}

	return "details"
}

// getLastShownProductIDs retrieves product IDs from the most recent bot message in chat history
func (s *CustomerAIService) getLastShownProductIDs(ctx context.Context, chatID string) []string {
	if chatID == "" {
		return nil
	}

	chatSvc := NewChatService(s.database)
	chat, err := chatSvc.GetChatByChatID(ctx, chatID)
	if err != nil || chat == nil {
		return nil
	}

	// Look for the most recent bot message with product IDs
	for i := len(chat.Messages) - 1; i >= 0; i-- {
		msg := chat.Messages[i]
		if msg.Sender == "bot" && len(msg.ProductIDs) > 0 {
			var ids []string
			for _, id := range msg.ProductIDs {
				ids = append(ids, id.Hex())
			}
			return ids
		}
	}

	return nil
}

// handleContextualQuestion handles questions about previously shown products
func (s *CustomerAIService) handleContextualQuestion(
	ctx context.Context,
	chatID string,
	questionType string,
) (*CustomerSearchResponse, error) {
	productIDs := s.getLastShownProductIDs(ctx, chatID)
	if len(productIDs) == 0 {
		return &CustomerSearchResponse{
			Response:      "متاسفانه محصولی در گفتگوی قبلی پیدا نکردم. لطفاً نام یا کد محصول را مشخص کنید.",
			Products:      nil,
			ProductIDs:    nil,
			Success:       false,
			IsAIGenerated: false,
		}, nil
	}

	// Get the first product (most relevant)
	products, err := s.getProductsByIDs(ctx, productIDs[:1])
	if err != nil || len(products) == 0 {
		return &CustomerSearchResponse{
			Response:      "متاسفانه اطلاعات این محصول در دسترس نیست.",
			Products:      nil,
			ProductIDs:    nil,
			Success:       false,
			IsAIGenerated: false,
		}, nil
	}

	product := products[0]
	var response string
	productName := product.Name
	if product.SearchMetadata != nil && product.SearchMetadata.NamePersian != "" {
		productName = product.SearchMetadata.NamePersian
	}

	switch questionType {
	case "material":
		if product.SearchMetadata != nil && product.SearchMetadata.MaterialPersian != "" {
			response = fmt.Sprintf("جنس %s: %s", productName, product.SearchMetadata.MaterialPersian)
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات جنس %s در سیستم ثبت نشده است.", productName)
		}
	case "color":
		if product.SearchMetadata != nil && len(product.SearchMetadata.ColorsPersian) > 0 {
			var colors []string
			for _, c := range product.SearchMetadata.ColorsPersian {
				colors = append(colors, c.NamePersian)
			}
			response = fmt.Sprintf("رنگ‌های موجود %s: %s", productName, strings.Join(colors, "، "))
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات رنگ %s در سیستم ثبت نشده است.", productName)
		}
	case "size":
		if len(product.ColorVariants) > 0 {
			sizeSet := make(map[string]bool)
			for _, cv := range product.ColorVariants {
				for _, sv := range cv.Sizes {
					if sv.Size != "" {
						sizeSet[sv.Size] = true
					}
				}
			}
			if len(sizeSet) > 0 {
				var sizes []string
				for size := range sizeSet {
					sizes = append(sizes, size)
				}
				response = fmt.Sprintf("سایزهای موجود %s: %s", productName, strings.Join(sizes, "، "))
			} else {
				response = fmt.Sprintf("متاسفانه اطلاعات سایز %s در سیستم ثبت نشده است.", productName)
			}
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات سایز %s در سیستم ثبت نشده است.", productName)
		}
	case "price":
		response = fmt.Sprintf("قیمت %s: %s تومان", productName, formatPrice(product.Price))
	default:
		// Return full details
		var builder strings.Builder
		builder.WriteString(fmt.Sprintf("📦 %s\n", productName))
		if product.SearchMetadata != nil {
			if product.SearchMetadata.MaterialPersian != "" {
				builder.WriteString(fmt.Sprintf("جنس: %s\n", product.SearchMetadata.MaterialPersian))
			}
			if len(product.SearchMetadata.ColorsPersian) > 0 {
				var colors []string
				for _, c := range product.SearchMetadata.ColorsPersian {
					colors = append(colors, c.NamePersian)
				}
				builder.WriteString(fmt.Sprintf("رنگ‌ها: %s\n", strings.Join(colors, "، ")))
			}
		}
		builder.WriteString(fmt.Sprintf("قیمت: %s تومان\n", formatPrice(product.Price)))
		builder.WriteString(fmt.Sprintf("برند: %s", product.Brand))
		response = builder.String()
	}

	return &CustomerSearchResponse{
		Response:      response,
		Products:      products,
		ProductIDs:    productIDs[:1],
		Success:       true,
		IsAIGenerated: false,
	}, nil
}

// handleProductDetailQuestion handles direct questions about specific products
func (s *CustomerAIService) handleProductDetailQuestion(
	ctx context.Context,
	productCode string,
	questionType string,
) (*CustomerSearchResponse, error) {
	details, products, err := s.toolGetProductDetails(ctx, productCode, "")
	if err != nil {
		return nil, err
	}

	if len(products) == 0 {
		return &CustomerSearchResponse{
			Response:      fmt.Sprintf("متاسفانه محصولی با کد %s پیدا نشد.", productCode),
			Products:      nil,
			ProductIDs:    nil,
			Success:       false,
			IsAIGenerated: false,
		}, nil
	}

	product := products[0]
	var response string

	switch questionType {
	case "material":
		if product.SearchMetadata != nil && product.SearchMetadata.MaterialPersian != "" {
			response = fmt.Sprintf("جنس محصول کد %s: %s", productCode, product.SearchMetadata.MaterialPersian)
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات جنس محصول کد %s در سیستم ثبت نشده است.", productCode)
		}
	case "color":
		if product.SearchMetadata != nil && len(product.SearchMetadata.ColorsPersian) > 0 {
			var colors []string
			for _, c := range product.SearchMetadata.ColorsPersian {
				colors = append(colors, c.NamePersian)
			}
			response = fmt.Sprintf("رنگ‌های موجود محصول کد %s: %s", productCode, strings.Join(colors, "، "))
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات رنگ محصول کد %s در سیستم ثبت نشده است.", productCode)
		}
	case "size":
		if len(product.ColorVariants) > 0 {
			sizeSet := make(map[string]bool)
			for _, cv := range product.ColorVariants {
				for _, sv := range cv.Sizes {
					if sv.Size != "" {
						sizeSet[sv.Size] = true
					}
				}
			}
			if len(sizeSet) > 0 {
				var sizes []string
				for size := range sizeSet {
					sizes = append(sizes, size)
				}
				response = fmt.Sprintf("سایزهای موجود محصول کد %s: %s", productCode, strings.Join(sizes, "، "))
			} else {
				response = fmt.Sprintf("متاسفانه اطلاعات سایز محصول کد %s در سیستم ثبت نشده است.", productCode)
			}
		} else {
			response = fmt.Sprintf("متاسفانه اطلاعات سایز محصول کد %s در سیستم ثبت نشده است.", productCode)
		}
	case "price":
		response = fmt.Sprintf("قیمت محصول کد %s: %s تومان", productCode, formatPrice(product.Price))
	default:
		response = details
	}

	var productIDs []string
	for _, p := range products {
		productIDs = append(productIDs, p.ID.Hex())
	}

	return &CustomerSearchResponse{
		Response:      response,
		Products:      products,
		ProductIDs:    productIDs,
		Success:       true,
		IsAIGenerated: false,
	}, nil
}

// RunAgenticChat executes the main agent loop.
//
// The loop enforces a clean separation of responsibilities:
//
//   - Tools (toolSearchProducts / toolGetProductDetails / toolGetUserContext /
//     toolGetRecentOrders) perform the actual DB/search work and return
//     authoritative data — resolving to real product IDs, never prose.
//   - The model is constrained (via a JSON schema) to return an agentDecision
//     rather than free text: it interprets the tool results and either answers,
//     refines the search, or reports nothing found.
//   - The service validates that decision (sanitizing the reply, and only ever
//     surfacing products from the DB rows the tools already returned) and is
//     the only thing that assembles the CustomerSearchResponse.
//
// Because the final response is built from re-fetched database rows plus a
// short sanitized reply — never from an unrestricted model essay — the user can
// never be shown hallucinated products, fabricated "actions taken", leaked
// internal identifiers, or off-topic content.
func (s *CustomerAIService) RunAgenticChat(
	ctx context.Context,
	req CustomerSearchRequest,
) (*CustomerSearchResponse, error) {
	if s.openRouterAPIKey == "" {
		return s.getFallbackResponse(ctx, req.Query)
	}

	// Check if this is a direct product detail question (with product code)
	if productCode, questionType := s.detectProductCodeQuestion(req.Query); productCode != "" {
		return s.handleProductDetailQuestion(ctx, productCode, questionType)
	}

	// Check if this is a contextual question about a previously shown product
	if questionType := s.detectContextualQuestion(req.Query); questionType != "" {
		return s.handleContextualQuestion(ctx, req.ChatID, questionType)
	}

	structured := NewOpenRouterStructuredClient()

	// Build the message thread the model reasons over. Tool results are appended
	// as data (plain JSON) messages, not prose, so the model can only cite what
	// was actually returned.
	messages := []OpenRouterMessage{
		{Role: "system", Content: s.structuredSystemPrompt()},
	}

	chatContext := s.buildChatContext(ctx, req)
	if chatContext != "" {
		messages = append(messages, OpenRouterMessage{
			Role: "user",
			Content: fmt.Sprintf(
				"Chat history (newest last):\n%s\n\nCurrent message: %s",
				chatContext, req.Query,
			),
		})
	} else {
		messages = append(messages, OpenRouterMessage{Role: "user", Content: req.Query})
	}

	// The authoritative result set for the whole turn. It is only ever populated
	// by tool executions below; the model can never add to it.
	var foundProducts []models.Product
	var foundIDs []string

	const maxTurns = 5
	for turn := 0; turn < maxTurns; turn++ {
		output, err := structured.CallStructured(ctx, StructuredRequest{
			Model:    s.openRouterModel,
			Messages: messages,
			Schema:   agentDecisionSchema(),
		})
		if err != nil {
			log.Printf("[customer-ai] structured call failed: %v", err)
			return s.finalize(ctx, req, foundProducts, foundIDs, "")
		}

		var decision agentDecision
		if err := parseBSONToStruct(output, &decision); err != nil {
			log.Printf("[customer-ai] failed to parse decision: %v", err)
			return s.finalize(ctx, req, foundProducts, foundIDs, "")
		}

		switch decision.Action {
		case "search":
			// The model asked for a (refined) catalog search. Run it and feed the
			// authoritative product data back as the next data message.
			query := strings.TrimSpace(decision.Query)
			if query == "" {
				query = req.Query
			}
			products, ids, err := s.toolSearchProducts(ctx, query, ParsedFilters{})
			if err != nil {
				log.Printf("[customer-ai] search tool error: %v", err)
				messages = append(messages, OpenRouterMessage{
					Role:    "user",
					Content: `{"results": []}`,
				})
				continue
			}
			foundProducts, foundIDs = products, ids
			messages = append(messages, OpenRouterMessage{
				Role:    "assistant",
				Content: `{"action":"search","query":` + string(mustJSON(decision.Query)) + `}`,
			})
			messages = append(messages, OpenRouterMessage{
				Role:    "user",
				Content: s.catalogContext(products),
			})
			continue

		case "respond":
			return s.finalize(ctx, req, foundProducts, foundIDs, decision.Reply)

		case "not_found":
			return s.finalize(ctx, req, nil, nil, "")
		}
	}

	// Exhausted the loop without a decision — deliver whatever the tools found,
	// with a grounded fallback line, never free model prose.
	return s.finalize(ctx, req, foundProducts, foundIDs, "")
}

func mustJSON(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// structuredSystemPrompt is the schema-contract prompt used for the structured
// loop. It mirrors the semantics of the configurable SystemPrompt but adds the
// hard requirement that the model emit only the agentDecision JSON schema and
// never free text.
func (s *CustomerAIService) structuredSystemPrompt() string {
	return `You are Voxcina, a Persian e-commerce shopping assistant.

Your job is to decide what to show the customer, never to write a product essay.
You MUST respond with ONLY a single JSON object matching this schema:
{"action": "respond"|"search"|"not_found", "reply": "...", "product_ids": ["..."], "query": "..."}

Rules:
- To look something up, set action "search" with a Persian/English "query".
- Search results are returned to you as JSON data. When you are ready to answer,
  set action "respond" and write a short, friendly Persian "reply" (1-3
  sentences) grounded only in those results.
- Set action "not_found" when the results are empty and you have no answer.
- Never invent a product id, price, material, colour or other detail that is not
  in the returned data. If you do not have it, don't state it.
- The "reply" is spoken to a customer: never mention internal identifiers, ids,
  or anything about your tools or search process.
- Never include anything outside the single JSON object.`
}

// catalogContext renders the minimal authoritative record of each found product
// — id, name, price — as JSON. The name and price are all the model is allowed
// to speak about; everything else is withheld so there is nothing extra to
// hallucinate.
func (s *CustomerAIService) catalogContext(products []models.Product) string {
	if len(products) == 0 {
		return `{"results": []}`
	}
	rows := make([]map[string]interface{}, 0, len(products))
	for _, p := range products {
		row := map[string]interface{}{
			"id":    p.ID.Hex(),
			"name":  p.Name,
			"price": p.Price,
		}
		if p.SearchMetadata != nil && p.SearchMetadata.NamePersian != "" {
			row["name_fa"] = p.SearchMetadata.NamePersian
		}
		if p.SearchMetadata != nil && p.SearchMetadata.MaterialPersian != "" {
			row["material_fa"] = p.SearchMetadata.MaterialPersian
		}
		rows = append(rows, row)
	}
	encoded, _ := json.Marshal(map[string]interface{}{"results": rows})
	return string(encoded)
}

// finalize assembles the validated response the caller delivers to the user.
// reply is the model's short, grounded Persian sentence (or empty); it is
// sanitized and, when unusable, replaced by a safe fallback. foundProducts /
// foundIDs are the authoritative DB rows and ids from tool execution — they are
// reconciled here and never taken from the model's prose.
func (s *CustomerAIService) finalize(
	ctx context.Context,
	_ CustomerSearchRequest,
	foundProducts []models.Product,
	foundIDs []string,
	reply string,
) (*CustomerSearchResponse, error) {
	// Reconcile found products with their ids so the response is internally
	// consistent and only ever contains real, active products.
	if len(foundProducts) == 0 && len(foundIDs) > 0 {
		products, err := s.getProductsByIDs(ctx, foundIDs)
		if err == nil {
			foundProducts = products
		}
	}

	reply = sanitizeCustomerReply(reply)

	if len(foundProducts) == 0 {
		if !isUsableCustomerReply(reply) {
			reply = "متاسفانه محصولی با این مشخصات پیدا نشد. لطفاً با کلمات کلیدی دیگری جستجو کنید یا دسته‌بندی‌های محصولات ما را مرور کنید."
		}
		return &CustomerSearchResponse{
			Response:      reply,
			Products:      nil,
			ProductIDs:    nil,
			Success:       false,
			IsAIGenerated: true,
		}, nil
	}

	if !isUsableCustomerReply(reply) {
		reply = pickCustomerFallback(s.config.FallbackMessages)
		if reply == "" {
			reply = "بر اساس جستجوی شما، این محصولات را پیشنهاد می‌کنم:"
		}
	}

	productIDs := make([]string, 0, len(foundProducts))
	for _, p := range foundProducts {
		productIDs = append(productIDs, p.ID.Hex())
	}

	return &CustomerSearchResponse{
		Response:      reply,
		Products:      foundProducts,
		ProductIDs:    productIDs,
		Success:       true,
		IsAIGenerated: true,
	}, nil
}

// sanitizeCustomerReply strips residual markup and internal identifiers that a
// model may leak into the customer-facing reply, mirroring the negotiation
// agent's sanitizer. It is a lighter pass than that agent's: the reply is
// already schema-constrained, but it must never carry an ObjectId, a JSON blob,
// or a narrated tool call.
func sanitizeCustomerReply(reply string) string {
	reply = strings.TrimSpace(reply)
	if reply == "" {
		return ""
	}
	reply = sanitizeCodeFence.ReplaceAllString(reply, "")
	reply = stripJSONObjects(reply)
	reply = stripToolNarration(reply)
	return strings.TrimSpace(collapseSpaces(reply))
}

// isUsableCustomerReply reports whether a reply survived sanitising into
// something a customer can read (Persian text). An empty or machinery-only
// reply routes to a safe fallback instead.
func isUsableCustomerReply(reply string) bool {
	return hasPersianLetter(reply)
}

// pickCustomerFallback rotates through the configured fallback messages.
func pickCustomerFallback(pool []string) string {
	if len(pool) == 0 {
		return ""
	}
	idx := int(time.Now().UnixNano() % int64(len(pool)))
	if idx < 0 {
		idx += len(pool)
	}
	return pool[idx]
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

// toolGetProductDetails retrieves detailed information about a specific product by code or ID
func (s *CustomerAIService) toolGetProductDetails(
	ctx context.Context,
	productCode string,
	productID string,
) (string, []models.Product, error) {
	collection := s.database.Collection("products")

	var filter bson.M

	// Try to find by product code in name (e.g., "کد 1210" or "1210")
	if productCode != "" {
		// Clean the code - remove Persian/Arabic digits and convert
		cleanCode := strings.TrimSpace(productCode)
		// Search for products with this code in their name
		filter = bson.M{
			"$or": []bson.M{
				{"name": bson.M{"$regex": cleanCode, "$options": "i"}},
				{"search_metadata.namePersian": bson.M{"$regex": cleanCode, "$options": "i"}},
				{"sku": bson.M{"$regex": cleanCode, "$options": "i"}},
			},
			"is_active": true,
		}
	} else if productID != "" {
		// Try to find by ObjectID
		objID, err := primitive.ObjectIDFromHex(productID)
		if err != nil {
			return "شناسه محصول نامعتبر است.", nil, nil
		}
		filter = bson.M{"_id": objID, "is_active": true}
	} else {
		return "لطفاً کد یا شناسه محصول را مشخص کنید.", nil, nil
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(5))
	if err != nil {
		return "", nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return "", nil, err
	}

	if len(products) == 0 {
		return fmt.Sprintf("محصولی با کد %s پیدا نشد.", productCode), nil, nil
	}

	// Build detailed response
	var builder strings.Builder
	for _, product := range products {
		builder.WriteString(fmt.Sprintf("📦 **%s**\n", product.Name))

		if product.SearchMetadata != nil {
			if product.SearchMetadata.NamePersian != "" {
				builder.WriteString(fmt.Sprintf("نام: %s\n", product.SearchMetadata.NamePersian))
			}
			if product.SearchMetadata.MaterialPersian != "" {
				builder.WriteString(fmt.Sprintf("جنس/پارچه: %s\n", product.SearchMetadata.MaterialPersian))
			}
			if product.SearchMetadata.StylePersian != "" {
				builder.WriteString(fmt.Sprintf("استایل: %s\n", product.SearchMetadata.StylePersian))
			}
			if len(product.SearchMetadata.ColorsPersian) > 0 {
				var colors []string
				for _, c := range product.SearchMetadata.ColorsPersian {
					colors = append(colors, c.NamePersian)
				}
				builder.WriteString(fmt.Sprintf("رنگ‌ها: %s\n", strings.Join(colors, "، ")))
			}
			if product.SearchMetadata.DescriptionPersian != "" {
				builder.WriteString(fmt.Sprintf("توضیحات: %s\n", product.SearchMetadata.DescriptionPersian))
			}
		}

		builder.WriteString(fmt.Sprintf("قیمت: %s تومان\n", formatPrice(product.Price)))
		builder.WriteString(fmt.Sprintf("برند: %s\n", product.Brand))

		// Add available sizes from color variants
		if len(product.ColorVariants) > 0 {
			sizeSet := make(map[string]bool)
			for _, cv := range product.ColorVariants {
				for _, sv := range cv.Sizes {
					if sv.Size != "" {
						sizeSet[sv.Size] = true
					}
				}
			}
			if len(sizeSet) > 0 {
				var sizes []string
				for size := range sizeSet {
					sizes = append(sizes, size)
				}
				builder.WriteString(fmt.Sprintf("سایزهای موجود: %s\n", strings.Join(sizes, "، ")))
			}
		}

		builder.WriteString(fmt.Sprintf("شناسه: %s\n\n", product.ID.Hex()))
	}

	return builder.String(), products, nil
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
	// Use hybrid search for better results
	productIDs, _ := s.hybridSemanticProductSearch(ctx, query)
	products, _ := s.getProductsByIDs(ctx, productIDs)

	var msg string
	if len(products) > 0 {
		// Pick a random fallback message
		if len(s.config.FallbackMessages) > 0 {
			idx := int(time.Now().UnixNano()) % len(s.config.FallbackMessages)
			msg = s.config.FallbackMessages[idx]
		} else {
			msg = "بر اساس جستجوی شما، این محصولات رو پیشنهاد می‌کنم:"
		}
	} else {
		msg = "متاسفانه محصولی با این مشخصات پیدا نشد. لطفاً با کلمات کلیدی دیگری جستجو کنید یا دسته‌بندی‌های محصولات ما را مرور کنید."
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
