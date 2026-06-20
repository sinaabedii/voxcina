package services

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const sellerAgentTimeout = 60
const maxDiscountPercent = 20
const sellerAgentModel = "qwen/qwen3.6-27b"

type NegotiateRequest struct {
	Message        string              `json:"message"`
	ChatHistory    []CouponChatMessage `json:"chat_history"`
	CartItems      []CouponCartItem    `json:"cart_items"`
	TryonContext   string              `json:"tryon_context"`
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
}

type NegotiateResponse struct {
	Reply  string              `json:"reply"`
	Coupon *NegotiateCouponOut `json:"coupon,omitempty"`
}

type NegotiateCouponOut struct {
	Code       string   `json:"code"`
	Value      float64  `json:"value"`
	ValidUntil string   `json:"valid_until"`
	ProductIDs []string `json:"product_ids"`
}

type sellerCouponAction struct {
	Action  string   `json:"action"`
	Value   float64  `json:"value,omitempty"`
	Message string   `json:"message"`
}

func RunSellerAgent(req NegotiateRequest) (*NegotiateResponse, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set")
	}

	cartCtx, _ := json.Marshal(req.CartItems)

	systemPrompt := fmt.Sprintf(`You are a friendly Persian-speaking clothing seller in the Voxcina virtual try-on room.
The customer just virtually tried on: %s

Their cart contains: %s

Your role:
1. First, mention the item they tried on. Start with a small discount offer (5-10%%).
2. If the customer asks for more, gradually increase your offer — but NEVER exceed 20%%.
3. Be playful and persuasive. Use Persian phrases like "فقط برای تو", "پیشنهاد ویژه", "همین الان", "فرصت محدود".
4. When you reach your final offer, output a JSON action to create a coupon.

Rules:
- Maximum discount: 20%% of item prices
- Coupons are valid for 1 hour only
- Coupons apply only to the items being discussed
- Never offer more than 20%% even if the customer insists
- If the customer is rude, politely decline
- Respond ONLY in Persian

When you decide to issue a coupon, output EXACTLY this JSON on a single line:
{"action":"offer_coupon","value":15,"message":"باشه، ۱۵٪ تخفیف برات می‌ذارم. فقط تا یک ساعت دیگه وقت داری!"}

Otherwise, just respond naturally in Persian. Do NOT use the JSON action format unless you are actually issuing a coupon.`, req.TryonContext, string(cartCtx))

	messages := []map[string]interface{}{
		{"role": "system", "content": systemPrompt},
	}

	for _, msg := range req.ChatHistory {
		role := msg.Role
		if role == "agent" {
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

	requestBody := map[string]interface{}{
		"model":       sellerAgentModel,
		"messages":    messages,
		"max_tokens":  2000,
		"temperature": 0.9,
		"reasoning":   map[string]bool{"enabled": true},
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

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				Reasoning string `json:"reasoning"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no response from AI")
	}

	rawContent := result.Choices[0].Message.Content

	action := parseCouponAction(rawContent)
	if action == nil && result.Choices[0].Message.Reasoning != "" {
		action = parseCouponAction(result.Choices[0].Message.Reasoning)
	}
	if action != nil && action.Action == "offer_coupon" && action.Value > 0 {
		if action.Value > maxDiscountPercent {
			action.Value = maxDiscountPercent
		}
		code := generateCouponCode()
		validUntil := time.Now().Add(1 * time.Hour).Format(time.RFC3339)

		productIDs := make([]string, 0, len(req.CartItems))
		for _, item := range req.CartItems {
			productIDs = append(productIDs, item.ProductID)
		}

		return &NegotiateResponse{
			Reply: action.Message,
			Coupon: &NegotiateCouponOut{
				Code:       code,
				Value:      action.Value,
				ValidUntil: validUntil,
				ProductIDs: productIDs,
			},
		}, nil
	}

	return &NegotiateResponse{Reply: rawContent}, nil
}

func parseCouponAction(content string) *sellerCouponAction {
	var action sellerCouponAction
	for i := 0; i < len(content); i++ {
		if content[i] == '{' {
			for j := i + 1; j < len(content) && j-i < 500; j++ {
				if content[j] == '}' {
					candidate := content[i : j+1]
					if err := json.Unmarshal([]byte(candidate), &action); err == nil && action.Action == "offer_coupon" {
						return &action
					}
					i = j
					break
				}
			}
		}
	}
	return nil
}

func generateCouponCode() string {
	b := make([]byte, 4)
	rand.Read(b)
	return "TRYN-" + hex.EncodeToString(b)
}
