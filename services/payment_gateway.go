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
	OrderID     string
	Amount      int64
	CallbackURL string
	Description string
	Mobile      string
	ProviderID  string
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
	Success    bool
	Status     string
	Amount     int64
	RefNumber  string
	CreatedAt  *time.Time
	PaidAt     *time.Time
}
