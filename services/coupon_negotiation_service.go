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
	Message              string              `json:"message"`
	ChatHistory          []CouponChatMessage `json:"chat_history"`
	CartItems            []CouponCartItem    `json:"cart_items"`
	TryonContext         string              `json:"tryon_context"`
	TryonProductID       string              `json:"tryon_product_id"`
	TryonColor           string              `json:"tryon_color"`
	ComplementaryProducts []CouponCartItem   `json:"complementary_products,omitempty"`
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
	Action         string  `json:"action"`
	Value          float64 `json:"value,omitempty"`
	ProductID      string  `json:"product_id,omitempty"`
	CompProductID  string  `json:"comp_product_id,omitempty"`
	Message        string  `json:"message"`
}

func RunSellerAgent(req NegotiateRequest) (*NegotiateResponse, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set")
	}

	cartCtx, _ := json.Marshal(req.CartItems)

	complementaryCtx := ""
	if len(req.ComplementaryProducts) > 0 {
		compJSON, _ := json.Marshal(req.ComplementaryProducts)
		complementaryCtx = fmt.Sprintf("\nمحصولات پیشنهادی قابل توصیه (در سبد خرید مشتری نیستند):\n%s\n", string(compJSON))
	}

	systemPrompt := fmt.Sprintf(`You are a friendly Persian-speaking clothing seller named "سارا" in the Voxcina virtual try-on room.
The customer just virtually tried on: %s

Their cart contains: %s
%s
YOUR TASK:
1. Compliment how the tried-on item looks on them. Be enthusiastic!
2. Pick ONE item from the "پیشنهادی" list above (if provided) and recommend it enthusiastically — explain why it pairs beautifully with their tried-on item.
3. Offer a BUNDLE deal: "اگر هر دو رو با هم بخری، %d%% تخفیف می‌دم!" — if the customer accepts or negotiates, gradually increase up to %d%% max.
4. If no complementary products are listed, negotiate normally on the tried-on item only.
5. Be playful, warm, and persuasive. Use Persian phrases like "فقط برای تو", "پیشنهاد ویژه", "همین الان", "فرصت محدود".
6. When you reach your final offer, output a JSON action to create a coupon.

Rules:
- Start bundle discount at 5-10%% and negotiate up to %d%% maximum
- Coupons are valid for 1 hour only
- If complementary products exist, the coupon MUST include BOTH the tried-on product AND the chosen complementary product
- Never exceed %d%% even if the customer insists
- If the customer is rude, politely decline
- Respond ONLY in Persian
- Only recommend from the provided complementary list — never make up products

When you decide to issue a coupon, output EXACTLY this JSON on a single line:
{"action":"offer_coupon","value":15,"product_id":"[tried-on ID]","comp_product_id":"[complementary ID]","message":"باشه، ۱۵٪ تخفیف برات می‌ذارم. فقط تا یک ساعت دیگه وقت داری!"}

Otherwise, just respond naturally in Persian. Do NOT use the JSON action format unless you are actually issuing a coupon.`,
		req.TryonContext, string(cartCtx), complementaryCtx,
		maxDiscountPercent, maxDiscountPercent,
		maxDiscountPercent, maxDiscountPercent,
	)

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
		"max_tokens":  4096,
		"temperature": 0.9,
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

		productIDs := []string{req.TryonProductID}
		if action.CompProductID != "" {
			productIDs = append(productIDs, action.CompProductID)
		}
		for _, item := range req.CartItems {
			found := false
			for _, pid := range productIDs {
				if pid == item.ProductID {
					found = true
					break
				}
			}
			if !found {
				productIDs = append(productIDs, item.ProductID)
			}
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
