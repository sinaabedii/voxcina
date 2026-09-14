package services

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// FCM HTTP v1 client.
//
// One Firebase Cloud Messaging send is an OPTIMISATION on top of the inbox
// row, and — from Iranian infrastructure — a delivery that fails routinely:
// fcm.googleapis.com is reachable only through the outbound proxy the rest of
// the backend tunnels through (the same chain services/email_service.go uses:
// SMTP_PROXY || HTTPS_PROXY || HTTP_PROXY). Everything here is built so a
// failed send is cheap, logged, retried later by the push dispatcher's
// backoff, and never blocks a handler.
//
// Messages are DATA-ONLY. A message containing a "notification" block is
// drawn by Play Services itself while the app is backgrounded: onMessageReceived
// never fires, the tap cannot be routed, the badge does not move, and the
// Persian channel is not used. Everything travels in "data" — see §0 of
// BACKEND_NOTIFICATIONS.md and push/VoxcinaMessagingService.kt.

const (
	fcmScope        = "https://www.googleapis.com/auth/firebase.messaging"
	fcmSendEndpoint = "https://fcm.googleapis.com/v1/projects/%s/messages:send"
	fcmTokenURL     = "https://oauth2.googleapis.com/token"
	fcmHTTPTimeout  = 15 * time.Second
	// Refresh the cached access token five minutes before it lapses.
	fcmTokenRefreshSlack = 5 * time.Minute
)

// FCMPushMessage is one data-only push for one device token.
type FCMPushMessage struct {
	Token string
	// Data is the entire payload. Every value must be a string: FCM data
	// values are strings by definition (the app's parse coerces the rest).
	Data map[string]string
}

// FCMService talks to Firebase Cloud Messaging HTTP v1 with a service
// account. A nil *FCMService (or a service with privateServiceAccount == nil)
// is disabled: the dispatcher then leaves every row pending-retryable and the
// inbox keeps delivering.
type FCMService struct {
	projectID    string
	clientEmail  string
	privateKey   *rsa.PrivateKey
	proxyURL     string
	httpClient   *http.Client
	tokenMu      sync.Mutex
	cachedToken  string
	tokenExpires time.Time
}

// serviceAccountFile is the subset of a Firebase service-account JSON the
// client needs.
type serviceAccountFile struct {
	ProjectID   string `json:"project_id"`
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
}

// resolveOutboundProxy returns the HTTP(S) proxy for Google-bound traffic,
// using the same chain as email: SMTP_PROXY falls back to HTTPS_PROXY then
// HTTP_PROXY. An empty string means direct.
func resolveOutboundProxy() string {
	for _, name := range []string{"SMTP_PROXY", "HTTPS_PROXY", "HTTP_PROXY"} {
		if v := strings.TrimSpace(os.Getenv(name)); v != "" {
			return v
		}
	}
	return ""
}

// proxyHTTPClient builds an HTTP client that tunnels everything through the
// outbound proxy (Go's Transport speaks HTTP CONNECT for https URLs natively,
// including Proxy-Authorization from the URL userinfo).
func proxyHTTPClient(proxyURL string, timeout time.Duration) (*http.Client, error) {
	transport := &http.Transport{
		MaxIdleConns:        20,
		IdleConnTimeout:     60 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	}
	if proxyURL != "" {
		parsed, err := url.Parse(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy url: %w", err)
		}
		transport.Proxy = http.ProxyURL(parsed)
	}
	return &http.Client{Transport: transport, Timeout: timeout}, nil
}

// LoadFCMService builds the FCM client from the environment:
//
//   - FCM_CREDENTIALS_FILE — path to the service-account JSON. The file lives
//     OUTSIDE the repository tree (compose mounts it read-only into the
//     container); nothing in the repository references it by content.
//
// Returns (nil, nil) when the variable is unset or the file is simply absent —
// pushes are disabled and the system runs inbox-only, the supported
// degradation. A file that exists but is unreadable or malformed is an error
// the caller logs loudly: real misconfiguration, not absence.
func LoadFCMService() (*FCMService, error) {
	path := strings.TrimSpace(os.Getenv("FCM_CREDENTIALS_FILE"))
	if path == "" {
		log.Println("FCM: FCM_CREDENTIALS_FILE not set; pushes disabled, inbox-only mode")
		return nil, nil
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("FCM: %s does not exist; pushes disabled, inbox-only mode", path)
			return nil, nil
		}
		return nil, fmt.Errorf("FCM: reading %s failed: %w", path, err)
	}
	var account serviceAccountFile
	if err := json.Unmarshal(raw, &account); err != nil {
		return nil, fmt.Errorf("FCM: %s is not a valid service-account JSON: %w", path, err)
	}
	if account.ProjectID == "" || account.ClientEmail == "" || account.PrivateKey == "" {
		return nil, fmt.Errorf("FCM: %s is missing project_id/client_email/private_key", path)
	}
	block, _ := pem.Decode([]byte(account.PrivateKey))
	if block == nil {
		return nil, fmt.Errorf("FCM: private key in %s is not PEM-encoded", path)
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// Some exports carry PKCS#1 instead of PKCS#8.
		if rsaKey, pkcs1Err := x509.ParsePKCS1PrivateKey(block.Bytes); pkcs1Err == nil {
			key = rsaKey
		} else {
			return nil, fmt.Errorf("FCM: private key in %s is neither PKCS#8 nor PKCS#1: %w", path, err)
		}
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("FCM: private key in %s is not an RSA key", path)
	}
	proxy := resolveOutboundProxy()
	client, err := proxyHTTPClient(proxy, fcmHTTPTimeout)
	if err != nil {
		return nil, err
	}
	if proxy != "" {
		log.Printf("FCM: enabled for project %s, sending via outbound proxy", account.ProjectID)
	} else {
		log.Printf("FCM: enabled for project %s, sending DIRECTLY (no proxy env configured)", account.ProjectID)
	}
	return &FCMService{
		projectID:   account.ProjectID,
		clientEmail: account.ClientEmail,
		privateKey:  rsaKey,
		proxyURL:    proxy,
		httpClient:  client,
	}, nil
}

