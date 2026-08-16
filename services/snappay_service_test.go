package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSnappPayUpdatePaymentSendsDocumentedPayload(t *testing.T) {
	var payload struct {
		Amount               int64         `json:"amount"`
		CartList             []PaymentCart `json:"cartList"`
		DiscountAmount       int64         `json:"discountAmount"`
		ExternalSourceAmount int64         `json:"externalSourceAmount"`
		PaymentToken         string        `json:"paymentToken"`
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case snappPayOAuthPath:
			if r.Method != http.MethodPost {
				t.Errorf("OAuth method = %s, want POST", r.Method)
			}
			_, _ = w.Write([]byte(`{"access_token":"test-token","expires_in":3600}`))
		case snappPayUpdatePath:
			if r.Method != http.MethodPost {
				t.Errorf("update method = %s, want POST", r.Method)
			}
			if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
				t.Errorf("Authorization = %q, want Bearer test-token", got)
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Errorf("decode update payload: %v", err)
			}
			_, _ = w.Write([]byte(`{"successful":true,"response":{"transactionId":"updated-transaction"}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	service := &SnappPayService{
		clientID:     "client-id",
		clientSecret: "client-secret",
		username:     "username",
		password:     "password",
		baseURL:      server.URL,
		httpClient:   server.Client(),
	}

	response, err := service.UpdatePayment(context.Background(), &UpdatePaymentRequest{
		PaymentToken: "payment-token",
		Amount:       950,
		CartList: []PaymentCart{{
			CartID:           123,
			ShipmentIncluded: true,
			TaxIncluded:      true,
			ShippingAmount:   100,
			TaxAmount:        0,
			TotalAmount:      1000,
			Items: []PaymentCartItem{{
				Amount:         900,
				Category:       "پوشاک",
				Count:          1,
				ID:             456,
				Name:           "پیراهن",
				CommissionType: 100,
			}},
		}},
		DiscountAmount:       50,
		ExternalSourceAmount: 0,
	})
	if err != nil {
		t.Fatalf("UpdatePayment returned an error: %v", err)
	}
	if response == nil || response.TransactionID != "updated-transaction" {
		t.Fatalf("unexpected update response: %+v", response)
	}
	if payload.Amount != 950 || payload.PaymentToken != "payment-token" || payload.DiscountAmount != 50 || payload.ExternalSourceAmount != 0 {
		t.Fatalf("unexpected update fields: %+v", payload)
	}
	if len(payload.CartList) != 1 || len(payload.CartList[0].Items) != 1 {
		t.Fatalf("unexpected cart list: %+v", payload.CartList)
	}
	if !payload.CartList[0].ShipmentIncluded || !payload.CartList[0].TaxIncluded {
		t.Fatal("update payload must include shipment and tax")
	}
	if payload.CartList[0].Items[0].Category != "پوشاک" {
		t.Fatalf("category = %q, want Persian category", payload.CartList[0].Items[0].Category)
	}
}
