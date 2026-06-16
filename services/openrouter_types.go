package services

// OpenRouterRequest represents the request structure for OpenRouter API
type OpenRouterRequest struct {
	Model       string                   `json:"model"`
	Messages    []OpenRouterMessage      `json:"messages"`
	MaxTokens   int                      `json:"max_tokens,omitempty"`
	Temperature float64                  `json:"temperature,omitempty"`
}

// OpenRouterMessage represents a message in the conversation
type OpenRouterMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // Can be string or array of content parts
}

// OpenRouterResponse represents the response from OpenRouter API
type OpenRouterResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string      `json:"message"`
		Code    interface{} `json:"code"`
	} `json:"error,omitempty"`
}
