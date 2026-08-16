package services

import (
	"context"
	"time"
)

// PaymentGateway defines the interface that all payment gateways must implement.
type PaymentGateway interface {
	Name() string
	RequestPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
	VerifyPayment(ctx context.Context, req *VerifyRequest) (*VerifyResponse, error)
	InquiryPayment(ctx context.Context, req *InquiryRequest) (*InquiryResponse, error)
}

type PaymentRequest struct {
	OrderID                  string
	Amount                   int64
	CallbackURL              string
	Description              string
	Mobile                   string
	ProviderID               string
	TransactionID            string
	CartList                 []PaymentCart
	DiscountAmount           int64
	ExternalSourceAmount     int64
	ForcedPaymentMethodTypes []string
}

// PaymentCart and PaymentCartItem contain the server-authoritative order
// breakdown required by gateways that support deferred payment operations.
type PaymentCart struct {
	CartID           int64             `json:"cartId"`
	Items            []PaymentCartItem `json:"cartItems"`
	ShipmentIncluded bool              `json:"isShipmentIncluded"`
	TaxIncluded      bool              `json:"isTaxIncluded"`
	ShippingAmount   int64             `json:"shippingAmount"`
	TaxAmount        int64             `json:"taxAmount"`
	TotalAmount      int64             `json:"totalAmount"`
}

type PaymentCartItem struct {
	Amount         int64  `json:"amount"`
	Category       string `json:"category"`
	Count          int    `json:"count"`
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	CommissionType int    `json:"commissionType"`
}

type PaymentResponse struct {
	GatewayRef string
	PayURL     string
}

type VerifyRequest struct {
	GatewayRef     string
	ExpectedAmount int64
	ProviderID     string
	CallbackType   int
	TrackingCode   string // DigiPay: bank tracking code from callback
}

type VerifyResponse struct {
	Success    bool
	RefNumber  string
	Amount     int64
	GatewayRef string
}

type InquiryRequest struct {
	GatewayRef string
}

type InquiryResponse struct {
	Success   bool
	Status    string
	Amount    int64
	RefNumber string
	CreatedAt *time.Time
	PaidAt    *time.Time
}

// EligibilityPaymentGateway is implemented by gateways that decide whether
// their payment method should be displayed for a specific amount.
type EligibilityPaymentGateway interface {
	CheckEligibility(ctx context.Context, amount int64, paymentMethodTypes []string) (*EligibilityResponse, error)
}

type EligibilityResponse struct {
	Eligible     bool   `json:"eligible"`
	TitleMessage string `json:"title_message"`
	Description  string `json:"description"`
}

// SnappPayPaymentGateway exposes the provider lifecycle beyond the common
// request/verify/inquiry flow.
type SnappPayPaymentGateway interface {
	PaymentGateway
	EligibilityPaymentGateway
	SettlePayment(ctx context.Context, paymentToken string) (*LifecycleResponse, error)
	CancelPayment(ctx context.Context, paymentToken string) (*LifecycleResponse, error)
	UpdatePayment(ctx context.Context, req *UpdatePaymentRequest) (*LifecycleResponse, error)
}

type LifecycleResponse struct {
	TransactionID string
}

type UpdatePaymentRequest struct {
	PaymentToken         string
	Amount               int64
	CartList             []PaymentCart
	DiscountAmount       int64
	ExternalSourceAmount int64
}
