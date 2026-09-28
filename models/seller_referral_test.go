package models

import (
	"errors"
	"testing"
)

// TestEffectiveSellerBudgetLegacyZero pins the backward-compatibility rule:
// every pre-referral seller document has no budget stored and stays on the
// standard 36-point budget.
func TestEffectiveSellerBudgetLegacyZero(t *testing.T) {
	u := User{}
	if got := u.EffectiveSellerBudget(); got != SellerVoucherBudgetPercent {
		t.Errorf("zero budget effective = %d, want %d", got, SellerVoucherBudgetPercent)
	}
	if got := u.EffectiveSellerBudget(); got != 36 {
		t.Errorf("zero budget effective = %d, want 36", got)
	}
}

// TestEffectiveSellerBudgetExplicit20 pins the referral-joined budget: an
// explicit 20 survives the accessor instead of collapsing to the default.
func TestEffectiveSellerBudgetExplicit20(t *testing.T) {
	u := User{SellerBudgetPercent: ReferralSellerVoucherBudgetPercent}
	if got := u.EffectiveSellerBudget(); got != 20 {
		t.Errorf("explicit 20 budget effective = %d, want 20", got)
	}
}

// TestValidateReferralBudgetSplitAccepts checks a valid referral split under
// the 20-point budget.
func TestValidateReferralBudgetSplitAccepts(t *testing.T) {
	if err := ValidateSellerVoucherSplitForBudget(ReferralSellerVoucherBudgetPercent, 12, 8); err != nil {
		t.Errorf("split 12/8 under budget 20 rejected: %v", err)
	}
}

// TestValidateReferralBudgetSplitRejectsStandardTotal ensures a standard
// 36-point split cannot slip through under the referral budget.
func TestValidateReferralBudgetSplitRejectsStandardTotal(t *testing.T) {
	err := ValidateSellerVoucherSplitForBudget(ReferralSellerVoucherBudgetPercent, 18, 18)
	if err == nil {
		t.Fatal("split 18/18 (sums 36) accepted under budget 20, want rejection")
	}
	if !errors.Is(err, ErrSellerSplitBudget) {
		t.Errorf("split 18/18 under budget 20: err = %v, want ErrSellerSplitBudget", err)
	}
}

// TestReferralSellerVoucherBudgetIs20 pins the referral budget itself.
func TestReferralSellerVoucherBudgetIs20(t *testing.T) {
	if ReferralSellerVoucherBudgetPercent != 20 {
		t.Errorf("ReferralSellerVoucherBudgetPercent = %d, want 20", ReferralSellerVoucherBudgetPercent)
	}
}

// TestNormalizeSellerBudgetWhitelist pins the write-path defense: only the
// two program budgets survive; unset and anything unknown collapse to the
// standard budget so a corrupt value can never widen a seller's picker.
func TestNormalizeSellerBudgetWhitelist(t *testing.T) {
	cases := []struct{ in, want int }{
		{0, SellerVoucherBudgetPercent},          // unset legacy document
		{36, SellerVoucherBudgetPercent},         // standard
		{20, ReferralSellerVoucherBudgetPercent}, // referral-joined
		{50, SellerVoucherBudgetPercent},         // corrupt
		{-5, SellerVoucherBudgetPercent},         // corrupt
		{1, SellerVoucherBudgetPercent},          // unknown
		{35, SellerVoucherBudgetPercent},         // near-miss
	}
	for _, tc := range cases {
		if got := NormalizeSellerBudget(tc.in); got != tc.want {
			t.Errorf("NormalizeSellerBudget(%d) = %d, want %d", tc.in, got, tc.want)
		}
	}
}

// TestIsValidSellerBudget pins what may be persisted: unset (legacy) or one
// of the two program budgets. Everything else must be rejected at the write
// path, never silently normalized.
func TestIsValidSellerBudget(t *testing.T) {
	for _, b := range []int{0, SellerVoucherBudgetPercent, ReferralSellerVoucherBudgetPercent} {
		if !IsValidSellerBudget(b) {
			t.Errorf("IsValidSellerBudget(%d) = false, want true", b)
		}
	}
	for _, b := range []int{1, 19, 21, 35, 37, 50, -1, 100} {
		if IsValidSellerBudget(b) {
			t.Errorf("IsValidSellerBudget(%d) = true, want false", b)
		}
	}
}

// TestReferralParentCommissionPercentIs5 pins the parent's cut itself.
func TestReferralParentCommissionPercentIs5(t *testing.T) {
	if ReferralParentCommissionPercent != 5 {
		t.Errorf("ReferralParentCommissionPercent = %d, want 5", ReferralParentCommissionPercent)
	}
}
