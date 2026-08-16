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
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

func NegotiateCouponStream(w http.ResponseWriter, r *http.Request) {
	userID, _, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "لطفاً وارد شوید")
		return
	}

	var req services.NegotiateRequest
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
	input, err := buildSellerInput(r.Context(), userID, req)
	if err != nil {
		fmt.Printf("[negotiate-stream] context build failed for user=%s: %v\n", userID.Hex(), err)
		utils.ErrorResponse(w, http.StatusBadRequest, "اطلاعات پرو مجازی نامعتبر است")
		return
	}

	fmt.Printf("[negotiate-stream] user=%s product=%s grants=%d band=%d-%d msg=%q\n",
		userID.Hex(), input.Request.TryonProductID, input.State.GrantCount,
		input.State.Floor, input.State.Ceiling, utils.TruncateRunes(req.Message, 50))

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	turn, err := services.RunSellerAgentStream(r.Context(), input, w)
	if err != nil {
		fmt.Printf("[negotiate-stream] stream error: %v\n", err)
		evt := services.StreamEvent{Type: "error", Error: "خطا در ارتباط با سرویس مذاکره"}
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "data: %s\n\n", data)
		return
	}

	// The response is already on the wire, so persistence must not ride on the
	// request context — a client that disconnects here would cancel the writes.
	persistCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if turn.Coupon != nil {
		if turn.Coupon.IsReuse {
			// Restating the current best price — reuse the existing coupon and
			// skip minting a duplicate code/document.
			fmt.Printf("[negotiate-stream] reusing active coupon %s at %d%%\n", turn.Coupon.Code, int(turn.Coupon.Value))
		} else {
			nc := buildNegotiatedCoupon(input, turn.Coupon, userID)
			nc.TryonID = input.Request.TryonID
			nc.ChatID = input.Request.ChatID
			if err := saveNegotiatedCoupon(persistCtx, nc); err != nil {
				fmt.Printf("[negotiate-stream] coupon save error: %v\n", err)
			}
		}
	}

	persistNegotiationTurn(persistCtx, userID, input, turn)
}

// buildSellerInput assembles the agent's whole view of the world from the
// database. The client supplies only identifiers, and each is checked against
// the authenticated user before anything derived from it reaches the prompt.
func buildSellerInput(ctx context.Context, userID primitive.ObjectID, req services.NegotiateRequest) (services.SellerAgentInput, error) {
	input := services.SellerAgentInput{Request: req}

	// A try-on record is the authoritative statement of what was worn, so it
	// overrides the product and colour the client claims. It is also the only
	// thing that lets the prompt say the customer is wearing anything: the
	// fitting room lets them chat before trying on, and the client-supplied
	// product alone proves nothing about what happened.
	if req.TryonID != "" && virtualTryonService != nil {
		tryon, err := virtualTryonService.GetByTryonID(ctx, req.TryonID)
		if err != nil {
			fmt.Printf("[negotiate-stream] tryon %s not found: %v\n", req.TryonID, err)
		} else if tryon == nil {
			fmt.Printf("[negotiate-stream] tryon %s not found (nil)\n", req.TryonID)
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
		return input, fmt.Errorf("no try-on product to negotiate over")
	}

	tryonContext, colorValue, colorName, err := describeTryonProduct(ctx, input.Request.TryonProductID, input.Request.TryonColor)
	if err != nil {
		return input, err
	}
	input.TryonContext = tryonContext
	input.TryonColorName = colorName
	if colorValue != "" {
		// Pin the coupon to the canonical variant value so the cart-side
		// colour check matches however the try-on record spelled it.
		input.Request.TryonColor = colorValue
	}

	input.CartItems = buildServerCartContext(ctx, userID)
	input.ChatHistory, input.SuggestedProducts = loadNegotiationHistory(ctx, userID, req.ChatID)
	input.ComplementaryProducts = loadComplementaryProducts(input.Request.TryonProductID, input.Request.TryonColor)

	grantCount, prevMax, lastReason := loadNegotiationProgress(ctx, userID, req.ChatID)
	input.State = services.ResolveNegotiationState(grantCount, prevMax, lastReason)

	// Carry the room's most recent still-valid coupon so the agent can reuse it
	// when a turn just restates the current best price instead of minting a
	// duplicate. Loaded here (server-side, authenticated) so the client can't
	// nominate a coupon to reuse.
	input.ReusableCoupon = loadLatestActiveCoupon(ctx, userID, req.ChatID)

	return input, nil
}

// describeTryonProduct renders the one-line garment summary the prompt shows as
// "Just tried on", using the catalogue price rather than a client-supplied one.
// It also returns the canonical colour value and display name of the matched
// variant, so the coupon is pinned to the same values the cart stores.
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
	if cv, _, ok := findColorVariant(&product, color, color); ok {
		colorValue = canonicalColorValue(cv)
		colorName = cv.ColorName
	}

	return fmt.Sprintf("%s - %s - %.0f تومان", product.Name, colorName, product.Price), colorValue, colorName, nil
}

