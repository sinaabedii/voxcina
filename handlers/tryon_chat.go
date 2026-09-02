package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// TryOnChatStream handles POST /api/tryon/chat-stream — one SSE turn of the
// fitting-room conversation. The agent (SellerModeTryon) talks about the
// garment and recommends products from the catalog; it has no coupon tool.
// Discount negotiation is the checkout page's job: /api/coupons/negotiate-stream.
func TryOnChatStream(w http.ResponseWriter, r *http.Request) {
	userID, _, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "لطفاً وارد شوید")
		return
	}

	var req services.SellerChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "پیام نمی‌تواند خالی باشد")
		return
	}

	// Everything the agent reasons over is rebuilt from the database here; the
	// request body only names which try-on and which room.
	input, err := buildTryOnChatInput(r.Context(), userID, req)
	if err != nil {
		fmt.Printf("[tryon-chat] context build failed for user=%s: %v\n", userID.Hex(), err)
		utils.ErrorResponse(w, http.StatusBadRequest, "اطلاعات پرو مجازی نامعتبر است")
		return
	}

	fmt.Printf("[tryon-chat] user=%s product=%s msg=%q\n",
		userID.Hex(), input.Request.TryonProductID, utils.TruncateRunes(req.Message, 50))

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	turn, err := services.RunSellerAgentStream(r.Context(), input, w)
	if err != nil {
		fmt.Printf("[tryon-chat] stream error: %v\n", err)
		evt := services.StreamEvent{Type: "error", Error: "خطا در ارتباط با سرویس گفتگو"}
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "data: %s\n\n", data)
		return
	}

	// The response is already on the wire, so persistence must not ride on the
	// request context — a client that disconnects here would cancel the writes.
	persistCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	persistTryOnChatTurn(persistCtx, userID, input, turn)
}

// buildTryOnChatInput assembles the agent's whole view of the world from the
// database. The client supplies only identifiers, and each is checked against
// the authenticated user before anything derived from it reaches the prompt.
func buildTryOnChatInput(ctx context.Context, userID primitive.ObjectID, req services.SellerChatRequest) (services.SellerAgentInput, error) {
	input := services.SellerAgentInput{Mode: services.SellerModeTryon, Request: req}

	// A try-on record is the authoritative statement of what was worn, so it
	// overrides the product and colour the client claims. It is also the only
	// thing that lets the prompt say the customer is wearing anything: the
	// fitting room lets them chat before trying on, and the client-supplied
	// product alone proves nothing about what happened.
	if req.TryonID != "" && virtualTryonService != nil {
		tryon, err := virtualTryonService.GetByTryonID(ctx, req.TryonID)
		if err != nil {
			fmt.Printf("[tryon-chat] tryon %s not found: %v\n", req.TryonID, err)
		} else if tryon == nil {
			fmt.Printf("[tryon-chat] tryon %s not found (nil)\n", req.TryonID)
		} else if tryon.UserID != userID {
			return input, fmt.Errorf("tryon %s does not belong to user %s", req.TryonID, userID.Hex())
		} else {
			if !tryon.GarmentProductID.IsZero() {
				input.Request.TryonProductID = tryon.GarmentProductID.Hex()
			}
			if tryon.GarmentColor != "" {
				input.Request.TryonColor = tryon.GarmentColor
			}
			input.TryonDone = tryon.Status == models.TryonStatusDone
		}
	}

	if input.Request.TryonProductID == "" {
		return input, fmt.Errorf("no garment in the fitting room to talk about")
	}

	tryonContext, colorValue, colorName, err := describeTryonProduct(ctx, input.Request.TryonProductID, input.Request.TryonColor)
	if err != nil {
		return input, err
	}
	input.TryonContext = tryonContext
	input.TryonColorName = colorName
	if colorValue != "" {
		// Pin the context to the canonical variant value so every colour the
		// agent names matches how the catalog and the cart spell it.
		input.Request.TryonColor = colorValue
	}

	input.CartItems = buildServerCartContext(ctx, userID)
	input.ChatHistory, input.SuggestedProducts = loadTryOnChatHistory(ctx, userID, req.ChatID)
	input.ComplementaryProducts = loadComplementaryProducts(input.Request.TryonProductID, input.Request.TryonColor)

	return input, nil
}

