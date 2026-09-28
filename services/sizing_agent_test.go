package services

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBuildSizingAgentPromptContainsRequiredDirectives(t *testing.T) {
	clothingType := "کت بلیزر زنانه"
	styleNotes := "اورسایز با اپل سرشانه"
	searchCtx := "قد کل و عرض سینه در کت‌های استاندارد"

	prompt := buildSizingAgentPrompt(clothingType, styleNotes, searchCtx)

	if !strings.Contains(prompt, clothingType) {
		t.Errorf("prompt missing clothing type")
	}
	if !strings.Contains(prompt, styleNotes) {
		t.Errorf("prompt missing style notes")
	}
	if !strings.Contains(prompt, searchCtx) {
		t.Errorf("prompt missing search context")
	}
	if !strings.Contains(prompt, "Minimalist premium fashion size-guide diagram") {
		t.Errorf("prompt missing shared diagram style block")
	}
	if !strings.Contains(prompt, "#FAF7F2") {
		t.Errorf("prompt missing background color code")
	}
}

func TestSizingAgentResultParsingAndConversion(t *testing.T) {
	sampleJSON := `{
		"name": "کت بلیزر زنانه",
		"slug": "women-blazer",
		"measurements": [
			{
				"key": "total_length",
				"label": "قد کل",
				"body_guide": "از کنار یقه (گودی گردن) روی برجستگی سینه تا قد دلخواه اندازه بگیرید.",
				"fit_advice": "قد کت معمولاً تا خط باسن یا زیر آن در نظر گرفته می‌شود."
			},
			{
				"key": "chest",
				"label": "عرض سینه",
				"body_guide": "متر را دور برجسته‌ترین قسمت سینه به صورت افقی قرار دهید.",
				"fit_advice": "برای کت بلیزر معمولاً ۴ الی ۶ سانتی‌متر آزادی در دور سینه لحاظ می‌شود."
			},
			{
				"key": "shoulder",
				"label": "عرض شانه",
				"body_guide": "از انتهای سرشانه راست تا انتهای سرشانه چپ از پشت اندازه بگیرید.",
				"fit_advice": "در مدل‌های دارای اپل، سرشانه کمی پهن‌تر از سرشانه طبیعی بدن است."
			},
			{
				"key": "sleeve_length",
				"label": "قد آستین",
				"body_guide": "از نقطه اتصال سرشانه تا روی مچ دست در حالت دست کمی خمیده اندازه بگیرید.",
				"fit_advice": "قد آستین باید درست روی استخوان مچ قرار بگیرد."
			},
			{
				"key": "waist",
				"label": "دور کمر",
				"body_guide": "باریک‌ترین قسمت کمر طبیعی را متر بزنید.",
				"fit_advice": "در کت‌های راسته آزادی کمر بیشتر است."
			}
		],
		"general_fit_guide": "کت بلیزر زنانه با برش استاندارد، مناسب استایل‌های کژوال و رسمی است.",
		"nano_banana_prompt": "Minimalist premium fashion size-guide diagram... The garment is a tailored blazer... 1. A vertical line along the side, labeled \"قد کل\""
	}`

	var result SizingAgentResult
	if err := json.Unmarshal([]byte(sampleJSON), &result); err != nil {
		t.Fatalf("failed to unmarshal sample sizing agent JSON: %v", err)
	}

	if result.Name != "کت بلیزر زنانه" {
		t.Errorf("expected name 'کت بلیزر زنانه', got %s", result.Name)
	}
	if result.Slug != "women-blazer" {
		t.Errorf("expected slug 'women-blazer', got %s", result.Slug)
	}
	if len(result.Measurements) != 5 {
		t.Fatalf("expected 5 measurements, got %d", len(result.Measurements))
	}

	defs := result.ToMeasurementDefs()
	if len(defs) != len(result.Measurements) {
		t.Fatalf("expected %d defs, got %d", len(result.Measurements), len(defs))
	}

	if defs[0].Key != "total_length" || defs[0].Label != "قد کل" {
		t.Errorf("first def mismatch: %+v", defs[0])
	}
}

func TestSizingAgentSchemaValidity(t *testing.T) {
	envelope := sizingAgentSchema()
	if envelope["name"] != "sizing_research_output" {
		t.Errorf("envelope name must be sizing_research_output, got %v", envelope["name"])
	}
	if envelope["strict"] != true {
		t.Errorf("envelope strict must be true, got %v", envelope["strict"])
	}

	schema, ok := envelope["schema"].(map[string]interface{})
	if !ok {
		t.Fatalf("envelope schema must be a map")
	}

	if schema["type"] != "object" {
		t.Errorf("schema type must be object")
	}
	if schema["additionalProperties"] != false {
		t.Errorf("schema additionalProperties must be false")
	}

	props, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("properties must be a map")
	}
	for _, requiredField := range []string{"name", "slug", "measurements", "general_fit_guide", "nano_banana_prompt"} {
		if _, exists := props[requiredField]; !exists {
			t.Errorf("missing property in schema: %s", requiredField)
		}
	}

	measurements, ok := props["measurements"].(map[string]interface{})
	if !ok {
		t.Fatalf("measurements must be a map")
	}
	items, ok := measurements["items"].(map[string]interface{})
	if !ok {
		t.Fatalf("measurements items must be a map")
	}
	if items["additionalProperties"] != false {
		t.Errorf("measurements items additionalProperties must be false")
	}
}
