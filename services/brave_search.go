package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"strings"
	"time"
)

// BraveSearchClient is a hardened client for Brave Search API.
type BraveSearchClient struct {
	apiKey   string
	baseURL  string
	client   *http.Client
}

// NewBraveSearchClient creates a new Brave Search client from env vars.
func NewBraveSearchClient() *BraveSearchClient {
	baseURL := os.Getenv("BRAVE_SEARCH_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.search.brave.com"
	}
	return &BraveSearchClient{
		apiKey:  os.Getenv("BRAVE_SEARCH_API_KEY"),
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// SearchOptions configures a Brave Search request.
type SearchOptions struct {
	Count     int
	Offset    int
	SearchLang string
	Country   string
}

// LLMContextSource represents a single source from the LLM context response.
type LLMContextSource struct {
	URL     string `json:"url"`
	Title   string `json:"title"`
	Snippet string `json:"snippet"`
	Content string `json:"content,omitempty"`
}

// LLMContextResponse is the parsed response from POST /res/v1/llm/context.
type LLMContextResponse struct {
	Success bool               `json:"success"`
	Data    []LLMContextSource `json:"data"`
	Meta    LLMContextMeta     `json:"meta"`
}

type LLMContextMeta struct {
	CreditsUsed int `json:"credits_used"`
}

// SearchLLMContext calls the Brave LLM Context API for bounded, citation-ready results.
func (c *BraveSearchClient) SearchLLMContext(ctx context.Context, query string, opts SearchOptions) (*LLMContextResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("BRAVE_SEARCH_API_KEY not set")
	}

	body := map[string]interface{}{
		"query": query,
	}
	if opts.Count > 0 {
		body["count"] = opts.Count
	} else {
		body["count"] = 5
	}
	if opts.Offset > 0 {
		body["offset"] = opts.Offset
	}
	if opts.SearchLang != "" {
		body["search_lang"] = opts.SearchLang
	}
	if opts.Country != "" {
		body["country"] = opts.Country
	}

	jsonData, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/res/v1/llm/context", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Subscription-Token", c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("brave llm context API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result LLMContextResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// WebSearchResult represents a single result from the web search API.
type WebSearchResult struct {
	URL     string `json:"url"`
	Title   string `json:"title"`
	Snippet string `json:"snippet"`
}

// WebSearchResponse is the parsed response from GET /res/v1/web/search.
type WebSearchResponse struct {
	Web struct {
		Results []WebSearchResult `json:"results"`
	} `json:"web"`
}

// SearchWeb falls back to the web search API.
func (c *BraveSearchClient) SearchWeb(ctx context.Context, query string, opts SearchOptions) ([]WebSearchResult, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("BRAVE_SEARCH_API_KEY not set")
	}

	baseURL := c.baseURL + "/res/v1/web/search"
	params := url.Values{}
	params.Set("q", query)
	if opts.Count > 0 {
		params.Set("count", fmt.Sprintf("%d", opts.Count))
	} else {
		params.Set("count", "5")
	}
	if opts.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", opts.Offset))
	}
	if opts.SearchLang != "" {
		params.Set("search_lang", opts.SearchLang)
	}
	if opts.Country != "" {
		params.Set("country", opts.Country)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Subscription-Token", c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("brave web search API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result WebSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Web.Results, nil
}

// FetchURLContent downloads and sanitizes content from a follow-up URL.
// Enforces HTTPS only, blocks private/link-local IPs, enforces response limits,
// 10s timeout, content-type check, and respects robots.txt.
func FetchURLContent(ctx context.Context, targetURL string) (string, error) {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}

	// HTTPS only
	if parsed.Scheme != "https" {
		return "", fmt.Errorf("only HTTPS URLs are allowed")
	}

	host := parsed.Hostname()
	if host == "" {
		return "", fmt.Errorf("empty hostname")
	}

	// Resolve IP and block private/link-local
	ip, err := resolveHost(host)
	if err != nil {
		return "", fmt.Errorf("resolve error: %w", err)
	}
	if ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLoopback() {
		return "", fmt.Errorf("blocked private/link-local IP: %s", ip.String())
	}

	// Check robots.txt (best-effort)
	if !robotsAllowed(ctx, host) {
		return "", fmt.Errorf("robots.txt disallows fetching %s", host)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "VoxcinaBlogBot/1.0")

	httpClient := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			// Stay on same host
			if req.Host != host {
				return fmt.Errorf("redirect to different host blocked")
			}
			return nil
		},
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Content-type check: only text/html or text/plain
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "text/html") && !strings.Contains(ct, "text/plain") {
		return "", fmt.Errorf("unsupported content type: %s", ct)
	}

	// Enforce response size limit (100KB max)
	body, err := io.ReadAll(io.LimitReader(resp.Body, 100*1024))
	if err != nil {
		return "", err
	}

	// Strip HTML tags for plain text extraction
	return stripHTML(string(body)), nil
}

// resolveHost resolves a hostname to an IP and validates it.
func resolveHost(host string) (netip.Addr, error) {
	addrs, err := net.LookupIP(host)
	if err != nil {
		return netip.Addr{}, err
	}
	if len(addrs) == 0 {
		return netip.Addr{}, fmt.Errorf("no addresses found for %s", host)
	}
	addr, err := netip.ParseAddr(addrs[0].String())
	if err != nil {
		return netip.Addr{}, fmt.Errorf("invalid IP: %s", addrs[0])
	}
	return addr, nil
}

// robotsAllowed checks if the host allows fetching (best-effort, ignores errors).
func robotsAllowed(ctx context.Context, host string) bool {
	robotsURL := fmt.Sprintf("https://%s/robots.txt", host)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, robotsURL, nil)
	if err != nil {
		return true
	}
	req.Header.Set("User-Agent", "VoxcinaBlogBot/1.0")

	resp, err := (&http.Client{Timeout: 3 * time.Second}).Do(req)
	if err != nil {
		return true // Allow by default on error
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return true
	}

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 32*1024))
	disallow := strings.Contains(strings.ToLower(string(body)), "disallow: /")
	return !disallow
}

// stripHTML removes HTML tags and decodes common entities.
func stripHTML(s string) string {
	// Simple tag removal
	var sb strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
		case !inTag:
			sb.WriteRune(r)
		}
	}
	result := sb.String()
	result = strings.ReplaceAll(result, "&amp;", "&")
	result = strings.ReplaceAll(result, "&lt;", "<")
	result = strings.ReplaceAll(result, "&gt;", ">")
	result = strings.ReplaceAll(result, "&quot;", "\"")
	result = strings.ReplaceAll(result, "&#39;", "'")
	result = strings.ReplaceAll(result, "&apos;", "'")
	return result
}
