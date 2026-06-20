package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"backEnd/utils"
)

const tryOnModel = "google/gemini-3.1-flash-image"

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

func VirtualTryOn(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "حداکثر حجم آپلود ۱۰ مگابایت است")
		return
	}

	personFile, _, err := r.FormFile("person_image")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "تصویر شخص الزامی است")
		return
	}
	defer personFile.Close()

	garmentFile, _, err := r.FormFile("garment_image")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "تصویر لباس الزامی است")
		return
	}
	defer garmentFile.Close()

	garmentType := r.FormValue("garment_type")
	if garmentType == "" {
		garmentType = "upper_body"
	}

	prompt := getTryOnPrompt(garmentType)

	personBytes, err := io.ReadAll(personFile)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر شخص")
		return
	}

	garmentBytes, err := io.ReadAll(garmentFile)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر لباس")
		return
	}

	personMime := http.DetectContentType(personBytes)
	garmentMime := http.DetectContentType(garmentBytes)

	personBase64 := base64.StdEncoding.EncodeToString(personBytes)
	garmentBase64 := base64.StdEncoding.EncodeToString(garmentBytes)

	personDataURL := fmt.Sprintf("data:%s;base64,%s", personMime, personBase64)
	garmentDataURL := fmt.Sprintf("data:%s;base64,%s", garmentMime, garmentBase64)

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
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطای داخلی")
		return
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "سرویس پرو مجازی در حال حاضر در دسترس نیست")
		return
	}

	httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطای داخلی")
		return
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("HTTP-Referer", os.Getenv("APP_URL"))
	httpReq.Header.Set("X-Title", "Voxcina Virtual Try-On")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "خطا در ارتباط با سرویس پرو مجازی")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت پاسخ")
		return
	}

	if resp.StatusCode != http.StatusOK {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, fmt.Sprintf("سرویس پرو مجازی با خطا مواجه شد (کد %d)", resp.StatusCode))
		return
	}

	var orResp openRouterTryOnResponse
	if err := json.Unmarshal(body, &orResp); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در پردازش پاسخ")
		return
	}

	if orResp.Error != nil {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "سرویس پرو مجازی با خطا مواجه شد")
		return
	}

	if len(orResp.Choices) == 0 {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "پاسخی از سرویس دریافت نشد")
		return
	}

	rawContent := orResp.Choices[0].Message.Content

	imageDataURL := extractBase64Image(rawContent)
	if imageDataURL == "" {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "تصویری توسط سرویس تولید نشد")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"image": imageDataURL,
	})
}

type openRouterTryOnResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

var base64ImageRegex = regexp.MustCompile(`data:image/\w+;base64,[A-Za-z0-9+/=]+`)

func extractBase64Image(content string) string {
	match := base64ImageRegex.FindString(content)
	if match != "" {
		return match
	}

	if strings.HasPrefix(content, "data:image/") && len(content) > 100 {
		return content
	}

	return ""
}
