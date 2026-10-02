package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backEnd/models"
	"backEnd/services"
)

func TestValidateImageMagicBytes(t *testing.T) {
	tests := []struct {
		name      string
		data      []byte
		expectExt string
		expectErr bool
	}{
		{
			name:      "Valid JPEG",
			data:      []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46},
			expectExt: ".jpg",
			expectErr: false,
		},
		{
			name:      "Valid PNG",
			data:      []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00},
			expectExt: ".png",
			expectErr: false,
		},
		{
			name:      "Valid WebP",
			data:      []byte("RIFF1234WEBPVP8 ..."),
			expectExt: ".webp",
			expectErr: false,
		},
		{
			name:      "Valid GIF87a",
			data:      []byte("GIF87a..."),
			expectExt: ".gif",
			expectErr: false,
		},
		{
			name:      "Valid GIF89a",
			data:      []byte("GIF89a..."),
			expectExt: ".gif",
			expectErr: false,
		},
		{
			name:      "Too small",
			data:      []byte{0xFF, 0xD8},
			expectErr: true,
		},
		{
			name:      "PDF file",
			data:      []byte("%PDF-1.7 header"),
			expectErr: true,
		},
		{
			name:      "Executable / text",
			data:      []byte("#!/bin/bash\necho hi"),
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ext, err := validateImageMagicBytes(tt.data)
			if tt.expectErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tt.expectErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !tt.expectErr && ext != tt.expectExt {
				t.Fatalf("expected ext %s, got %s", tt.expectExt, ext)
			}
		})
	}
}

func TestSlugify(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Women Blazer", "women-blazer"},
		{"Men T-Shirt_Classic", "men-t-shirt-classic"},
		{"   Pants 2026   ", "pants-2026"},
	}

	for _, tt := range tests {
		got := slugify(tt.input)
		if got != tt.expected {
			t.Errorf("slugify(%q) = %q, expected %q", tt.input, got, tt.expected)
		}
	}
}

func TestProductSizeChartJSONSerialization(t *testing.T) {
	chart := []models.ProductSizeMeasurement{
		{
			Size: "M",
			Values: map[string]string{
				"chest":  "52",
				"length": "70",
			},
		},
		{
			Size: "L",
			Values: map[string]string{
				"chest":  "55",
				"length": "72",
			},
		},
	}

	data, err := json.Marshal(chart)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded []models.ProductSizeMeasurement
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if len(decoded) != 2 {
		t.Fatalf("expected 2 items, got %d", len(decoded))
	}
	if decoded[0].Size != "M" || decoded[0].Values["chest"] != "52" {
		t.Errorf("decoded content mismatch: %+v", decoded[0])
	}
}

func TestValidateMeasurements(t *testing.T) {
	if err := validateMeasurements(nil); err == nil {
		t.Errorf("expected error on nil measurements")
	}
	if err := validateMeasurements([]models.SizingMeasurementDef{}); err == nil {
		t.Errorf("expected error on empty measurements")
	}
	if err := validateMeasurements([]models.SizingMeasurementDef{{Key: "", Label: "قد"}}); err == nil {
		t.Errorf("expected error on empty key")
	}
	if err := validateMeasurements([]models.SizingMeasurementDef{{Key: "length", Label: "   "}}); err == nil {
		t.Errorf("expected error on whitespace label")
	}
	valid := []models.SizingMeasurementDef{
		{Key: "chest", Label: "عرض سینه", BodyGuide: "...", FitAdvice: "..."},
	}
	if err := validateMeasurements(valid); err != nil {
		t.Errorf("unexpected error on valid measurements: %v", err)
	}
}

