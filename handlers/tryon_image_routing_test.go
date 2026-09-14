package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestDecideOpenRouterImageRoute(t *testing.T) {
	chatImage := map[string]bool{
		"google/gemini-3-pro-image":     true,
		"google/gemini-2.5-flash-image": true,
	}
	imagesAPI := map[string]bool{
		"openai/gpt-image-2.5-sunburst":   true,
		"google/gemini-3-pro-image":       true,
		"bytedance-seed/seedream-5-0-pro": true,
	}

	cases := []struct {
		model string
		want  openRouterImageRoute
	}{
		// Chat-capable wins even though the Image API could also serve it:
		// the chat path is the one this handler has always used for Gemini.
		{"google/gemini-3-pro-image", imageRouteChat},
		{"google/gemini-2.5-flash-image", imageRouteChat},
		// Absent from the chat list, present on the Image API.
		{"openai/gpt-image-2.5-sunburst", imageRouteImagesAPI},
		{"bytedance-seed/seedream-5-0-pro", imageRouteImagesAPI},
		// Known to no list: legacy chat flow so OpenRouter's own error surfaces.
		{"owner/typo-model", imageRouteUnknown},
	}

	for _, tc := range cases {
		if got := decideOpenRouterImageRoute(chatImage, imagesAPI, tc.model); got != tc.want {
			t.Errorf("route(%s) = %d, want %d", tc.model, got, tc.want)
		}
	}
}

func TestGenerateTryOnImageViaImagesAPI(t *testing.T) {
	var capturedBody map[string]interface{}
	fakeImage := testPNGBytes(t, 8, 8)
	fakeB64 := base64.StdEncoding.EncodeToString(fakeImage)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Errorf("decode request body: %v", err)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Errorf("Authorization = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"created":1,"data":[{"b64_json":"` + fakeB64 + `","media_type":"image/png"}]}`))
	}))
	t.Cleanup(server.Close)
	origURL := openRouterImagesAPIURL
	openRouterImagesAPIURL = server.URL
	t.Cleanup(func() { openRouterImagesAPIURL = origURL })

	raw, err := generateTryOnImageViaImagesAPI(
		"task-test", "test-key", "https://voxcina.com",
		"openai/gpt-image-2.5-sunburst", "try-on prompt",
		"data:image/jpeg;base64,PERSON", "data:image/jpeg;base64,GARMENT",
	)
	if err != nil {
		t.Fatalf("generateTryOnImageViaImagesAPI: %v", err)
	}
	if !bytes.Equal(raw, fakeImage) {
		t.Errorf("raw image bytes = %q", raw)
	}

	if capturedBody["model"] != "openai/gpt-image-2.5-sunburst" {
		t.Errorf("model = %v", capturedBody["model"])
	}
	if capturedBody["prompt"] != "try-on prompt" {
		t.Errorf("prompt = %v", capturedBody["prompt"])
	}
	if capturedBody["aspect_ratio"] != "3:4" {
		t.Errorf("aspect_ratio = %v, want the 3:4 the prompts promise", capturedBody["aspect_ratio"])
	}
	if n, ok := capturedBody["n"].(float64); !ok || n != 1 {
		t.Errorf("n = %v, want 1", capturedBody["n"])
	}
	refs, ok := capturedBody["input_references"].([]interface{})
	if !ok || len(refs) != 2 {
		t.Fatalf("input_references = %v, want person and garment entries", capturedBody["input_references"])
	}
	first := refs[0].(map[string]interface{})["image_url"].(map[string]interface{})["url"]
	if first != "data:image/jpeg;base64,PERSON" {
		t.Errorf("first reference url = %v", first)
	}
	second := refs[1].(map[string]interface{})["image_url"].(map[string]interface{})["url"]
	if second != "data:image/jpeg;base64,GARMENT" {
		t.Errorf("second reference url = %v", second)
	}
}

func TestGenerateTryOnImageViaImagesAPIErrors(t *testing.T) {
	cases := []struct {
		name       string
		status     int
		body       string
		wantSubstr string
	}{
		{"upstream error code", http.StatusInternalServerError, `{"error":{"code":500,"message":"boom"}}`, "سرویس پرو مجازی با خطا مواجه شد"},
		{"rate limited", http.StatusTooManyRequests, `{"error":{"code":429,"message":"rate limit exceeded"}}`, "ظرفیت سرویس پرو مجازی"},
		{"ok but empty data", http.StatusOK, `{"created":1,"data":[]}`, "تصویری توسط سرویس تولید نشد"},
		{"ok but error field", http.StatusOK, `{"error":{"code":1,"message":"internal"}}`, "سرویس پرو مجازی با خطا مواجه شد"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tc.status)
				w.Write([]byte(tc.body))
			}))
			defer server.Close()

			origURL := openRouterImagesAPIURL
			openRouterImagesAPIURL = server.URL
			t.Cleanup(func() { openRouterImagesAPIURL = origURL })

			_, err := generateTryOnImageViaImagesAPI("task-test", "k", "u", "m", "p", "a", "b")
			if err == nil {
				t.Fatal("expected an error")
			}
			if !strings.Contains(err.Error(), tc.wantSubstr) {
				t.Errorf("error = %q, want it to contain %q", err.Error(), tc.wantSubstr)
			}
		})
	}
}

func TestSaveTryOnImageBytes(t *testing.T) {
	src := testPNGBytes(t, 30, 40)

	path, err := saveTryOnImageBytes(src)
	if err != nil {
		t.Fatalf("saveTryOnImageBytes: %v", err)
	}
	t.Cleanup(func() { os.Remove(strings.TrimPrefix(path, "/")) })

	if !strings.HasPrefix(path, "/uploads/products/tryon/") || !strings.HasSuffix(path, ".jpg") {
		t.Errorf("path = %q, want it under the try-on uploads tree as jpg", path)
	}
	if _, err := os.Stat(strings.TrimPrefix(path, "/")); err != nil {
		t.Errorf("saved file missing: %v", err)
	}
}

// testPNGBytes renders a solid-colour PNG of the given size.
func testPNGBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for x := 0; x < w; x++ {
		for y := 0; y < h; y++ {
			img.Set(x, y, color.RGBA{R: 200, G: 30, B: 30, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

// The live discovery lists must keep agreeing with the routing rules: the
// Gemini family draws over chat completions, sunburst only over the Image
// API. Requires network access; skipped in offline environments.
func TestTryOnImageRouteAgainstLiveDiscovery(t *testing.T) {
	if os.Getenv("TRYON_LIVE_DISCOVERY") == "" {
		t.Skip("set TRYON_LIVE_DISCOVERY=1 to run against OpenRouter's public model lists")
	}
	ctx := context.Background()
	if got := tryOnImageRoute(ctx, "openai/gpt-image-2.5-sunburst"); got != imageRouteImagesAPI {
		t.Errorf("sunburst route = %d, want the Image API", got)
	}
	if got := tryOnImageRoute(ctx, "google/gemini-3-pro-image"); got != imageRouteChat {
		t.Errorf("nano banana Pro route = %d, want chat completions", got)
	}
}
