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

// The split moves in whole percentage points. It is a picker with 37 positions
// (0..36), not a slider over the reals: a code reading "17.5% off" is not
// something a seller can say out loud, and fractional shares turn commission
// reconciliation into a rounding argument.
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
	if discountPercent < SellerVoucherMinPercent || discountPercent > SellerVoucherMaxPercent {
		return ErrSellerSplitOutOfRange
	}
	if sellerSharePercent < SellerVoucherMinPercent || sellerSharePercent > SellerVoucherMaxPercent {
		return ErrSellerSplitOutOfRange
	}
	if discountPercent+sellerSharePercent != SellerVoucherBudgetPercent {
		return ErrSellerSplitBudget
	}
	return nil
}
