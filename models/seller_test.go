package models

import (
	"errors"
	"testing"
)

// TestValidateSellerVoucherSplitAccepts walks every legal position of the
// picker. All 37 of them must be accepted, because the UI offers all 37.
func TestValidateSellerVoucherSplitAccepts(t *testing.T) {
	for discount := SellerVoucherMinPercent; discount <= SellerVoucherMaxPercent; discount++ {
		share := SellerVoucherBudgetPercent - discount
		if err := ValidateSellerVoucherSplit(discount, share); err != nil {
			t.Errorf("split %d/%d rejected: %v", discount, share, err)
		}
	}
}

func TestValidateSellerVoucherSplitRejectsWrongTotal(t *testing.T) {
	cases := []struct{ discount, share int }{
		{20, 20}, // 40 — over budget
		{10, 10}, // 20 — under budget
		{0, 0},   // nothing allocated
		{36, 36}, // both maxed
		{35, 0},  // one short
		{1, 36},  // one over
	}
	for _, tc := range cases {
		err := ValidateSellerVoucherSplit(tc.discount, tc.share)
		if !errors.Is(err, ErrSellerSplitBudget) {
			t.Errorf("split %d/%d: err = %v, want ErrSellerSplitBudget", tc.discount, tc.share, err)
		}
	}
}

func TestValidateSellerVoucherSplitRejectsOutOfRange(t *testing.T) {
	cases := []struct{ discount, share int }{
		{-1, 37},
		{37, -1},
		{-5, 41},
		{100, -64},
	}
	for _, tc := range cases {
		err := ValidateSellerVoucherSplit(tc.discount, tc.share)
		if !errors.Is(err, ErrSellerSplitOutOfRange) {
			t.Errorf("split %d/%d: err = %v, want ErrSellerSplitOutOfRange", tc.discount, tc.share, err)
		}
	}
}

// TestSellerVoucherBudgetIsWhole pins the budget itself. The picker, the two
// error messages and the commission math all assume 36 whole points; changing
// it is a product decision, not a refactor.
func TestSellerVoucherBudgetIsWhole(t *testing.T) {
	if SellerVoucherBudgetPercent != 36 {
		t.Errorf("SellerVoucherBudgetPercent = %d, want 36", SellerVoucherBudgetPercent)
	}
	if SellerVoucherMaxPercent != SellerVoucherBudgetPercent {
		t.Errorf("a seller must be able to take the whole budget: max = %d, budget = %d",
			SellerVoucherMaxPercent, SellerVoucherBudgetPercent)
	}
}
