package services

import (
	"encoding/json"
	"testing"
)

// needsTextGrounding is the switch that decides whether a tool-only turn gets
// a second, tool-free pass asking the model to describe its own decision
// instead of falling straight to a canned line — see groundTextualReply.
func TestNeedsTextGroundingOnlyForCouponOrRecommendWithEmptyContent(t *testing.T) {
	tests := map[string]struct {
		toolName string
		content  string
		want     bool
	}{
		"coupon call with no content needs grounding": {
			toolName: "offer_coupon", content: "", want: true,
		},
		"coupon call with only machinery needs grounding": {
			toolName: "offer_coupon", content: "```json\n{\"value\":5}\n```", want: true,
		},
		"coupon call that already wrote a real reply does not": {
			toolName: "offer_coupon", content: "دمت گرم رفیق، حله!", want: false,
		},
		"recommend call with no content needs grounding": {
			toolName: "recommend_product", content: "", want: true,
		},
		"search_catalog is handled by its own branch, not this one": {
			toolName: "search_catalog", content: "", want: false,
		},
		"plain chat turn with no tool call is not groundable": {
			toolName: "", content: "", want: false,
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			result := &streamResult{content: tc.content}
			if got := needsTextGrounding(tc.toolName, result); got != tc.want {
				t.Errorf("got %t, want %t", got, tc.want)
			}
		})
	}
}

// toolOutcomeMessage is fed back to the model as the fact of what it already
// decided; it must reflect the server-resolved coupon/recommendation, not
// whatever the model originally asked for, so it can never be used to smuggle
// a different number or product past the reason gate.
func TestToolOutcomeMessageReflectsResolvedDecision(t *testing.T) {
	coupon := &NegotiateCouponOut{Value: 10, Reason: "returning customer", CompProductID: "comp-1"}
	recommended := &CouponCartItem{ProductID: "comp-1", ProductName: "شلوار جین راسته", Price: 500000}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("offer_coupon", coupon, recommended)), &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload["granted_percent"] != float64(10) {
		t.Errorf("granted_percent = %v, want 10", payload["granted_percent"])
	}
	if payload["customer_reason_credited"] != "returning customer" {
		t.Errorf("reason not carried through: %v", payload["customer_reason_credited"])
	}
	if payload["bundled_product"] != "شلوار جین راسته" {
		t.Errorf("bundled product not carried through: %v", payload["bundled_product"])
	}

	var noCoupon map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("offer_coupon", nil, nil)), &noCoupon); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if noCoupon["ok"] != false {
		t.Errorf("a dropped coupon must report ok:false, got %v", noCoupon)
	}

	var noRec map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("recommend_product", nil, nil)), &noRec); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if noRec["ok"] != false {
		t.Errorf("a dropped recommendation must report ok:false, got %v", noRec)
	}
}

// pickFallback must stay inside the pool it is given — including the
// degenerate empty-pool case — since its output is what a customer sees.
func TestPickFallbackStaysWithinPool(t *testing.T) {
	if got := pickFallback(nil); got != "" {
		t.Errorf("empty pool should yield empty string, got %q", got)
	}

	pool := []string{"a", "b", "c"}
	seen := map[string]bool{}
	for i := 0; i < 50; i++ {
		got := pickFallback(pool)
		found := false
		for _, p := range pool {
			if p == got {
				found = true
			}
		}
		if !found {
			t.Fatalf("pickFallback returned %q, not in pool %v", got, pool)
		}
		seen[got] = true
	}
	_ = seen // rotation is time-seeded; presence-in-pool is the invariant that matters
}
