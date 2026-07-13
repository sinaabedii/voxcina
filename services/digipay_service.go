package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

const (
	digipayAuthURL     = "/digipay/api/oauth/token"
	digipayTicketURL   = "/digipay/api/tickets/business?type=11"
	digipayVerifyURL   = "/digipay/api/purchases/verify"
	digipayInquiryURL  = "/digipay/api/orders"
	digipayAPIVersion  = "2022-02-02"
)

type DigiPayService struct {
	clientID     string
	clientSecret string
	bodyUsername string
	bodyPassword string
	baseURL      string
	httpClient   *http.Client

	mu           sync.RWMutex
	token        string
	tokenExpiry  time.Time
	sfGroup      singleflight.Group
}

func NewDigiPayService() *DigiPayService {
	baseURL := os.Getenv("DIGIPAY_BASE_URL")
	if baseURL == "" {
		baseURL = "https://uat.mydigipay.info"
	}

	clientID := os.Getenv("DIGIPAY_CLIENT_ID")
	clientSecret := os.Getenv("DIGIPAY_CLIENT_SECRET")

	bodyUser := os.Getenv("DIGIPAY_USERNAME")
	if bodyUser == "" {
		bodyUser = clientID
	}
	bodyPass := os.Getenv("DIGIPAY_PASSWORD")
	if bodyPass == "" {
		bodyPass = clientSecret
	}

	return &DigiPayService{
		clientID:     clientID,
		clientSecret: clientSecret,
		bodyUsername: bodyUser,
		bodyPassword: bodyPass,
		baseURL:      baseURL,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (d *DigiPayService) Name() string {
	return "digipay"
}

func (d *DigiPayService) getToken(ctx context.Context) (string, error) {
	d.mu.RLock()
	if d.token != "" && time.Now().Add(5*time.Minute).Before(d.tokenExpiry) {
		token := d.token
		d.mu.RUnlock()
		return token, nil
	}
	d.mu.RUnlock()

	v, err, _ := d.sfGroup.Do("digipay-token", func() (interface{}, error) {
		token, expiry, err := d.fetchToken(ctx)
		if err != nil {
			return "", err
		}
		d.mu.Lock()
		d.token = token
		d.tokenExpiry = expiry
		d.mu.Unlock()
		return token, nil
	})

	if err != nil {
		return "", err
	}
	return v.(string), nil
}

type digipayTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func (d *DigiPayService) fetchToken(ctx context.Context) (string, time.Time, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	w.WriteField("username", d.bodyUsername)
	w.WriteField("password", d.bodyPassword)
	w.WriteField("grant_type", "password")
	w.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.baseURL+digipayAuthURL, &buf)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.SetBasicAuth(d.clientID, d.clientSecret)

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", time.Time{}, fmt.Errorf("token request returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var tokenResp digipayTokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		return "", time.Time{}, fmt.Errorf("failed to parse token response: %w", err)
	}

	expiry := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
	return tokenResp.AccessToken, expiry, nil
}

type digipayTicketRequest struct {
	CellNumber     string `json:"cellNumber"`
	Amount         int64  `json:"amount"`
	ProviderID     string `json:"providerId"`
	CallbackURL    string `json:"callbackUrl"`
	AdditionalInfo map[string]int `json:"additionalInfo"`
}

type digipayResult struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Level   string `json:"level"`
}

type digipayTicketResponse struct {
	Ticket      string        `json:"ticket"`
	Result      digipayResult `json:"result"`
	RedirectURL string        `json:"redirectUrl"`
}

