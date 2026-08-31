package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

var checkoutChatService *services.CheckoutChatService

// InitCheckoutChatService wires up the checkout-page discount-negotiation
// chat store. Deliberately separate from InitVirtualTryonService: this chat
// has nothing to do with the fitting room.
func InitCheckoutChatService(db *mongo.Database) {
	checkoutChatService = services.NewCheckoutChatService(db)
}

// NegotiateCheckoutCouponStream handles POST /api/coupons/negotiate-stream.
// It is the cart-scoped counterpart to NegotiateCouponStream: the customer
// negotiates a discount on whatever is in their cart, with no tried-on
// garment required.
func NegotiateCheckoutCouponStream(w http.ResponseWriter, r *http.Request) {
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
	if req.ChatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id الزامی است")
		return
	}

	input := buildCheckoutSellerInput(r.Context(), userID, req)

	fmt.Printf("[checkout-negotiate] user=%s grants=%d band=%d-%d msg=%q\n",
		userID.Hex(), input.State.GrantCount, input.State.Floor, input.State.Ceiling,
		utils.TruncateRunes(req.Message, 50))

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	turn, err := services.RunSellerAgentStream(r.Context(), input, w)
	if err != nil {
		fmt.Printf("[checkout-negotiate] stream error: %v\n", err)
		evt := services.StreamEvent{Type: "error", Error: "خطا در ارتباط با سرویس مذاکره"}
		data, _ := json.Marshal(evt)
		fmt.Fprintf(w, "data: %s\n\n", data)
		return
	}

	// Persistence must not ride on the request context, same reasoning as the
	// tryon negotiation stream: the response is already on the wire.
	persistCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if turn.Coupon != nil {
		if turn.Coupon.IsReuse {
			fmt.Printf("[checkout-negotiate] reusing active coupon %s at %d%%\n", turn.Coupon.Code, int(turn.Coupon.Value))
		} else {
			nc := buildNegotiatedCoupon(input, turn.Coupon, userID)
			nc.ChatID = input.Request.ChatID
			nc.Source = "checkout_negotiation"
			if err := saveNegotiatedCoupon(persistCtx, nc); err != nil {
				fmt.Printf("[checkout-negotiate] coupon save error: %v\n", err)
			}
		}
	}

	persistCheckoutNegotiationTurn(persistCtx, userID, input, turn)
}

// buildCheckoutSellerInput assembles the agent's view of the world from the
// database, scoped to the customer's cart — there is no tried-on garment to
// look up here.
func buildCheckoutSellerInput(ctx context.Context, userID primitive.ObjectID, req services.NegotiateRequest) services.SellerAgentInput {
	input := services.SellerAgentInput{Mode: services.SellerModeCheckout, Request: req}

	input.CartItems = buildServerCartContext(ctx, userID)
	input.ChatHistory = loadCheckoutNegotiationHistory(ctx, userID, req.ChatID)

	grantCount, prevMax, lastReason := loadNegotiationProgress(ctx, userID, req.ChatID)
	input.State = services.ResolveNegotiationState(grantCount, prevMax, lastReason)
	input.ReusableCoupon = loadLatestActiveCoupon(ctx, userID, req.ChatID)

	return input
}

// loadCheckoutNegotiationHistory replays the stored transcript for this
// checkout session instead of trusting whatever history the client sends.
func loadCheckoutNegotiationHistory(ctx context.Context, userID primitive.ObjectID, chatID string) []services.CouponChatMessage {
	if chatID == "" || checkoutChatService == nil {
		return nil
	}

	chat, err := checkoutChatService.GetByChatID(ctx, chatID)
	if err != nil || chat == nil {
		return nil
	}
	if chat.UserID != userID {
		fmt.Printf("[checkout-negotiate] chat %s does not belong to user %s — ignoring history\n", chatID, userID.Hex())
		return nil
	}

	history := make([]services.CouponChatMessage, 0, len(chat.Messages))
	for _, msg := range chat.Messages {
		if msg.Role != models.CheckoutChatRoleUser && msg.Role != models.CheckoutChatRoleAgent {
			continue
		}
		if msg.Content == "" {
			continue
		}
		history = append(history, services.CouponChatMessage{Role: msg.Role, Content: msg.Content})
	}
	return history
}

