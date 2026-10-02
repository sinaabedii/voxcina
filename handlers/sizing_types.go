package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	sizingTypesCollection = "sizing_types"
	sizingTypeUploadDir   = "./uploads/size-guides"
	sizingTypeWebPrefix   = "/uploads/size-guides/"
)

// validateImageMagicBytes checks magic bytes for common web image formats.
func validateImageMagicBytes(data []byte) (string, error) {
	if len(data) < 4 {
		return "", errors.New("file too small to be a valid image")
	}

	// JPEG: FF D8 FF
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return ".jpg", nil
	}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) {
		return ".png", nil
	}

	// WebP: RIFF....WEBP
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return ".webp", nil
	}

	// GIF: GIF87a or GIF89a
	if len(data) >= 6 && (string(data[:6]) == "GIF87a" || string(data[:6]) == "GIF89a") {
		return ".gif", nil
	}

	return "", errors.New("unsupported image format: only JPEG, PNG, WebP, GIF are allowed")
}

// saveSizingTypeImage reads and validates the uploaded image before persisting to disk.
func saveSizingTypeImage(header *multipart.FileHeader) (string, error) {
	file, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("error opening uploaded file: %w", err)
	}
	defer file.Close()

	const maxImageBytes = 10 << 20
	data, err := io.ReadAll(io.LimitReader(file, maxImageBytes+1))
	if err != nil {
		return "", fmt.Errorf("error reading uploaded file: %w", err)
	}
	if len(data) > maxImageBytes {
		return "", errors.New("image exceeds maximum allowed size of 10MB")
	}

	ext, err := validateImageMagicBytes(data)
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(sizingTypeUploadDir, 0755); err != nil {
		return "", fmt.Errorf("error creating upload directory: %w", err)
	}

	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), primitive.NewObjectID().Hex()[:8], ext)
	diskPath := filepath.Join(sizingTypeUploadDir, filename)

	if err := os.WriteFile(diskPath, data, 0644); err != nil {
		return "", fmt.Errorf("error saving image file: %w", err)
	}

	return sizingTypeWebPrefix + filename, nil
}

// validateMeasurements ensures that at least one measurement is defined and all have valid key and label.
func validateMeasurements(measurements []models.SizingMeasurementDef) error {
	if len(measurements) == 0 {
		return errors.New("at least one measurement definition is required")
	}
	for _, m := range measurements {
		if strings.TrimSpace(m.Key) == "" || strings.TrimSpace(m.Label) == "" {
			return errors.New("all measurement definitions must have key and label")
		}
	}
	return nil
}

// slugify converts a string into a clean lowercase kebab-case slug.
func slugify(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	var b strings.Builder
	lastHyphen := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastHyphen = false
		} else if r == '-' || r == '_' || r == ' ' || r == '\t' {
			if !lastHyphen && b.Len() > 0 {
				b.WriteRune('-')
				lastHyphen = true
			}
		}
	}
	res := strings.Trim(b.String(), "-")
	if res == "" {
		res = fmt.Sprintf("sizing-%d", time.Now().Unix())
	}
	return res
}