// Enabled reports whether this instance can send at all.
func (f *FCMService) Enabled() bool { return f != nil && f.privateKey != nil }

// FCMSendError classifies an FCM send outcome so the dispatcher can decide
// between retry, terminal failure and device-row deletion.
type FCMSendError struct {
	HTTPStatus int
	Reason     string // the FCM error code, e.g. UNREGISTERED
}

func (e *FCMSendError) Error() string { return fmt.Sprintf("fcm: HTTP %d %s", e.HTTPStatus, e.Reason) }

// IsPermanent reports errors that will not improve on retry.
func (e *FCMSendError) IsPermanent() bool {
	switch e.Reason {
	case "UNREGISTERED", "INVALID_ARGUMENT", "SENDER_ID_MISMATCH", "THIRD_PARTY_AUTH_ERROR":
		return true
	}
	return false
}

// fcmOAuthClaims is the JWT-bearer assertion for the token exchange.
type fcmOAuthClaims struct {
	jwt.RegisteredClaims
	Scope string `json:"scope,omitempty"`
}

// accessToken returns the cached or freshly exchanged OAuth2 access token.
func (f *FCMService) accessToken(ctx context.Context) (string, error) {
	f.tokenMu.Lock()
	defer f.tokenMu.Unlock()
	if f.cachedToken != "" && time.Now().Before(f.tokenExpires.Add(-fcmTokenRefreshSlack)) {
		return f.cachedToken, nil
	}
	if err := f.refreshAccessToken(ctx); err != nil {
		return "", err
	}
	return f.cachedToken, nil
}

// refreshAccessToken signs the JWT-bearer assertion and exchanges it at
// oauth2.googleapis.com. golang-jwt v5 signs RS256 with the parsed service
// account key — the same library this repo already uses for its own tokens.
func (f *FCMService) refreshAccessToken(ctx context.Context) error {
	now := time.Now()
	assertion, err := jwt.NewWithClaims(jwt.SigningMethodRS256, fcmOAuthClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    f.clientEmail,
			Audience:  jwt.ClaimStrings{fcmTokenURL},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
		Scope: fcmScope,
	}).SignedString(f.privateKey)
	if err != nil {
		return fmt.Errorf("fcm: signing oauth assertion: %w", err)
	}
	form := url.Values{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {assertion},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fcmTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := f.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fcm: oauth exchange: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if resp.StatusCode != http.StatusOK {
		return &FCMSendError{HTTPStatus: resp.StatusCode, Reason: "OAUTH_TOKEN"}
	}
	var token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &token); err != nil || token.AccessToken == "" {
		return fmt.Errorf("fcm: oauth response malformed")
	}
	f.cachedToken = token.AccessToken
	f.tokenExpires = now.Add(time.Duration(token.ExpiresIn) * time.Second)
	return nil
}

// buildFCMMessageBody marshals one data-only message. data-only: no
// "notification" key, ever — a "notification" block would be drawn by Play
// Services while the app is backgrounded and onMessageReceived would never
// fire. android.priority=high so the message passes Doze promptly.
func buildFCMMessageBody(token string, data map[string]string) ([]byte, error) {
	return json.Marshal(map[string]interface{}{
		"message": map[string]interface{}{
			"token": token,
			"data":  data,
			"android": map[string]interface{}{
				"priority": "high",
			},
		},
	})
}

// Send delivers one data-only push to one device token. Never call this with
// a "notification"-shaped payload — this package has no way to build one, by
// design.
func (f *FCMService) Send(ctx context.Context, msg FCMPushMessage) error {
	if !f.Enabled() {
		return errors.New("fcm: service disabled")
	}
	token, err := f.accessToken(ctx)
	if err != nil {
		return err
	}
	payload, err := buildFCMMessageBody(msg.Token, msg.Data)
	if err != nil {
		return fmt.Errorf("fcm: payload marshal: %w", err)
	}
	endpoint := fmt.Sprintf(fcmSendEndpoint, f.projectID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := f.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fcm: send: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 8<<10))
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 16<<10))
	reason := "UNKNOWN"
	var errBody struct {
		Error struct {
			Status  string `json:"status"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(body, &errBody) == nil && errBody.Error.Status != "" {
		reason = errBody.Error.Status
	} else if len(body) > 0 {
		reason = fmt.Sprintf("HTTP %d: %.120s", resp.StatusCode, string(body))
	}
	return &FCMSendError{HTTPStatus: resp.StatusCode, Reason: reason}
}
