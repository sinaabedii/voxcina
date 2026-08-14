package services

import (
	"strings"
	"testing"
)

// Grok periodically writes the offer_coupon call into a channel instead of
// emitting it. Every shape below was observed in production; each one used to
// end the turn with no coupon at all, and the customer heard the generic
// "tell me what you have in mind" fallback after explicitly asking for a
// discount.
func TestSalvageNarratedCouponShapes(t *testing.T) {
	tests := map[string]struct {
		in     string
		want   float64
		reason string
	}{
		"bare arguments object": {
			in:   `{"value": 15, "message": "یه تخفیف برات گذاشتم"}`,
			want: 15,
		},
		"wrapped call envelope": {
			in:     `{"name": "offer_coupon", "arguments": {"value": 20, "reason": "عروسی داداشش"}}`,
			want:   20,
			reason: "عروسی داداشش",
		},
		"function envelope": {
			in:   `{"type":"function","function":{"name":"offer_coupon","arguments":{"value":10}}}`,
			want: 10,
		},
		"arguments as encoded string": {
			in:   `{"name":"offer_coupon","arguments":"{\"value\":12,\"reason\":\"bundle\"}"}`,
			want: 12,
		},
		"fenced json block": {
			in:   "```json\n{\"name\": \"offer_coupon\", \"arguments\": {\"value\": 15}}\n```",
			want: 15,
		},
		"prose narration": {
			in:   "I should call offer_coupon with value 5 for her",
			want: 5,
		},
		"json beside persian text": {
			in:   "چشم رفیق!\n{\"value\": 25}\nبفرما",
			want: 25,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := salvageNarratedCoupon(tc.in)
			if got == nil {
				t.Fatalf("salvageNarratedCoupon(%q) = nil, want value %v", tc.in, tc.want)
			}
			if got.Value != tc.want {
				t.Errorf("value = %v, want %v", got.Value, tc.want)
			}
			if tc.reason != "" && got.Reason != tc.reason {
				t.Errorf("reason = %q, want %q", got.Reason, tc.reason)
			}
		})
	}
}

func TestSalvageNarratedCouponIgnoresNonCoupons(t *testing.T) {
	for name, in := range map[string]string{
		"empty":               "",
		"plain persian reply": "سلام رفیق! این پیراهن حسابی به تیپت میاد.",
		"search_catalog args": `{"query": "شلوار جین مشکی", "limit": 5}`,
		"zero value":          `{"name": "offer_coupon", "arguments": {"value": 0}}`,
		"unrelated number":    "she asked about the 42 size",
	} {
		t.Run(name, func(t *testing.T) {
			if got := salvageNarratedCoupon(in); got != nil {
				t.Errorf("salvageNarratedCoupon(%q) = %+v, want nil", in, got)
			}
		})
	}
}

// A typed-out call reaching the visible channel must still produce the coupon
// the customer asked for — this is the A02/A09/A12/A13 "coupon=None" failure.
func TestInterpretToolCallsRecoversCouponTypedAsContent(t *testing.T) {
	in := SellerAgentInput{State: ResolveNegotiationState(0, 0, "")}
	result := &streamResult{
		content: "```json\n{\"name\":\"offer_coupon\",\"arguments\":{\"value\":5,\"message\":\"یه تخفیف برات گذاشتم\"}}\n```",
	}

	coupon, _ := interpretToolCalls(in, result)
	if coupon == nil {
		t.Fatal("no coupon recovered from a call the model typed into its reply")
	}
	if int(coupon.Value) != in.State.Floor {
		t.Errorf("coupon value = %v, want the floor %d", coupon.Value, in.State.Floor)
	}
}

// The visible channel is the one a customer can steer, so a justification found
// there is not trusted: the grant holds at the floor no matter what percent the
// text claims.
func TestCouponTypedAsContentCannotRaiseTheDiscount(t *testing.T) {
	in := SellerAgentInput{State: ResolveNegotiationState(1, 10, "stated budget")}
	result := &streamResult{
		content: `{"name":"offer_coupon","arguments":{"value":25,"reason":"برای عروسی داداشم"}}`,
	}

	coupon, _ := interpretToolCalls(in, result)
	if coupon == nil {
		t.Fatal("expected the floor coupon to still be granted")
	}
	if int(coupon.Value) != in.State.Floor {
		t.Errorf("coupon value = %v, want it held at the floor %d", coupon.Value, in.State.Floor)
	}
}

