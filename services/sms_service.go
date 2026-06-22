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

// SendOTP sends an OTP code to the specified phone number
func (s *SMSService) SendOTP(phone, code, firstName string) error {
	// Convert phone number: remove leading 0 if present for international format
	// SMS.ir expects format like "919xxxx904" (without country code prefix)
	mobile := phone
	if strings.HasPrefix(mobile, "0") {
		mobile = mobile[1:] // Remove leading 0
	}

	// Parse template ID
	var templateID int
	fmt.Sscanf(s.templateID, "%d", &templateID)
	if templateID == 0 {
		return fmt.Errorf("invalid template ID: %s", s.templateID)
	}

	reqBody := SendVerifyRequest{
		Mobile:     mobile,
		TemplateID: templateID,
		Parameters: []SMSParameter{
			{Name: "OTPCODE", Value: code},
			{Name: "USER", Value: firstName},
		},
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
