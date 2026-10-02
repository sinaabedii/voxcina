package services

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestExtractJSONFromBraces(t *testing.T) {
	// Nested JSON object wrapped in markdown and text
	raw := "Here is the response:\n```json\n{\n  \"name\": \"کت بلیزر\",\n  \"details\": {\n    \"sizes\": [\"S\", \"M\"]\n  }\n}\n```\nHope this helps!"
	extracted := extractJSONFromBraces(raw)
	if extracted == "" {
		t.Fatalf("expected extracted JSON, got empty string")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(extracted), &parsed); err != nil {
		t.Fatalf("failed to parse extracted JSON: %v, extracted content: %s", err, extracted)
	}

	if parsed["name"] != "کت بلیزر" {
		t.Errorf("expected name 'کت بلیزر', got %v", parsed["name"])
	}
	details, ok := parsed["details"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected nested details map, got %T", parsed["details"])
	}
	if len(details["sizes"].([]interface{})) != 2 {
		t.Errorf("expected 2 sizes, got %v", details["sizes"])
	}
}

func TestCallStructuredRetriesOnReasoningMandatoryError(t *testing.T) {
	var callCount int32
	var secondAttemptHadReasoningExclude bool

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&callCount, 1)

		bodyBytes, _ := io.ReadAll(r.Body)
		var reqBody map[string]interface{}
		_ = json.Unmarshal(bodyBytes, &reqBody)

		if count == 1 {
			// First attempt fails with 400: Reasoning is mandatory
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":{"message":"Reasoning is mandatory for this endpoint and cannot be disabled.","code":400}}`))
			return
		}

		// Second attempt should have exclude: true
		if reasoning, ok := reqBody["reasoning"].(map[string]interface{}); ok {
			if exclude, ok := reasoning["exclude"].(bool); ok && exclude {
				secondAttemptHadReasoningExclude = true
			}
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"choices": [
				{
					"message": {
						"content": "{\"status\": \"ok\"}"
					}
				}
			],
			"usage": {
				"prompt_tokens": 10,
				"completion_tokens": 5,
				"total_tokens": 15
			}
		}`))
	}))
	defer server.Close()

	client := &OpenRouterStructuredClient{
		apiKey:     "test-key",
		baseURL:    server.URL,
		httpClient: server.Client(),
	}

	req := StructuredRequest{
		Model:    "deepseek/deepseek-r1",
		Messages: []OpenRouterMessage{{Role: "user", Content: "test"}},
	}

	resp, err := client.CallStructured(context.Background(), req)
	if err != nil {
		t.Fatalf("expected successful call after retry, got: %v", err)
	}

	if resp.Content != `{"status": "ok"}` {
		t.Errorf("expected content '{\"status\": \"ok\"}', got %s", resp.Content)
	}

	if atomic.LoadInt32(&callCount) != 2 {
		t.Errorf("expected 2 attempts, got %d", atomic.LoadInt32(&callCount))
	}

	if !secondAttemptHadReasoningExclude {
		t.Errorf("expected second attempt to have reasoning.exclude = true")
	}
}

func TestCallStructuredRetriesOnUnsupportedReasoningParam(t *testing.T) {
	var callCount int32
	var secondAttemptHadNoReasoning bool

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&callCount, 1)

		bodyBytes, _ := io.ReadAll(r.Body)
		var reqBody map[string]interface{}
		_ = json.Unmarshal(bodyBytes, &reqBody)

		if count == 1 {
			// First attempt fails because provider doesn't support reasoning parameter
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":{"message":"reasoning parameter is not supported by this provider","code":400}}`))
			return
		}

		// Second attempt should not have reasoning param
		if _, ok := reqBody["reasoning"]; !ok {
			secondAttemptHadNoReasoning = true
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"choices": [
				{
					"message": {
						"content": "{\"result\": \"success\"}"
					}
				}
			]
		}`))
	}))
	defer server.Close()

	client := &OpenRouterStructuredClient{
		apiKey:     "test-key",
		baseURL:    server.URL,
		httpClient: server.Client(),
	}

	req := StructuredRequest{
		Model:    "custom/legacy-model",
		Messages: []OpenRouterMessage{{Role: "user", Content: "test"}},
	}

	resp, err := client.CallStructured(context.Background(), req)
	if err != nil {
		t.Fatalf("expected successful call after retry, got: %v", err)
	}

	if !strings.Contains(resp.Content, "success") {
		t.Errorf("unexpected response content: %s", resp.Content)
	}

	if !secondAttemptHadNoReasoning {
		t.Errorf("expected second attempt to omit reasoning parameter")
	}
}
