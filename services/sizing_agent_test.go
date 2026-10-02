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
	if !strings.Contains(prompt, "Technical flat sketch vector of the garment") {
		t.Errorf("prompt missing vector diagram style block")
	}
	if !strings.Contains(prompt, "#FAF7F2") {
		t.Errorf("prompt missing off-white background color code")
	}
	if !strings.Contains(prompt, "invisible ghost mannequin (hollow-man 3D effect)") {
		t.Errorf("prompt missing mannequin diagram style block")
	}
	if !strings.Contains(prompt, "#FFFFFF") {
		t.Errorf("prompt missing white background color code")
	}
	if !strings.Contains(prompt, "image_prompt_mannequin") {
		t.Errorf("prompt missing image_prompt_mannequin directive")
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
		"nano_banana_prompt": "Minimalist premium fashion size-guide diagram... The garment is a tailored blazer... 1. A vertical line along the side, labeled \"قد کل\"",
		"image_prompt_mannequin": "High-end luxury fashion studio product photography on an invisible ghost mannequin... labeled \"قد کل\""
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
	if result.ImagePromptMannequin == "" {
		t.Errorf("expected ImagePromptMannequin to be parsed")
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

func TestSizingAgentPromptFallbacks(t *testing.T) {
	// 1. nano_banana_prompt provided, others empty
	res1 := SizingAgentResult{
		NanoBananaPrompt: "vector-prompt",
	}
	if res1.ImagePromptVector == "" {
		res1.ImagePromptVector = res1.NanoBananaPrompt
	}
	if res1.ImagePrompt == "" {
		res1.ImagePrompt = res1.ImagePromptVector
	}
	if res1.ImagePromptVector != "vector-prompt" || res1.ImagePrompt != "vector-prompt" {
		t.Errorf("res1 fallback failed: %+v", res1)
	}

	// 2. image_prompt_vector provided, nano_banana_prompt empty
	res2 := SizingAgentResult{
		ImagePromptVector: "vector-prompt-2",
	}
	if res2.NanoBananaPrompt == "" {
		res2.NanoBananaPrompt = res2.ImagePromptVector
	}
	if res2.ImagePrompt == "" {
		res2.ImagePrompt = res2.ImagePromptVector
	}
	if res2.NanoBananaPrompt != "vector-prompt-2" || res2.ImagePrompt != "vector-prompt-2" {
		t.Errorf("res2 fallback failed: %+v", res2)
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
	for _, requiredField := range []string{"name", "slug", "measurements", "admin_measurement_guide", "nano_banana_prompt", "image_prompt_mannequin"} {
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
			"nano_banana_prompt":"vector diagram",
			"image_prompt_mannequin":"mannequin diagram"
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
	if !strings.Contains(fake.calls[1].prompt, `"style_notes":"اورسایز"`) {
		t.Errorf("second prompt missing style notes in input JSON: %s", fake.calls[1].prompt)
	}
	for _, directive := range []string{
		"You are an expert master fashion pattern maker and garment sizing specialist for an Iranian premium fashion e-commerce brand.",
		"natural, fluent, and highly understandable Persian for buyers",
		"thorough Persian advice summarizing how this garment is meant to fit, fabric drape/stretch considerations, sizing recommendations between two sizes, and styling notes",
		"ONE short, cohesive paragraph consisting of only a couple of sentences",
		"ایستایی و تن‌خور لباس روی اندام",
		"رعایت نیم‌فاصله",
		"Do NOT produce bullet points, numbered lists, headings, tape-measure instructions, or long explanations",
	} {
		if !strings.Contains(fake.calls[1].prompt, directive) {
			t.Errorf("second prompt missing buyer-guide directive %q", directive)
		}
	}
	if result.GeneralFitGuide == "" || result.AdminMeasurementGuide == "" {
		t.Fatalf("expected buyer guide and transient admin guide in result: %+v", result)
	}
	if result.ImagePrompt != result.NanoBananaPrompt {
		t.Errorf("ImagePrompt alias was not preserved")
	}
	if result.ImagePromptVector != "vector diagram" {
		t.Errorf("expected ImagePromptVector to be set, got %q", result.ImagePromptVector)
	}
	if result.ImagePromptMannequin != "mannequin diagram" {
		t.Errorf("expected ImagePromptMannequin to be set, got %q", result.ImagePromptMannequin)
	}
}

func TestUpdateDiagramPromptsWithModel(t *testing.T) {
	measurements := []SizingAgentMeasurement{
		{Key: "chest_width", Label: "عرض سینه"},
		{Key: "total_length", Label: "قد کل"},
	}

	// 1. Success case through structured client
	fakeSuccess := &fakeSizingStructuredClient{responses: []*StructuredResponse{
		{Content: `{"image_prompt_vector":"custom vector prompt","image_prompt_mannequin":"custom mannequin prompt"}`},
	}}

	agentSuccess := &SizingAgent{openRouter: fakeSuccess}
	res, err := agentSuccess.UpdateDiagramPromptsWithModel(context.Background(), "کت زنانه", "کژوال", measurements, "old-vector", "old-mannequin", "test-model")
	if err != nil {
		t.Fatalf("UpdateDiagramPromptsWithModel failed: %v", err)
	}
	if res.ImagePromptVector != "custom vector prompt" || res.ImagePromptMannequin != "custom mannequin prompt" {
		t.Errorf("unexpected prompts from success response: %+v", res)
	}
	if len(fakeSuccess.calls) != 1 {
		t.Fatalf("expected 1 call, got %d", len(fakeSuccess.calls))
	}
	if fakeSuccess.calls[0].model != "test-model" {
		t.Errorf("expected model override, got %s", fakeSuccess.calls[0].model)
	}
	if !strings.Contains(fakeSuccess.calls[0].prompt, "Remaining Measurements (2 items)") {
		t.Errorf("prompt missing item count in call: %s", fakeSuccess.calls[0].prompt)
	}
	if !strings.Contains(fakeSuccess.calls[0].prompt, "old-vector") || !strings.Contains(fakeSuccess.calls[0].prompt, "old-mannequin") {
		t.Errorf("prompt missing current prompts in call: %s", fakeSuccess.calls[0].prompt)
	}

	// 2. Fallback case on error or malformed response
	fakeFallback := &fakeSizingStructuredClient{responses: []*StructuredResponse{
		{Content: `invalid json`},
	}}
	agentFallback := &SizingAgent{openRouter: fakeFallback}
	resFallback, err := agentFallback.UpdateDiagramPromptsWithModel(context.Background(), "کت زنانه", "کژوال", measurements, "", "", "")
	if err != nil {
		t.Fatalf("UpdateDiagramPromptsWithModel fallback failed: %v", err)
	}
	if !strings.Contains(resFallback.ImagePromptVector, "کت زنانه (کژوال)") ||
		!strings.Contains(resFallback.ImagePromptVector, `1. A dimension line indicating chest_width, labeled "عرض سینه"`) ||
		!strings.Contains(resFallback.ImagePromptVector, `2. A dimension line indicating total_length, labeled "قد کل"`) {
		t.Errorf("vector prompt fallback format mismatch: %s", resFallback.ImagePromptVector)
	}
	if !strings.Contains(resFallback.ImagePromptMannequin, "invisible ghost mannequin") ||
		!strings.Contains(resFallback.ImagePromptMannequin, `1. An elegant dimension line indicating chest_width, labeled "عرض سینه"`) ||
		!strings.Contains(resFallback.ImagePromptMannequin, `2. An elegant dimension line indicating total_length, labeled "قد کل"`) {
		t.Errorf("mannequin prompt fallback format mismatch: %s", resFallback.ImagePromptMannequin)
	}

	// 3. Validation case: empty measurements
	_, errEmpty := agentSuccess.UpdateDiagramPromptsWithModel(context.Background(), "کت زنانه", "", nil, "", "", "")
	if errEmpty == nil {
		t.Errorf("expected error on empty measurements")
	}
}
