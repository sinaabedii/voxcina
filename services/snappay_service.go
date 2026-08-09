package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

const (
	snappPayTokenPath       = "/api/online/payment/v1/token"
	snappPayEligibilityPath = "/api/online/offer/v1/eligible"
	snappPayVerifyPath      = "/api/online/payment/v1/verify"
	snappPaySettlePath      = "/api/online/payment/v1/settle"
	snappPayRevertPath      = "/api/online/payment/v1/revert"
	snappPayStatusPath      = "/api/online/payment/v1/status"
	snappPayCancelPath      = "/api/online/payment/v1/cancel"
	snappPayUpdatePath      = "/api/online/payment/v1/update"
	snappPayOAuthPath       = "/api/online/v1/oauth/token"
)

// SnappPayService implements the SnappPay online merchant API. Credentials
// are read only from the server environment; no provider secrets belong in
// frontend code or source control.
type SnappPayService struct {
	clientID     string
	clientSecret string
	username     string
	password     string
	venture      string
	baseURL      string
	httpClient   *http.Client

	mu          sync.RWMutex
	token       string
	tokenExpiry time.Time
	tokenGroup  singleflight.Group
}

func NewSnappPayService() *SnappPayService {
	baseURL := strings.TrimRight(os.Getenv("SNAPPAY_BASE_URL"), "/")
	return &SnappPayService{
		clientID:     os.Getenv("SNAPPAY_CLIENT_ID"),
		clientSecret: os.Getenv("SNAPPAY_CLIENT_SECRET"),
		username:     os.Getenv("SNAPPAY_USERNAME"),
		password:     os.Getenv("SNAPPAY_PASSWORD"),
		venture:      os.Getenv("SNAPPAY_VENTURE"),
		baseURL:      baseURL,
		httpClient:   newDirectPaymentHTTPClient(30 * time.Second),
	}
}

func (s *SnappPayService) Name() string { return "snappay" }

func (s *SnappPayService) Configured() bool {
	return s.baseURL != "" && s.clientID != "" && s.clientSecret != "" && s.username != "" && s.password != ""
}

type snappPayTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type snappPayError struct {
	ErrorCode int         `json:"errorCode"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data"`
}

// SnappPayAPIError preserves the provider error code so callers can apply the
// documented state-aware retry rules instead of treating every HTTP failure
// as the same generic error.
type SnappPayAPIError struct {
	HTTPStatus int
	Code       int
	Message    string
}

func (e *SnappPayAPIError) Error() string {
	if e.Code > 0 {
		return fmt.Sprintf("snappay error %d: %s", e.Code, e.Message)
	}
	return fmt.Sprintf("snappay HTTP %d: %s", e.HTTPStatus, e.Message)
}

type snappPayEnvelope[T any] struct {
	Response   T              `json:"response"`
	Successful bool           `json:"successful"`
	ErrorData  *snappPayError `json:"errorData,omitempty"`
}

func (s *SnappPayService) getToken(ctx context.Context) (string, error) {
	if !s.Configured() {
		return "", errors.New("snappay is not configured")
	}

	s.mu.RLock()
	if s.token != "" && time.Now().Add(30*time.Second).Before(s.tokenExpiry) {
		token := s.token
		s.mu.RUnlock()
		return token, nil
	}
	s.mu.RUnlock()

	value, err, _ := s.tokenGroup.Do("snappay-token", func() (interface{}, error) {
		token, expiry, fetchErr := s.fetchToken(ctx)
		if fetchErr != nil {
			return "", fetchErr
		}
		s.mu.Lock()
		s.token = token
		s.tokenExpiry = expiry
		s.mu.Unlock()
		return token, nil
	})
	if err != nil {
		return "", err
	}
	return value.(string), nil
}

func (s *SnappPayService) fetchToken(ctx context.Context) (string, time.Time, error) {
	form := url.Values{
		"grant_type": {"password"},
		"scope":      {"online-merchant"},
		"username":   {s.username},
		"password":   {s.password},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+snappPayOAuthPath, strings.NewReader(form.Encode()))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("create snappay token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.clientID, s.clientSecret)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("snappay token request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("read snappay token response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", time.Time{}, fmt.Errorf("snappay token returned HTTP %d: %s", resp.StatusCode, string(body))
	}
	var tokenResp snappPayTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", time.Time{}, fmt.Errorf("parse snappay token response: %w", err)
	}
	if tokenResp.AccessToken == "" || tokenResp.ExpiresIn <= 0 {
		return "", time.Time{}, errors.New("snappay token response did not contain a valid access token")
	}
	return tokenResp.AccessToken, time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second), nil
}

