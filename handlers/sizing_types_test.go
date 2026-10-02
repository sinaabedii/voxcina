package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backEnd/models"
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
