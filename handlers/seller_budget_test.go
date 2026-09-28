package handlers

import (
	"strings"
	"testing"
	"time"
)

// TestValidateSellerVoucherParamsForBudgetReferral pins the dynamic budget on
// the voucher path: a referral-joined seller's 12/8 split passes under budget
// 20, while a standard 18/18 split is rejected with a message naming 20.
func TestValidateSellerVoucherParamsForBudgetReferral(t *testing.T) {
	now := time.Date(2026, 9, 27, 12, 0, 0, 0, time.UTC)
	intPtr := func(v int) *int { return &v }

	if _, msg := validateSellerVoucherParamsForBudget(20, intPtr(12), intPtr(8), intPtr(50), intPtr(30), nil, now); msg != "" {
		t.Fatalf("split 12/8 under budget 20 rejected: %q", msg)
	}

	_, msg := validateSellerVoucherParamsForBudget(20, intPtr(18), intPtr(18), intPtr(50), intPtr(30), nil, now)
	if !strings.Contains(msg, "۲۰") {
		t.Fatalf("split 18/18 under budget 20: message %q does not name the ۲۰ budget", msg)
	}

	_, msg = validateSellerVoucherParamsForBudget(20, intPtr(21), intPtr(-1), intPtr(50), intPtr(30), nil, now)
	if !strings.Contains(msg, "۲۰") {
		t.Fatalf("out-of-range split under budget 20: message %q does not name the ۲۰ budget", msg)
	}

	// The legacy entry point still enforces the standard budget byte-for-byte.
	_, msg = validateSellerVoucherParams(intPtr(20), intPtr(20), intPtr(50), intPtr(30), nil, now)
	if msg != "مجموع تخفیف مشتری و سهم فروشنده باید دقیقاً ۳۶ درصد باشد" {
		t.Fatalf("legacy validator message changed: %q", msg)
	}
}
