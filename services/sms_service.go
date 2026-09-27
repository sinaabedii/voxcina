package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// SMSService handles SMS operations via external SMS.ir API
type SMSService struct {
	baseURL    string
	accessKey  string
	templateID string
	httpClient *http.Client
}

// SMSParameter represents a parameter for SMS template
type SMSParameter struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// SendVerifyRequest is the request body for sending verification SMS
type SendVerifyRequest struct {
	Mobile     string         `json:"mobile"`
	TemplateID int            `json:"templateId"`
	Parameters []SMSParameter `json:"parameters"`
}

// SendVerifyResponse is the response from SMS.ir API
type SendVerifyResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Data    struct {
		MessageID int64   `json:"messageId"`
		Cost      float64 `json:"cost"`
	} `json:"data"`
}

// NewSMSService creates a new SMS service instance
func NewSMSService() *SMSService {
	baseURL := os.Getenv("SMSIR_URL")
	// Remove any trailing spaces from URL
	baseURL = strings.TrimSpace(baseURL)

	return &SMSService{
		baseURL:    baseURL,
		accessKey:  os.Getenv("SMSIR_ACCESS_KEY"),
		templateID: os.Getenv("SMSIR_TEMPLATE_ID"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// normalizeMobile converts a phone number to the format SMS.ir expects
// (leading 0 stripped, e.g. "919xxxx904").
func normalizeMobile(phone string) string {
	if strings.HasPrefix(phone, "0") {
		return phone[1:]
	}
	return phone
}

// SendOTP sends an OTP code to the specified phone number
func (s *SMSService) SendOTP(phone, code, firstName string) error {
	var templateID int
	fmt.Sscanf(s.templateID, "%d", &templateID)
	if templateID == 0 {
		return fmt.Errorf("invalid template ID: %s", s.templateID)
	}

	return s.send(normalizeMobile(phone), templateID, []SMSParameter{
		{Name: "OTPCODE", Value: code},
		{Name: "USER", Value: firstName},
	})
}

// SendCartRecoveryCoupon texts a user their abandoned-cart discount voucher
// using the SMSIR_CART_RECOVERY_TEMPLATE_ID template, whose placeholders are
// #NAME#, #DISCOUNT# (percent), and #DAY# (validity in days).
func (s *SMSService) SendCartRecoveryCoupon(phone, firstName string, discountPercent, validDays int) error {
	templateIDStr := strings.TrimSpace(os.Getenv("SMSIR_CART_RECOVERY_TEMPLATE_ID"))
	var templateID int
	fmt.Sscanf(templateIDStr, "%d", &templateID)
	if templateID == 0 {
		return fmt.Errorf("invalid cart recovery template ID: %s", templateIDStr)
	}

	return s.send(normalizeMobile(phone), templateID, []SMSParameter{
		{Name: "NAME", Value: firstName},
		{Name: "DISCOUNT", Value: fmt.Sprintf("%d", discountPercent)},
		{Name: "DAY", Value: fmt.Sprintf("%d", validDays)},
	})
}

// SendOrderConfirmation texts the customer that their order was registered.
// Template 748931 ("ثبت سفارش مشتری") params: #NAME# (first name), #ORDER_NUMBER#.
// Uses SMSIR_ORDER_CONFIRM_TEMPLATE_ID. No-op if that env var is empty/unset so
// existing OTP/cart-recovery flows are unaffected when the template is not configured.
func (s *SMSService) SendOrderConfirmation(phone, firstName, orderNumber string) error {
	templateIDStr := strings.TrimSpace(os.Getenv("SMSIR_ORDER_CONFIRM_TEMPLATE_ID"))
	if templateIDStr == "" {
		return nil
	}
	var templateID int
	fmt.Sscanf(templateIDStr, "%d", &templateID)
	if templateID == 0 {
		return fmt.Errorf("invalid order confirm template ID: %s", templateIDStr)
	}
	if strings.TrimSpace(phone) == "" || strings.TrimSpace(orderNumber) == "" {
		return fmt.Errorf("phone and orderNumber are required for order confirmation SMS")
	}
	return s.send(normalizeMobile(phone), templateID, []SMSParameter{
		{Name: "NAME", Value: strings.TrimSpace(firstName)},
		{Name: "ORDER_NUMBER", Value: strings.TrimSpace(orderNumber)},
	})
}

// SendBulkRequest is the payload for the SMS.ir group/bulk send API.
type SendBulkRequest struct {
	LineNumber   int64    `json:"lineNumber"`
	MessageText  string   `json:"messageText"`
	Mobiles      []string `json:"mobiles"`
	SendDateTime *int64   `json:"sendDateTime"`
}

type SendBulkResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Data    struct {
		PackID     string  `json:"packId"`
		MessageIDs []int64 `json:"messageIds"`
		Cost       float64 `json:"cost"`
	} `json:"data"`
}

// SendAdminOrderAlert notifies shop managers one by one via the verify API.
// Template 816379 ("ثبت سفارش (اطلاع به مدیر)") param: #ORDER_NUMBER#.
// Uses SMSIR_ADMIN_ORDER_TEMPLATE_ID. Verify sends go out over SMS.ir's shared
// service lines (like OTP), so they deliver even when the account's dedicated
// bulk lines fail, and they reach blacklist-opted-out numbers. No-op if the
// template env var is unset. Every admin is attempted; the first error (if any)
// is returned.
func (s *SMSService) SendAdminOrderAlert(adminPhones []string, orderNumber string) error {
	templateIDStr := strings.TrimSpace(os.Getenv("SMSIR_ADMIN_ORDER_TEMPLATE_ID"))
	if templateIDStr == "" {
		return nil
	}
	var templateID int
	fmt.Sscanf(templateIDStr, "%d", &templateID)
	if templateID == 0 {
		return fmt.Errorf("invalid admin order template ID: %s", templateIDStr)
	}
	if strings.TrimSpace(orderNumber) == "" {
		return fmt.Errorf("orderNumber is required for admin order SMS")
	}
	orderNumber = strings.TrimSpace(orderNumber)
	seen := make(map[string]struct{}, len(adminPhones))
	var firstErr error
	for _, p := range adminPhones {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		n := normalizeMobile(p)
		if n == "" {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		if err := s.send(n, templateID, []SMSParameter{
			{Name: "ORDER_NUMBER", Value: orderNumber},
		}); err != nil {
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

func (s *SMSService) sendBulk(lineNumber int64, messageText string, mobiles []string) error {
	body := SendBulkRequest{
		LineNumber:  lineNumber,
		MessageText: messageText,
		Mobiles:     mobiles,
	}
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal bulk request: %w", err)
	}
	url := strings.TrimSpace(s.baseURL) + "/v1/send/bulk"
	url = strings.ReplaceAll(url, " ", "")
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create bulk request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-api-key", s.accessKey)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send bulk request: %w", err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read bulk response: %w", err)
	}
	var bulkResp SendBulkResponse
	if err := json.Unmarshal(respBody, &bulkResp); err != nil {
		return fmt.Errorf("failed to parse bulk response: %w, body: %s", err, string(respBody))
	}
	if bulkResp.Status != 1 {
		return fmt.Errorf("SMS bulk API error: %s (status: %d)", bulkResp.Message, bulkResp.Status)
	}
	return nil
}

// send performs the actual SMS.ir verify/pattern API call shared by every
// template-based send.
func (s *SMSService) send(mobile string, templateID int, parameters []SMSParameter) error {
	reqBody := SendVerifyRequest{
		Mobile:     mobile,
		TemplateID: templateID,
		Parameters: parameters,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Build the full URL
	url := s.baseURL + "/v1/send/verify"
	url = strings.ReplaceAll(url, " ", "") // Remove any spaces in URL

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-api-key", s.accessKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var smsResp SendVerifyResponse
	if err := json.Unmarshal(body, &smsResp); err != nil {
		return fmt.Errorf("failed to parse response: %w, body: %s", err, string(body))
	}

	if smsResp.Status != 1 {
		return fmt.Errorf("SMS API error: %s (status: %d)", smsResp.Message, smsResp.Status)
	}

	return nil
}
