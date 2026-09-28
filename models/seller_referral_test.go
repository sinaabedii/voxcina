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
