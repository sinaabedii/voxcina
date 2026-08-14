package services

import "testing"

func TestSanitizeSellerReplyDropsToolNarration(t *testing.T) {
	tests := map[string]struct {
		in   string
		want string
	}{
		"prose narration alone": {
			in:   "call offercoupon with value is 5",
			want: "",
		},
		"narration beside real text": {
			in:   "سلام رفیق! I will call offer_coupon with value 10. برات نگهش داشتم.",
			want: "سلام رفیق! برات نگهش داشتم.",
		},
		"tool call wrapper": {
			in:   "<tool_call>{\"name\": \"offer_coupon\"}</tool_call>",
			want: "",
		},
		"recommend narration on its own line": {
			in:   "خوش اومدی رفیق\nnow recommend_product product_id abc\nحالا بگو چی میخوای",
			want: "خوش اومدی رفیق\nحالا بگو چی میخوای",
		},
		"clean reply untouched": {
			in:   "رفیق این شلوار حسابی به تیپت میاد، حیفه از دستش بدی!",
			want: "رفیق این شلوار حسابی به تیپت میاد، حیفه از دستش بدی!",
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

func TestSanitizeSellerReplyStripsPercent(t *testing.T) {
	tests := map[string]struct {
		in   string
		want string
	}{
		"persian percent sign":    {in: "یه تخفیف ۱۵٪ برات گذاشتم", want: "یه تخفیف برات گذاشتم"},
		"ascii percent sign":      {in: "یه تخفیف 15% برات گذاشتم", want: "یه تخفیف برات گذاشتم"},
		"spaced percent word":     {in: "یه تخفیف ۱۰ درصد برات گذاشتم", want: "یه تخفیف برات گذاشتم"},
		"percent adjective":       {in: "تخفیف ۲۰ درصدی مال خودت", want: "تخفیف مال خودت"},
		"zwnj before word":        {in: "تخفیف ۲۰‌درصدی مال خودت", want: "تخفیف مال خودت"},
		"english percent word":    {in: "a 20 percent deal", want: "a deal"},
		"bare sign":               {in: "تخفیف ٪ برات هست", want: "تخفیف برات هست"},
		"plain price untouched":   {in: "قیمتش ۵۰۰ هزار تومنه", want: "قیمتش ۵۰۰ هزار تومنه"},
		"plain size untouched":    {in: "سایز ۴۲ رو برات میارم", want: "سایز ۴۲ رو برات میارم"},
		"discount word untouched": {in: "یه تخفیف خودمونی برات جور کردم", want: "یه تخفیف خودمونی برات جور کردم"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := sanitizeSellerReply(tc.in); got != tc.want {
				t.Errorf("sanitizeSellerReply(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestSanitizeSellerReplyKeepsExistingBehaviour(t *testing.T) {
	tests := map[string]struct {
		in   string
		want string
	}{
		"markdown bold":  {in: "**سلام** رفیق", want: "سلام رفیق"},
		"markdown link":  {in: "اینو ببین [شلوار](https://x.ir/p/1) خوبه", want: "اینو ببین شلوار خوبه"},
		"line bullet":    {in: "- گزینه اول\n- گزینه دوم", want: "گزینه اول\nگزینه دوم"},
		"emoji dropped":  {in: "سلام رفیق 😀", want: "سلام رفیق"},
		"zwnj preserved": {in: "می‌خوای", want: "می‌خوای"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if got := sanitizeSellerReply(tc.in); got != tc.want {
				t.Errorf("sanitizeSellerReply(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestSplitSentencesRoundTrips(t *testing.T) {
	for _, in := range []string{
		"",
		"یک جمله بدون نقطه",
		"اول. دوم! سوم؟ چهارم",
		"خط اول\nخط دوم\n\nخط سوم",
		"trailing space after dot.   ",
	} {
		var joined string
		for _, s := range splitSentences(in) {
			joined += s
		}
		if joined != in {
			t.Errorf("splitSentences(%q) rejoined to %q", in, joined)
		}
	}
}

func TestParseNarratedCoupon(t *testing.T) {
	tests := map[string]struct {
		in    string
		want  float64
		found bool
	}{
		"prose form":       {in: "I should call offercoupon with value is 5", want: 5, found: true},
		"underscored name": {in: "next: call offer_coupon with value 12 for her", want: 12, found: true},
		"call syntax":      {in: "offer_coupon(value=10, reason=\"bundle\")", want: 10, found: true},
		"no number":        {in: "I should call offer_coupon for her", found: false},
		"zero value":       {in: "call offer_coupon with value 0", found: false},
		"adjacent number":  {in: "offer coupon: 10 and move on", want: 10, found: true},
		"number too far":   {in: "call offer_coupon later, she already asked about the 42 size", found: false},
		"no tool named":    {in: "she wants 20 off", found: false},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := parseNarratedCoupon(tc.in)
			if !tc.found {
				if got != nil {
					t.Fatalf("parseNarratedCoupon(%q) = %+v, want nil", tc.in, got)
				}
				return
			}
			if got == nil {
				t.Fatalf("parseNarratedCoupon(%q) = nil, want value %v", tc.in, tc.want)
			}
			if got.Value != tc.want {
				t.Errorf("parseNarratedCoupon(%q) value = %v, want %v", tc.in, got.Value, tc.want)
			}
		})
	}
}
