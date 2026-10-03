package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"backEnd/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestNewOrderReceiptResponseAllowlistsSensitiveOrderFields(t *testing.T) {
	order := models.Order{
		ID: primitive.NewObjectID(), UserID: primitive.NewObjectID(), OrderNumber: "DGS-10001",
		Items:           []models.OrderItem{{ProductID: primitive.NewObjectID(), ProductName: "پیراهن", ProductImage: "/uploads/shirt.jpg", Quantity: 2, PriceAtPurchase: 1250000}},
		ShippingAddress: models.Address{FirstName: "علی", Address: "خیابان اصلی", PostalCode: "1234567890", Latitude: 35.7, IsDefault: true},
		Status:          "processing", PaymentStatus: "paid", PaymentMethod: "online", GatewayName: "zibal",
		ShippingMethod: "پست پیشتاز",
		DiscountCode:   "SECRET-DISCOUNT", MerchantTransactionID: "merchant-secret", GatewayTransactionID: "provider-secret",
		GatewayReference: "token-secret", TrackingCode: stringPtr("TRK-1"), Timeline: []models.OrderTimelineEntry{{Note: "internal"}},
		Notes: []models.OrderNote{{Content: "admin-only"}}, CreatedAt: time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC),
	}

	payload, err := json.Marshal(newOrderReceiptResponse(order))
	if err != nil {
		t.Fatalf("marshal receipt: %v", err)
	}
	serialized := string(payload)
	for _, forbidden := range []string{
		"user_id", "discount_code", "merchant_transaction_id", "gateway_transaction_id", "gateway_reference",
		"timeline", "notes", "latitude", "is_default", "provider-secret", "token-secret", "admin-only", "tracking_code", "TRK-1",
	} {
		if strings.Contains(serialized, forbidden) {
			t.Errorf("receipt contains forbidden field or value %q: %s", forbidden, serialized)
		}
	}
	for _, expected := range []string{"DGS-10001", "پیراهن", "1250000", "zibal", "پست پیشتاز", "shipping_method", "jalali_created_at"} {
		if !strings.Contains(serialized, expected) {
			t.Errorf("receipt is missing expected value %q: %s", expected, serialized)
		}
	}
}

func TestNormalizeCheckoutShippingMethod(t *testing.T) {
	method, err := normalizeCheckoutShippingMethod("  پست پیشتاز  ")
	if err != nil || method != "پست پیشتاز" {
		t.Fatalf("normalized shipping method = %q, err = %v", method, err)
	}

	tooLong := strings.Repeat("ا", maxCheckoutShippingMethodLength+1)
	if _, err := normalizeCheckoutShippingMethod(tooLong); err == nil {
		t.Fatal("expected an overlong shipping method to be rejected")
	}
}

func TestNewOrderReceiptResponsePreservesSnapshotsAndEmptyItems(t *testing.T) {
	productID := primitive.NewObjectID()
	order := models.Order{ID: primitive.NewObjectID(), Items: []models.OrderItem{{
		ProductID: productID, ProductName: "نام زمان خرید", ProductImage: "old-image.jpg",
		Variant:  models.OrderVariant{VariantID: "variant-1", Size: "M", Color: "02", ColorName: "قرمز", SKU: "SKU-OLD"},
		Quantity: 3, PriceAtPurchase: 987.5,
	}}}

	response := newOrderReceiptResponse(order)
	if len(response.Items) != 1 || response.Items[0].Product.ID != productID || response.Items[0].Product.Name != "نام زمان خرید" || response.Items[0].Product.Image != "old-image.jpg" {
		t.Fatalf("receipt did not preserve product snapshot: %+v", response.Items)
	}
	if response.Items[0].PriceAtPurchase != 987.5 || response.Items[0].Variant.SKU != "SKU-OLD" {
		t.Fatalf("receipt did not preserve purchase details: %+v", response.Items[0])
	}

	empty := newOrderReceiptResponse(models.Order{})
	if empty.Items == nil || len(empty.Items) != 0 {
		t.Fatalf("empty receipt items must be a non-nil empty array: %#v", empty.Items)
	}
}

func TestNewOrderReceiptResponseUsesStableNameForBlankSnapshot(t *testing.T) {
	response := newOrderReceiptResponse(models.Order{Items: []models.OrderItem{{ProductName: "  "}}})
	if response.Items[0].Product.Name != "کالا" {
		t.Fatalf("unexpected blank snapshot label: %q", response.Items[0].Product.Name)
	}
}

func TestOwnsOrderReceipt(t *testing.T) {
	owner := primitive.NewObjectID()
	order := models.Order{UserID: owner}
	if !ownsOrderReceipt(order, owner) {
		t.Fatal("order owner should be authorized")
	}
	if ownsOrderReceipt(order, primitive.NewObjectID()) {
		t.Fatal("different customer should not be authorized")
	}
	if ownsOrderReceipt(order, primitive.NilObjectID) {
		t.Fatal("nil identity should not be authorized")
	}
}

func TestOrderReceiptFilterMatchesCustomerAndAdminLookupSemantics(t *testing.T) {
	orderID := primitive.NewObjectID()
	customerFilter := orderReceiptFilter(orderID, false)
	if customerFilter["_id"] != orderID || customerFilter["is_active"] != true {
		t.Fatalf("customer receipt filter = %#v, want active order by id", customerFilter)
	}

	adminFilter := orderReceiptFilter(orderID, true)
	if adminFilter["_id"] != orderID {
		t.Fatalf("admin receipt filter = %#v, want order by id", adminFilter)
	}
	if _, exists := adminFilter["is_active"]; exists {
		t.Fatalf("admin receipt filter must include inactive orders: %#v", adminFilter)
	}
}

func TestGetOrderReceiptRejectsInvalidPreconditionsBeforeDatabaseAccess(t *testing.T) {
	tests := []struct {
		name       string
		request    *http.Request
		statusCode int
	}{
		{
			name:       "missing auth context",
			request:    mux.SetURLVars(httptest.NewRequest(http.MethodGet, "/api/orders/not-an-id/receipt", nil), map[string]string{"orderId": "not-an-id"}),
			statusCode: http.StatusUnauthorized,
		},
		{
			name:       "invalid order id",
			request:    mux.SetURLVars(httptest.NewRequest(http.MethodGet, "/api/orders/not-an-id/receipt", nil).WithContext(context.WithValue(context.WithValue(context.Background(), "userID", primitive.NewObjectID()), "role", "user")), map[string]string{"orderId": "not-an-id"}),
			statusCode: http.StatusBadRequest,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			GetOrderReceipt(recorder, test.request)
			if recorder.Code != test.statusCode {
				t.Fatalf("status = %d, want %d; body=%s", recorder.Code, test.statusCode, recorder.Body.String())
			}
		})
	}
}

func stringPtr(value string) *string { return &value }