// GenerateSizingType handles POST /api/admin/sizing-types/generate
func GenerateSizingType(w http.ResponseWriter, r *http.Request) {
	var clothingType string
	var styleNotes string
	var model string

	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		var req struct {
			ClothingType      string `json:"clothing_type"`
			ClothingTypeCamel string `json:"clothingType"`
			StyleNotes        string `json:"style_notes"`
			StyleNotesCamel   string `json:"styleNotes"`
			Model             string `json:"model"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
			return
		}
		clothingType = req.ClothingType
		if clothingType == "" {
			clothingType = req.ClothingTypeCamel
		}
		styleNotes = req.StyleNotes
		if styleNotes == "" {
			styleNotes = req.StyleNotesCamel
		}
		model = req.Model
	} else {
		clothingType = r.FormValue("clothing_type")
		if clothingType == "" {
			clothingType = r.FormValue("clothingType")
		}
		styleNotes = r.FormValue("style_notes")
		if styleNotes == "" {
			styleNotes = r.FormValue("styleNotes")
		}
		model = r.FormValue("model")
	}

	clothingType = strings.TrimSpace(clothingType)
	if clothingType == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "clothing_type is required")
		return
	}

	model = strings.TrimSpace(model)
	if model != "" {
		if err := services.ValidateModelName(model); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid AI model format: "+err.Error())
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	result, err := services.GenerateSizingResearchWithModel(ctx, clothingType, styleNotes, model)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to generate sizing research: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// GenerateSizingDiagramPrompts handles POST /api/admin/sizing-types/generate-prompts
func GenerateSizingDiagramPrompts(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClothingType                string                        `json:"clothing_type"`
		ClothingTypeCamel           string                        `json:"clothingType"`
		StyleNotes                  string                        `json:"style_notes"`
		StyleNotesCamel             string                        `json:"styleNotes"`
		Model                       string                        `json:"model"`
		Measurements                []models.SizingMeasurementDef `json:"measurements"`
		CurrentVectorPrompt         string                        `json:"current_vector_prompt"`
		CurrentVectorPromptCamel    string                        `json:"currentVectorPrompt"`
		CurrentMannequinPrompt      string                        `json:"current_mannequin_prompt"`
		CurrentMannequinPromptCamel string                        `json:"currentMannequinPrompt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
		return
	}

	clothingType := strings.TrimSpace(req.ClothingType)
	if clothingType == "" {
		clothingType = strings.TrimSpace(req.ClothingTypeCamel)
	}

	styleNotes := strings.TrimSpace(req.StyleNotes)
	if styleNotes == "" {
		styleNotes = strings.TrimSpace(req.StyleNotesCamel)
	}

	currentVector := strings.TrimSpace(req.CurrentVectorPrompt)
	if currentVector == "" {
		currentVector = strings.TrimSpace(req.CurrentVectorPromptCamel)
	}

	currentMannequin := strings.TrimSpace(req.CurrentMannequinPrompt)
	if currentMannequin == "" {
		currentMannequin = strings.TrimSpace(req.CurrentMannequinPromptCamel)
	}

	if len(req.Measurements) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "At least one measurement is required")
		return
	}

	model := strings.TrimSpace(req.Model)
	if model != "" {
		if err := services.ValidateModelName(model); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid AI model format: "+err.Error())
			return
		}
	}

	agentMeasurements := make([]services.SizingAgentMeasurement, len(req.Measurements))
	for i, m := range req.Measurements {
		agentMeasurements[i] = services.SizingAgentMeasurement{
			Key:                m.Key,
			Label:              m.Label,
			BodyGuide:          m.BodyGuide,
			FitAdvice:          m.FitAdvice,
			GarmentMeasurement: m.GarmentMeasurement,
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	result, err := services.UpdateDiagramPromptsWithModel(ctx, clothingType, styleNotes, agentMeasurements, currentVector, currentMannequin, model)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update diagram prompts: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// ExtrapolateSizingMeasurements handles POST /api/admin/sizing-types/extrapolate-measurements
func ExtrapolateSizingMeasurements(w http.ResponseWriter, r *http.Request) {
	var input services.ExtrapolateMeasurementsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
		return
	}

	if len(input.SizeChart) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "At least one size chart row is required")
		return
	}

	if len(input.Measurements) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "At least one measurement definition is required")
		return
	}

	input.Model = strings.TrimSpace(input.Model)
	if input.Model != "" {
		if err := services.ValidateModelName(input.Model); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid AI model format: "+err.Error())
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	result, err := services.ExtrapolateSizeChartMeasurementsWithModel(ctx, input)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to extrapolate measurements: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// ListAdminSizingTypes handles GET /api/admin/sizing-types
func ListAdminSizingTypes(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection(sizingTypesCollection)
	findOpts := options.Find().SetSort(bson.D{
		{Key: "display_order", Value: 1},
		{Key: "created_at", Value: -1},
	})

	cursor, err := collection.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sizing types: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var sizingTypes []models.SizingType
	if err := cursor.All(ctx, &sizingTypes); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding sizing types: "+err.Error())
		return
	}

	if sizingTypes == nil {
		sizingTypes = []models.SizingType{}
	}

	utils.JSONResponse(w, http.StatusOK, sizingTypes)
}

