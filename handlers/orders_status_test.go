package handlers

import "testing"

func TestOrderStatusRequiresPayment(t *testing.T) {
	for _, status := range []string{"processing", "shipped", "delivered"} {
		if !orderStatusRequiresPayment(status) {
			t.Fatalf("orderStatusRequiresPayment(%q) = false, want true", status)
		}
	}

	for _, status := range []string{"pending", "cancelled"} {
		if orderStatusRequiresPayment(status) {
			t.Fatalf("orderStatusRequiresPayment(%q) = true, want false", status)
		}
	}
}
