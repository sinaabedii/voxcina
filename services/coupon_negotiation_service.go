package services

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const sellerAgentTimeout = 180
const maxDiscountPercent = 20
const sellerAgentModel = "google/gemma-4-31b-it"
const fallbackSellerAgentModel = "qwen/qwen3.5-27b"

type NegotiateRequest struct {
	Message              string            `json:"message"`
	ChatHistory          []CouponChatMessage `json:"chat_history"`
	CartItems            []CouponCartItem   `json:"cart_items"`
	TryonContext         string            `json:"tryon_context"`
	TryonProductID       string            `json:"tryon_product_id"`
	TryonColor           string            `json:"tryon_color"`
	ComplementaryProducts []CouponCartItem  `json:"complementary_products,omitempty"`
}

type CouponChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type CouponCartItem struct {
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	Price       float64 `json:"price"`
	Color       string  `json:"color,omitempty"`
	Size        string  `json:"size,omitempty"`
	Image       string  `json:"image,omitempty"`
}

type NegotiateResponse struct {
	Reply  string              `json:"reply"`
	Coupon *NegotiateCouponOut `json:"coupon,omitempty"`
}

type NegotiateCouponOut struct {
	Code          string   `json:"code"`
	Value         float64  `json:"value"`
	ValidUntil    string   `json:"valid_until"`
	ProductIDs    []string `json:"product_ids"`
	CompProductID string   `json:"comp_product_id,omitempty"`
}

type couponToolParams struct {
	Value         float64 `json:"value"`
	Message       string  `json:"message"`
	ProductID     string  `json:"product_id"`
	CompProductID string  `json:"comp_product_id,omitempty"`
}

func buildTools() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "offer_coupon",
				"description": "Offer a discount coupon to the customer. Call this ONLY when you decide to give a discount. Do NOT mention the coupon details in your chat text — the system handles display automatically.",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"value": map[string]interface{}{
							"type":        "integer",
							"description": fmt.Sprintf("Discount percent, 1-%d", maxDiscountPercent),
						},
						"message": map[string]interface{}{
							"type":        "string",
							"description": "Short Persian message to the customer about this coupon",
						},
						"product_id": map[string]interface{}{
							"type":        "string",
							"description": "The main product ID the customer is trying on",
						},
						"comp_product_id": map[string]interface{}{
							"type":        "string",
							"description": "The complementary product ID to include in the bundle, if any",
						},
					},
					"required": []string{"value", "message", "product_id"},
				},
			},
		},
	}
}

func RunSellerAgent(req NegotiateRequest) (*NegotiateResponse, error) {
	messages := buildSellerMessages(req)

	toolCoupon, reply, err := callSellerAgent(sellerAgentModel, messages)
	if err != nil {
		fmt.Printf("[negotiate] primary model %s failed: %v — trying fallback %s\n", sellerAgentModel, err, fallbackSellerAgentModel)
		toolCoupon, reply, err = callSellerAgent(fallbackSellerAgentModel, messages)
		if err != nil {
			return nil, fmt.Errorf("both models failed: %v", err)
		}
	}

	if toolCoupon != nil && toolCoupon.Value > 0 {
		resp := buildCouponResponse(req, toolCoupon)
		if reply != "" {
			resp.Reply = reply
		}
		return resp, nil
	}

	return &NegotiateResponse{Reply: reply}, nil
}

const maxChatHistoryMessages = 40

func buildSellerMessages(req NegotiateRequest) []map[string]interface{} {
	cartCtx, _ := json.Marshal(req.CartItems)

	complementaryCtx := ""
	if len(req.ComplementaryProducts) > 0 {
		compJSON, _ := json.Marshal(req.ComplementaryProducts)
		complementaryCtx = fmt.Sprintf("\nComplementary products available for recommendation (not in customer cart):\n%s\n", string(compJSON))
	}

	systemPrompt := fmt.Sprintf(`You are Sara, a friendly Persian-speaking clothing seller at Voxcina virtual try-on room.

The customer just tried on: %s
Their cart: %s
%s
RULES:
- ALL your chat replies must be in plain Persian text — no markdown, no formatting, no thinking aloud
- Keep replies short, warm, and conversational (2-3 sentences max)
- Never repeat the coupon value/code in chat text — just say you're offering a special discount
- Never make up products — only recommend from the complementary list

FLOW:
1. Compliment the tried-on item (1 sentence)
2. If complementary products exist, recommend ONE and explain why they pair well (1-2 sentences)
3. If the customer asks for a discount or you feel it's time to offer one, CALL the offer_coupon tool
   - Start at 5-10%%, negotiate up to %d%% max
   - Always include comp_product_id if complementary products exist
   - The tool handles displaying the coupon — do NOT write coupon details in your chat text
4. If no complementary products, negotiate on the single tried-on item only`, req.TryonContext, string(cartCtx), complementaryCtx, maxDiscountPercent)

	messages := []map[string]interface{}{
		{"role": "system", "content": systemPrompt},
	}

	history := req.ChatHistory
	if len(history) > maxChatHistoryMessages {
		history = history[len(history)-maxChatHistoryMessages:]
	}

	for _, msg := range history {
		role := msg.Role
		if role == "agent" || role == "agent_streaming" {
			role = "assistant"
		}
		messages = append(messages, map[string]interface{}{
			"role":    role,
			"content": msg.Content,
		})
	}

	messages = append(messages, map[string]interface{}{
		"role":    "user",
		"content": req.Message,
	})

	return messages
}