// A06: the customer names a new reason, the model narrates the call in its
// private reasoning channel, and the bump must survive. Salvaging only the
// percent dropped the justification, the reason gate saw an unjustified
// increase, and the discount silently stayed at the floor (10 -> 10).
func TestCouponNarratedInReasoningKeepsItsReason(t *testing.T) {
	in := SellerAgentInput{State: ResolveNegotiationState(1, 10, "بودجه‌اش محدوده")}
	result := &streamResult{
		reasoning: `Customer named a new occasion, so: {"name":"offer_coupon","arguments":{"value":15,"reason":"عروسی داداشش"}}`,
	}

	coupon, _ := interpretToolCalls(in, result)
	if coupon == nil {
		t.Fatal("no coupon recovered from reasoning narration")
	}
	if int(coupon.Value) != in.State.NextStep {
		t.Errorf("coupon value = %v, want the next step up %d", coupon.Value, in.State.NextStep)
	}
}

// A18: the reply persisted to the transcript was the four characters "json" —
// the language tag of a fenced block whose body was stripped as tool narration.
func TestSanitizeSellerReplyDropsTypedToolCalls(t *testing.T) {
	tests := map[string]struct {
		in   string
		want string
	}{
		"fenced call leaves nothing": {
			in:   "```json\n{\"name\": \"offer_coupon\", \"arguments\": {\"value\": 15}}\n```",
			want: "",
		},
		"unterminated fence": {
			in:   "```json\n{\"name\": \"offer_coupon\", \"arguments\": {\"value\": 15",
			want: "",
		},
		"bare object beside real text": {
			in:   "چشم رفیق! {\"value\": 15, \"message\": \"x\"} بفرما",
			want: "چشم رفیق! بفرما",
		},
		"braces in prose survive": {
			in:   "قیمتش ۵۰۰ تومنه رفیق",
			want: "قیمتش ۵۰۰ تومنه رفیق",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := sanitizeSellerReply(tc.in); got != tc.want {
				t.Errorf("sanitizeSellerReply(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestIsUsableReply(t *testing.T) {
	tests := map[string]bool{
		"":                     false,
		"json":                 false,
		"{}":                   false,
		"۱۵٪":                  false,
		"سلام رفیق":            true,
		"این شلوار جین عالیه":  true,
		"سایز L رو برات میارم": true,
	}
	for in, want := range tests {
		if got := isUsableReply(in); got != want {
			t.Errorf("isUsableReply(%q) = %t, want %t", in, got, want)
		}
	}
}

// Arguments arrive as a stream of fragments; a turn cut short leaves an object
// that never closes. The percent is still unambiguous, and dropping the whole
// call would cost the customer a coupon the model did ask for.
func TestParseLooseCouponArguments(t *testing.T) {
	got := parseLooseCouponArguments(`{"value": 15, "reason": "عروسی داداشش", "mess`)
	if got == nil {
		t.Fatal("truncated arguments yielded no coupon")
	}
	if got.Value != 15 {
		t.Errorf("value = %v, want 15", got.Value)
	}
	if got.Reason != "عروسی داداشش" {
		t.Errorf("reason = %q, want the narrated reason", got.Reason)
	}
	if parseLooseCouponArguments(`{"query": "شلوار"`) != nil {
		t.Error("recovered a coupon from arguments with no value")
	}
}

func TestBalancedJSONObjectsFindsNestedPayload(t *testing.T) {
	objs := balancedJSONObjects(`prefix {"a":{"b":1},"c":"}"} suffix`)
	if len(objs) != 2 {
		t.Fatalf("got %d objects, want outer and inner: %q", len(objs), objs)
	}
	if !strings.HasPrefix(objs[0], `{"a"`) {
		t.Errorf("first object = %q, want the outermost", objs[0])
	}
	if objs[1] != `{"b":1}` {
		t.Errorf("second object = %q, want the nested one", objs[1])
	}
}
