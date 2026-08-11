package handlers

import (
	"context"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func TestSnappPayTransactionIDMatchesDocumentedShape(t *testing.T) {
	first := snappPayTransactionID()
	second := snappPayTransactionID()
	if first == second {
		t.Fatal("generated SnappPay transaction IDs must be unique")
	}
	if len(first) < 5 {
		t.Fatalf("transaction ID %q is shorter than the documented minimum", first)
	}
	if len(first) > 10 && !strings.ContainsAny(first, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		t.Fatalf("transaction ID %q longer than ten characters must contain a letter", first)
	}
}

func TestReducedOrderItemsIncludesRemovedRowsAndQuantityDifferences(t *testing.T) {
	productA := primitive.NewObjectID()
	productB := primitive.NewObjectID()
	oldItems := []models.OrderItem{
		{ProductID: productA, Variant: models.OrderVariant{Size: "M", Color: "#000000"}, Quantity: 3},
		{ProductID: productB, Variant: models.OrderVariant{Size: "L", Color: "#ffffff"}, Quantity: 1},
	}
	newItems := []models.OrderItem{
		{ProductID: productA, Variant: models.OrderVariant{Size: "M", Color: "#000000"}, Quantity: 1},
	}

	removed := reducedOrderItems(oldItems, newItems)
	if len(removed) != 2 {
		t.Fatalf("got %d inventory restoration rows, want 2", len(removed))
	}
	if removed[0].ProductID != productA || removed[0].Quantity != 2 {
		t.Fatalf("quantity reduction was not calculated correctly: %+v", removed[0])
	}
	if removed[1].ProductID != productB || removed[1].Quantity != 1 {
		t.Fatalf("fully removed row was not calculated correctly: %+v", removed[1])
	}
}

func TestBuildSnappPayCartAllowsMerchantDiscountCode(t *testing.T) {
	order := models.Order{
		ID:             primitive.NewObjectID(),
		OrderNumber:    "DGS-TEST",
		Items:          []models.OrderItem{{ProductID: primitive.NewObjectID(), ProductName: "shirt", Quantity: 1, PriceAtPurchase: 100}},
		ShippingCost:   10,
		DiscountAmount: 20,
		DiscountCode:   "SITE-20",
		TotalAmount:    90,
	}

	_, amount, err := buildSnappPayCart(context.Background(), order)
	if err != nil {
		t.Fatalf("merchant discount code should not prevent SnappPay cart creation: %v", err)
	}
	if amount != 900 {
		t.Fatalf("got SnappPay amount %d, want 900", amount)
	}
}