func TestPublicSizingTypeResponseExcludesAdminMeasurementGuidance(t *testing.T) {
	public := toPublicSizingTypeResponse(models.SizingType{
		Name:                  "کت بلیزر",
		AdminMeasurementGuide: "راهنمای داخلی اندازه‌گیری لباس",
		ImagePrompt:           "vector prompt",
		ImagePromptMannequin:  "mannequin prompt",
		Measurements: []models.SizingMeasurementDef{{
			Key:                "chest",
			Label:              "عرض سینه",
			BodyGuide:          "دور سینه را اندازه بگیرید.",
			FitAdvice:          "آزادی مناسب در نظر بگیرید.",
			GarmentMeasurement: "عرض تخت لباس را اندازه بگیرید.",
		}},
	})

	data, err := json.Marshal(public)
	if err != nil {
		t.Fatalf("failed to marshal public sizing type: %v", err)
	}
	encoded := string(data)
	if strings.Contains(encoded, "admin_measurement_guide") || strings.Contains(encoded, "garment_measurement") {
		t.Fatalf("public sizing response leaked admin measurement guidance: %s", encoded)
	}
	if strings.Contains(encoded, "image_prompt_mannequin") {
		t.Fatalf("public sizing response leaked admin-only image prompt mannequin: %s", encoded)
	}
	if !strings.Contains(encoded, "body_guide") || !strings.Contains(encoded, "fit_advice") {
		t.Fatalf("public sizing response lost buyer-facing measurement guidance: %s", encoded)
	}
}

func TestGenerateSizingTypeValidation(t *testing.T) {
	// Test empty clothing_type
	reqEmpty := httptest.NewRequest("POST", "/api/admin/sizing-types/generate", strings.NewReader(`{"clothing_type": ""}`))
	reqEmpty.Header.Set("Content-Type", "application/json")
	wEmpty := httptest.NewRecorder()
	GenerateSizingType(wEmpty, reqEmpty)
	if wEmpty.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty clothing_type, got %d", wEmpty.Code)
	}

	// Test invalid model format
	reqInvalidModel := httptest.NewRequest("POST", "/api/admin/sizing-types/generate", strings.NewReader(`{"clothing_type": "هودی", "model": "invalid model with spaces"}`))
	reqInvalidModel.Header.Set("Content-Type", "application/json")
	wInvalidModel := httptest.NewRecorder()
	GenerateSizingType(wInvalidModel, reqInvalidModel)
	if wInvalidModel.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid model format, got %d", wInvalidModel.Code)
	}
	if !strings.Contains(wInvalidModel.Body.String(), "Invalid AI model format") {
		t.Errorf("expected body to mention invalid format, got: %s", wInvalidModel.Body.String())
	}
}

func TestGenerateSizingDiagramPromptsValidation(t *testing.T) {
	// Test empty measurements
	reqEmpty := httptest.NewRequest("POST", "/api/admin/sizing-types/generate-prompts", strings.NewReader(`{"clothing_type": "مانتو", "measurements": []}`))
	reqEmpty.Header.Set("Content-Type", "application/json")
	wEmpty := httptest.NewRecorder()
	GenerateSizingDiagramPrompts(wEmpty, reqEmpty)
	if wEmpty.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty measurements, got %d", wEmpty.Code)
	}

	// Test invalid model format
	reqInvalidModel := httptest.NewRequest("POST", "/api/admin/sizing-types/generate-prompts", strings.NewReader(`{"clothing_type": "مانتو", "model": "invalid model", "measurements": [{"key":"chest","label":"عرض سینه"}]}`))
	reqInvalidModel.Header.Set("Content-Type", "application/json")
	wInvalidModel := httptest.NewRecorder()
	GenerateSizingDiagramPrompts(wInvalidModel, reqInvalidModel)
	if wInvalidModel.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid model format, got %d", wInvalidModel.Code)
	}

	// Test valid fallback execution
	reqValid := httptest.NewRequest("POST", "/api/admin/sizing-types/generate-prompts", strings.NewReader(`{
		"clothing_type": "مانتو کژوال",
		"measurements": [
			{"key":"chest_width","label":"عرض سینه"},
			{"key":"total_length","label":"قد کل"}
		]
	}`))
	reqValid.Header.Set("Content-Type", "application/json")
	wValid := httptest.NewRecorder()
	GenerateSizingDiagramPrompts(wValid, reqValid)
	if wValid.Code != http.StatusOK {
		t.Errorf("expected 200 for valid diagram prompt regeneration, got %d: %s", wValid.Code, wValid.Body.String())
	}
	var res struct {
		ImagePromptVector    string `json:"image_prompt_vector"`
		ImagePromptMannequin string `json:"image_prompt_mannequin"`
	}
	if err := json.Unmarshal(wValid.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !strings.Contains(res.ImagePromptVector, "مانتو کژوال") || !strings.Contains(res.ImagePromptMannequin, "invisible ghost mannequin") {
		t.Errorf("unexpected diagram prompt response: %+v", res)
	}
}

