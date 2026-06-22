package handlers

import (
	"encoding/json"
	"net/http"

	"backEnd/db"
	"backEnd/services"
	"backEnd/utils"
)

// AIMetadataHandler handles AI-powered metadata generation requests
type AIMetadataHandler struct {
	aiService *services.AIMetadataService
}

// NewAIMetadataHandler creates a new AI metadata handler
func NewAIMetadataHandler() (*AIMetadataHandler, error) {
	aiService, err := services.NewAIMetadataService(db.Database)
	if err != nil {
		return nil, err
	}

	return &AIMetadataHandler{
		aiService: aiService,
	}, nil
}

// GenerateProductMetadata handles POST /api/admin/ai/generate-metadata
func (h *AIMetadataHandler) GenerateProductMetadata(w http.ResponseWriter, r *http.Request) {
	var req services.ProductMetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields
	if req.Name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product name is required")
		return
	}
	if req.Description == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product description is required")
		return
	}

	// Generate metadata using AI
	metadata, err := h.aiService.GenerateMetadata(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to generate metadata: "+err.Error())
		return
	}

	// Return generated metadata
	utils.SuccessResponse(w, http.StatusOK, "Metadata generated successfully", metadata)
}

// GetAvailableModels handles GET /api/admin/ai/models
func (h *AIMetadataHandler) GetAvailableModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.aiService.GetAvailableModels()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get models: "+err.Error())
		return
	}

	utils.SuccessResponse(w, http.StatusOK, "Models retrieved successfully", models)
}

// GetFieldDescriptions handles GET /api/admin/ai/field-descriptions
func (h *AIMetadataHandler) GetFieldDescriptions(w http.ResponseWriter, r *http.Request) {
	// Return field descriptions
	descriptions := map[string]string{
		"namePersian":        "نام فارسی محصول - عنوان کوتاه و جذاب برای نمایش به مشتری",
		"descriptionPersian": "توضیحات کامل فارسی - شرح ویژگی‌ها، جنس، استایل و موارد استفاده محصول",
		"keywords":           "کلمات کلیدی فارسی - برای جستجو و SEO (حداقل ۳ کلمه)",
		"tags":               "برچسب‌های فارسی - ویژگی‌های استایل، فصل، و موقعیت استفاده",
		"materialPersian":    "جنس محصول به فارسی - باید از لیست پیشنهادی انتخاب شود",
		"materialEnglish":    "جنس محصول به انگلیسی - به صورت خودکار از واژه‌نامه پر می‌شود",
		"materialTags":       "برچسب‌های جنس - به صورت خودکار از واژه‌نامه پر می‌شود",
		"stylePersian":       "استایل محصول به فارسی - مانند: اسپرت، رسمی، کژوال",
		"styleEnglish":       "استایل محصول به انگلیسی - به صورت خودکار پر می‌شود",
		"occasionTags":       "موقعیت‌های استفاده - مانند: روزمره، اداری، مهمانی، ورزشی",
		"season":             "فصل‌های مناسب - بهار، تابستان، پاییز، زمستان",
		"gender":             "جنسیت - مردانه، زنانه، یا یونیسکس",
		"ageGroup":           "گروه سنی - بزرگسال، نوجوان، یا کودک",
		"fitType":            "نوع برازش - معمولی (Regular)، تنگ (Slim)، یا گشاد (Oversized)",
		"colorsPersian":      "رنگ‌های موجود - به صورت خودکار از تنوع‌های محصول استخراج می‌شود",
		"popularityScore":    "امتیاز محبوبیت - به صورت خودکار بر اساس فروش و بازدید محاسبه می‌شود",
		"embeddingVector":    "بردار معنایی - برای جستجوی هوشمند، به صورت خودکار تولید می‌شود",
	}

	utils.SuccessResponse(w, http.StatusOK, "Descriptions retrieved successfully", descriptions)
}