// buildServerCartContext reads the user's real cart so prices in the prompt
// cannot be spoofed by the caller.
func buildServerCartContext(ctx context.Context, userID primitive.ObjectID) []services.CouponCartItem {
	cart, _, err := getActiveCartForUser(ctx, userID)
	if err != nil || cart == nil {
		return nil
	}

	items := make([]services.CouponCartItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		var product models.Product
		if err := db.Database.Collection("products").FindOne(ctx, bson.M{"_id": item.ProductID}).Decode(&product); err != nil {
			continue
		}

		entry := services.CouponCartItem{
			ProductID:   item.ProductID.Hex(),
			ProductName: product.Name,
			Price:       product.Price,
			Color:       item.Variant.Color,
			ColorName:   item.Variant.ColorName,
			Size:        item.Variant.Size,
		}
		if cv, _, ok := findColorVariant(&product, item.Variant.Color, item.Variant.ColorName); ok {
			entry.Color = canonicalColorValue(cv)
			entry.ColorName = cv.ColorName
		}
		items = append(items, entry)
	}
	return items
}

// loadNegotiationHistory replays the stored transcript for this room instead of
// trusting the history the client sends, which is otherwise trivially forged.
// It also reports which product cards this room has already put on screen: the
// transcript itself is text only, so without this second return the agent
// cannot tell what the customer is currently looking at.
func loadNegotiationHistory(ctx context.Context, userID primitive.ObjectID, chatID string) ([]services.CouponChatMessage, []string) {
	if chatID == "" || tryonChatService == nil {
		return nil, nil
	}

	chat, err := tryonChatService.GetByChatID(ctx, chatID)
	if err != nil || chat == nil {
		return nil, nil
	}
	if chat.UserID != userID {
		fmt.Printf("[negotiate-stream] chat %s does not belong to user %s — ignoring history\n", chatID, userID.Hex())
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

// loadNegotiationProgress reports how many coupons this room has already
// produced, the largest percent among them, and the reason cited for that
// largest grant — the three facts the reason gate needs to decide whether the
// agent may go higher this turn.
func loadNegotiationProgress(ctx context.Context, userID primitive.ObjectID, chatID string) (int, int, string) {
	if chatID == "" {
		return 0, 0, ""
	}

	cursor, err := db.Database.Collection("negotiated_coupons").Find(ctx, bson.M{
		"user_id": userID,
		"chat_id": chatID,
	})
	if err != nil {
		fmt.Printf("[negotiate-stream] progress lookup failed: %v\n", err)
		return 0, 0, ""
	}
	defer cursor.Close(ctx)

	var coupons []models.NegotiatedCoupon
	if err := cursor.All(ctx, &coupons); err != nil {
		fmt.Printf("[negotiate-stream] progress decode failed: %v\n", err)
		return 0, 0, ""
	}

	prevMax := 0
	lastReason := ""
	for _, c := range coupons {
		if int(c.Value) > prevMax {
			prevMax = int(c.Value)
			lastReason = c.Reason
		}
	}
	return len(coupons), prevMax, lastReason
}

// loadLatestActiveCoupon returns the most recent still-unused, unexpired
// negotiated coupon for this fitting room, as a NegotiateCouponOut the agent
// can echo straight back to the client when it restates the current best price.
// Returns nil when there is none — the agent then mints a fresh code.
func loadLatestActiveCoupon(ctx context.Context, userID primitive.ObjectID, chatID string) *services.NegotiateCouponOut {
	if chatID == "" {
		return nil
	}

	var coupon models.NegotiatedCoupon
	err := db.Database.Collection("negotiated_coupons").FindOne(ctx, bson.M{
		"user_id":     userID,
		"chat_id":     chatID,
		"used":        false,
		"valid_until": bson.M{"$gt": time.Now()},
	}, options.FindOne().SetSort(bson.M{"created_at": -1})).Decode(&coupon)
	if err != nil {
		return nil
	}

	out := &services.NegotiateCouponOut{
		Code:       coupon.Code,
		Value:      coupon.Value,
		Reason:     coupon.Reason,
		ValidUntil: coupon.ValidUntil.Format(time.RFC3339),
		IsReuse:    true,
	}

	productIDStrings := make([]string, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		productIDStrings = append(productIDStrings, pid.Hex())
	}
	out.ProductIDs = productIDStrings
	if len(productIDStrings) > 1 {
		out.CompProductID = productIDStrings[1]
	}

	if len(coupon.RequiredProducts) > 0 {
		out.MainColor = coupon.RequiredProducts[0].Color
		out.MainColorName = coupon.RequiredProducts[0].ColorName
		if len(coupon.RequiredProducts) > 1 {
			out.CompColor = coupon.RequiredProducts[1].Color
			out.CompColorName = coupon.RequiredProducts[1].ColorName
		}
	}

	return out
}

// persistNegotiationTurn writes both halves of the turn to the room transcript.
// Doing it here rather than from the browser removes the race where the agent
// reads history that the client has not finished uploading yet, and lets the
// agent message carry the model and latency the admin transcript viewer shows.
func persistNegotiationTurn(ctx context.Context, userID primitive.ObjectID, input services.SellerAgentInput, turn *services.SellerTurnResult) {
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
	// to restore the coupon and the recommendation card — keep it stable.
	if turn.Coupon != nil {
		result := map[string]interface{}{
			"code":        turn.Coupon.Code,
			"value":       turn.Coupon.Value,
			"valid_until": turn.Coupon.ValidUntil,
			"product_ids": turn.Coupon.ProductIDs,
		}
		if rec := recommendedProductRecord(turn.RecommendedProduct); rec != nil {
			result["recommended_product"] = rec
		}
		if len(turn.CatalogHits) > 0 {
			result["catalog_hits"] = turn.CatalogHits
		}
		agentMsg.ToolCall = &models.TryonChatToolCall{
			Name: "offer_coupon",
			Arguments: map[string]interface{}{
				"product_id":      input.Request.TryonProductID,
				"comp_product_id": turn.Coupon.CompProductID,
				"message":         turn.Reply,
			},
			Result: result,
		}
	} else if rec := recommendedProductRecord(turn.RecommendedProduct); rec != nil {
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
		fmt.Printf("[negotiate-stream] transcript append failed: %v\n", err)
		return
	}

	if turn.Coupon != nil {
		_ = tryonChatService.AddCouponCode(ctx, chatID, turn.Coupon.Code)
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
		fmt.Printf("[negotiate] failed to find complementary products: %v\n", err)
		return nil
	}
	return compProducts
}

func buildNegotiatedCoupon(input services.SellerAgentInput, coupon *services.NegotiateCouponOut, userID primitive.ObjectID) models.NegotiatedCoupon {
	productIDs := make([]primitive.ObjectID, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		objID, err := primitive.ObjectIDFromHex(pid)
		if err == nil {
			productIDs = append(productIDs, objID)
		}
	}

	validUntil, _ := time.Parse(time.RFC3339, coupon.ValidUntil)

	cartSnapshot := make([]models.CartItemSnapshot, 0, len(input.CartItems))
	for _, item := range input.CartItems {
		cartSnapshot = append(cartSnapshot, models.CartItemSnapshot{
			ProductID:   item.ProductID,
			ProductName: item.ProductName,
			Price:       item.Price,
			Color:       item.Color,
			ColorName:   item.ColorName,
			Size:        item.Size,
		})
	}

	conversation := make([]models.CouponMessage, 0, len(input.ChatHistory)+1)
	for _, msg := range input.ChatHistory {
		conversation = append(conversation, models.CouponMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	conversation = append(conversation, models.CouponMessage{
		Role:    "user",
		Content: input.Request.Message,
	})

	requiredProducts := buildRequiredProducts(input, coupon)

	return models.NegotiatedCoupon{
		Code:             coupon.Code,
		UserID:           userID,
		ProductIDs:       productIDs,
		RequiredProducts: requiredProducts,
		CartSnapshot:     cartSnapshot,
		Type:             "percentage",
		Value:            coupon.Value,
		Reason:           coupon.Reason,
		ValidUntil:       validUntil,
		Used:             false,
		Conversation:     conversation,
		CreatedAt:        time.Now(),
	}
}

func buildRequiredProducts(input services.SellerAgentInput, coupon *services.NegotiateCouponOut) []models.RequiredProduct {
	ctx := context.Background()
	collection := db.Database.Collection("products")
	result := make([]models.RequiredProduct, 0, len(coupon.ProductIDs))

	for i, pid := range coupon.ProductIDs {
		objID, err := primitive.ObjectIDFromHex(pid)
		if err != nil {
			continue
		}

		var product models.Product
		if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&product); err != nil {
			continue
		}

		var color, colorName, image string
		if i == 0 {
			color = input.Request.TryonColor
			colorName = input.TryonColorName
		} else if coupon.CompProductID != "" && pid == coupon.CompProductID {
			for _, cp := range input.ComplementaryProducts {
				if cp.ProductID == coupon.CompProductID {
					color = cp.Color
					colorName = cp.ColorName
					if cp.Image != "" {
						image = cp.Image
					}
					break
				}
			}
		}

		if cv, _, ok := findColorVariant(&product, color, colorName); ok {
			color = canonicalColorValue(cv)
			colorName = cv.ColorName
			if image == "" && len(cv.Images) > 0 {
				image = cv.Images[0]
			}
			if image == "" && cv.TryOnImage != "" {
				image = cv.TryOnImage
			}
		} else if len(product.ColorVariants) > 0 {
			cv := product.ColorVariants[0]
			color = canonicalColorValue(cv)
			colorName = cv.ColorName
			if image == "" && len(cv.Images) > 0 {
				image = cv.Images[0]
			}
		}

		result = append(result, models.RequiredProduct{
			ProductID: objID,
			Color:     color,
			ColorName: colorName,
			Image:     image,
		})
	}

	return result
}

func saveNegotiatedCoupon(ctx context.Context, coupon models.NegotiatedCoupon) error {
	collection := db.Database.Collection("negotiated_coupons")
	_, err := collection.InsertOne(ctx, coupon)
	return err
}

func ApplyNegotiatedCoupon(w http.ResponseWriter, r *http.Request) {
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req struct {
		Code      string `json:"code"`
		CartItems []struct {
			ProductID string `json:"product_id"`
			Color     string `json:"color,omitempty"`
			ColorName string `json:"color_name,omitempty"`
		} `json:"cart_items,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}

	if req.Code == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد کوپن الزامی است")
		return
	}

	ctx := context.Background()
	collection := db.Database.Collection("negotiated_coupons")

	var coupon models.NegotiatedCoupon
	err = collection.FindOne(ctx, bson.M{
		"code":    req.Code,
		"user_id": userID,
		"used":    false,
	}).Decode(&coupon)

	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "کد تخفیف نامعتبر است یا قبلاً استفاده شده")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تخفیف")
		return
	}

	if time.Now().After(coupon.ValidUntil) {
		utils.ErrorResponse(w, http.StatusGone, "کد تخفیف منقضی شده است")
		return
	}

	// Validate the required products against the current cart. Try-on negotiated
	// coupons require ALL required products present, in the negotiated color
	// (any size qualifies). Cart-recovery coupons only require that AT LEAST ONE
	// of the color variants that were in the cart when the SMS was sent is still
	// there. We must never trust an empty cart_items array, and ideally we
	// validate against the server-side cart so a stale client cannot lie (bug #3).
	// Prefer the server cart; fall back to client-supplied cart_items only when
	// the server cart is unavailable (e.g. anonymous).
	serverCart := buildServerCartContext(ctx, userID)
	var cartForValidation []struct {
		PID       string
		Color     string
		ColorName string
	}
	if len(serverCart) > 0 {
		for _, it := range serverCart {
			cartForValidation = append(cartForValidation, struct {
				PID       string
				Color     string
				ColorName string
			}{PID: it.ProductID, Color: it.Color, ColorName: it.ColorName})
		}
	} else {
		for _, ci := range req.CartItems {
			cartForValidation = append(cartForValidation, struct {
				PID       string
				Color     string
				ColorName string
			}{PID: ci.ProductID, Color: ci.Color, ColorName: ci.ColorName})
		}
	}
	// Bug #3: if coupon has required products, an empty cart cannot satisfy them.
	if len(coupon.RequiredProducts) > 0 && len(cartForValidation) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "سبد خرید خالی است")
		return
	}
	if len(coupon.RequiredProducts) > 0 && len(cartForValidation) > 0 {
		if coupon.Source == "cart_recovery" {
			found := false
			for _, required := range coupon.RequiredProducts {
				for _, cartItem := range cartForValidation {
					if cartItem.PID != required.ProductID.Hex() {
						continue
					}
					if colorsOverlap(required.Color, required.ColorName, cartItem.Color, cartItem.ColorName) {
						found = true
						break
					}
				}
				if found {
					break
				}
			}
			if !found {
				utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف دیگر با محصولات موجود در سبد خرید شما مطابقت ندارد")
				return
			}
		} else {
			for _, required := range coupon.RequiredProducts {
				requiredPID := required.ProductID.Hex()
				found := false
				for _, cartItem := range cartForValidation {
					if cartItem.PID != requiredPID {
						continue
					}
					if required.Color == "" && required.ColorName == "" {
						found = true
						break
					}
					if colorsOverlap(required.Color, required.ColorName, cartItem.Color, cartItem.ColorName) {
						found = true
						break
					}
				}
				if !found {
					utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی، در همان رنگ پیشنهادی، در سبد خرید باشند")
					return
				}
			}
		}
	} else if len(coupon.ProductIDs) > 0 && len(cartForValidation) > 0 {
		for _, requiredPID := range coupon.ProductIDs {
			found := false
			for _, cartItem := range cartForValidation {
				if cartItem.PID == requiredPID.Hex() {
					found = true
					break
				}
			}
			if !found {
				utils.ErrorResponse(w, http.StatusBadRequest, "این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی در سبد خرید باشند")
				return
			}
		}
	} else if len(coupon.ProductIDs) > 0 && len(cartForValidation) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "سبد خرید خالی است")
		return
	}

	// Note: used flag is set by the frontend via POST /api/discounts/activate
	// after the discount is successfully applied to the cart.

	productIDStrings := make([]string, 0, len(coupon.ProductIDs))
	for _, pid := range coupon.ProductIDs {
		productIDStrings = append(productIDStrings, pid.Hex())
	}

	requiredProductsOut := make([]map[string]interface{}, 0, len(coupon.RequiredProducts))
	for _, rp := range coupon.RequiredProducts {
		requiredProductsOut = append(requiredProductsOut, map[string]interface{}{
			"product_id": rp.ProductID.Hex(),
			"color":      rp.Color,
			"color_name": rp.ColorName,
		})
	}

	description := "کد تخفیف اختصاصی شما"
	if coupon.Source == "cart_recovery" {
		description = "کد تخفیف بازگشت به سبد خرید"
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"valid": true,
		"discount": map[string]interface{}{
			"code":               coupon.Code,
			"type":               coupon.Type,
			"value":              coupon.Value,
			"discountPercentage": coupon.Value,
			"min_order_amount":   0,
			"valid_to":           coupon.ValidUntil.Format(time.RFC3339),
			"description":        description,
			"product_ids":        productIDStrings,
			"required_products":  requiredProductsOut,
			"source":             coupon.Source,
		},
	})
}

// colorsOverlap reports whether two (color, colorName) pairs refer to the same
// color variant, comparing both raw color and display-name values.
func colorsOverlap(color1, colorName1, color2, colorName2 string) bool {
	values1 := variantLookupValues(color1, colorName1)
	values2 := variantLookupValues(color2, colorName2)
	if len(values1) == 0 || len(values2) == 0 {
		return false
	}
	for _, v1 := range values1 {
		for _, v2 := range values2 {
			if v1 == v2 {
				return true
			}
		}
	}
	return false
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
		fmt.Println("[negotiate] no garment-type matches, trying fallback query")
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