func TestExtrapolateSizingMeasurementsValidation(t *testing.T) {
	// 1. Missing chart
	reqEmptyChart := httptest.NewRequest("POST", "/api/admin/sizing-types/extrapolate-measurements", strings.NewReader(`{
		"clothing_type": "کت",
		"measurements": [{"key":"chest","label":"عرض سینه"}],
		"size_chart": []
	}`))
	reqEmptyChart.Header.Set("Content-Type", "application/json")
	wEmptyChart := httptest.NewRecorder()
	ExtrapolateSizingMeasurements(wEmptyChart, reqEmptyChart)
	if wEmptyChart.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty size chart, got %d", wEmptyChart.Code)
	}

	// 2. Missing measurements
	reqEmptyDefs := httptest.NewRequest("POST", "/api/admin/sizing-types/extrapolate-measurements", strings.NewReader(`{
		"clothing_type": "کت",
		"measurements": [],
		"size_chart": [{"size":"M","values":{}}]
	}`))
	reqEmptyDefs.Header.Set("Content-Type", "application/json")
	wEmptyDefs := httptest.NewRecorder()
	ExtrapolateSizingMeasurements(wEmptyDefs, reqEmptyDefs)
	if wEmptyDefs.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty measurements, got %d", wEmptyDefs.Code)
	}

	// 3. Invalid model format
	reqInvalidModel := httptest.NewRequest("POST", "/api/admin/sizing-types/extrapolate-measurements", strings.NewReader(`{
		"clothing_type": "کت",
		"model": "bad model with spaces",
		"measurements": [{"key":"chest","label":"عرض سینه"}],
		"size_chart": [{"size":"M","values":{"chest":"50"}}]
	}`))
	reqInvalidModel.Header.Set("Content-Type", "application/json")
	wInvalidModel := httptest.NewRecorder()
	ExtrapolateSizingMeasurements(wInvalidModel, reqInvalidModel)
	if wInvalidModel.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid model format, got %d", wInvalidModel.Code)
	}

	// 4. Valid extrapolation via fallback
	reqValid := httptest.NewRequest("POST", "/api/admin/sizing-types/extrapolate-measurements", strings.NewReader(`{
		"clothing_type": "کت زنانه",
		"measurements": [{"key":"chest","label":"عرض سینه"}],
		"size_chart": [
			{"size":"S","values":{"chest":""}},
			{"size":"M","values":{"chest":"50"}},
			{"size":"L","values":{"chest":""}}
		]
	}`))
	reqValid.Header.Set("Content-Type", "application/json")
	wValid := httptest.NewRecorder()
	ExtrapolateSizingMeasurements(wValid, reqValid)
	if wValid.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid extrapolation, got %d: %s", wValid.Code, wValid.Body.String())
	}

	var res services.ExtrapolateMeasurementsResult
	if err := json.Unmarshal(wValid.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(res.SizeChart) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(res.SizeChart))
	}
	if res.SizeChart[0].Values["chest"] != "48" || res.SizeChart[1].Values["chest"] != "50" || res.SizeChart[2].Values["chest"] != "52" {
		t.Errorf("unexpected extrapolated chart values: %+v", res.SizeChart)
	}
}