// persistCheckoutNegotiationTurn writes both halves of the turn to the
// session transcript, mirroring persistNegotiationTurn.
func persistCheckoutNegotiationTurn(ctx context.Context, userID primitive.ObjectID, input services.SellerAgentInput, turn *services.SellerTurnResult) {
	chatID := input.Request.ChatID
	if chatID == "" || checkoutChatService == nil {
		return
	}

	now := time.Now()
	messages := []models.CheckoutChatMessage{{
		ID:        primitive.NewObjectID().Hex(),
		Role:      models.CheckoutChatRoleUser,
		Content:   input.Request.Message,
		Timestamp: now,
	}}

	agentMsg := models.CheckoutChatMessage{
		ID:             primitive.NewObjectID().Hex(),
		Role:           models.CheckoutChatRoleAgent,
		Content:        turn.Reply,
		Timestamp:      now.Add(time.Millisecond),
		ModelUsed:      turn.ModelUsed,
		ResponseTimeMs: turn.ResponseTimeMs,
	}

	if turn.Coupon != nil {
		agentMsg.ToolCall = &models.CheckoutChatToolCall{
			Name: "offer_coupon",
			Arguments: map[string]interface{}{
				"message": turn.Reply,
			},
			Result: map[string]interface{}{
				"code":        turn.Coupon.Code,
				"value":       turn.Coupon.Value,
				"valid_until": turn.Coupon.ValidUntil,
			},
		}
	}

	messages = append(messages, agentMsg)

	if err := checkoutChatService.AppendMessages(ctx, chatID, messages, userID); err != nil {
		fmt.Printf("[checkout-negotiate] transcript append failed: %v\n", err)
		return
	}

	if turn.Coupon != nil {
		_ = checkoutChatService.AddCouponCode(ctx, chatID, turn.Coupon.Code)
	}
}

// AppendCheckoutChatMessages handles POST /api/coupons/sessions/messages.
// Mirrors AppendTryonMessages for the checkout_chats collection.
func AppendCheckoutChatMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req struct {
		ChatID   string                        `json:"chat_id"`
		Messages []models.CheckoutChatMessage `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	if req.ChatID == "" || len(req.Messages) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id و messages الزامی هستند")
		return
	}

	now := time.Now()
	for i := range req.Messages {
		if req.Messages[i].ID == "" {
			req.Messages[i].ID = primitive.NewObjectID().Hex()
		}
		if req.Messages[i].Timestamp.IsZero() {
			req.Messages[i].Timestamp = now
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := checkoutChatService.AppendMessages(ctx, req.ChatID, req.Messages, userID); err != nil {
		fmt.Printf("[checkout-messages] append error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره پیام‌ها")
		return
	}

	for _, m := range req.Messages {
		if m.ToolCall != nil && m.ToolCall.Name == "offer_coupon" {
			if code, ok := m.ToolCall.Result["code"].(string); ok && code != "" {
				_ = checkoutChatService.AddCouponCode(ctx, req.ChatID, code)
			}
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat_id": req.ChatID,
		"count":   len(req.Messages),
	})
}

// GetCheckoutChatSession handles GET /api/coupons/sessions/{chatId}.
func GetCheckoutChatSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	vars := mux.Vars(r)
	chatID := vars["chatId"]
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id الزامی است")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chat, err := checkoutChatService.GetByChatID(ctx, chatID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت جلسه")
		return
	}
	if chat == nil || chat.UserID != userID {
		utils.ErrorResponse(w, http.StatusNotFound, "جلسه یافت نشد")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat":    chat,
	})
}
