package models

import "testing"

func TestShippingDiscountPercent(t *testing.T) {
	cases := []struct {
		option string
		want   float64
	}{
		{"", 0},
		{ShippingDiscountFree, 100},
		{ShippingDiscountHalf, 50},
		{ShippingDiscountFull, 0},
		{"bogus", 0},
	}
	for _, tc := range cases {
		if got := ShippingDiscountPercent(tc.option); got != tc.want {
			t.Errorf("ShippingDiscountPercent(%q) = %v, want %v", tc.option, got, tc.want)
		}
	}
}

func TestIsValidShippingDiscount(t *testing.T) {
	cases := []struct {
		option string
		want   bool
	}{
		{"", true},
		{ShippingDiscountFree, true},
		{ShippingDiscountHalf, true},
		{ShippingDiscountFull, true},
		{"bogus", false},
	}
	for _, tc := range cases {
		if got := IsValidShippingDiscount(tc.option); got != tc.want {
			t.Errorf("IsValidShippingDiscount(%q) = %v, want %v", tc.option, got, tc.want)
		}
	}
}
