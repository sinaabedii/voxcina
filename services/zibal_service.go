package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	ZibalGatewayURL = "https://gateway.zibal.ir"
	ZibalRequestURL = ZibalGatewayURL + "/v1/request"
	ZibalVerifyURL  = ZibalGatewayURL + "/v1/verify"
	ZibalInquiryURL = ZibalGatewayURL + "/v1/inquiry"
	ZibalStartURL   = ZibalGatewayURL + "/start"
)

type ZibalPaymentRequest struct {
	Merchant      string                `json:"merchant"`
	Amount        int64                 `json:"amount"`
	CallbackURL   string                `json:"callbackUrl"`
	Description   string                `json:"description,omitempty"`
	OrderID       string                `json:"orderId,omitempty"`
	Mobile        string                `json:"mobile,omitempty"`
	AllowedCards  []string              `json:"allowedCards,omitempty"`
	NationalCode  string                `json:"nationalCode,omitempty"`
	CheckMobileWithCard bool             `json:"checkMobileWithCard,omitempty"`
	MultiplexingInfo []MultiplexingInfo `json:"multiplexingInfo,omitempty"`
}

type MultiplexingInfo struct {
	BankAccount  string `json:"bankAccount,omitempty"`
	SubMerchantID string `json:"subMerchantId,omitempty"`
	Amount       int64  `json:"amount"`
}

type ZibalPaymentResponse struct {
	Result  int    `json:"result"`
	Message string `json:"message"`
	TrackID int64  `json:"trackId,omitempty"`
}

type ZibalVerifyRequest struct {
	Merchant string `json:"merchant"`
	TrackID  int64  `json:"trackId"`
}

type ZibalVerifyResponse struct {
	Result      int       `json:"result"`
	Message     string    `json:"message"`
	Status      int       `json:"status"`
	Amount      int64     `json:"amount"`
	RefNumber   string    `json:"refNumber,omitempty"`
	CardNumber  string    `json:"cardNumber,omitempty"`
	PaidAt      time.Time `json:"paidAt,omitempty"`
	Description string    `json:"description,omitempty"`
	OrderID     string    `json:"orderId,omitempty"`
}

type ZibalInquiryRequest struct {
	Merchant string `json:"merchant"`
	TrackID  int64  `json:"trackId"`
}

type ZibalInquiryResponse struct {
	Result      int       `json:"result"`
	Message     string    `json:"message"`
	Status      int       `json:"status"`
	Amount      int64     `json:"amount"`
	RefNumber   string    `json:"refNumber,omitempty"`
	CardNumber  string    `json:"cardNumber,omitempty"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	PaidAt      time.Time `json:"paidAt,omitempty"`
	VerifiedAt  time.Time `json:"verifiedAt,omitempty"`
	Description string    `json:"description,omitempty"`
	OrderID     string    `json:"orderId,omitempty"`
	Wage        int       `json:"wage,omitempty"`
}

type ZibalService struct {
	merchant string
	client   *http.Client
}

func NewZibalService(merchant string) *ZibalService {
	return &ZibalService{
		merchant: merchant,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (z *ZibalService) RequestPayment(ctx context.Context, req *ZibalPaymentRequest) (*ZibalPaymentResponse, error) {
	req.Merchant = z.merchant

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, ZibalRequestURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := z.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result ZibalPaymentResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

func (z *ZibalService) VerifyPayment(ctx context.Context, trackID int64) (*ZibalVerifyResponse, error) {
	req := ZibalVerifyRequest{
		Merchant: z.merchant,
		TrackID:  trackID,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, ZibalVerifyURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := z.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result ZibalVerifyResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

func (z *ZibalService) InquiryPayment(ctx context.Context, trackID int64) (*ZibalInquiryResponse, error) {
	req := ZibalInquiryRequest{
		Merchant: z.merchant,
		TrackID:  trackID,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, ZibalInquiryURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := z.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result ZibalInquiryResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

func (z *ZibalService) GetPaymentURL(trackID int64) string {
	return fmt.Sprintf("%s/%d", ZibalStartURL, trackID)
}

func IsPaymentSuccessful(status int) bool {
	return status == 1
}

// IsPaymentPending returns true if payment is still awaiting completion
func IsPaymentPending(status int) bool {
	return status == -1
}

// IsPaymentCancelledByUser returns true if user cancelled the payment
func IsPaymentCancelledByUser(status int) bool {
	return status == 3
}

func GetPaymentStatusText(status int) string {
	switch status {
	case -1:
		return "در انتظار پرداخت"
	case -2:
		return "خطای داخلی"
	case 1:
		return "پرداخت شده - تاییدشده"
	case 2:
		return "پرداخت شده - تاییدنشده"
	case 3:
		return "لغوشده توسط کاربر"
	case 4:
		return "شماره کارت نامعتبر"
	case 5:
		return "موجودی حساب کافی نیست"
	case 6:
		return "رمز واردشده اشتباه است"
	case 7:
		return "تعداد درخواست‌ها بیش از حد مجاز است"
	case 8:
		return "تعداد پرداخت روزانه بیش از حد مجاز است"
	case 9:
		return "مبلغ پرداخت روزانه بیش از حد مجاز است"
	case 10:
		return "صادرکننده کارت نامعتبر است"
	case 11:
		return "خطای سوییچ"
	case 12:
		return "کارت قابل دسترسی نیست"
	case 15:
		return "تراکنش استرداد شده"
	case 16:
		return "تراکنش در حال استرداد"
	case 18:
		return "تراکنش ریورس شده"
	case 21:
		return "پذیرنده نامعتبر است"
	default:
		return "وضعیت نامشخص"
	}
}
