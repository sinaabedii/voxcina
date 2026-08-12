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

var embeddingHTTPClient = &http.Client{Timeout: 20 * time.Second}

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

// BuildVariantEmbeddingText builds the text that is embedded per color variant.
// One FAISS record is kept per variant ("{productId}:{variantId}") so KNN
// search returns variant-level hits (ColorVariantListItem) instead of whole
// products.
func BuildVariantEmbeddingText(
	productName, productDesc, brand string,
	cv models.ColorVariant,
	meta *models.VariantAIMetadata,
	productMeta *models.ProductSearchMetadata,
) string {
	var parts []string
	if strings.TrimSpace(productName) != "" {
		parts = append(parts, productName)
	}
	if strings.TrimSpace(productDesc) != "" {
		parts = append(parts, productDesc)
	}
	if strings.TrimSpace(brand) != "" {
		parts = append(parts, "Brand: "+brand)
	}
	// Variant color identity is the strongest signal for "مشکی / قرمز" queries.
	if strings.TrimSpace(cv.ColorName) != "" {
		parts = append(parts, "رنگ: "+cv.ColorName)
	}
	if strings.TrimSpace(cv.Color) != "" && cv.Color != cv.ColorName {
		parts = append(parts, "کد رنگ: "+cv.Color)
	}
	if len(cv.Sizes) > 0 {
		var sizes []string
		for _, s := range cv.Sizes {
			if strings.TrimSpace(s.Size) != "" {
				sizes = append(sizes, s.Size)
			}
		}
		if len(sizes) > 0 {
			parts = append(parts, "سایزها: "+strings.Join(sizes, "، "))
		}
	}
	// Prefer variant AI fields; fall back to product-level metadata so an
	// un-enriched variant still embeds sensibly.
	if meta != nil {
		if strings.TrimSpace(meta.ProductTypePersian) != "" {
			parts = append(parts, "نوع: "+meta.ProductTypePersian)
		} else if strings.TrimSpace(meta.ProductTypeStandard) != "" {
			parts = append(parts, "نوع: "+meta.ProductTypeStandard)
		}
		if strings.TrimSpace(meta.MaterialPersian) != "" {
			parts = append(parts, "جنس: "+meta.MaterialPersian)
		}
		if strings.TrimSpace(meta.StylePersian) != "" {
			parts = append(parts, "استایل: "+meta.StylePersian)
		}
		if strings.TrimSpace(meta.PatternPersian) != "" {
			parts = append(parts, "طرح: "+meta.PatternPersian)
		}
		if strings.TrimSpace(meta.FitType) != "" {
			parts = append(parts, "برازش: "+meta.FitType)
		}
		if strings.TrimSpace(meta.ColorFamily) != "" {
			parts = append(parts, "خانواده رنگ: "+meta.ColorFamily)
		}
		if len(meta.Keywords) > 0 {
			parts = append(parts, strings.Join(meta.Keywords, "، "))
		}
		if len(meta.Tags) > 0 {
			parts = append(parts, strings.Join(meta.Tags, "، "))
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
	}
	if productMeta != nil {
		// Fill only what the variant didn't already supply.
		if (meta == nil || len(meta.Keywords) == 0) && len(productMeta.Keywords) > 0 {
			parts = append(parts, strings.Join(productMeta.Keywords, "، "))
		}
		if (meta == nil || len(meta.Tags) == 0) && len(productMeta.Tags) > 0 {
			parts = append(parts, strings.Join(productMeta.Tags, "، "))
		}
		if (meta == nil || strings.TrimSpace(meta.MaterialPersian) == "") && strings.TrimSpace(productMeta.MaterialPersian) != "" {
			parts = append(parts, "جنس: "+productMeta.MaterialPersian)
		}
		if (meta == nil || strings.TrimSpace(meta.StylePersian) == "") && strings.TrimSpace(productMeta.StylePersian) != "" {
			parts = append(parts, "استایل: "+productMeta.StylePersian)
		}
		if (meta == nil || len(meta.OccasionTags) == 0) && len(productMeta.OccasionTags) > 0 {
			parts = append(parts, "مناسب برای: "+strings.Join(productMeta.OccasionTags, "، "))
		}
		if (meta == nil || strings.TrimSpace(meta.Gender) == "") && strings.TrimSpace(productMeta.Gender) != "" {
			parts = append(parts, "جنسیت: "+productMeta.Gender)
		}
		if strings.TrimSpace(productMeta.NamePersian) != "" {
			parts = append(parts, productMeta.NamePersian)
		}
		if strings.TrimSpace(productMeta.DescriptionPersian) != "" {
			parts = append(parts, productMeta.DescriptionPersian)
		}
	}
	return strings.Join(parts, "\n")
}

// VariantFAISSKey returns the FAISS id for a variant ("{productId}:{variantId}").
func VariantFAISSKey(productID, variantID string) string {
	if strings.TrimSpace(variantID) == "" {
		return productID
	}
	return productID + ":" + variantID
}

// ParseVariantFAISSKey splits a FAISS variant key back into product + variant.
func ParseVariantFAISSKey(key string) (string, string) {
	if i := strings.LastIndex(key, ":"); i > 0 && i+1 < len(key) {
		// product IDs are 24 hex chars, so the last colon reliably separates them.
		return key[:i], key[i+1:]
	}
	return key, ""
}