func (d *DigiPayService) RequestPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error) {
	token, err := d.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	ticketReq := digipayTicketRequest{
		CellNumber:  req.Mobile,
		Amount:      req.Amount,
		ProviderID:  req.ProviderID,
		CallbackURL: req.CallbackURL,
		AdditionalInfo: map[string]int{
			"preferredGateway": 2, // IPG direct
		},
	}

	bodyJSON, err := json.Marshal(ticketReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ticket request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, d.baseURL+digipayTicketURL, bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to create ticket request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Agent", "WEB")
	httpReq.Header.Set("Digipay-Version", digipayAPIVersion)

	resp, err := d.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ticket request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read ticket response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ticket request returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var ticketResp digipayTicketResponse
	if err := json.Unmarshal(respBody, &ticketResp); err != nil {
		return nil, fmt.Errorf("failed to parse ticket response: %w", err)
	}

	if ticketResp.Result.Status != 0 {
		return nil, fmt.Errorf("digipay ticket creation failed: %s", ticketResp.Result.Message)
	}

	return &PaymentResponse{
		GatewayRef: ticketResp.Ticket,
		PayURL:     ticketResp.RedirectURL,
	}, nil
}

type digipayVerifyResponse struct {
	Result         digipayResult `json:"result"`
	Ticket         string        `json:"ticket"`
	Amount         int64         `json:"amount"`
	TrackingCode   string        `json:"trackingCode"`
	RRN            string        `json:"rrn"`
	Psp            string        `json:"psp"`
	CardNumber     string        `json:"cardNumber"`
	CardHolderName string        `json:"cardHolderName"`
}

func (d *DigiPayService) VerifyPayment(ctx context.Context, req *VerifyRequest) (*VerifyResponse, error) {
	token, err := d.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	verifyURL := fmt.Sprintf("%s%s?type=%d", d.baseURL, digipayVerifyURL, req.CallbackType)

	verifyTracking := req.TrackingCode
	if verifyTracking == "" {
		verifyTracking = req.GatewayRef
	}

	verifyBody, err := json.Marshal(map[string]string{
		"trackingCode": verifyTracking,
		"providerId":   req.ProviderID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal verify body: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, verifyURL, bytes.NewReader(verifyBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create verify request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Agent", "WEB")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Digipay-Version", digipayAPIVersion)

	resp, err := d.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("verify request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read verify response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("verify request returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var verifyResp digipayVerifyResponse
	if err := json.Unmarshal(respBody, &verifyResp); err != nil {
		return nil, fmt.Errorf("failed to parse verify response: %w", err)
	}

	success := verifyResp.Result.Status == 0

	return &VerifyResponse{
		Success:    success,
		RefNumber:  verifyResp.TrackingCode,
		Amount:     verifyResp.Amount,
		GatewayRef: verifyResp.Ticket,
	}, nil
}

type digipayInquiryResponse struct {
	Result       digipayResult `json:"result"`
	Ticket       string        `json:"ticket"`
	Amount       int64         `json:"amount"`
	TrackingCode string        `json:"trackingCode"`
	Status       string        `json:"status"`
	RRN          string        `json:"rrn"`
	Psp          string        `json:"psp"`
	CreatedAt    digipayTime   `json:"createdAt"`
	PaidAt       digipayTime   `json:"paidAt"`
}

type digipayTime struct {
	Date         string `json:"date"`
	Timezone     string `json:"timezone"`
	TimezoneType int    `json:"timezone_type"`
}

func (d *DigiPayService) InquiryPayment(ctx context.Context, req *InquiryRequest) (*InquiryResponse, error) {
	token, err := d.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	inquiryURL := fmt.Sprintf("%s%s/%s", d.baseURL, digipayInquiryURL, url.PathEscape(req.GatewayRef))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, inquiryURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create inquiry request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Agent", "WEB")

	resp, err := d.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("inquiry request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read inquiry response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("inquiry request returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var inquiryResp digipayInquiryResponse
	if err := json.Unmarshal(respBody, &inquiryResp); err != nil {
		return nil, fmt.Errorf("failed to parse inquiry response: %w", err)
	}

	return &InquiryResponse{
		Success:   inquiryResp.Result.Status == 0,
		Status:    inquiryResp.Status,
		Amount:    inquiryResp.Amount,
		RefNumber: inquiryResp.TrackingCode,
	}, nil
}