func callSellerAgent(model string, messages []map[string]interface{}) (*couponToolParams, string, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, "", fmt.Errorf("OPENROUTER_API_KEY not set")
	}

	requestBody := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"tools":       buildTools(),
		"max_tokens":  4096,
		"temperature": 0.9,
		"reasoning":   map[string]bool{"enabled": true},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, "", fmt.Errorf("error marshaling request: %v", err)
	}

	httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
	httpReq.Header.Set("X-Title", "Voxcina Coupon Seller")

	client := &http.Client{Timeout: time.Duration(sellerAgentTimeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, "", fmt.Errorf("API request failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body)[:min(300, len(body))])
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				Reasoning string `json:"reasoning"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("[negotiate] model=%s parse error body=%s\n", model, string(body)[:min(500, len(body))])
		return nil, "", fmt.Errorf("failed to parse response: %v", err)
	}

	if len(result.Choices) == 0 {
		return nil, "", fmt.Errorf("no response from AI")
	}

	msg := result.Choices[0].Message
	reply := msg.Content
	if reply == "" {
		reply = msg.Reasoning
	}

	toolCoupon := extractToolCoupon(msg.ToolCalls)
	if toolCoupon == nil && msg.Reasoning != "" {
		toolCoupon = parseInlineCoupon(msg.Reasoning)
	}
	if toolCoupon == nil && msg.Content != "" {
		toolCoupon = parseInlineCoupon(msg.Content)
	}

	return toolCoupon, reply, nil
}

func extractToolCoupon(toolCalls []struct {
	ID       string `json:"id"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}) *couponToolParams {
	for _, tc := range toolCalls {
		if tc.Function.Name != "offer_coupon" {
			continue
		}
		var params couponToolParams
		if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
			fmt.Printf("[negotiate] failed to parse tool arguments: %v\n", err)
			continue
		}
		return &params
	}
	return nil
}

func parseInlineCoupon(content string) *couponToolParams {
	for i := 0; i < len(content); i++ {
		if content[i] == '{' {
			for j := i + 1; j < len(content) && j-i < 500; j++ {
				if content[j] == '}' {
					candidate := content[i : j+1]
					var params couponToolParams
					if err := json.Unmarshal([]byte(candidate), &params); err == nil && params.Value > 0 && (params.Message != "" || params.ProductID != "") {
						return &params
					}
					i = j
					break
				}
			}
		}
	}
	return nil
}

func buildCouponResponse(req NegotiateRequest, params *couponToolParams) *NegotiateResponse {
	if params.Value > maxDiscountPercent {
		params.Value = maxDiscountPercent
	}
	code := generateCouponCode()
	validUntil := time.Now().Add(1 * time.Hour).Format(time.RFC3339)

	productIDs := []string{req.TryonProductID}
	if params.CompProductID != "" {
		productIDs = append(productIDs, params.CompProductID)
	}

	return &NegotiateResponse{
		Reply: params.Message,
		Coupon: &NegotiateCouponOut{
			Code:          code,
			Value:         params.Value,
			ValidUntil:    validUntil,
			ProductIDs:    productIDs,
			CompProductID: params.CompProductID,
		},
	}
}

func generateCouponCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return "TRYN-" + hex.EncodeToString(b)
}

type StreamEvent struct {
	Type                 string             `json:"type"`
	Text                 string             `json:"text,omitempty"`
	Reply                string             `json:"reply,omitempty"`
	Coupon               *NegotiateCouponOut `json:"coupon,omitempty"`
	ComplementaryProducts []CouponCartItem   `json:"complementary_products,omitempty"`
	Error                string             `json:"error,omitempty"`
}

type streamResult struct {
	content    string
	reasoning  string
	toolCalls  []accumulatedToolCall
	tokensSent bool
}

type accumulatedToolCall struct {
	name      string
	arguments string
}