// ListPublicSizingTypes handles GET /api/sizing-types
func ListPublicSizingTypes(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection(sizingTypesCollection)
	findOpts := options.Find().SetSort(bson.D{
		{Key: "display_order", Value: 1},
		{Key: "created_at", Value: -1},
	})

	cursor, err := collection.Find(ctx, bson.M{"is_active": true}, findOpts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sizing types: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var sizingTypes []models.SizingType
	if err := cursor.All(ctx, &sizingTypes); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding sizing types: "+err.Error())
		return
	}

	if sizingTypes == nil {
		sizingTypes = []models.SizingType{}
	}

	publicSizingTypes := make([]publicSizingTypeResponse, len(sizingTypes))
	for i, sizingType := range sizingTypes {
		publicSizingTypes[i] = toPublicSizingTypeResponse(sizingType)
	}

	utils.JSONResponse(w, http.StatusOK, publicSizingTypes)
}

// publicSizingTypeResponse deliberately excludes admin-only garment measurement
// instructions while retaining the buyer-facing sizing data.
type publicSizingTypeResponse struct {
	ID              primitive.ObjectID     `json:"id"`
	Name            string                 `json:"name"`
	Slug            string                 `json:"slug"`
	Description     string                 `json:"description,omitempty"`
	Measurements    []publicMeasurementDef `json:"measurements"`
	ImagePrompt     string                 `json:"image_prompt,omitempty"`
	ImagePath       string                 `json:"image_path,omitempty"`
	GeneralFitGuide string                 `json:"general_fit_guide,omitempty"`
	IsActive        bool                   `json:"is_active"`
	DisplayOrder    int                    `json:"display_order"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

type publicMeasurementDef struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	BodyGuide string `json:"body_guide"`
	FitAdvice string `json:"fit_advice"`
}

func toPublicSizingTypeResponse(sizingType models.SizingType) publicSizingTypeResponse {
	measurements := make([]publicMeasurementDef, len(sizingType.Measurements))
	for i, measurement := range sizingType.Measurements {
		measurements[i] = publicMeasurementDef{
			Key:       measurement.Key,
			Label:     measurement.Label,
			BodyGuide: measurement.BodyGuide,
			FitAdvice: measurement.FitAdvice,
		}
	}

	return publicSizingTypeResponse{
		ID:              sizingType.ID,
		Name:            sizingType.Name,
		Slug:            sizingType.Slug,
		Description:     sizingType.Description,
		Measurements:    measurements,
		ImagePrompt:     sizingType.ImagePrompt,
		ImagePath:       sizingType.ImagePath,
		GeneralFitGuide: sizingType.GeneralFitGuide,
		IsActive:        sizingType.IsActive,
		DisplayOrder:    sizingType.DisplayOrder,
		CreatedAt:       sizingType.CreatedAt,
		UpdatedAt:       sizingType.UpdatedAt,
	}
}

// GetSizingType handles GET /api/admin/sizing-types/{id}
func GetSizingType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		idStr = r.URL.Query().Get("id")
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid sizing type ID format")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var sizingType models.SizingType
	err = db.Database.Collection(sizingTypesCollection).FindOne(ctx, bson.M{"_id": objID}).Decode(&sizingType)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Sizing type not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sizing type: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, sizingType)
}

// CreateSizingType handles POST /api/admin/sizing-types
func CreateSizingType(w http.ResponseWriter, r *http.Request) {
	contentType := r.Header.Get("Content-Type")

	var (
		name                  string
		slug                  string
		description           string
		measurements          []models.SizingMeasurementDef
		imagePrompt           string
		imagePromptMannequin  string
		imagePath             string
		generalFitGuide       string
		adminMeasurementGuide string
		isActive              = true
		displayOrder          = 0
	)

	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
			return
		}

		name = strings.TrimSpace(r.FormValue("name"))
		slug = strings.TrimSpace(r.FormValue("slug"))
		description = strings.TrimSpace(r.FormValue("description"))
		imagePrompt = strings.TrimSpace(r.FormValue("image_prompt"))
		if imagePrompt == "" {
			imagePrompt = strings.TrimSpace(r.FormValue("imagePrompt"))
		}
		imagePromptMannequin = strings.TrimSpace(r.FormValue("image_prompt_mannequin"))
		if imagePromptMannequin == "" {
			imagePromptMannequin = strings.TrimSpace(r.FormValue("imagePromptMannequin"))
		}
		imagePath = strings.TrimSpace(r.FormValue("image_path"))
		if imagePath == "" {
			imagePath = strings.TrimSpace(r.FormValue("imagePath"))
		}
		generalFitGuide = strings.TrimSpace(r.FormValue("general_fit_guide"))
		if generalFitGuide == "" {
			generalFitGuide = strings.TrimSpace(r.FormValue("generalFitGuide"))
		}
		adminMeasurementGuide = strings.TrimSpace(r.FormValue("admin_measurement_guide"))
		if adminMeasurementGuide == "" {
			adminMeasurementGuide = strings.TrimSpace(r.FormValue("adminMeasurementGuide"))
		}

		if activeStr := r.FormValue("is_active"); activeStr != "" {
			if b, err := strconv.ParseBool(activeStr); err == nil {
				isActive = b
			}
		} else if activeStr := r.FormValue("isActive"); activeStr != "" {
			if b, err := strconv.ParseBool(activeStr); err == nil {
				isActive = b
			}
		}

		if orderStr := r.FormValue("display_order"); orderStr != "" {
			if ord, err := strconv.Atoi(orderStr); err == nil {
				displayOrder = ord
			}
		} else if orderStr := r.FormValue("displayOrder"); orderStr != "" {
			if ord, err := strconv.Atoi(orderStr); err == nil {
				displayOrder = ord
			}
		}

		measurementsRaw := r.FormValue("measurements")
		if measurementsRaw != "" {
			if err := json.Unmarshal([]byte(measurementsRaw), &measurements); err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid measurements JSON format: "+err.Error())
				return
			}
		}

		// Handle file upload if present
		if r.MultipartForm != nil && r.MultipartForm.File != nil {
			fileHeaders := r.MultipartForm.File["image"]
			if len(fileHeaders) == 0 {
				fileHeaders = r.MultipartForm.File["file"]
			}
			if len(fileHeaders) > 0 {
				uploadedPath, err := saveSizingTypeImage(fileHeaders[0])
				if err != nil {
					utils.ErrorResponse(w, http.StatusBadRequest, "Image upload error: "+err.Error())
					return
				}
				imagePath = uploadedPath
			}
		}
	} else {
		var req struct {
			Name                       string                        `json:"name"`
			Slug                       string                        `json:"slug"`
			Description                string                        `json:"description"`
			Measurements               []models.SizingMeasurementDef `json:"measurements"`
			ImagePrompt                string                        `json:"image_prompt"`
			ImagePromptCamel           string                        `json:"imagePrompt"`
			ImagePromptMannequin       string                        `json:"image_prompt_mannequin"`
			ImagePromptMannequinCamel  string                        `json:"imagePromptMannequin"`
			ImagePath                  string                        `json:"image_path"`
			ImagePathCamel             string                        `json:"imagePath"`
			GeneralFitGuide            string                        `json:"general_fit_guide"`
			GeneralFitGuideCamel       string                        `json:"generalFitGuide"`
			AdminMeasurementGuide      string                        `json:"admin_measurement_guide"`
			AdminMeasurementGuideCamel string                        `json:"adminMeasurementGuide"`
			IsActive                   *bool                         `json:"is_active"`
			IsActiveCamel              *bool                         `json:"isActive"`
			DisplayOrder               *int                          `json:"display_order"`
			DisplayOrderCamel          *int                          `json:"displayOrder"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON format: "+err.Error())
			return
		}

		name = strings.TrimSpace(req.Name)
		slug = strings.TrimSpace(req.Slug)
		description = strings.TrimSpace(req.Description)
		measurements = req.Measurements
		imagePrompt = strings.TrimSpace(req.ImagePrompt)
		if imagePrompt == "" {
			imagePrompt = strings.TrimSpace(req.ImagePromptCamel)
		}
		imagePromptMannequin = strings.TrimSpace(req.ImagePromptMannequin)
		if imagePromptMannequin == "" {
			imagePromptMannequin = strings.TrimSpace(req.ImagePromptMannequinCamel)
		}
		imagePath = strings.TrimSpace(req.ImagePath)
		if imagePath == "" {
			imagePath = strings.TrimSpace(req.ImagePathCamel)
		}
		generalFitGuide = strings.TrimSpace(req.GeneralFitGuide)
		if generalFitGuide == "" {
			generalFitGuide = strings.TrimSpace(req.GeneralFitGuideCamel)
		}
		adminMeasurementGuide = strings.TrimSpace(req.AdminMeasurementGuide)
		if adminMeasurementGuide == "" {
			adminMeasurementGuide = strings.TrimSpace(req.AdminMeasurementGuideCamel)
		}

		if req.IsActive != nil {
			isActive = *req.IsActive
		} else if req.IsActiveCamel != nil {
			isActive = *req.IsActiveCamel
		}

		if req.DisplayOrder != nil {
			displayOrder = *req.DisplayOrder
		} else if req.DisplayOrderCamel != nil {
			displayOrder = *req.DisplayOrderCamel
		}
	}

	if name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Name is required")
		return
	}

	if slug == "" {
		slug = slugify(name)
	} else {
		slug = slugify(slug)
	}

	if err := validateMeasurements(measurements); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection(sizingTypesCollection)

	// Check slug uniqueness
	count, err := collection.CountDocuments(ctx, bson.M{"slug": slug})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error checking slug uniqueness: "+err.Error())
		return
	}
	if count > 0 {
		utils.ErrorResponse(w, http.StatusConflict, fmt.Sprintf("A sizing type with slug %q already exists", slug))
		return
	}

	now := time.Now()
	newSizingType := models.SizingType{
		ID:                    primitive.NewObjectID(),
		Name:                  name,
		Slug:                  slug,
		Description:           description,
		Measurements:          measurements,
		ImagePrompt:           imagePrompt,
		ImagePromptMannequin:  imagePromptMannequin,
		ImagePath:             imagePath,
		GeneralFitGuide:       generalFitGuide,
		AdminMeasurementGuide: adminMeasurementGuide,
		IsActive:              isActive,
		DisplayOrder:          displayOrder,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	_, err = collection.InsertOne(ctx, newSizingType)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving sizing type: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, newSizingType)
}

