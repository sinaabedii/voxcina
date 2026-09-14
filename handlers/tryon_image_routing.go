package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// A resolved try-on model is drawn through one of two OpenRouter APIs. The
// chat-completions call this handler has always made works only for models
// whose endpoints list image among their chat OUTPUT modalities (the Gemini
// "nano banana" family). Models like openai/gpt-image-2.5-sunburst answer the
// same chat endpoint with a 404 — "No endpoints found that support the
// requested output modalities: image, text" — because OpenRouter serves their
// image generation exclusively through the dedicated Image API
// (POST /api/v1/images, prompt + input_references + b64_json response).
// Sending every model down the chat path made those admin selections fail
// with "سرویس پرو مجازی با خطا مواجه شد (کد 404)".
type openRouterImageRoute int

const (
	// imageRouteChat keeps the existing chat/completions flow.
	imageRouteChat openRouterImageRoute = iota
	// imageRouteImagesAPI draws through POST /api/v1/images.
	imageRouteImagesAPI
	// imageRouteUnknown means discovery gave no answer for this model; the
	// chat flow is attempted anyway, preserving the legacy behaviour and its
	// error reporting for genuinely misconfigured names.
	imageRouteUnknown
)

// Discovery endpoints are public; only generation needs the API key. Swapped
// in tests.
var (
	openRouterModelsListURL      = "https://openrouter.ai/api/v1/models"
	openRouterImagesModelsURL    = "https://openrouter.ai/api/v1/images/models"
	openRouterChatCompletionsURL = "https://openrouter.ai/api/v1/chat/completions"
	openRouterImagesAPIURL       = "https://openrouter.ai/api/v1/images"
)

// openRouterImageCapabilities is the two public model lists distilled to the
// one fact each contributes: whether a model can return images over chat
// completions, and whether it is drawable through the Image API.
type openRouterImageCapabilities struct {
	fetchedAt time.Time
	chatImage map[string]bool
	imagesAPI map[string]bool
}

var (
	openRouterCapabilityCache sync.Mutex
	openRouterCapabilities    *openRouterImageCapabilities
)

const openRouterCapabilityTTL = 10 * time.Minute

// decideOpenRouterImageRoute picks the generation API from discovery data.
// Chat-capable wins so models served by both APIs keep the long-proven chat
// path; the Image API is the fallback for images-only models, not a rewrite
// of the ones that already work.
func decideOpenRouterImageRoute(chatImage, imagesAPI map[string]bool, model string) openRouterImageRoute {
	if chatImage[model] {
		return imageRouteChat
	}
	if imagesAPI[model] {
		return imageRouteImagesAPI
	}
	return imageRouteUnknown
}

// tryOnImageRoute resolves the route for a model through the cached discovery
// lists. A discovery failure is not fatal: it logs and returns unknown, which
// runs the legacy chat flow, and the next request re-fetches.
func tryOnImageRoute(ctx context.Context, model string) openRouterImageRoute {
	caps, err := fetchOpenRouterImageCapabilities(ctx)
	if err != nil {
		fmt.Printf("[tryon] model discovery failed (%v) — falling back to chat routing for %s\n", err, model)
		return imageRouteUnknown
	}
	return decideOpenRouterImageRoute(caps.chatImage, caps.imagesAPI, model)
}

func fetchOpenRouterImageCapabilities(ctx context.Context) (*openRouterImageCapabilities, error) {
	openRouterCapabilityCache.Lock()
	defer openRouterCapabilityCache.Unlock()

	if openRouterCapabilities != nil && time.Since(openRouterCapabilities.fetchedAt) < openRouterCapabilityTTL {
		return openRouterCapabilities, nil
	}

	chatImage, err := fetchChatImageCapableModels(ctx)
	if err != nil {
		return nil, err
	}
	imagesAPI, err := fetchImagesAPIModels(ctx)
	if err != nil {
		return nil, err
	}

	openRouterCapabilities = &openRouterImageCapabilities{
		fetchedAt: time.Now(),
		chatImage: chatImage,
		imagesAPI: imagesAPI,
	}
	return openRouterCapabilities, nil
}

