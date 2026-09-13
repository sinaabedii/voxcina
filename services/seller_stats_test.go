package services

import (
	"math"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func sellerVoucher(code string, discountPercent, sharePercent int, validFrom, validTo time.Time) models.Discount {
	id := primitive.NewObjectID()
	return models.Discount{
		Code:               code,
		Type:               "percentage",
		Value:              float64(discountPercent),
		ValidFrom:          validFrom,
		ValidTo:            validTo,
		SellerID:           &id,
		SellerSharePercent: sharePercent,
	}
}

func closeEnough(got, want float64) bool {
	return math.Abs(got-want) < 0.0001
}

// TestCommissionUsesNetMerchandise pins the agreed formula: the seller's share
// applies to the merchandise subtotal AFTER the customer's discount, not
// before, and not to the order total (which carries shipping and tax).
//
// 1,000,000 subtotal with a 20% code: the shopper saves 200,000, leaving
// 800,000. The seller's 16% of that is 128,000 — NOT 160,000 (which would be
// 16% of the gross) and not 16% of whatever was charged after shipping.
func TestCommissionUsesNetMerchandise(t *testing.T) {
	now := time.Now()
	vouchers := []models.Discount{
		sellerVoucher("SLR-AAAA1111", 20, 16, now.Add(-time.Hour), now.Add(time.Hour)),
	}
	agg := map[string]voucherAggregate{
		"SLR-AAAA1111": {
			Code:             "SLR-AAAA1111",
			OrdersTotal:      1,
			OrdersPaid:       1,
			GrossSubtotal:    1_000_000,
			CustomerDiscount: 200_000,
			CommissionBase:   800_000,
			RevenueCollected: 850_000, // includes shipping; must not drive commission
		},
	}

	perf := BuildVoucherPerformance(vouchers, agg, now)
	if len(perf) != 1 {
		t.Fatalf("got %d rows, want 1", len(perf))
	}
	if !closeEnough(perf[0].NetMerchandise, 800_000) {
		t.Errorf("NetMerchandise = %v, want 800000", perf[0].NetMerchandise)
	}
	if !closeEnough(perf[0].Commission, 128_000) {
		t.Errorf("Commission = %v, want 128000 (16%% of the net, not of the gross)", perf[0].Commission)
	}
}

// TestCommissionIsZeroWithoutCountableOrders guards the gate: an unpaid or
// cancelled order contributes no commission base, so nothing is owed even
// though the code was used.
func TestCommissionIsZeroWithoutCountableOrders(t *testing.T) {
	now := time.Now()
	vouchers := []models.Discount{
		sellerVoucher("SLR-BBBB2222", 10, 26, now.Add(-time.Hour), now.Add(time.Hour)),
	}
	agg := map[string]voucherAggregate{
		"SLR-BBBB2222": {
			Code:            "SLR-BBBB2222",
			OrdersTotal:     3,
			OrdersPaid:      0,
			OrdersPending:   2,
			OrdersCancelled: 1,
			CommissionBase:  0,
		},
	}

	perf := BuildVoucherPerformance(vouchers, agg, now)
	if perf[0].Commission != 0 {
		t.Errorf("Commission = %v, want 0 when no order was paid", perf[0].Commission)
	}
	if perf[0].OrdersTotal != 3 {
		t.Errorf("OrdersTotal = %d, want 3 — the funnel stays visible even at zero commission", perf[0].OrdersTotal)
	}
	if perf[0].AvgOrderValue != 0 {
		t.Errorf("AvgOrderValue = %v, want 0 (no division by zero paid orders)", perf[0].AvgOrderValue)
	}
}

// TestZeroShareEarnsNothing covers the edge of the picker: a seller may hand
// the whole 36% to the customer, and then earns nothing however well the code
// sells.
func TestZeroShareEarnsNothing(t *testing.T) {
	now := time.Now()
	vouchers := []models.Discount{
		sellerVoucher("SLR-CCCC3333", 36, 0, now.Add(-time.Hour), now.Add(time.Hour)),
	}
	agg := map[string]voucherAggregate{
		"SLR-CCCC3333": {Code: "SLR-CCCC3333", OrdersPaid: 5, CommissionBase: 5_000_000},
	}

	perf := BuildVoucherPerformance(vouchers, agg, now)
	if perf[0].Commission != 0 {
		t.Errorf("Commission = %v, want 0 for a 36/0 split", perf[0].Commission)
	}
}

// TestVoucherStatusLabels covers the four labels the tables render.
func TestVoucherStatusLabels(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name     string
		voucher  models.Discount
		expected string
	}{
		{
			name:     "active",
			voucher:  models.Discount{ValidFrom: now.Add(-time.Hour), ValidTo: now.Add(time.Hour)},
			expected: "active",
		},
		{
			name:     "scheduled",
			voucher:  models.Discount{ValidFrom: now.Add(time.Hour), ValidTo: now.Add(2 * time.Hour)},
			expected: "scheduled",
		},
		{
			name:     "expired",
			voucher:  models.Discount{ValidFrom: now.Add(-2 * time.Hour), ValidTo: now.Add(-time.Hour)},
			expected: "expired",
		},
		{
			name:     "depleted",
			voucher:  models.Discount{ValidFrom: now.Add(-time.Hour), ValidTo: now.Add(time.Hour), MaxUses: 5, UsedCount: 5},
			expected: "depleted",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := voucherStatus(tc.voucher, now); got != tc.expected {
				t.Errorf("voucherStatus = %q, want %q", got, tc.expected)
			}
		})
	}
}

