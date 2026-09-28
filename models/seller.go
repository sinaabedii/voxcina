package models

import (
	"errors"
	"fmt"
)

// A seller is a partner who promotes the shop with their own voucher codes.
// Every code carves up ONE fixed budget:
//
//	SellerVoucherBudgetPercent = customer discount % + seller commission %
//
// The seller chooses the split when minting the code. Nothing else about the
// deal is negotiable, and the split is frozen once the code exists — earned
// commission is derived from it long after the fact, so a mutable split would
// silently rewrite history. A different split means a new code.
const SellerVoucherBudgetPercent = 36

// ReferralSellerVoucherBudgetPercent is the fixed budget a referral-joined
// seller splits (discount % + share % == 20).
const ReferralSellerVoucherBudgetPercent = 20

// ReferralParentCommissionPercent is the cut a referring seller earns on every
// paid order placed through one of their sub-sellers' voucher codes: 5% of
// the child's CommissionBase (paid merchandise net of discounts and approved
// returns). It is tracked separately and never mixed into either seller's own
// Commission.
const ReferralParentCommissionPercent = 5

// NormalizeSellerBudget maps any stored SellerBudgetPercent to a usable
// budget: the two program budgets (36 standard, 20 referral-joined) pass
// through, everything else — including unset 0 from legacy documents — falls
// back to the standard budget. Read paths use this so a corrupt value can
// never widen a seller's picker; write paths must additionally reject
// out-of-whitelist values via IsValidSellerBudget instead of silently
// normalizing them.
func NormalizeSellerBudget(budget int) int {
	switch budget {
	case SellerVoucherBudgetPercent, ReferralSellerVoucherBudgetPercent:
		return budget
	default:
		return SellerVoucherBudgetPercent
	}
}

// IsValidSellerBudget reports whether a budget may be persisted on
// User.SellerBudgetPercent: unset (0, legacy/standard) or one of the two
// program budgets. Anything else is a product-level unknown and must be
// rejected at the write path.
func IsValidSellerBudget(budget int) bool {
	return budget == 0 ||
		budget == SellerVoucherBudgetPercent ||
		budget == ReferralSellerVoucherBudgetPercent
}

// SellerReferralCodePrefix marks an auto-minted recruiter code. The code is
// shared as a link (/seller/sign-up?ref=REF-XXXXXXXX), so like the voucher
// prefix it carries no readable identity — the suffix is random hex.
const SellerReferralCodePrefix = "REF-"

// SellerReferralCodeRandomBytes sizes the random suffix: 4 bytes render as 8
// upper-case hex characters (REF-XXXXXXXX).
const SellerReferralCodeRandomBytes = 4

// The standard-budget split moves in whole percentage points. It is a picker
// with 37 positions (0..36), not a slider over the reals: a code reading
// "17.5% off" is not something a seller can say out loud, and fractional
// shares turn commission reconciliation into a rounding argument. Referral
// sellers use the same picker shape over their own budget (0..20); the range
// below binds the standard budget only.
const (
	SellerVoucherMinPercent = 0
	SellerVoucherMaxPercent = SellerVoucherBudgetPercent
)

// SellerVoucherCodePrefix marks an auto-minted seller code. It follows the
// convention the other machine-issued coupons already use — "TRYN-" for the
// try-on negotiation, "CART-" for cart recovery — so the source of a code is
// readable at a glance in the vouchers table.
//
// The suffix is random rather than derived from the seller's name: a code is
// public, and a partner's identity should not be legible in it.
const SellerVoucherCodePrefix = "SLR-"

// ErrSellerSplitOutOfRange and ErrSellerSplitBudget describe the two ways a
// requested split can be rejected.
var (
	ErrSellerSplitOutOfRange = errors.New("each share must be a whole number between 0 and 36")
	ErrSellerSplitBudget     = fmt.Errorf("the customer discount and the seller share must add up to exactly %d%%", SellerVoucherBudgetPercent)
)

// ValidateSellerVoucherSplit checks a proposed split of the fixed budget.
//
// Callers pass both halves rather than one plus a derived remainder, so a
// client that computes the remainder differently is caught here instead of
// silently minting a code whose two percentages disagree.
func ValidateSellerVoucherSplit(discountPercent, sellerSharePercent int) error {
	return ValidateSellerVoucherSplitForBudget(SellerVoucherBudgetPercent, discountPercent, sellerSharePercent)
}

// ValidateSellerVoucherSplitForBudget checks a proposed split against an
// explicit budget (standard 36 or referral 20). Both shares must be whole
// numbers in 0..budget and add up to exactly budget. Errors wrap the
// package sentinels so errors.Is callers keep working across budgets.
func ValidateSellerVoucherSplitForBudget(budget, discountPercent, sellerSharePercent int) error {
	if discountPercent < SellerVoucherMinPercent || discountPercent > budget {
		return fmt.Errorf("each share must be a whole number between 0 and %d: %w", budget, ErrSellerSplitOutOfRange)
	}
	if sellerSharePercent < SellerVoucherMinPercent || sellerSharePercent > budget {
		return fmt.Errorf("each share must be a whole number between 0 and %d: %w", budget, ErrSellerSplitOutOfRange)
	}
	if discountPercent+sellerSharePercent != budget {
		return fmt.Errorf("the customer discount and the seller share must add up to exactly %d%%: %w", budget, ErrSellerSplitBudget)
	}
	return nil
}