// fetchChatImageCapableModels reads the general model list and keeps the ids
// whose chat output modalities include "image".
func fetchChatImageCapableModels(ctx context.Context) (map[string]bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, openRouterModelsListURL, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("models list returned %d", resp.StatusCode)
	}

	var payload struct {
		Data []struct {
			ID           string `json:"id"`
			Architecture struct {
				OutputModalities []string `json:"output_modalities"`
			} `json:"architecture"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	result := make(map[string]bool, len(payload.Data))
	for _, m := range payload.Data {
		for _, modality := range m.Architecture.OutputModalities {
			if modality == "image" {
				result[m.ID] = true
				break
			}
		}
	}
	return result, nil
}

// fetchImagesAPIModels reads the Image API discovery list.
func fetchImagesAPIModels(ctx context.Context) (map[string]bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, openRouterImagesModelsURL, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("images models list returned %d", resp.StatusCode)
	}

	var payload struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	result := make(map[string]bool, len(payload.Data))
	for _, m := range payload.Data {
		result[m.ID] = true
	}
	return result, nil
}

type openRouterImagesAPIResponse struct {
	Created int64 `json:"created"`
	Data    []struct {
		B64JSON   string `json:"b64_json"`
		MediaType string `json:"media_type"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// generateTryOnImageViaImagesAPI draws the try-on through OpenRouter's Image
// API. The request carries only the parameters every images-list model
// accepts (prompt, n, aspect_ratio, input_references); model-specific knobs
// like sunburst's quality tiers are deliberately omitted so one body fits all
// of them. Returns the raw image bytes; errors carry the Persian message the
// task reports to the user.
func generateTryOnImageViaImagesAPI(taskID, apiKey, appURL, model, prompt, personDataURL, garmentDataURL string) ([]byte, error) {
	requestBody := map[string]interface{}{
		"model":  model,
		"prompt": prompt,
		"n":      1,
		// The prompts below promise a 3:4 portrait; asking here means the
		// drawing starts in the right shape instead of being cropped to it.
		"aspect_ratio": "3:4",
		"input_references": []map[string]interface{}{
			{"type": "image_url", "image_url": map[string]string{"url": personDataURL}},
			{"type": "image_url", "image_url": map[string]string{"url": garmentDataURL}},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Printf("[tryon-%s] images-api marshal error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطای داخلی")
	}

	httpReq, err := http.NewRequest(http.MethodPost, openRouterImagesAPIURL, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("[tryon-%s] images-api NewRequest error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطای داخلی")
	}
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("HTTP-Referer", appURL)
	httpReq.Header.Set("X-Title", "Voxcina Virtual Try-On")

	fmt.Printf("[tryon-%s] sending request to OpenRouter Image API...\n", taskID)
	client := &http.Client{Timeout: 180 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		fmt.Printf("[tryon-%s] OpenRouter Image API request error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطا در ارتباط با سرویس پرو مجازی")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[tryon-%s] images-api read response error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطا در دریافت پاسخ")
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[tryon-%s] OpenRouter Image API non-OK: %d body: %s\n", taskID, resp.StatusCode, string(body)[:min(len(body), 500)])
		if resp.StatusCode == http.StatusRequestEntityTooLarge {
			return nil, fmt.Errorf("حجم تصاویر ارسالی بیش از حد مجاز است")
		}
		errMsg := fmt.Sprintf("سرویس پرو مجازی با خطا مواجه شد (کد %d)", resp.StatusCode)
		bodyStr := string(body)
		if strings.Contains(bodyStr, "limit exceeded") || strings.Contains(bodyStr, "rate") {
			errMsg = "ظرفیت سرویس پرو مجازی به پایان رسیده است. لطفاً بعداً تلاش کنید."
		}
		return nil, fmt.Errorf("%s", errMsg)
	}

	var apiResp openRouterImagesAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		fmt.Printf("[tryon-%s] images-api unmarshal error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطا در پردازش پاسخ")
	}
	if apiResp.Error != nil {
		fmt.Printf("[tryon-%s] OpenRouter Image API error: %s\n", taskID, apiResp.Error.Message)
		return nil, fmt.Errorf("سرویس پرو مجازی با خطا مواجه شد")
	}
	if len(apiResp.Data) == 0 || apiResp.Data[0].B64JSON == "" {
		fmt.Printf("[tryon-%s] images-api returned no image\n", taskID)
		return nil, fmt.Errorf("تصویری توسط سرویس تولید نشد")
	}

	raw, err := base64.StdEncoding.DecodeString(apiResp.Data[0].B64JSON)
	if err != nil {
		fmt.Printf("[tryon-%s] images-api base64 decode error: %v\n", taskID, err)
		return nil, fmt.Errorf("خطا در پردازش تصویر تولیدشده")
	}
	return raw, nil
}

// saveTryOnImageBytes crops to the 3:4 showcase ratio and writes the image
// under the try-on uploads tree. Both generation paths converge here.
func saveTryOnImageBytes(rawData []byte) (string, error) {
	croppedData, _, err := cropToAspectRatio(rawData, 3, 4)
	if err != nil {
		return "", fmt.Errorf("crop error: %v", err)
	}

	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := fmt.Sprintf("%s/%d.jpg", uploadDir, time.Now().UnixNano())
	if err := os.WriteFile(filename, croppedData, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}

	return "/" + filename, nil
}