// TestRollUpSellerDeduplicatesCustomers is the one figure that cannot be summed
// across codes: a shopper who used two of a seller's codes is one customer, not
// two. Everything else adds.
func TestRollUpSellerDeduplicatesCustomers(t *testing.T) {
	now := time.Now()
	shared := primitive.NewObjectID()
	onlyFirst := primitive.NewObjectID()
	onlySecond := primitive.NewObjectID()

	vouchers := []models.Discount{
		sellerVoucher("SLR-1", 20, 16, now.Add(-time.Hour), now.Add(time.Hour)),
		sellerVoucher("SLR-2", 30, 6, now.Add(-time.Hour), now.Add(time.Hour)),
	}
	agg := map[string]voucherAggregate{
		"SLR-1": {
			Code: "SLR-1", OrdersPaid: 2, CommissionBase: 100_000,
			GrossSubtotal: 120_000, CustomerDiscount: 20_000, RevenueCollected: 100_000,
			Customers: []primitive.ObjectID{shared, onlyFirst},
		},
		"SLR-2": {
			Code: "SLR-2", OrdersPaid: 1, CommissionBase: 50_000,
			GrossSubtotal: 70_000, CustomerDiscount: 20_000, RevenueCollected: 50_000,
			Customers: []primitive.ObjectID{shared, onlySecond},
		},
	}

	perf := BuildVoucherPerformance(vouchers, agg, now)
	rolled := RollUpSeller(perf, agg)

	if rolled.UniqueCustomers != 3 {
		t.Errorf("UniqueCustomers = %d, want 3 (the shared shopper counts once)", rolled.UniqueCustomers)
	}
	if rolled.OrdersPaid != 3 {
		t.Errorf("OrdersPaid = %d, want 3", rolled.OrdersPaid)
	}
	// 16% of 100,000 plus 6% of 50,000.
	if !closeEnough(rolled.Commission, 16_000+3_000) {
		t.Errorf("Commission = %v, want 19000", rolled.Commission)
	}
	if rolled.VoucherCount != 2 || rolled.ActiveVoucherCount != 2 {
		t.Errorf("voucher counts = %d/%d, want 2/2", rolled.ActiveVoucherCount, rolled.VoucherCount)
	}
}

// TestUnusedVoucherStillReported covers a freshly minted code: it has no orders
// and therefore no aggregate row, but it must still appear with zeroes rather
// than vanish from the seller's panel.
func TestUnusedVoucherStillReported(t *testing.T) {
	now := time.Now()
	vouchers := []models.Discount{
		sellerVoucher("SLR-NEW", 18, 18, now.Add(-time.Minute), now.Add(time.Hour)),
	}

	perf := BuildVoucherPerformance(vouchers, map[string]voucherAggregate{}, now)
	if len(perf) != 1 {
		t.Fatalf("got %d rows, want 1", len(perf))
	}
	if perf[0].Status != "active" {
		t.Errorf("Status = %q, want active", perf[0].Status)
	}
	if perf[0].OrdersTotal != 0 || perf[0].Commission != 0 {
		t.Errorf("expected an all-zero row, got orders=%d commission=%v", perf[0].OrdersTotal, perf[0].Commission)
	}
	if perf[0].DiscountPercent+perf[0].SellerSharePercent != models.SellerVoucherBudgetPercent {
		t.Errorf("reported split %d/%d does not add to the budget",
			perf[0].DiscountPercent, perf[0].SellerSharePercent)
	}
}