func RunSellerAgentStream(req NegotiateRequest, w io.Writer) (*NegotiateCouponOut, error) {
	messages := buildSellerMessages(req)

	streamResult, err := streamSellerAgent(sellerAgentModel, messages, w)
	if err != nil {
		if streamResult != nil && streamResult.tokensSent {
			return nil, err
		}
		fmt.Printf("[negotiate-stream] primary model %s failed (no tokens sent): %v — trying fallback %s\n", sellerAgentModel, err, fallbackSellerAgentModel)
		streamResult, err = streamSellerAgent(fallbackSellerAgentModel, messages, w)
		if err != nil {
			return nil, fmt.Errorf("both streaming models failed: %v", err)
		}
	}

	content := streamResult.content

	toolCoupon := extractAccumulatedToolCoupon(streamResult.toolCalls)
	if toolCoupon == nil {
		toolCoupon = parseInlineCoupon(content)
	}
	if toolCoupon == nil && streamResult.reasoning != "" {
		toolCoupon = parseInlineCoupon(streamResult.reasoning)
	}

	reply := content
	if reply == "" {
		reply = streamResult.reasoning
	}

	var coupon *NegotiateCouponOut
	if toolCoupon != nil && toolCoupon.Value > 0 {
		resp := buildCouponResponse(req, toolCoupon)
		if reply == "" {
			reply = resp.Reply
		}
		coupon = resp.Coupon
	}

	doneEvt := StreamEvent{Type: "done", Reply: reply}
	if coupon != nil {
		doneEvt.Coupon = coupon
	}
	if len(req.ComplementaryProducts) > 0 {
		doneEvt.ComplementaryProducts = req.ComplementaryProducts
	}
	data, _ := json.Marshal(doneEvt)
	fmt.Fprintf(w, "data: %s\n\n", data)
	if f, ok := w.(interface{ Flush() }); ok {
		f.Flush()
	}

	return coupon, nil
}

func extractAccumulatedToolCoupon(calls []accumulatedToolCall) *couponToolParams {
	for _, tc := range calls {
		if tc.name != "offer_coupon" {
			continue
		}
		var params couponToolParams
		if err := json.Unmarshal([]byte(tc.arguments), &params); err != nil {
			fmt.Printf("[negotiate-stream] failed to parse accumulated tool args: %v\n", err)
			continue
		}
		return &params
	}
	return nil
}

func streamSellerAgent(model string, messages []map[string]interface{}, w io.Writer) (*streamResult, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set")
	}

	requestBody := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"tools":       buildTools(),
		"max_tokens":  4096,
		"temperature": 0.9,
		"reasoning":   map[string]bool{"enabled": true},
		"stream":      true,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request: %v", err)
	}

	httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
	httpReq.Header.Set("X-Title", "Voxcina Coupon Seller")

	client := &http.Client{Timeout: time.Duration(sellerAgentTimeout) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return &streamResult{tokensSent: false}, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body)[:min(300, len(body))])
	}

	var fullContent strings.Builder
	var fullReasoning strings.Builder
	var tokensSent bool
	toolCallAccum := make(map[int]*accumulatedToolCall)

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		payload := strings.TrimPrefix(line, "data: ")
		if payload == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content    string `json:"content"`
					Reasoning  string `json:"reasoning"`
					ToolCalls  []struct {
						Index    int `json:"index"`
						Function struct {
							Name      string `json:"name"`
							Arguments string `json:"arguments"`
						} `json:"function"`
					} `json:"tool_calls"`
				} `json:"delta"`
				FinishReason *string `json:"finish_reason"`
			} `json:"choices"`
		}

		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			continue
		}

		if len(chunk.Choices) > 0 {
			delta := chunk.Choices[0].Delta
			token := delta.Content

			if token != "" {
				fullContent.WriteString(token)
				tokensSent = true
				evt := StreamEvent{Type: "token", Text: token}
				data, _ := json.Marshal(evt)
				fmt.Fprintf(w, "data: %s\n\n", data)
				if f, ok := w.(interface{ Flush() }); ok {
					f.Flush()
				}
			}

			if delta.Reasoning != "" {
				fullReasoning.WriteString(delta.Reasoning)
			}

			for _, tc := range delta.ToolCalls {
				acc, exists := toolCallAccum[tc.Index]
				if !exists {
					acc = &accumulatedToolCall{}
					toolCallAccum[tc.Index] = acc
				}
				if tc.Function.Name != "" {
					acc.name = tc.Function.Name
				}
				if tc.Function.Arguments != "" {
					acc.arguments += tc.Function.Arguments
				}
			}
		}
	}

	calls := make([]accumulatedToolCall, 0, len(toolCallAccum))
	for _, acc := range toolCallAccum {
		calls = append(calls, *acc)
	}

	if err := scanner.Err(); err != nil {
		return &streamResult{
			content:    strings.TrimSpace(fullContent.String()),
			reasoning:  fullReasoning.String(),
			toolCalls:  calls,
			tokensSent: tokensSent,
		}, fmt.Errorf("stream read error: %v", err)
	}

	return &streamResult{
		content:    strings.TrimSpace(fullContent.String()),
		reasoning:  fullReasoning.String(),
		toolCalls:  calls,
		tokensSent: tokensSent,
	}, nil
}
