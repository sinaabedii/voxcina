package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"backEnd/models"
)

type OpenRouterEmbeddingRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type OpenRouterEmbeddingResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
		Index     int       `json:"index"`
		Object    string    `json:"object"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

var embeddingHTTPClient = &http.Client{Timeout: 20 *time.Second}

// GenerateEmbedding calls OpenRouter's embeddings API and returns a float32 vector plus the model name used.
func GenerateEmbedding(ctx context.Context, input string) ([]float32, string, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, "", fmt.Errorf("OPENROUTER_API_KEY is not set")
	}

	model := os.Getenv("OPENROUTER_EMBEDDING_MODEL")
	if model == "" {
		return nil, "", fmt.Errorf("OPENROUTER_EMBEDDING_MODEL is not set")
	}

	reqBody := OpenRouterEmbeddingRequest{
		Model: model,
		Input: input,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/embeddings", bytes.NewBuffer(payload))
	if err != nil {
		return nil, "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	if ref := os.Getenv("APP_URL"); ref != "" {
		req.Header.Set("HTTP-Referer", ref)
	}
	req.Header.Set("X-Title", "Voxcina Product Embeddings")

	resp, err := embeddingHTTPClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("OpenRouter embeddings API error (status %d): %s", resp.StatusCode, string(body))
	}

	var parsed OpenRouterEmbeddingResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, "", err
	}

	if parsed.Error != nil {
		return nil, "", fmt.Errorf("OpenRouter embeddings error: %s", parsed.Error.Message)
	}

	if len(parsed.Data) == 0 || len(parsed.Data[0].Embedding) == 0 {
		return nil, "", fmt.Errorf("no embedding returned")
	}

	floats := parsed.Data[0].Embedding
	vec := make([]float32, len(floats))
	for i, v := range floats {
		vec[i] = float32(v)
	}

	return vec, model, nil
}

// BuildProductEmbeddingText constructs a rich text representation of a product
// from its core fields and optional AI search metadata, to be used as input
// for embedding generation.
func BuildProductEmbeddingText(
	name, description, brand string,
	meta *models.ProductSearchMetadata,
) string {
	var parts []string

	if strings.TrimSpace(name) != "" {
		parts = append(parts, name)
	}
	if strings.TrimSpace(description) != "" {
		parts = append(parts, description)
	}
	if strings.TrimSpace(brand) != "" {
		parts = append(parts, "Brand: "+brand)
	}

	if meta != nil {
		if strings.TrimSpace(meta.NamePersian) != "" {
			parts = append(parts, meta.NamePersian)
		}
		if strings.TrimSpace(meta.DescriptionPersian) != "" {
			parts = append(parts, meta.DescriptionPersian)
		}
		if len(meta.Keywords) > 0 {
			parts = append(parts, strings.Join(meta.Keywords, "، "))
		}
		if len(meta.Tags) > 0 {
			parts = append(parts, strings.Join(meta.Tags, "، "))
		}
		if strings.TrimSpace(meta.MaterialPersian) != "" {
			parts = append(parts, "جنس: "+meta.MaterialPersian)
		}
		if strings.TrimSpace(meta.StylePersian) != "" {
			parts = append(parts, "استایل: "+meta.StylePersian)
		}
		if len(meta.OccasionTags) > 0 {
			parts = append(parts, "مناسب برای: "+strings.Join(meta.OccasionTags, "، "))
		}
		if len(meta.Season) > 0 {
			parts = append(parts, "فصل: "+strings.Join(meta.Season, "، "))
		}
		if strings.TrimSpace(meta.Gender) != "" {
			parts = append(parts, "جنسیت: "+meta.Gender)
		}
		if strings.TrimSpace(meta.AgeGroup) != "" {
			parts = append(parts, "گروه سنی: "+meta.AgeGroup)
		}
	}

	return strings.Join(parts, "\n")
}
