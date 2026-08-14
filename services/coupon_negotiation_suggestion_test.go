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
		Request:      NegotiateRequest{Message: "سلام"},
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