// describeTryonProduct renders the garment summary the prompt shows as
// "Garment in focus", using the catalogue price rather than a client-supplied
// one. It also returns the canonical colour value and display name of the
// matched variant, so the agent speaks the same colour words the cart stores.
//
// The summary carries the variant's own facts — material, fit, type, and the
// sizes actually in stock — because the prompt forbids Voxa from stating any
// garment fact that is not in the context. With only a name and a price there,
// she had to dodge the most common fitting-room questions ("جنسش چیه؟",
// "سایز XL داری؟") about the very item on screen; now she can answer them.
func describeTryonProduct(ctx context.Context, productID, color string) (summary, colorValue, colorName string, err error) {
	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return "", "", "", fmt.Errorf("invalid product ID %q: %w", productID, err)
	}

	var product models.Product
	if err := db.Database.Collection("products").FindOne(ctx, bson.M{"_id": objID}).Decode(&product); err != nil {
		return "", "", "", fmt.Errorf("product %s not found: %w", productID, err)
	}

	colorName = color
	facts := ""
	if cv, _, ok := findColorVariant(&product, color, color); ok {
		colorValue = canonicalColorValue(cv)
		colorName = cv.ColorName
		facts = variantFactLine(&product, cv)
	}

	summary = fmt.Sprintf("%s - %s - %.0f تومان", product.Name, colorName, product.Price)
	if facts != "" {
		summary += " | " + facts
	}
	return summary, colorValue, colorName, nil
}

// variantFactLine packs the per-variant facts a customer asks about in the
// fitting room: what it is made of, how it fits, and which sizes are actually
// available right now. Sizes are listed only when in stock, with quantity, so
// "همین الان فقط L مونده" is a grounded answer instead of a guess.
func variantFactLine(product *models.Product, cv models.ColorVariant) string {
	var parts []string
	if product.Brand != "" {
		parts = append(parts, "برند: "+product.Brand)
	}
	if cv.AIMetadata != nil {
		if cv.AIMetadata.ProductTypePersian != "" {
			parts = append(parts, "نوع: "+cv.AIMetadata.ProductTypePersian)
		}
		if cv.AIMetadata.MaterialPersian != "" {
			parts = append(parts, "جنس: "+cv.AIMetadata.MaterialPersian)
		}
		if cv.AIMetadata.FitType != "" {
			parts = append(parts, "قواره: "+cv.AIMetadata.FitType)
		}
		if cv.AIMetadata.Gender != "" {
			parts = append(parts, "مناسب: "+cv.AIMetadata.Gender)
		}
	}
	var sizes []string
	for _, s := range cv.Sizes {
		if s.Quantity > 0 {
			sizes = append(sizes, fmt.Sprintf("%s(%d عدد)", s.Size, s.Quantity))
		}
	}
	switch {
	case len(sizes) > 0:
		parts = append(parts, "سایزهای موجود: "+strings.Join(sizes, "، "))
	case len(cv.Sizes) > 0:
		parts = append(parts, "فعلاً بدون موجودی")
	}
	return strings.Join(parts, " | ")
}

// loadTryOnChatHistory replays the stored transcript for this room instead of
// trusting the history the client sends, which is otherwise trivially forged.
// It also reports which product cards this room has already put on screen: the
// transcript itself is text only, so without this second return the agent
// cannot tell what the customer is currently looking at.
func loadTryOnChatHistory(ctx context.Context, userID primitive.ObjectID, chatID string) ([]services.CouponChatMessage, []string) {
	if chatID == "" || tryonChatService == nil {
		return nil, nil
	}

	chat, err := tryonChatService.GetByChatID(ctx, chatID)
	if err != nil || chat == nil {
		return nil, nil
	}
	if chat.UserID != userID {
		fmt.Printf("[tryon-chat] chat %s does not belong to user %s — ignoring history\n", chatID, userID.Hex())
		return nil, nil
	}

	history := make([]services.CouponChatMessage, 0, len(chat.Messages))
	var shown []string
	for _, msg := range chat.Messages {
		if name := shownProductName(msg); name != "" && !containsString(shown, name) {
			shown = append(shown, name)
		}
		if msg.Role != models.TryonChatRoleUser && msg.Role != models.TryonChatRoleAgent {
			continue
		}
		if msg.Content == "" {
			continue
		}
		history = append(history, services.CouponChatMessage{Role: msg.Role, Content: msg.Content})
	}
	return history, shown
}

