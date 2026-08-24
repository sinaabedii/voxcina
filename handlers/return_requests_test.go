package handlers

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func deliveredOrder(deliveredAgo time.Duration) *models.Order {
	deliveredAt := time.Now().Add(-deliveredAgo)
	return &models.Order{
		ID:            primitive.NewObjectID(),
		Status:        "delivered",
		PaymentStatus: "paid",
		DeliveredAt:   &deliveredAt,
	}
}

func TestEvaluateReturnEligibilityWithinWindow(t *testing.T) {
	order := deliveredOrder(3 * 24 * time.Hour)
	el := evaluateReturnEligibility(order, nil, time.Now())
	if !el.CanRequest {
		t.Fatalf("expected eligible within window, got reason=%q", el.Reason)
	}
}

// Boundary is inclusive: exactly at delivered_at + 7d is still allowed.
func TestEvaluateReturnEligibilityExactDeadlineIsInclusive(t *testing.T) {
	deliveredAt := time.Now().Add(-models.ReturnWindowDuration)
	order := deliveredOrder(0)
	order.DeliveredAt = &deliveredAt
	el := evaluateReturnEligibility(order, nil, deliveredAt.Add(models.ReturnWindowDuration))
	if !el.CanRequest {
		t.Fatalf("expected inclusive boundary to allow request at exact deadline, got reason=%q", el.Reason)
	}
}

func TestEvaluateReturnEligibilityWindowExpired(t *testing.T) {
	order := deliveredOrder(models.ReturnWindowDuration + time.Minute)
	el := evaluateReturnEligibility(order, nil, time.Now())
	if el.CanRequest || el.Reason != ReturnReasonWindowExpired {
		t.Fatalf("expected window_expired, got can_request=%v reason=%q", el.CanRequest, el.Reason)
	}
}

func TestEvaluateReturnEligibilityRequiresDeliveredStatus(t *testing.T) {
	for _, status := range []string{"pending", "processing", "shipped", "cancelled"} {
		order := deliveredOrder(24 * time.Hour)
		order.Status = status
		el := evaluateReturnEligibility(order, nil, time.Now())
		if el.CanRequest || el.Reason != ReturnReasonNotDelivered {
			t.Fatalf("status %q: expected not_delivered, got can_request=%v reason=%q", status, el.CanRequest, el.Reason)
		}
	}
}

func TestEvaluateReturnEligibilityRequiresPaidOrder(t *testing.T) {
	order := deliveredOrder(24 * time.Hour)
	order.PaymentStatus = "pending"
	el := evaluateReturnEligibility(order, nil, time.Now())
	if el.CanRequest || el.Reason != ReturnReasonNotPaid {
		t.Fatalf("expected not_paid, got can_request=%v reason=%q", el.CanRequest, el.Reason)
	}
}

func TestEvaluateReturnEligibilityBlocksOnApprovedRequest(t *testing.T) {
	order := deliveredOrder(24 * time.Hour)
	existing := &models.ReturnRequest{
		ID:     primitive.NewObjectID(),
		Status: models.ReturnStatusApproved,
	}
	el := evaluateReturnEligibility(order, existing, time.Now())
	if el.CanRequest || el.Reason != ReturnReasonAlreadyApproved {
		t.Fatalf("expected already_approved, got can_request=%v reason=%q", el.CanRequest, el.Reason)
	}
	if el.ExistingRequestID != existing.ID.Hex() {
		t.Fatalf("expected existing request id surfaced, got %q", el.ExistingRequestID)
	}
}

func TestEvaluateReturnEligibilityBlocksOnPendingRequest(t *testing.T) {
	order := deliveredOrder(24 * time.Hour)
	existing := &models.ReturnRequest{
		ID:     primitive.NewObjectID(),
		Status: models.ReturnStatusPending,
	}
	el := evaluateReturnEligibility(order, existing, time.Now())
	if el.CanRequest || el.Reason != ReturnReasonAlreadyPending {
		t.Fatalf("expected already_pending, got can_request=%v reason=%q", el.CanRequest, el.Reason)
	}
}

// Rejected and cancelled requests free the order for re-submission.
func TestEvaluateReturnEligibilityAllowsResubmissionAfterRejectedOrCancelled(t *testing.T) {
	for _, status := range []string{models.ReturnStatusRejected, models.ReturnStatusCancelled} {
		order := deliveredOrder(24 * time.Hour)
		existing := &models.ReturnRequest{
			ID:     primitive.NewObjectID(),
			Status: status,
		}
		el := evaluateReturnEligibility(order, existing, time.Now())
		if !el.CanRequest {
			t.Fatalf("status %q: expected re-submission allowed, got reason=%q", status, el.Reason)
		}
	}
}

