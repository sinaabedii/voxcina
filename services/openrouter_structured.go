package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
)

// OpenRouterStructuredClient wraps OpenRouter with JSON schema support and graceful fallback.
type OpenRouterStructuredClient struct {
	apiKey   string
	baseURL  string
	httpClient *http.Client
}

// NewOpenRouterStructuredClient creates a new client.
// Uses Go's default transport which automatically reads HTTPS_PROXY/HTTP_PROXY
// from environment via http.ProxyFromEnvironment — matching all other services.
func NewOpenRouterStructuredClient() *OpenRouterStructuredClient {
	return &OpenRouterStructuredClient{
		apiKey: os.Getenv("OPENROUTER_API_KEY"),
		baseURL: "https://openrouter.ai/api/v1",
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// StructuredRequest is a call to the LLM with a JSON schema for structured output.
type StructuredRequest struct {
	Model       string                 `json:"model"`
	Messages    []OpenRouterMessage    `json:"messages"`
	Schema      map[string]interface{} `json:"schema"` // JSON schema for response_format
	MaxTokens   int                    `json:"max_tokens,omitempty"`
	Temperature float64                `json:"temperature,omitempty"`
}

// StructuredResponse holds the parsed structured output.
type StructuredResponse struct {
	Content string
	Usage   struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	}
}

// defaultStructuredModel is used by CallWithSchema when no model is specified.
const defaultStructuredModel = "openai/gpt-4o-mini"

// CallWithSchema sends a single user prompt with a JSON schema and returns the parsed response.
func (c *OpenRouterStructuredClient) CallWithSchema(ctx context.Context, prompt string, schema map[string]interface{}) (*StructuredResponse, error) {
	req := StructuredRequest{
		Model:    defaultStructuredModel,
		Messages: []OpenRouterMessage{{Role: "user", Content: prompt}},
		Schema:   schema,
	}
	return c.CallStructured(ctx, req)
}

// CallWithSchemaAndModel sends a single user prompt with a JSON schema using the specified model.
func (c *OpenRouterStructuredClient) CallWithSchemaAndModel(ctx context.Context, prompt string, schema map[string]interface{}, model string) (*StructuredResponse, error) {
	if model == "" {
		model = defaultStructuredModel
	}
	req := StructuredRequest{
		Model:    model,
		Messages: []OpenRouterMessage{{Role: "user", Content: prompt}},
		Schema:   schema,
	}
	return c.CallStructured(ctx, req)
}

// CallStructured sends a request with JSON schema and falls back to brace extraction.
func (c *OpenRouterStructuredClient) CallStructured(ctx context.Context, req StructuredRequest) (*StructuredResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY not set")
	}

	if req.MaxTokens == 0 {
		req.MaxTokens = 4096
	}
	if req.Temperature == 0 {
		req.Temperature = 0.3
	}

	// Build request body with response_format if schema is provided
	body := map[string]interface{}{
		"model":       req.Model,
		"messages":    req.Messages,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
		"stream":      false,
	}
	if req.Schema != nil {
		body["response_format"] = map[string]interface{}{
			"type": "json_schema",
			"json_schema": req.Schema,
		}
	}

	jsonData, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	log.Printf("[openrouter] Request body size: %d bytes, model: %s", len(jsonData), req.Model)

	// Retry with backoff + jitter (max 3 attempts)
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			sleep := time.Duration(math.Pow(2, float64(attempt-1))*1000 + rand.Float64()*500)
			time.Sleep(sleep)
		}

		// Recreate request for each retry (body is consumed)
		log.Printf("[openrouter] Sending request (attempt %d/3)...", attempt+1)
		httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = err
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
		httpReq.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
		httpReq.Header.Set("X-Title", "Voxcina Blog AI")

		log.Printf("[openrouter] Executing HTTP request (attempt %d)...", attempt+1)
		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			log.Printf("[openrouter] HTTP request failed (attempt %d): %v", attempt+1, err)
			lastErr = err
			continue
		}
		log.Printf("[openrouter] HTTP response received (attempt %d): status %d", attempt+1, resp.StatusCode)

		// Read body with timeout — some providers send chunked responses that never close
		type bodyResult struct {
			data []byte
			err  error
		}
		bodyCh := make(chan bodyResult, 1)
		go func() {
			data, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			bodyCh <- bodyResult{data, err}
		}()

		var bodyBytes []byte
		select {
		case result := <-bodyCh:
			if result.err != nil {
				log.Printf("[openrouter] Failed to read body (attempt %d): %v", attempt+1, result.err)
				lastErr = result.err
				continue
			}
			bodyBytes = result.data
		case <-time.After(90 * time.Second):
			resp.Body.Close()
			log.Printf("[openrouter] Body read timeout after 90s (attempt %d)", attempt+1)
			lastErr = fmt.Errorf("body read timeout")
			continue
		case <-ctx.Done():
			resp.Body.Close()
			log.Printf("[openrouter] Context canceled during body read (attempt %d)", attempt+1)
			lastErr = ctx.Err()
			continue
		}
		log.Printf("[openrouter] Response body: %d bytes (attempt %d)", len(bodyBytes), attempt+1)

		// Check HTTP status before decoding
		if resp.StatusCode != 200 {
			bodyStr := string(bodyBytes)
			if len(bodyStr) > 200 {
				bodyStr = bodyStr[:200]
			}
			log.Printf("[openrouter] HTTP %d (attempt %d): %s", resp.StatusCode, attempt+1, bodyStr)
			lastErr = fmt.Errorf("OpenRouter HTTP %d: %s", resp.StatusCode, bodyStr)
			// Don't retry on client errors
			if resp.StatusCode >= 400 && resp.StatusCode < 500 {
				return nil, lastErr
			}
			continue
		}

		var openResp OpenRouterResponse
		if err := json.Unmarshal(bodyBytes, &openResp); err != nil {
			log.Printf("[openrouter] JSON decode failed (attempt %d): %v, body prefix: %s", attempt+1, err, string(bodyBytes[:min(len(bodyBytes), 200)]))
			lastErr = err
			continue
		}

		if openResp.Error != nil {
			lastErr = fmt.Errorf("OpenRouter error (code=%v): %s", openResp.Error.Code, openResp.Error.Message)
			// Don't retry on client errors
			if openResp.Error.Code != nil {
				if code, ok := openResp.Error.Code.(float64); ok {
					if code >= 400 && code < 500 {
						return nil, lastErr
					}
				}
			}
			continue
		}

		if len(openResp.Choices) == 0 {
			lastErr = fmt.Errorf("no response from AI")
			continue
		}

		content := openResp.Choices[0].Message.Content
		usage := openResp.Usage

		// Try to parse as JSON first
		var parsed interface{}
		if err := json.Unmarshal([]byte(content), &parsed); err == nil {
			return &StructuredResponse{
				Content: content,
				Usage:   struct {
					PromptTokens     int `json:"prompt_tokens"`
					CompletionTokens int `json:"completion_tokens"`
					TotalTokens      int `json:"total_tokens"`
				}{
					PromptTokens:     usage.PromptTokens,
					CompletionTokens: usage.CompletionTokens,
					TotalTokens:      usage.TotalTokens,
				},
			}, nil
		}

		// Fallback: try brace extraction
		extracted := extractJSONFromBraces(content)
		if extracted != "" {
			if err := json.Unmarshal([]byte(extracted), &parsed); err == nil {
				return &StructuredResponse{
					Content: extracted,
					Usage: struct {
						PromptTokens     int `json:"prompt_tokens"`
						CompletionTokens int `json:"completion_tokens"`
						TotalTokens      int `json:"total_tokens"`
					}{
						PromptTokens:     usage.PromptTokens,
						CompletionTokens: usage.CompletionTokens,
						TotalTokens:      usage.TotalTokens,
					},
				}, nil
			}
		}

		// Return raw content if all parsing fails
		return &StructuredResponse{
			Content: content,
			Usage: struct {
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
				TotalTokens      int `json:"total_tokens"`
			}{
				PromptTokens:     usage.PromptTokens,
				CompletionTokens: usage.CompletionTokens,
				TotalTokens:      usage.TotalTokens,
			},
		}, nil
	}

	return nil, fmt.Errorf("all retries exhausted: %w", lastErr)
}

// extractJSONFromBraces extracts the first valid JSON object from content.
func extractJSONFromBraces(content string) string {
	content = strings.TrimSpace(content)
	// Remove markdown code blocks
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	for i := 0; i < len(content); i++ {
		if content[i] == '{' {
			for j := i + 1; j < len(content) && j-i < 10000; j++ {
				if content[j] == '}' {
					candidate := content[i : j+1]
					var tmp interface{}
					if err := json.Unmarshal([]byte(candidate), &tmp); err == nil {
						return candidate
					}
					break
				}
			}
		}
	}
	return ""
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
