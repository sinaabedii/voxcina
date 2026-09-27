package handlers

import "testing"

func TestApplyShippingDiscount(t *testing.T) {
	cases := []struct {
		base    float64
		percent float64
		want    float64
	}{
		{35000, 0, 35000},
		{35000, 50, 17500},
		{35000, 100, 0},
		{333, 50, 167}, // 166.5 -> round half away from zero
		{1000, 50, 500},
		{0, 100, 0},
	}
	for _, tc := range cases {
		if got := applyShippingDiscount(tc.base, tc.percent); got != tc.want {
			t.Errorf("applyShippingDiscount(%v, %v) = %v, want %v", tc.base, tc.percent, got, tc.want)
		}
	}
}