func (s *SnappPayService) doJSON(ctx context.Context, method, path string, payload interface{}, target interface{}) error {
	token, err := s.getToken(ctx)
	if err != nil {
		return err
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal snappay request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, method, s.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create snappay request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	if s.venture != "" {
		req.Header.Set("venture", s.venture)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("snappay API request: %w", err)
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read snappay API response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errorEnvelope snappPayEnvelope[json.RawMessage]
		if json.Unmarshal(responseBody, &errorEnvelope) == nil && errorEnvelope.ErrorData != nil {
			return &SnappPayAPIError{
				HTTPStatus: resp.StatusCode,
				Code:       errorEnvelope.ErrorData.ErrorCode,
				Message:    errorEnvelope.ErrorData.Message,
			}
		}
		return &SnappPayAPIError{HTTPStatus: resp.StatusCode, Message: string(responseBody)}
	}
	if err := json.Unmarshal(responseBody, target); err != nil {
		return fmt.Errorf("parse snappay API response: %w", err)
	}
	return nil
}

type snappPayEligibilityResponse struct {
	Eligible     bool   `json:"eligible"`
	TitleMessage string `json:"title_message"`
	Description  string `json:"description"`
}

func (s *SnappPayService) CheckEligibility(ctx context.Context, amount int64, paymentMethodTypes []string) (*EligibilityResponse, error) {
	token, err := s.getToken(ctx)
	if err != nil {
		return nil, err
	}
	query := url.Values{"amount": {fmt.Sprintf("%d", amount)}}
	if len(paymentMethodTypes) > 0 {
		query.Set("paymentMethodTypes", strings.Join(paymentMethodTypes, ","))
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+snappPayEligibilityPath+"?"+query.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("create snappay eligibility request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if s.venture != "" {
		req.Header.Set("venture", s.venture)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("snappay eligibility request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read snappay eligibility response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("snappay eligibility returned HTTP %d: %s", resp.StatusCode, string(body))
	}
	var envelope snappPayEnvelope[snappPayEligibilityResponse]
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("parse snappay eligibility response: %w", err)
	}
	if !envelope.Successful {
		return nil, envelope.errorMessage("eligibility request failed")
	}
	return &EligibilityResponse{
		Eligible:     envelope.Response.Eligible,
		TitleMessage: envelope.Response.TitleMessage,
		Description:  envelope.Response.Description,
	}, nil
}

type snappPayTokenRequest struct {
	Amount                   int64         `json:"amount"`
	CartList                 []PaymentCart `json:"cartList"`
	DiscountAmount           int64         `json:"discountAmount"`
	ExternalSourceAmount     int64         `json:"externalSourceAmount"`
	Mobile                   string        `json:"mobile"`
	ForcedPaymentMethodTypes []string      `json:"forcedPaymentMethodTypes,omitempty"`
	ReturnURL                string        `json:"returnURL"`
	TransactionID            string        `json:"transactionId"`
}

func (s *SnappPayService) RequestPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error) {
	request := snappPayTokenRequest{
		Amount:                   req.Amount,
		CartList:                 req.CartList,
		DiscountAmount:           req.DiscountAmount,
		ExternalSourceAmount:     req.ExternalSourceAmount,
		Mobile:                   req.Mobile,
		ForcedPaymentMethodTypes: req.ForcedPaymentMethodTypes,
		ReturnURL:                req.CallbackURL,
		TransactionID:            req.TransactionID,
	}
	var envelope snappPayEnvelope[struct {
		PaymentToken   string `json:"paymentToken"`
		PaymentPageURL string `json:"paymentPageUrl"`
	}]
	if err := s.doJSON(ctx, http.MethodPost, snappPayTokenPath, request, &envelope); err != nil {
		return nil, err
	}
	if !envelope.Successful {
		return nil, envelope.errorMessage("payment token request failed")
	}
	if envelope.Response.PaymentToken == "" || envelope.Response.PaymentPageURL == "" {
		return nil, errors.New("snappay token response did not contain a payment URL")
	}
	return &PaymentResponse{GatewayRef: envelope.Response.PaymentToken, PayURL: envelope.Response.PaymentPageURL}, nil
}

func (s *SnappPayService) VerifyPayment(ctx context.Context, req *VerifyRequest) (*VerifyResponse, error) {
	var envelope snappPayEnvelope[struct {
		TransactionID string `json:"transactionId"`
	}]
	if err := s.doJSON(ctx, http.MethodPost, snappPayVerifyPath, map[string]string{"paymentToken": req.GatewayRef}, &envelope); err != nil {
		return nil, err
	}
	if !envelope.Successful {
		return &VerifyResponse{Success: false, GatewayRef: req.GatewayRef}, envelope.errorMessage("verify request failed")
	}
	return &VerifyResponse{Success: true, GatewayRef: req.GatewayRef, RefNumber: envelope.Response.TransactionID}, nil
}

type snappPayStatusResponse struct {
	TransactionID string `json:"transactionId"`
	Status        string `json:"status"`
	Amount        int64  `json:"amount"`
}

func (s *SnappPayService) InquiryPayment(ctx context.Context, req *InquiryRequest) (*InquiryResponse, error) {
	token, err := s.getToken(ctx)
	if err != nil {
		return nil, err
	}
	query := url.Values{"paymentToken": {req.GatewayRef}}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+snappPayStatusPath+"?"+query.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("create snappay status request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	if s.venture != "" {
		httpReq.Header.Set("venture", s.venture)
	}
	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("snappay status request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read snappay status response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("snappay status returned HTTP %d: %s", resp.StatusCode, string(body))
	}
	var envelope snappPayEnvelope[snappPayStatusResponse]
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("parse snappay status response: %w", err)
	}
	if !envelope.Successful {
		return nil, envelope.errorMessage("status request failed")
	}
	return &InquiryResponse{
		Success:   envelope.Response.Status == "SETTLE",
		Status:    envelope.Response.Status,
		Amount:    envelope.Response.Amount,
		RefNumber: envelope.Response.TransactionID,
	}, nil
}