// UpdateSizingType handles PUT /api/admin/sizing-types/{id}
func UpdateSizingType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		idStr = r.URL.Query().Get("id")
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid sizing type ID format")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection(sizingTypesCollection)

	var existing models.SizingType
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Sizing type not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sizing type: "+err.Error())
		}
		return
	}

	updateFields := bson.M{}
	contentType := r.Header.Get("Content-Type")

	if strings.Contains(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
			return
		}

		if val := r.FormValue("name"); val != "" {
			updateFields["name"] = strings.TrimSpace(val)
		}

		if val := r.FormValue("slug"); val != "" {
			newSlug := slugify(val)
			if newSlug != existing.Slug {
				cnt, err := collection.CountDocuments(ctx, bson.M{"slug": newSlug, "_id": bson.M{"$ne": objID}})
				if err == nil && cnt > 0 {
					utils.ErrorResponse(w, http.StatusConflict, fmt.Sprintf("A sizing type with slug %q already exists", newSlug))
					return
				}
				updateFields["slug"] = newSlug
			}
		}

		if _, exists := r.Form["description"]; exists {
			updateFields["description"] = strings.TrimSpace(r.FormValue("description"))
		}

		if _, exists := r.Form["image_prompt"]; exists {
			updateFields["image_prompt"] = strings.TrimSpace(r.FormValue("image_prompt"))
		} else if _, exists := r.Form["imagePrompt"]; exists {
			updateFields["image_prompt"] = strings.TrimSpace(r.FormValue("imagePrompt"))
		}

		if _, exists := r.Form["image_prompt_mannequin"]; exists {
			updateFields["image_prompt_mannequin"] = strings.TrimSpace(r.FormValue("image_prompt_mannequin"))
		} else if _, exists := r.Form["imagePromptMannequin"]; exists {
			updateFields["image_prompt_mannequin"] = strings.TrimSpace(r.FormValue("imagePromptMannequin"))
		}

		if _, exists := r.Form["general_fit_guide"]; exists {
			updateFields["general_fit_guide"] = strings.TrimSpace(r.FormValue("general_fit_guide"))
		} else if _, exists := r.Form["generalFitGuide"]; exists {
			updateFields["general_fit_guide"] = strings.TrimSpace(r.FormValue("generalFitGuide"))
		}

		if _, exists := r.Form["admin_measurement_guide"]; exists {
			updateFields["admin_measurement_guide"] = strings.TrimSpace(r.FormValue("admin_measurement_guide"))
		} else if _, exists := r.Form["adminMeasurementGuide"]; exists {
			updateFields["admin_measurement_guide"] = strings.TrimSpace(r.FormValue("adminMeasurementGuide"))
		}

		if activeStr := r.FormValue("is_active"); activeStr != "" {
			if b, err := strconv.ParseBool(activeStr); err == nil {
				updateFields["is_active"] = b
			}
		} else if activeStr := r.FormValue("isActive"); activeStr != "" {
			if b, err := strconv.ParseBool(activeStr); err == nil {
				updateFields["is_active"] = b
			}
		}

		if orderStr := r.FormValue("display_order"); orderStr != "" {
			if ord, err := strconv.Atoi(orderStr); err == nil {
				updateFields["display_order"] = ord
			}
		} else if orderStr := r.FormValue("displayOrder"); orderStr != "" {
			if ord, err := strconv.Atoi(orderStr); err == nil {
				updateFields["display_order"] = ord
			}
		}

		if measurementsRaw := r.FormValue("measurements"); measurementsRaw != "" {
			var measurements []models.SizingMeasurementDef
			if err := json.Unmarshal([]byte(measurementsRaw), &measurements); err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid measurements JSON format: "+err.Error())
				return
			}
			if err := validateMeasurements(measurements); err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
				return
			}
			updateFields["measurements"] = measurements
		}

		// Check for manual image_path update
		var imagePathKey string
		if _, exists := r.Form["image_path"]; exists {
			imagePathKey = "image_path"
		} else if _, exists := r.Form["imagePath"]; exists {
			imagePathKey = "imagePath"
		}

		if imagePathKey != "" {
			newPath := strings.TrimSpace(r.FormValue(imagePathKey))
			updateFields["image_path"] = newPath
			if newPath == "" && existing.ImagePath != "" && strings.HasPrefix(existing.ImagePath, sizingTypeWebPrefix) && !strings.Contains(existing.ImagePath, "..") {
				filename := filepath.Base(existing.ImagePath)
				diskPath := filepath.Join(sizingTypeUploadDir, filename)
				_ = os.Remove(diskPath)
			}
		}

		// Handle file upload
		if r.MultipartForm != nil && r.MultipartForm.File != nil {
			fileHeaders := r.MultipartForm.File["image"]
			if len(fileHeaders) == 0 {
				fileHeaders = r.MultipartForm.File["file"]
			}
			if len(fileHeaders) > 0 {
				uploadedPath, err := saveSizingTypeImage(fileHeaders[0])
				if err != nil {
					utils.ErrorResponse(w, http.StatusBadRequest, "Image upload error: "+err.Error())
					return
				}
				updateFields["image_path"] = uploadedPath

				// Clean up previous image if it was in the size-guides upload folder
				if existing.ImagePath != "" && strings.HasPrefix(existing.ImagePath, sizingTypeWebPrefix) && !strings.Contains(existing.ImagePath, "..") {
					filename := filepath.Base(existing.ImagePath)
					diskPath := filepath.Join(sizingTypeUploadDir, filename)
					_ = os.Remove(diskPath)
				}
			}
		}
	} else {
		var req struct {
			Name                       *string                        `json:"name"`
			Slug                       *string                        `json:"slug"`
			Description                *string                        `json:"description"`
			Measurements               *[]models.SizingMeasurementDef `json:"measurements"`
			ImagePrompt                *string                        `json:"image_prompt"`
			ImagePromptCamel           *string                        `json:"imagePrompt"`
			ImagePromptMannequin       *string                        `json:"image_prompt_mannequin"`
			ImagePromptMannequinCamel  *string                        `json:"imagePromptMannequin"`
			ImagePath                  *string                        `json:"image_path"`
			ImagePathCamel             *string                        `json:"imagePath"`
			GeneralFitGuide            *string                        `json:"general_fit_guide"`
			GeneralFitGuideCamel       *string                        `json:"generalFitGuide"`
			AdminMeasurementGuide      *string                        `json:"admin_measurement_guide"`
			AdminMeasurementGuideCamel *string                        `json:"adminMeasurementGuide"`
			IsActive                   *bool                          `json:"is_active"`
			IsActiveCamel              *bool                          `json:"isActive"`
			DisplayOrder               *int                           `json:"display_order"`
			DisplayOrderCamel          *int                           `json:"displayOrder"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON format: "+err.Error())
			return
		}

		if req.Name != nil {
			updateFields["name"] = strings.TrimSpace(*req.Name)
		}
		if req.Slug != nil {
			newSlug := slugify(*req.Slug)
			if newSlug != existing.Slug {
				cnt, err := collection.CountDocuments(ctx, bson.M{"slug": newSlug, "_id": bson.M{"$ne": objID}})
				if err == nil && cnt > 0 {
					utils.ErrorResponse(w, http.StatusConflict, fmt.Sprintf("A sizing type with slug %q already exists", newSlug))
					return
				}
				updateFields["slug"] = newSlug
			}
		}
		if req.Description != nil {
			updateFields["description"] = strings.TrimSpace(*req.Description)
		}
		if req.Measurements != nil {
			if err := validateMeasurements(*req.Measurements); err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
				return
			}
			updateFields["measurements"] = *req.Measurements
		}
		if req.ImagePrompt != nil {
			updateFields["image_prompt"] = strings.TrimSpace(*req.ImagePrompt)
		} else if req.ImagePromptCamel != nil {
			updateFields["image_prompt"] = strings.TrimSpace(*req.ImagePromptCamel)
		}
		if req.ImagePromptMannequin != nil {
			updateFields["image_prompt_mannequin"] = strings.TrimSpace(*req.ImagePromptMannequin)
		} else if req.ImagePromptMannequinCamel != nil {
			updateFields["image_prompt_mannequin"] = strings.TrimSpace(*req.ImagePromptMannequinCamel)
		}
		if req.ImagePath != nil {
			updateFields["image_path"] = strings.TrimSpace(*req.ImagePath)
		} else if req.ImagePathCamel != nil {
			updateFields["image_path"] = strings.TrimSpace(*req.ImagePathCamel)
		}
		if req.GeneralFitGuide != nil {
			updateFields["general_fit_guide"] = strings.TrimSpace(*req.GeneralFitGuide)
		} else if req.GeneralFitGuideCamel != nil {
			updateFields["general_fit_guide"] = strings.TrimSpace(*req.GeneralFitGuideCamel)
		}
		if req.AdminMeasurementGuide != nil {
			updateFields["admin_measurement_guide"] = strings.TrimSpace(*req.AdminMeasurementGuide)
		} else if req.AdminMeasurementGuideCamel != nil {
			updateFields["admin_measurement_guide"] = strings.TrimSpace(*req.AdminMeasurementGuideCamel)
		}
		if req.IsActive != nil {
			updateFields["is_active"] = *req.IsActive
		} else if req.IsActiveCamel != nil {
			updateFields["is_active"] = *req.IsActiveCamel
		}
		if req.DisplayOrder != nil {
			updateFields["display_order"] = *req.DisplayOrder
		} else if req.DisplayOrderCamel != nil {
			updateFields["display_order"] = *req.DisplayOrderCamel
		}
	}

	if len(updateFields) == 0 {
		utils.JSONResponse(w, http.StatusOK, existing)
		return
	}

	updateFields["updated_at"] = time.Now()

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateFields})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating sizing type: "+err.Error())
		return
	}

	var updated models.SizingType
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updated); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error reloading updated sizing type: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, updated)
}

// DeleteSizingType handles DELETE /api/admin/sizing-types/{id}
func DeleteSizingType(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		idStr = r.URL.Query().Get("id")
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid sizing type ID format")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection(sizingTypesCollection)

	var existing models.SizingType
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Sizing type not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error finding sizing type: "+err.Error())
		}
		return
	}

	_, err = collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting sizing type: "+err.Error())
		return
	}

	// Delete image file if saved locally
	if existing.ImagePath != "" && strings.HasPrefix(existing.ImagePath, sizingTypeWebPrefix) && !strings.Contains(existing.ImagePath, "..") {
		filename := filepath.Base(existing.ImagePath)
		diskPath := filepath.Join(sizingTypeUploadDir, filename)
		_ = os.Remove(diskPath)
	}

	// Clean up product sizing_type_id references (size_chart remains on the product)
	if _, err := db.Database.Collection("products").UpdateMany(
		ctx,
		bson.M{"sizing_type_id": objID},
		bson.M{"$unset": bson.M{"sizing_type_id": ""}},
	); err != nil {
		utils.LogAction("DELETE_SIZING_TYPE_UNLINK_PRODUCTS_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, objID.Hex()))
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Sizing type deleted successfully",
	})
}
