package handlers

import (
	"backEnd/utils"
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"regexp"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"golang.org/x/image/webp"
	xdraw "golang.org/x/image/draw"
)

const tryOnModel = "google/gemini-2.5-flash-image"
const tryOnMaxImageDimension = 1024
const tryOnImageQuality = 85
const tryOnTaskTTL = 30 * time.Minute
const tryOnCleanupInterval = 5 * time.Minute

const tryOnPromptUpper = "Replace upper garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural armpit and chest folds matching light direction. Ensure shoulder seams align with natural shoulders and collar sits naturally at neckline. No warping, bleeding, or artifacts. Output only image."

const tryOnPromptLower = "Replace lower garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural waistband and knee folds matching light direction. Ensure waist transition is seamless with realistic drape around hips and thighs. No warping, bleeding, or artifacts. Output only image."

const tryOnPromptDress = "Replace full-body garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural folds at shoulders, chest, and waist matching light direction. Ensure the garment wraps naturally around torso and drapes realistically over hips. No warping, bleeding, or artifacts. Output only image."

func getTryOnPrompt(garmentType string) string {
	switch garmentType {
	case "lower_body":
		return tryOnPromptLower
	case "dresses":
		return tryOnPromptDress
	default:
		return tryOnPromptUpper
	}
}

func tryOnDebug(format string, args ...interface{}) {
	if os.Getenv("TRYON_DEBUG") == "true" {
		fmt.Printf(format+"\n", args...)
	}
}

