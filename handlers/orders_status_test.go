package handlers

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

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

func TestOrderGatewayNameUsesStoredGateway(t *testing.T) {
	trackID := int64(42)
	order := models.Order{GatewayName: "snappay", ZibalTrackID: &trackID}
	if got := orderGatewayName(nil, order); got != "snappay" {
		t.Fatalf("orderGatewayName() = %q, want snappay", got)
	}
}

func TestOrderGatewayNameInfersLegacyZibal(t *testing.T) {
	trackID := int64(42)
	order := models.Order{ID: primitive.NewObjectID(), ZibalTrackID: &trackID}
	if got := orderGatewayName(nil, order); got != "zibal" {
		t.Fatalf("orderGatewayName() = %q, want zibal", got)
	}
}