func TestResolveDeliveryTimePrefersExplicitStamp(t *testing.T) {
	stamp := time.Now().Add(-48 * time.Hour)
	order := &models.Order{
		Status:      "delivered",
		DeliveredAt: &stamp,
		Timeline: []models.OrderTimelineEntry{
			{Status: "delivered", Timestamp: time.Now().Add(-240 * time.Hour)},
		},
	}
	got := resolveDeliveryTime(order)
	if !got.Equal(stamp) {
		t.Fatalf("expected explicit stamp %v, got %v", stamp, got)
	}
}

func TestResolveDeliveryTimeFallsBackToLatestTimelineEntry(t *testing.T) {
	older := time.Now().Add(-240 * time.Hour)
	newer := time.Now().Add(-96 * time.Hour)
	order := &models.Order{
		Status: "delivered",
		Timeline: []models.OrderTimelineEntry{
			{Status: "shipped", Timestamp: older},
			{Status: "delivered", Timestamp: older},
			{Status: "shipped", Timestamp: newer.Add(-time.Hour)},
			// re-delivery is the latest delivered entry and must win
			{Status: "delivered", Timestamp: newer},
		},
	}
	got := resolveDeliveryTime(order)
	if got == nil || !got.Equal(newer) {
		t.Fatalf("expected latest timeline delivered entry %v, got %v", newer, got)
	}
}

func TestResolveDeliveryTimeNilWhenNeverDelivered(t *testing.T) {
	order := &models.Order{Status: "shipped"}
	if got := resolveDeliveryTime(order); got != nil {
		t.Fatalf("expected nil for non-delivered order without records, got %v", got)
	}
}

func TestResolveDeliveryTimeUpdatedATFallbackWhileDelivered(t *testing.T) {
	updated := time.Now().Add(-72 * time.Hour)
	order := &models.Order{Status: "delivered", UpdatedAt: updated}
	got := resolveDeliveryTime(order)
	if got == nil || !got.Equal(updated) {
		t.Fatalf("expected updated_at fallback %v, got %v", updated, got)
	}
}

func TestBuildReturnItemsValidations(t *testing.T) {
	productID := primitive.NewObjectID()
	order := &models.Order{
		Items: []models.OrderItem{
			{
				ProductID:   productID,
				ProductName: "تیشرت",
				Variant:     models.OrderVariant{VariantID: "var-1", Size: "M"},
				Quantity:    2,
			},
			{
				ProductID:   productID,
				ProductName: "تیشرت",
				Variant:     models.OrderVariant{VariantID: "var-2", Size: "L"},
				Quantity:    1,
			},
		},
	}

	type reqItem = struct {
		ProductID string `json:"product_id"`
		VariantID string `json:"variant_id,omitempty"`
		Quantity  int    `json:"quantity"`
	}

	// Ambiguous product without variant disambiguation must fail.
	if _, err := buildReturnItems(order, []reqItem{{ProductID: productID.Hex(), Quantity: 1}}); err == nil {
		t.Fatal("expected error for ambiguous product without variant_id")
	}

	// Variant-disambiguated request succeeds.
	items, err := buildReturnItems(order, []reqItem{{ProductID: productID.Hex(), VariantID: "var-1", Quantity: 2}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 || items[0].Quantity != 2 || items[0].Variant.VariantID != "var-1" {
		t.Fatalf("unexpected resolved items: %+v", items)
	}

	// Quantity above purchased amount fails.
	if _, err := buildReturnItems(order, []reqItem{{ProductID: productID.Hex(), VariantID: "var-2", Quantity: 5}}); err == nil {
		t.Fatal("expected error when quantity exceeds purchased")
	}

	// Unknown product fails.
	if _, err := buildReturnItems(order, []reqItem{{ProductID: primitive.NewObjectID().Hex(), Quantity: 1}}); err == nil {
		t.Fatal("expected error for unknown product")
	}

	// Duplicate entries fail.
	dup := productID.Hex()
	if _, err := buildReturnItems(order, []reqItem{
		{ProductID: dup, VariantID: "var-1", Quantity: 1},
		{ProductID: dup, VariantID: "var-1", Quantity: 1},
	}); err == nil {
		t.Fatal("expected error for duplicate item entry")
	}

	// Non-positive quantity fails.
	if _, err := buildReturnItems(order, []reqItem{{ProductID: dup, VariantID: "var-1", Quantity: 0}}); err == nil {
		t.Fatal("expected error for zero quantity")
	}
}

func TestReturnBlockMessagesArePersianAndTotal(t *testing.T) {
	for _, reason := range []string{
		ReturnReasonNotDelivered,
		ReturnReasonNotPaid,
		ReturnReasonWindowExpired,
		ReturnReasonAlreadyApproved,
		ReturnReasonAlreadyPending,
		"",
	} {
		if msg := returnBlockMessage(reason); msg == "" {
			t.Fatalf("reason %q produced empty message", reason)
		}
	}
}