type tryOnTask struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"` // "processing", "done", "error"
	Image     string    `json:"image,omitempty"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

var tryOnTasks sync.Map

func init() {
	go cleanupTryOnTasks()
}

func generateTryOnTaskID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func cleanupTryOnTasks() {
	ticker := time.NewTicker(tryOnCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-tryOnTaskTTL)
		var removed int
		tryOnTasks.Range(func(key, value interface{}) bool {
			task := value.(*tryOnTask)
			if task.CreatedAt.Before(cutoff) {
				tryOnTasks.Delete(key)
				removed++
			}
			return true
		})
		if removed > 0 {
			fmt.Printf("[tryon-cleanup] removed %d stale tasks\n", removed)
		}
	}
}

func VirtualTryOn(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[tryon] --- VirtualTryOn START ---")

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		fmt.Printf("[tryon] ParseMultipartForm error: %v\n", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "حداکثر حجم آپلود ۱۰ مگابایت است")
		return
	}
	fmt.Println("[tryon] form parsed OK")

	personFile, _, err := r.FormFile("person_image")
	if err != nil {
		fmt.Printf("[tryon] person_image missing: %v\n", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "تصویر شخص الزامی است")
		return
	}
	defer personFile.Close()
	fmt.Println("[tryon] person_image received")

	garmentURL := r.FormValue("garment_image_url")
	var garmentBytes []byte
	if garmentURL != "" {
		fmt.Printf("[tryon] fetching garment from URL: %s\n", garmentURL)
		garmentBytes, err = fetchImageFromURL(garmentURL)
		if err != nil {
			fmt.Printf("[tryon] fetch garment URL error: %v\n", err)
			utils.ErrorResponse(w, http.StatusBadRequest, "خطا در دریافت تصویر لباس")
			return
		}
		fmt.Printf("[tryon] fetched garment image size: %d bytes\n", len(garmentBytes))
	} else {
		garmentFile, _, err := r.FormFile("garment_image")
		if err != nil {
			fmt.Printf("[tryon] garment_image missing: %v\n", err)
			utils.ErrorResponse(w, http.StatusBadRequest, "تصویر لباس الزامی است")
			return
		}
		defer garmentFile.Close()
		fmt.Println("[tryon] garment_image received")
		garmentBytes, err = io.ReadAll(garmentFile)
		if err != nil {
			fmt.Printf("[tryon] read garment bytes error: %v\n", err)
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر لباس")
			return
		}
		fmt.Printf("[tryon] garment image size: %d bytes\n", len(garmentBytes))
	}

	personBytes, err := io.ReadAll(personFile)
	if err != nil {
		fmt.Printf("[tryon] read person bytes error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر شخص")
		return
	}
	fmt.Printf("[tryon] person image size: %d bytes\n", len(personBytes))

	garmentType := r.FormValue("garment_type")
	if garmentType == "" {
		garmentType = "upper_body"
	}
	fmt.Printf("[tryon] garment_type: %s\n", garmentType)

	taskID := generateTryOnTaskID()
	task := &tryOnTask{
		ID:        taskID,
		Status:    "processing",
		CreatedAt: time.Now(),
	}
	tryOnTasks.Store(taskID, task)
	fmt.Printf("[tryon] task %s created, starting goroutine\n", taskID)

	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				fmt.Printf("[tryon-%s] PANIC: %v\n%s\n", taskID, rec, string(debug.Stack()))
				task.Status = "error"
				task.Error = "خطای داخلی سرور"
				tryOnTasks.Store(taskID, task)
			}
		}()

		if isTryOnDevMode() {
			fmt.Printf("[tryon-%s] DEV MODE: returning placeholder image\n", taskID)
			task.Status = "done"
			task.Image = getDevPlaceholderPath()
			tryOnTasks.Store(taskID, task)
			return
		}

		fmt.Printf("[tryon-%s] resizing images...\n", taskID)
		resizedPerson, _, err := resizeImageToMaxDimension(personBytes, tryOnMaxImageDimension)
		if err != nil {
			fmt.Printf("[tryon-%s] resize person error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش تصویر شخص"
			tryOnTasks.Store(taskID, task)
			return
		}
		resizedGarment, _, err := resizeImageToMaxDimension(garmentBytes, tryOnMaxImageDimension)
		if err != nil {
			fmt.Printf("[tryon-%s] resize garment error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش تصویر لباس"
			tryOnTasks.Store(taskID, task)
			return
		}
		fmt.Printf("[tryon-%s] resized person=%d garment=%d bytes\n", taskID, len(resizedPerson), len(resizedGarment))

		prompt := getTryOnPrompt(garmentType)

		personBase64 := base64.StdEncoding.EncodeToString(resizedPerson)
		garmentBase64 := base64.StdEncoding.EncodeToString(resizedGarment)

		personDataURL := fmt.Sprintf("data:image/jpeg;base64,%s", personBase64)
		garmentDataURL := fmt.Sprintf("data:image/jpeg;base64,%s", garmentBase64)

		requestBody := map[string]interface{}{
			"model": tryOnModel,
			"messages": []map[string]interface{}{
				{
					"role": "user",
					"content": []map[string]interface{}{
						{
							"type": "text",
							"text": prompt,
						},
						{
							"type": "image_url",
							"image_url": map[string]string{
								"url": personDataURL,
							},
						},
						{
							"type": "image_url",
							"image_url": map[string]string{
								"url": garmentDataURL,
							},
						},
					},
				},
			},
			"modalities": []string{"image", "text"},
		}

		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			fmt.Printf("[tryon-%s] json marshal error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطای داخلی"
			tryOnTasks.Store(taskID, task)
			return
		}

		apiKey := os.Getenv("OPENROUTER_API_KEY")
		if apiKey == "" {
			fmt.Printf("[tryon-%s] OPENROUTER_API_KEY not set\n", taskID)
			task.Status = "error"
			task.Error = "سرویس پرو مجازی در حال حاضر در دسترس نیست"
			tryOnTasks.Store(taskID, task)
			return
		}
		appURL := os.Getenv("APP_URL")

		httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			fmt.Printf("[tryon-%s] http.NewRequest error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطای داخلی"
			tryOnTasks.Store(taskID, task)
			return
		}

		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("HTTP-Referer", appURL)
		httpReq.Header.Set("X-Title", "Voxcina Virtual Try-On")

		fmt.Printf("[tryon-%s] sending request to OpenRouter...\n", taskID)
		client := &http.Client{Timeout: 180 * time.Second}
		resp, err := client.Do(httpReq)
		if err != nil {
			fmt.Printf("[tryon-%s] OpenRouter request error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در ارتباط با سرویس پرو مجازی"
			tryOnTasks.Store(taskID, task)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("[tryon-%s] read response body error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در دریافت پاسخ"
			tryOnTasks.Store(taskID, task)
			return
		}

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("[tryon-%s] OpenRouter non-OK: %d body: %s\n", taskID, resp.StatusCode, string(body)[:min(len(body), 500)])
			errMsg := fmt.Sprintf("سرویس پرو مجازی با خطا مواجه شد (کد %d)", resp.StatusCode)
			bodyStr := string(body)
			if strings.Contains(bodyStr, "limit exceeded") || strings.Contains(bodyStr, "rate") {
				errMsg = "ظرفیت سرویس پرو مجازی به پایان رسیده است. لطفاً بعداً تلاش کنید."
			}
			task.Status = "error"
			task.Error = errMsg
			tryOnTasks.Store(taskID, task)
			return
		}

		var orResp openRouterTryOnResponse
		if err := json.Unmarshal(body, &orResp); err != nil {
			fmt.Printf("[tryon-%s] json unmarshal error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش پاسخ"
			tryOnTasks.Store(taskID, task)
			return
		}

		if orResp.Error != nil {
			fmt.Printf("[tryon-%s] OpenRouter API error: %s\n", taskID, orResp.Error.Message)
			task.Status = "error"
			task.Error = "سرویس پرو مجازی با خطا مواجه شد"
			tryOnTasks.Store(taskID, task)
			return
		}

		if len(orResp.Choices) == 0 {
			fmt.Printf("[tryon-%s] no choices in response\n", taskID)
			task.Status = "error"
			task.Error = "پاسخی از سرویس دریافت نشد"
			tryOnTasks.Store(taskID, task)
			return
		}

		rawContent := orResp.Choices[0].Message.Content

		var savedPath string

		if len(orResp.Choices[0].Message.Images) > 0 {
			imageURL := orResp.Choices[0].Message.Images[0].ImageURL.URL
			if imageURL != "" {
				savedPath, err = saveTryOnImage(imageURL)
				if err != nil {
					fmt.Printf("[tryon-%s] save error (from images field): %v\n", taskID, err)
					task.Status = "error"
					task.Error = "خطا در ذخیره تصویر"
					tryOnTasks.Store(taskID, task)
					return
				}
			}
		}

		if savedPath == "" {
			imageDataURL := extractBase64Image(rawContent)
			if imageDataURL == "" {
				fmt.Printf("[tryon-%s] no image in response\n", taskID)
				task.Status = "error"
				task.Error = "تصویری توسط سرویس تولید نشد"
				tryOnTasks.Store(taskID, task)
				return
			}
			savedPath, err = saveTryOnImage(imageDataURL)
			if err != nil {
				fmt.Printf("[tryon-%s] save error (from content): %v\n", taskID, err)
				task.Status = "error"
				task.Error = "خطا در ذخیره تصویر"
				tryOnTasks.Store(taskID, task)
				return
			}
		}

		fmt.Printf("[tryon-%s] saved to: %s\n", taskID, savedPath)
		task.Status = "done"
		task.Image = savedPath
		tryOnTasks.Store(taskID, task)
		fmt.Printf("[tryon-%s] task completed\n", taskID)
	}()

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"task_id": taskID,
	})
	fmt.Printf("[tryon] --- VirtualTryOn END (task=%s) ---\n", taskID)
}

func VirtualTryOnStatus(w http.ResponseWriter, r *http.Request) {
	taskID := r.URL.Query().Get("task_id")
	if taskID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "task_id الزامی است")
		return
	}

	task, ok := loadTryOnTask(taskID)
	if !ok {
		utils.ErrorResponse(w, http.StatusNotFound, "تسک یافت نشد")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status": task.Status,
		"image":  task.Image,
		"error":  task.Error,
	})
}

func VirtualTryOnStatusStream(w http.ResponseWriter, r *http.Request) {
	taskID := r.URL.Query().Get("task_id")
	if taskID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "task_id الزامی است")
		return
	}

	task, ok := loadTryOnTask(taskID)
	if !ok {
		utils.ErrorResponse(w, http.StatusNotFound, "تسک یافت نشد")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	sendTaskEvent := func(t *tryOnTask) {
		data, _ := json.Marshal(map[string]string{
			"status": t.Status,
			"image":  t.Image,
			"error":  t.Error,
		})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	if task.Status != "processing" {
		sendTaskEvent(task)
		return
	}

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	timeout := time.After(5 * time.Minute)

	for {
		select {
		case <-r.Context().Done():
			return
		case <-timeout:
			sendTaskEvent(&tryOnTask{Status: "error", Error: "زمان انتظار به پایان رسید"})
			return
		case <-ticker.C:
			t, ok := loadTryOnTask(taskID)
			if !ok {
				sendTaskEvent(&tryOnTask{Status: "error", Error: "تسک یافت نشد"})
				return
			}
			if t.Status != "processing" {
				sendTaskEvent(t)
				return
			}
		}
	}
}

func loadTryOnTask(taskID string) (*tryOnTask, bool) {
	val, ok := tryOnTasks.Load(taskID)
	if !ok {
		return nil, false
	}
	task := val.(*tryOnTask)
	if time.Since(task.CreatedAt) > tryOnTaskTTL {
		tryOnTasks.Delete(taskID)
		return nil, false
	}
	return task, true
}

type openRouterTryOnResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
			Images  []struct {
				ImageURL struct {
					URL string `json:"url"`
				} `json:"image_url"`
			} `json:"images"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

