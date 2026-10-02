package services

import (
	"context"
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
				"fit_advice": "قد کت معمولاً تا خط باسن یا زیر آن در نظر گرفته می‌شود.",
				"garment_measurement": "لباس را صاف و بدون کشش روی سطح صاف قرار دهید."
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
	if defs[0].GarmentMeasurement == "" {
		t.Errorf("garment measurement instruction was not converted: %+v", defs[0])
	}
}

func TestSizingAgentSchemaValidity(t *testing.T) {
	envelope := sizingAgentSchema()
	if envelope["name"] != "sizing_definitions_output" {
		t.Errorf("envelope name must be sizing_definitions_output, got %v", envelope["name"])
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
	for _, requiredField := range []string{"name", "slug", "measurements", "admin_measurement_guide", "nano_banana_prompt"} {
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
	itemProps, ok := items["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("measurement item properties must be a map")
	}
	if _, exists := itemProps["garment_measurement"]; !exists {
		t.Errorf("measurement schema missing garment_measurement semantics")
	}

	guideSchema := sizingBuyerGuideSchema()
	if guideSchema["name"] != "sizing_buyer_guide_output" {
		t.Errorf("buyer guide schema has unexpected name: %v", guideSchema["name"])
	}
	guide, ok := guideSchema["schema"].(map[string]interface{})
	if !ok {
		t.Fatalf("buyer guide schema must be a map")
	}
	if guide["additionalProperties"] != false {
		t.Errorf("buyer guide schema additionalProperties must be false")
	}
	if _, exists := guide["properties"].(map[string]interface{})["general_fit_guide"]; !exists {
		t.Errorf("buyer guide schema missing general_fit_guide")
	}
}

type sizingCall struct {
	prompt string
	schema map[string]interface{}
	model  string
}

type fakeSizingStructuredClient struct {
	responses []*StructuredResponse
	calls     []sizingCall
}

func (f *fakeSizingStructuredClient) CallWithSchemaAndModel(_ context.Context, prompt string, schema map[string]interface{}, model string) (*StructuredResponse, error) {
	f.calls = append(f.calls, sizingCall{prompt: prompt, schema: schema, model: model})
	response := f.responses[len(f.calls)-1]
	return response, nil
}

func TestSizingAgentResearchUsesSequentialDefinitionAndBuyerGuideCalls(t *testing.T) {
	fake := &fakeSizingStructuredClient{responses: []*StructuredResponse{
		{Content: `{
			"name":"کت بلیزر زنانه",
			"slug":"women-blazer",
			"measurements":[{
				"key":"chest_width",
				"label":"عرض سینه",
				"body_guide":"دور برجسته‌ترین بخش سینه را اندازه بگیرید.",
				"fit_advice":"عرض تخت لباس نصف دور سینه است.",
				"garment_measurement":"لباس را تخت کنید و از زیر حلقه تا زیر حلقه به صورت عرض تخت اندازه بگیرید."
			}],
			"admin_measurement_guide":"لباس را بدون کشش روی سطح صاف قرار دهید.",
			"nano_banana_prompt":"diagram"
		}`},
		{Content: `{"general_fit_guide":"ابتدا دور سینه را در برجسته‌ترین قسمت اندازه بگیرید؛ سپس با جدول لباس مقایسه کنید."}`},
	}}

	agent := &SizingAgent{openRouter: fake}
	result, err := agent.ResearchWithModel(context.Background(), "کت بلیزر زنانه", "اورسایز", "test/model")
	if err != nil {
		t.Fatalf("ResearchWithModel failed: %v", err)
	}
	if len(fake.calls) != 2 {
		t.Fatalf("expected exactly two sequential calls, got %d", len(fake.calls))
	}
	if fake.calls[0].model != "test/model" || fake.calls[1].model != "test/model" {
		t.Fatalf("expected model override on both calls, got %q and %q", fake.calls[0].model, fake.calls[1].model)
	}
	if strings.Contains(fake.calls[0].prompt, "buyer-facing general fit guide") == false {
		t.Errorf("first prompt must explicitly exclude the buyer guide")
	}
	if strings.Contains(fake.calls[0].prompt, "general_fit_guide") == false {
		t.Errorf("first prompt must name the excluded buyer guide field")
	}
	if !strings.Contains(fake.calls[1].prompt, `"key":"chest_width"`) ||
		!strings.Contains(fake.calls[1].prompt, `"label":"عرض سینه"`) ||
		!strings.Contains(fake.calls[1].prompt, `"garment_measurement":"لباس را تخت کنید`) {
		t.Errorf("second prompt does not contain the exact generated measurement JSON: %s", fake.calls[1].prompt)
	}
	if result.GeneralFitGuide == "" || result.AdminMeasurementGuide == "" {
		t.Fatalf("expected buyer guide and transient admin guide in result: %+v", result)
	}
	if result.ImagePrompt != result.NanoBananaPrompt {
		t.Errorf("ImagePrompt alias was not preserved")
	}
}
