package services

import (
	"encoding/json"
	"strings"
	"testing"
)

// A product card is rendered from a tool call, never from the reply text, so
// nothing stopped a card appearing beside a reply that never acknowledged it.
func TestEnsureRecommendationMentioned(t *testing.T) {
	tests := map[string]struct {
		reply   string
		product string
		want    string
	}{
		"reply already names it": {
			reply:   "رفیق این شلوار جین حسابی به تیپت میاد!",
			product: "شلوار جین راسته",
			want:    "رفیق این شلوار جین حسابی به تیپت میاد!",
		},
		"reply ignores the card": {
			reply:   "دمت گرم رفیق! یه تخفیف خودمونی برات جور کردم.",
			product: "کت چرم مشکی",
			want:    "دمت گرم رفیق! یه تخفیف خودمونی برات جور کردم. ضمناً یه کت چرم مشکی هم برات کنار گذاشتم که حسابی به این ست میشه، همین پایین ببینش.",
		},
		"no product": {
			reply:   "سلام رفیق، خوش اومدی!",
			product: "",
			want:    "سلام رفیق، خوش اومدی!",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := ensureRecommendationMentioned(tc.reply, tc.product); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

// Matching on whole names would staple a redundant sentence onto replies that
// referred to the product the way a person actually would.
func TestMentionsProductMatchesPartialNames(t *testing.T) {
	const name = "شلوار جین راسته مردانه"
	if !mentionsProduct("این شلوار جین رو بردار رفیق", name) {
		t.Error("a reply naming the product informally counted as not mentioning it")
	}
	if mentionsProduct("سلام رفیق، چطوری؟", name) {
		t.Error("a reply that never mentions the product counted as mentioning it")
	}
}

// The transcript replayed to the agent is text only; without this the agent has
// no idea a card is on screen and either talks past it or pushes it again.
func TestSystemPromptNamesCardsAlreadyOnScreen(t *testing.T) {
	base := SellerAgentInput{
		Request:      SellerChatRequest{Message: "سلام"},
		TryonContext: "پیراهن آبی - آبی - 1200000 تومان",
		State:        ResolveNegotiationState(0, 0, ""),
	}

	empty := systemPromptOf(t, base)
	if !strings.Contains(empty, "no product card has been shown") {
		t.Errorf("prompt does not say the room is card-free:\n%s", empty)
	}

	withCards := base
	withCards.SuggestedProducts = []string{"شلوار جین راسته", "کت چرم مشکی"}
	prompt := systemPromptOf(t, withCards)
	for _, name := range withCards.SuggestedProducts {
		if !strings.Contains(prompt, name) {
			t.Errorf("prompt does not name the card already on screen: %s", name)
		}
	}
}

// The candidate list is the menu the agent picks from, not something to render.
// Sending it let the client fall back to its first entry, putting an unasked-for
// card on screen after every message.
func TestDoneEventCarriesNoCandidateProducts(t *testing.T) {
	data, err := json.Marshal(StreamEvent{
		Type:  "done",
		Reply: "سلام رفیق",
	})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "complementary_products") {
		t.Errorf("done event still ships the candidate list: %s", data)
	}

	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		t.Fatal(err)
	}
	if _, ok := fields["recommended_product"]; ok {
		t.Error("a turn with no recommendation should not carry a recommended_product")
	}
}

// The prompt asks the model to only put a card on screen in two situations, but
// a prompt is a request, not an enforcement. Where askless turns are concerned
// the server has to be the rule: a recommend_product call the model makes on a
// greeting, a price question or small talk must not become a card.
func TestRecommendationDroppedWhenCustomerDidNotAsk(t *testing.T) {
	in := SellerAgentInput{
		Request:               SellerChatRequest{Message: "سلام خوبی؟"},
		ComplementaryProducts: []CouponCartItem{{ProductID: "comp-1", ProductName: "شلوار جین راسته"}},
	}
	result := &streamResult{toolCalls: []accumulatedToolCall{
		{name: "recommend_product", arguments: `{"product_id":"comp-1"}`},
	}}
	coupon, recommended := interpretToolCalls(in, result)
	if coupon != nil {
		t.Errorf("no coupon should be minted: %v", coupon)
	}
	if recommended != nil {
		t.Errorf("recommendation on a greeting must be dropped, got %q", recommended.ProductName)
	}
}

func TestRecommendationKeptWhenCustomerAsked(t *testing.T) {
	in := SellerAgentInput{
		Request:               SellerChatRequest{Message: "یه شلوار جین مشکی سایز ۳۲ داری؟"},
		ComplementaryProducts: []CouponCartItem{{ProductID: "comp-1", ProductName: "شلوار جین راسته"}},
	}
	result := &streamResult{toolCalls: []accumulatedToolCall{
		{name: "recommend_product", arguments: `{"product_id":"comp-1"}`},
	}}
	_, recommended := interpretToolCalls(in, result)
	if recommended == nil || recommended.ProductID != "comp-1" {
		t.Errorf("recommendation for a product ask must be kept, got %v", recommended)
	}
}

func TestRecommendationKeptWhenCouponBundles(t *testing.T) {
	in := SellerAgentInput{
		Mode:                  SellerModeCheckout,
		Request:               SellerChatRequest{Message: "سلام چیزی میخوای؟"},
		TryonContext:          "پیراهن آبی - آبی - 1200000 تومان",
		ComplementaryProducts: []CouponCartItem{{ProductID: "comp-1", ProductName: "شلوار جین راسته"}},
		State:                 ResolveNegotiationState(0, 0, ""),
	}
	result := &streamResult{toolCalls: []accumulatedToolCall{
		{name: "offer_coupon", arguments: `{"value":5,"comp_product_id":"comp-1"}`},
	}}
	coupon, recommended := interpretToolCalls(in, result)
	if coupon == nil {
		t.Fatal("coupon should be minted")
	}
	if recommended == nil || recommended.ProductID != "comp-1" {
		t.Errorf("bundled complementary card must be kept, got %v", recommended)
	}
	if coupon.CompProductID != "comp-1" {
		t.Errorf("coupon should be tied to the bundle, got %q", coupon.CompProductID)
	}
}

// A "دستت" in a reply must not be read as "ست" — category matching is on whole
// tokens, and Arabic-looking keyboard variants still match their Persian form.
func TestUserAskedForProductRecognizesAsks(t *testing.T) {
	cases := []struct {
		msg  string
		want bool
	}{
		{"سلام خوبی؟", false},
		{"قیمتش چنده؟", false},
		{"سایز L هم داره؟", false},
		{"امروز خیلی خستم", false},
		{"یه تخفیف بده", false},
		{"یه شلوار جین داری؟", true},
		{"پیراهن مشکی دارید؟", true},
		{"چی داری؟", true},
		{"یه كت چرمی میخوام", true},
		{"سایز L هم داری؟", false},
	}
	for _, tc := range cases {
		if got := userAskedForProduct(tc.msg); got != tc.want {
			t.Errorf("%q: got %t, want %t", tc.msg, got, tc.want)
		}
	}
}
