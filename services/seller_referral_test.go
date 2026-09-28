package services

import (
	"testing"
)

// TestReferralCommissionAmountIsFivePercentOfBase pins the parent's cut: 5%
// of the child's commission base (paid merchandise net of discounts and
// approved returns) — never of the gross, never of the order total.
func TestReferralCommissionAmountIsFivePercentOfBase(t *testing.T) {
	if got := ReferralCommissionAmount(800_000); !closeEnough(got, 40_000) {
		t.Errorf("ReferralCommissionAmount(800000) = %v, want 40000", got)
	}
	if got := ReferralCommissionAmount(0); got != 0 {
		t.Errorf("ReferralCommissionAmount(0) = %v, want 0", got)
	}
}

// TestSumReferralEarningsAcrossChildren folds several child roll-ups into one
// parent cut: 5% of each base summed, paid orders summed, team size counted.
// A recruited-but-not-yet-earning child contributes nothing but still counts.
func TestSumReferralEarningsAcrossChildren(t *testing.T) {
	children := []SellerPerformance{
		{CommissionBase: 800_000, OrdersPaid: 3},
		{CommissionBase: 200_000, OrdersPaid: 1},
		{CommissionBase: 0, OrdersPaid: 0},
	}

	out := SumReferralEarnings(children)

	// 5% of 1,000,000.
	if !closeEnough(out.Commission, 50_000) {
		t.Errorf("Commission = %v, want 50000 (5%% of the summed bases)", out.Commission)
	}
	if out.OrdersPaid != 4 {
		t.Errorf("OrdersPaid = %d, want 4", out.OrdersPaid)
	}
	if out.SellerCount != 3 {
		t.Errorf("SellerCount = %d, want 3", out.SellerCount)
	}
	if len(out.Sellers) != 3 {
		t.Errorf("len(Sellers) = %d, want 3", len(out.Sellers))
	}
}

// TestSumReferralEarningsEmpty is the childless parent: all zeroes and a
// non-nil team list so the panel shape stays stable.
func TestSumReferralEarningsEmpty(t *testing.T) {
	out := SumReferralEarnings(nil)

	if out.Commission != 0 || out.OrdersPaid != 0 || out.SellerCount != 0 {
		t.Errorf("expected an all-zero cut, got %+v", out)
	}
	if out.Sellers == nil {
		t.Error("Sellers must be non-nil so the panel JSON shape stays stable")
	}
}