func (s *SnappPayService) SettlePayment(ctx context.Context, paymentToken string) (*LifecycleResponse, error) {
	return s.lifecycleRequest(ctx, snappPaySettlePath, paymentToken)
}

func (s *SnappPayService) CancelPayment(ctx context.Context, paymentToken string) (*LifecycleResponse, error) {
	return s.lifecycleRequest(ctx, snappPayCancelPath, paymentToken)
}

func (s *SnappPayService) RevertPayment(ctx context.Context, paymentToken string) (*LifecycleResponse, error) {
	return s.lifecycleRequest(ctx, snappPayRevertPath, paymentToken)
}

func (s *SnappPayService) lifecycleRequest(ctx context.Context, path, paymentToken string) (*LifecycleResponse, error) {
	var envelope snappPayEnvelope[struct {
		TransactionID string `json:"transactionId"`
	}]
	if err := s.doJSON(ctx, http.MethodPost, path, map[string]string{"paymentToken": paymentToken}, &envelope); err != nil {
		return nil, err
	}
	if !envelope.Successful {
		return nil, envelope.errorMessage("snappay lifecycle request failed")
	}
	return &LifecycleResponse{TransactionID: envelope.Response.TransactionID}, nil
}

func (s *SnappPayService) UpdatePayment(ctx context.Context, req *UpdatePaymentRequest) (*LifecycleResponse, error) {
	payload := struct {
		Amount               int64         `json:"amount"`
		CartList             []PaymentCart `json:"cartList"`
		DiscountAmount       int64         `json:"discountAmount"`
		ExternalSourceAmount int64         `json:"externalSourceAmount"`
		PaymentToken         string        `json:"paymentToken"`
	}{
		Amount: req.Amount, CartList: req.CartList, DiscountAmount: req.DiscountAmount,
		ExternalSourceAmount: req.ExternalSourceAmount, PaymentToken: req.PaymentToken,
	}
	var envelope snappPayEnvelope[struct {
		TransactionID string `json:"transactionId"`
	}]
	if err := s.doJSON(ctx, http.MethodPost, snappPayUpdatePath, payload, &envelope); err != nil {
		return nil, err
	}
	if !envelope.Successful {
		return nil, envelope.errorMessage("update request failed")
	}
	return &LifecycleResponse{TransactionID: envelope.Response.TransactionID}, nil
}

func (e snappPayEnvelope[T]) errorMessage(fallback string) error {
	if e.ErrorData != nil {
		message := e.ErrorData.Message
		if message == "" {
			message = fallback
		}
		return &SnappPayAPIError{Code: e.ErrorData.ErrorCode, Message: message}
	}
	return errors.New(fallback)
}