// shownProductName returns the product whose card this message put on screen,
// or "" if it showed none. The recommendation is read back out of the stored
// tool-call result — the same record the fitting room replays on reload — so
// what the agent is told matches exactly what the customer can see.
//
// The room's metadata.products_recommended list is deliberately not used: the
// client's message-append path also writes tried-on garments into it, so it is
// not a record of what was recommended.
func shownProductName(msg models.TryonChatMessage) string {
	if msg.ToolCall == nil || msg.ToolCall.Result == nil {
		return ""
	}
	rec, ok := msg.ToolCall.Result["recommended_product"].(map[string]interface{})
	if !ok {
		return ""
	}
	name, _ := rec["product_name"].(string)
	return strings.TrimSpace(name)
}

func containsString(list []string, want string) bool {
	for _, s := range list {
		if s == want {
			return true
		}
	}
	return false
}

// persistTryOnChatTurn writes both halves of the turn to the room transcript.
// Doing it here rather than from the browser removes the race where the agent
// reads history that the client has not finished uploading yet, and lets the
// agent message carry the model and latency the admin transcript viewer shows.
//
// No coupon branch: the tryon agent has no coupon tool (offer_coupon belongs
// to the checkout negotiation agent — see persistCheckoutNegotiationTurn).
func persistTryOnChatTurn(ctx context.Context, userID primitive.ObjectID, input services.SellerAgentInput, turn *services.SellerTurnResult) {
	chatID := input.Request.ChatID
	if chatID == "" || tryonChatService == nil {
		return
	}

	now := time.Now()
	messages := []models.TryonChatMessage{{
		ID:        primitive.NewObjectID().Hex(),
		Role:      models.TryonChatRoleUser,
		Content:   input.Request.Message,
		Timestamp: now,
	}}

	agentMsg := models.TryonChatMessage{
		ID:             primitive.NewObjectID().Hex(),
		Role:           models.TryonChatRoleAgent,
		Content:        turn.Reply,
		Timestamp:      now.Add(time.Millisecond),
		ModelUsed:      turn.ModelUsed,
		ResponseTimeMs: turn.ResponseTimeMs,
	}

	// The stored tool_call shape is what the fitting room reads back on reload
	// to restore the recommendation card — keep it stable.
	if rec := recommendedProductRecord(turn.RecommendedProduct); rec != nil {
		agentMsg.ToolCall = &models.TryonChatToolCall{
			Name:      "recommend_product",
			Arguments: map[string]interface{}{"product_id": turn.RecommendedProduct.ProductID},
			Result:    map[string]interface{}{"recommended_product": rec},
		}
	} else if len(turn.CatalogHits) > 0 {
		agentMsg.ToolCall = &models.TryonChatToolCall{
			Name:      "search_catalog",
			Arguments: map[string]interface{}{},
			Result:    map[string]interface{}{"catalog_hits": turn.CatalogHits},
		}
	}

	messages = append(messages, agentMsg)

	if err := tryonChatService.AppendMessages(ctx, chatID, messages, userID); err != nil {
		fmt.Printf("[tryon-chat] transcript append failed: %v\n", err)
		return
	}

	if turn.RecommendedProduct != nil {
		_ = tryonChatService.AddRecommendedProduct(ctx, chatID, turn.RecommendedProduct.ProductID)
	}
}

// recommendedProductRecord flattens a recommendation for storage. The keys are
// written out explicitly because the fitting room reads them straight back on
// reload — BSON would otherwise store the Go field names and the restore path
// would find nothing. The full product document is deliberately left out; the
// client rebuilds it from these fields (see buildRecommendedProduct).
func recommendedProductRecord(rec *services.CouponCartItem) map[string]interface{} {
	if rec == nil {
		return nil
	}
	return map[string]interface{}{
		"product_id":     rec.ProductID,
		"product_name":   rec.ProductName,
		"price":          rec.Price,
		"color":          rec.Color,
		"color_name":     rec.ColorName,
		"selected_color": rec.SelectedColor,
		"size":           rec.Size,
		"image":          rec.Image,
	}
}

