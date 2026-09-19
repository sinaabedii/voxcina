package services

import "testing"

// The Toman figure the agent quotes is computed here — never by the model —
// from the server-built cart the negotiation runs against, so it must follow
// the storefront's own arithmetic: unit price × quantity per line.
func TestCartSubtotalTomanCountsQuantities(t *testing.T) {
	items := []CouponCartItem{
		{Price: 1_200_000, Quantity: 2},
		{Price: 800_000}, // quantity not recorded counts once, like a single-item line
		{Price: 3_000_000, Quantity: 1},
	}

	if got := cartSubtotalToman(items); got != 6_200_000 {
		t.Errorf("cartSubtotalToman = %v, want 6200000", got)
	}
	if got := cartSubtotalToman(nil); got != 0 {
		t.Errorf("empty cart subtotal = %v, want 0", got)
	}
	if got := cartSubtotalToman([]CouponCartItem{{Price: 500_000, Quantity: 0}}); got != 500_000 {
		t.Errorf("quantity 0 subtotal = %v, want 500000", got)
	}
}

func TestDiscountAmountTomanRoundsToTheToman(t *testing.T) {
	tests := []struct {
		name     string
		subtotal float64
		percent  float64
		want     int
	}{
		{name: "ten percent of a clean subtotal", subtotal: 4_500_000, percent: 10, want: 450_000},
		{name: "five percent rounds up at half a toman", subtotal: 999_999, percent: 5, want: 50_000},
		{name: "no cart", subtotal: 0, percent: 10, want: 0},
		{name: "no discount", subtotal: 1_000_000, percent: 0, want: 0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := discountAmountToman(tc.subtotal, tc.percent); got != tc.want {
				t.Errorf("discountAmountToman(%v, %v) = %d, want %d", tc.subtotal, tc.percent, got, tc.want)
			}
		})
	}
}

// The amount the prompt tells the model to quote must read exactly like a price
// on the storefront: Persian digits, U+066C thousands separators.
func TestFormatTomanAmountMatchesStorefrontStyle(t *testing.T) {
	tests := map[int]string{
		0:             "۰",
		450_000:       "۴۵۰٬۰۰۰",
		4_500_000:     "۴٬۵۰۰٬۰۰۰",
		999:           "۹۹۹",
		1_234_567_890: "۱٬۲۳۴٬۵۶۷٬۸۹۰",
	}
	for amount, want := range tests {
		if got := formatTomanAmount(amount); got != want {
			t.Errorf("formatTomanAmount(%d) = %q, want %q", amount, got, want)
		}
	}
}
