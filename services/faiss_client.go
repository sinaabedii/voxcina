package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type FaissClient struct {
	baseURL    string
	httpClient *http.Client
}

type faissSearchRequest struct {
	Vector []float32 `json:"vector"`
	K      int       `json:"k"`
}

type faissSearchResponse struct {
	IDs []string `json:"ids"`
}

type faissUpsertRequest struct {
	ID     string    `json:"id"`
	Vector []float32 `json:"vector"`
}

// NewFaissClientFromEnv creates a FAISS client using FAISS_BASE_URL.
// If the env var is missing, it returns nil so callers can gracefully skip FAISS.
func NewFaissClientFromEnv() *FaissClient {
	base := strings.TrimSpace(os.Getenv("FAISS_BASE_URL"))
	if base == "" {
		return nil
	}

	return &FaissClient{
		baseURL: strings.TrimRight(base, "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// SearchSimilarProducts queries the FAISS service for the nearest neighbours of
// the given vector and returns product IDs in order of similarity.
func (c *FaissClient) SearchSimilarProducts(
	ctx context.Context,
	vector []float32,
	k int,
) ([]string, error) {
	if c == nil {
		return nil, fmt.Errorf("faiss client is nil")
	}
	if len(vector) == 0 || k <= 0 {
		return nil, nil
	}

	reqBody := faissSearchRequest{Vector: vector, K: k}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		"POST",
		c.baseURL+"/search",
		bytes.NewBuffer(payload),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("faiss search error: status %d", resp.StatusCode)
	}

	var parsed faissSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	return parsed.IDs, nil
}

// UpsertProductEmbedding sends or updates a single product vector in the FAISS index.
// It is best-effort: callers can ignore errors and fall back to non-vector search.
func (c *FaissClient) UpsertProductEmbedding(
	ctx context.Context,
	id string,
	vector []float32,
) error {
	if c == nil {
		return fmt.Errorf("faiss client is nil")
	}
	if strings.TrimSpace(id) == "" || len(vector) == 0 {
		return nil
	}

	reqBody := faissUpsertRequest{ID: id, Vector: vector}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		"POST",
		c.baseURL+"/upsert",
		bytes.NewBuffer(payload),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("faiss upsert error: status %d", resp.StatusCode)
	}

	return nil
}
