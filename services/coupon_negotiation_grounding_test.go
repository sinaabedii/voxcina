package services

import (
	"encoding/json"
	"testing"
)

// needsTextGrounding is the switch that decides whether a tool-only turn gets
// a second, tool-free pass asking the model to describe its own decision
// instead of falling straight to a canned line — see groundTextualReply.
// Checkout's offer_coupon is deliberately absent: it is always grounded by its
// own branch (the announcement must quote the resolved Toman amount), so this
// predicate only serves tryon's recommend_product.
func TestNeedsTextGroundingOnlyForRecommendWithEmptyContent(t *testing.T) {
	tests := map[string]struct {
		toolName string
		content  string
		want     bool
	}{
		"coupon is always grounded by its own branch": {
			toolName: "offer_coupon", content: "", want: false,
		},
		"recommend call with no content needs grounding": {
			toolName: "recommend_product", content: "", want: true,
		},
		"recommend call with only machinery needs grounding": {
			toolName: "recommend_product", content: "```json\n{\"product_id\":\"p1\"}\n```", want: true,
		},
		"recommend call that already wrote a real reply does not": {
			toolName: "recommend_product", content: "این مدل خیلی بهت میاد!", want: false,
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
// a different number or product past the reason gate. For a coupon it also
// carries what the grant is worth in Toman, derived from the server subtotal.
func TestToolOutcomeMessageReflectsResolvedDecision(t *testing.T) {
	coupon := &NegotiateCouponOut{Value: 10, Reason: "returning customer", CompProductID: "comp-1"}
	recommended := &CouponCartItem{ProductID: "comp-1", ProductName: "شلوار جین راسته", Price: 500000}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("offer_coupon", coupon, recommended, 5_000_000)), &payload); err != nil {
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
	if payload["amount_off_formatted"] != "۵۰۰٬۰۰۰ تومان" {
		t.Errorf("amount off = %v, want ۵۰۰٬۰۰۰ تومان", payload["amount_off_formatted"])
	}
	if payload["payable_formatted"] != "۴٬۵۰۰٬۰۰۰ تومان" {
		t.Errorf("payable = %v, want ۴٬۵۰۰٬۰۰۰ تومان", payload["payable_formatted"])
	}
	if payload["cart_subtotal_formatted"] != "۵٬۰۰۰٬۰۰۰ تومان" {
		t.Errorf("subtotal = %v, want ۵٬۰۰۰٬۰۰۰ تومان", payload["cart_subtotal_formatted"])
	}

	// No readable cart: the outcome must not hand the model a ۰ to quote.
	var noSubtotal map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("offer_coupon", coupon, recommended, 0)), &noSubtotal); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if _, present := noSubtotal["amount_off_formatted"]; present {
		t.Errorf("zero subtotal must omit amount fields, got %v", noSubtotal)
	}

	var noCoupon map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("offer_coupon", nil, nil, 0)), &noCoupon); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if noCoupon["ok"] != false {
		t.Errorf("a dropped coupon must report ok:false, got %v", noCoupon)
	}

	var noRec map[string]interface{}
	if err := json.Unmarshal([]byte(toolOutcomeMessage("recommend_product", nil, nil, 0)), &noRec); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if noRec["ok"] != false {
		t.Errorf("a dropped recommendation must report ok:false, got %v", noRec)
	}
}

// The offer branch keys off the call actually being present, not off the
// model's narrated toolName: a turn may both name a tool and emit it.
func TestHasToolCall(t *testing.T) {
	calls := []accumulatedToolCall{{name: "recommend_product"}, {name: "offer_coupon"}}
	if !hasToolCall(calls, "offer_coupon") {
		t.Error("offer_coupon call not detected")
	}
	if hasToolCall(calls, "search_catalog") {
		t.Error("search_catalog reported present without a call")
	}
	if hasToolCall(nil, "offer_coupon") {
		t.Error("nil calls must not report a tool")
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