func loadComplementaryProducts(productID, color string) []services.CouponCartItem {
	if productID == "" {
		return nil
	}
	compProducts, err := findComplementaryProducts(productID, color)
	if err != nil {
		fmt.Printf("[tryon-chat] failed to find complementary products: %v\n", err)
		return nil
	}
	return compProducts
}

func findComplementaryProducts(productID, color string) ([]services.CouponCartItem, error) {
	ctx := context.Background()
	collection := db.Database.Collection("products")

	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return nil, fmt.Errorf("invalid product ID: %v", err)
	}

	var product models.Product
	err = collection.FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&product)
	if err != nil {
		return nil, fmt.Errorf("product not found: %v", err)
	}

	var sourceGarmentType string
	for _, cv := range product.ColorVariants {
		if color != "" && !colorVariantMatches(cv, color, color) {
			continue
		}
		if cv.TryOnGarmentType != "" {
			sourceGarmentType = cv.TryOnGarmentType
			break
		}
	}
	if sourceGarmentType == "" {
		for _, cv := range product.ColorVariants {
			if cv.TryOnGarmentType != "" {
				sourceGarmentType = cv.TryOnGarmentType
				break
			}
		}
	}
	if sourceGarmentType == "" {
		sourceGarmentType = "upper_body"
	}

	compTypes := complementaryGarmentTypes(sourceGarmentType)
	if len(compTypes) == 0 {
		return nil, nil
	}

	filter := bson.M{
		"_id":       bson.M{"$ne": objID},
		"is_active": true,
		"color_variants": bson.M{
			"$elemMatch": bson.M{
				"try_on_garment_type": bson.M{"$in": compTypes},
				"try_on_image":        bson.M{"$ne": "", "$exists": true},
			},
		},
	}

	compProducts, err := queryCompProducts(collection, ctx, filter)
	if err != nil {
		return nil, err
	}

	if len(compProducts) == 0 {
		fallbackFilter := bson.M{
			"_id":       bson.M{"$ne": objID},
			"is_active": true,
			"color_variants": bson.M{
				"$elemMatch": bson.M{
					"try_on_image":        bson.M{"$ne": "", "$exists": true},
					"try_on_garment_type": bson.M{"$ne": sourceGarmentType},
				},
			},
		}
		fmt.Println("[tryon-chat] no garment-type matches, trying fallback query")
		compProducts, err = queryCompProducts(collection, ctx, fallbackFilter)
		if err != nil {
			return nil, err
		}
	}

	rand.Shuffle(len(compProducts), func(i, j int) {
		compProducts[i], compProducts[j] = compProducts[j], compProducts[i]
	})

	limit := 2
	if len(compProducts) < limit {
		limit = len(compProducts)
	}

	result := make([]services.CouponCartItem, 0, limit)
	for i := 0; i < limit; i++ {
		p := compProducts[i]
		item := services.CouponCartItem{
			ProductID:   p.ID.Hex(),
			ProductName: p.Name,
			Price:       p.Price,
		}
		for _, cv := range p.ColorVariants {
			if cv.TryOnImage != "" {
				item.Image = cv.TryOnImage
				item.Color = canonicalColorValue(cv)
				item.ColorName = cv.ColorName
				item.SelectedColor = canonicalColorValue(cv)
				break
			}
		}
		if item.Image == "" {
			for _, cv := range p.ColorVariants {
				if len(cv.Images) > 0 {
					item.Image = cv.Images[0]
					item.Color = canonicalColorValue(cv)
					item.ColorName = cv.ColorName
					item.SelectedColor = canonicalColorValue(cv)
					break
				}
			}
		}
		productCopy := p
		item.Product = &productCopy
		result = append(result, item)
	}

	return result, nil
}

func queryCompProducts(collection *mongo.Collection, ctx context.Context, filter bson.M) ([]models.Product, error) {
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("query error: %v", err)
	}
	defer cursor.Close(ctx)

	var compProducts []models.Product
	if err := cursor.All(ctx, &compProducts); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return compProducts, nil
}

func complementaryGarmentTypes(garmentType string) []string {
	switch garmentType {
	case "upper_body":
		return []string{"lower_body"}
	case "lower_body":
		return []string{"upper_body"}
	case "dresses":
		return []string{"upper_body", "lower_body"}
	default:
		return nil
	}
}