var base64ImageRegex = regexp.MustCompile(`data:image/\w+;base64,[A-Za-z0-9+/=\s]+`)

func extractBase64Image(content string) string {
	match := base64ImageRegex.FindString(content)
	if match != "" {
		return strings.Join(strings.Fields(match), "")
	}

	trimmed := strings.TrimSpace(content)
	if strings.HasPrefix(trimmed, "data:image/") && len(trimmed) > 100 {
		return trimmed
	}

	return ""
}

func saveTryOnImage(dataURL string) (string, error) {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid data URL")
	}

	rawData, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("base64 decode error: %v", err)
	}

	ext := ".png"
	if strings.Contains(parts[0], "jpeg") || strings.Contains(parts[0], "jpg") {
		ext = ".jpg"
	} else if strings.Contains(parts[0], "webp") {
		ext = ".webp"
	}

	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := fmt.Sprintf("%s/%d%s", uploadDir, time.Now().UnixNano(), ext)
	if err := os.WriteFile(filename, rawData, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}

	return "/" + filename, nil
}

func isTryOnDevMode() bool {
	return os.Getenv("TRYON_DEV_MODE") == "true"
}

var (
	devPlaceholderPath     string
	devPlaceholderPathOnce sync.Once
)

func getDevPlaceholderPath() string {
	devPlaceholderPathOnce.Do(func() {
		path, err := generatePlaceholderImageFixed()
		if err != nil {
			fmt.Printf("[tryon] fixed placeholder error: %v, using timestamped fallback\n", err)
			path, _ = generatePlaceholderImage()
		}
		devPlaceholderPath = path
	})
	return devPlaceholderPath
}

