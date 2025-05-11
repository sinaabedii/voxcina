package test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// TestAPI encapsulates the API testing functionality
type TestAPI struct {
	BaseURL     string
	Client      *http.Client
	AuthToken   string
	AdminToken  string
	TestUserID  string
	TestAdminID string
}

// NewTestAPI creates a new TestAPI instance
func NewTestAPI() *TestAPI {
	baseURL := os.Getenv("API_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080/api" // Default for local testing
	}

	return &TestAPI{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Request makes a request to the API
func (t *TestAPI) Request(method, path string, body interface{}, token string) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, t.BaseURL+path, reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create request: %w", err)
	}

	if reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := t.Client.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return resp, respBody, nil
}

// UnmarshalJSON unmarshals JSON data into the given target
func (t *TestAPI) UnmarshalJSON(data []byte, target interface{}) error {
	return json.Unmarshal(data, target)
}

// Register registers a new user
func (t *TestAPI) Register(email, password, name string) (string, string, error) {
	reqBody := map[string]interface{}{
		"email":    email,
		"password": password,
		"name":     name,
	}

	resp, body, err := t.Request(http.MethodPost, "/users/register", reqBody, "")
	if err != nil {
		return "", "", err
	}

	if resp.StatusCode != http.StatusCreated {
		return "", "", fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, body)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	userID, _ := result["id"].(string)
	token, _ := result["token"].(string)
	return userID, token, nil
}

// Login logs in a user
func (t *TestAPI) Login(email, password string) (string, error) {
	reqBody := map[string]interface{}{
		"email":    email,
		"password": password,
	}

	resp, body, err := t.Request(http.MethodPost, "/users/login", reqBody, "")
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, body)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	token, _ := result["token"].(string)
	return token, nil
}

// SetupTestUser creates a test user and saves the token
func (t *TestAPI) SetupTestUser(email, password, name string) error {
	userID, token, err := t.Register(email, password, name)
	if err != nil {
		return err
	}

	t.TestUserID = userID
	t.AuthToken = token
	return nil
}

// CleanupAfterTests performs cleanup after tests are done
func (t *TestAPI) CleanupAfterTests() {
	// Could implement deletion of test resources here if needed
	// For example, deleting test users, products, etc.
} 