func generatePlaceholderImageFixed() (string, error) {
	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := uploadDir + "/dev_placeholder.png"
	if _, err := os.Stat(filename); err == nil {
		return "/" + filename, nil
	}

	img, err := generatePlaceholderImageBytes()
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(filename, img, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}
	return "/" + filename, nil
}

func generatePlaceholderImage() (string, error) {
	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	img, err := generatePlaceholderImageBytes()
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("%s/dev_%d.png", uploadDir, time.Now().UnixNano())
	if err := os.WriteFile(filename, img, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}

	return "/" + filename, nil
}

func generatePlaceholderImageBytes() ([]byte, error) {
	width, height := 512, 512

	img := image.NewRGBA(image.Rect(0, 0, width, height))

	bgColor := color.RGBA{R: 26, G: 60, B: 105, A: 255}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, bgColor)
		}
	}

	borderColor := color.RGBA{R: 244, G: 241, B: 236, A: 255}
	borderWidth := 3
	for y := borderWidth; y < height-borderWidth; y++ {
		for x := borderWidth; x < borderWidth+2; x++ {
			img.Set(x, y, borderColor)
			img.Set(width-1-x, y, borderColor)
		}
	}
	for x := borderWidth; x < width-borderWidth; x++ {
		for y := borderWidth; y < borderWidth+2; y++ {
			img.Set(x, y, borderColor)
			img.Set(x, height-1-y, borderColor)
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, fmt.Errorf("png encode error: %v", err)
	}
	return buf.Bytes(), nil
}

func resizeImageToMaxDimension(data []byte, maxDim int) ([]byte, string, error) {
	mime := http.DetectContentType(data)

	var src image.Image
	var err error
	switch {
	case strings.Contains(mime, "jpeg") || strings.Contains(mime, "jpg"):
		src, err = jpeg.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "png"):
		src, err = png.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "webp"):
		src, err = webp.Decode(bytes.NewReader(data))
	default:
		src, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return nil, "", fmt.Errorf("decode error (%s): %v", mime, err)
	}

	bounds := src.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	src = flattenOnWhite(src, bounds)
	bounds = src.Bounds()

	if w <= maxDim && h <= maxDim {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, src, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
			return nil, "", fmt.Errorf("encode error: %v", err)
		}
		return buf.Bytes(), "image/jpeg", nil
	}

	var newW, newH int
	if w > h {
		newW = maxDim
		newH = int(float64(h) * float64(maxDim) / float64(w))
	} else {
		newH = maxDim
		newW = int(float64(w) * float64(maxDim) / float64(h))
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
		return nil, "", fmt.Errorf("encode error: %v", err)
	}
	return buf.Bytes(), "image/jpeg", nil
}

func flattenOnWhite(src image.Image, bounds image.Rectangle) image.Image {
	hasAlpha := false
	for y := bounds.Min.Y; y < bounds.Max.Y && !hasAlpha; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := src.At(x, y).RGBA()
			if a != 0xffff {
				hasAlpha = true
				break
			}
		}
	}
	if !hasAlpha {
		return src
	}
	white := image.NewRGBA(bounds)
	draw.Draw(white, bounds, image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(white, bounds, src, bounds.Min, draw.Over)
	return white
}

func fetchImageFromURL(imageURL string) ([]byte, error) {
	if strings.HasPrefix(imageURL, "/") {
		baseURL := os.Getenv("APP_URL")
		if baseURL == "" {
			baseURL = "http://localhost:8080"
		}
		imageURL = strings.TrimSuffix(baseURL, "/") + imageURL
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(imageURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return data, nil
}
