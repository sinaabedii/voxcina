package services

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"backEnd/models"
)

// The reported incident: a model answered the variant request with
// "season": "پاییز" — a bare string where the schema says array — and strict
// decoding failed the whole request. The decode boundary must normalize that
// shape instead, and this payload mirrors the incident.
func TestParseVariantAIResponseToleratesScalarSeason(t *testing.T) {
	s := &AIMetadataService{}
	payload := `{
		"namePersian": "شلوار جین نیم‌بگ مردانه آبی",
		"descriptionPersian": "شلوار جین مردانه مدل نیم‌بگ با فیت راحت و آزاد.",
		"keywords": ["شلوار جین مردانه", "شلوار نیم بگ مردانه"],
		"tags": ["شلوار_جین", "نیم_بگ"],
		"materialPersian": "جین",
		"stylePersian": "کژوال",
		"occasionTags": ["روزمره", "سفر"],
		"season": "پاییز",
		"fitType": "آزاد",
		"ageGroup": "بزرگسال",
		"productTypePersian": "شلوار جین",
		"productTypeStandard": "jeans",
		"patternPersian": "ساده",
		"colorFamily": "آبی",
		"confidence": 0.96,
		"reasoning": "Images and title confirm men's semi-baggy blue denim jeans."
	}`
	parsed, err := s.parseVariantAIResponse(payload)
	if err != nil {
		t.Fatalf("parse variant response: %v", err)
	}
	if len(parsed.Season) != 1 || parsed.Season[0] != "پاییز" {
		t.Errorf("season = %v, want [پاییز]", parsed.Season)
	}
	if len(parsed.Keywords) != 2 || len(parsed.Tags) != 2 || len(parsed.OccasionTags) != 2 {
		t.Errorf("array fields mangled: %v / %v / %v", parsed.Keywords, parsed.Tags, parsed.OccasionTags)
	}
	if parsed.FitType != "آزاد" {
		t.Errorf("fitType lost: %q", parsed.FitType)
	}
	// The variant-only fields must survive too: if VariantMetadataResponse ever
	// loses its UnmarshalJSON, the method promoted from the embedded struct runs
	// on the whole payload and quietly drops exactly these fields.
	if parsed.ProductTypePersian != "شلوار جین" || parsed.ProductTypeStandard != "jeans" {
		t.Errorf("variant product type lost: %q / %q", parsed.ProductTypePersian, parsed.ProductTypeStandard)
	}
	if parsed.ColorFamily != "آبی" {
		t.Errorf("colorFamily lost: %q", parsed.ColorFamily)
	}
	if parsed.Confidence != 0.96 {
		t.Errorf("confidence lost: %v", parsed.Confidence)
	}
}

// The product-level endpoint decodes the same struct, so the same
// scalar-for-array deviation must be normalized there as well.
func TestParseAIResponseToleratesScalarStringArrays(t *testing.T) {
	s := &AIMetadataService{}
	parsed, err := s.parseAIResponse(`{
		"namePersian": "شلوار جین",
		"keywords": "شلوار جین مردانه",
		"occasionTags": "روزمره",
		"season": "پاییز",
		"fitDescription": "relaxed fit",
		"garmentPhrase": "men's jeans"
	}`)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(parsed.Keywords) != 1 || parsed.Keywords[0] != "شلوار جین مردانه" {
		t.Errorf("keywords = %v, want one wrapped entry", parsed.Keywords)
	}
	if len(parsed.OccasionTags) != 1 || parsed.OccasionTags[0] != "روزمره" {
		t.Errorf("occasionTags = %v, want one wrapped entry", parsed.OccasionTags)
	}
	if len(parsed.Season) != 1 || parsed.Season[0] != "پاییز" {
		t.Errorf("season = %v, want [پاییز]", parsed.Season)
	}
	if parsed.FitDescription != "relaxed fit" || parsed.GarmentPhrase != "men's jeans" {
		t.Errorf("try-on fields lost: %q / %q", parsed.FitDescription, parsed.GarmentPhrase)
	}
}

// Shape normalization is not type whitewashing: values that carry no string
// data at all must keep failing loudly instead of decoding into garbage.
func TestParseVariantAIResponseStillRejectsNonStringSeason(t *testing.T) {
	s := &AIMetadataService{}
	for _, payload := range []string{`{"season": 5}`, `{"season": {"fall": true}}`} {
		if _, err := s.parseVariantAIResponse(payload); err == nil {
			t.Errorf("expected an error for %s", payload)
		}
	}
}

func TestCoerceStringSliceHandlesEmptyAndNull(t *testing.T) {
	for _, raw := range []string{"null", `""`, "[]"} {
		got, err := coerceStringSlice([]byte(raw))
		if err != nil {
			t.Errorf("coerceStringSlice(%s): %v", raw, err)
		}
		if len(got) != 0 {
			t.Errorf("coerceStringSlice(%s) = %v, want empty", raw, got)
		}
	}
}

// The config file's variant prompt overrides defaultVariantSystemPrompt, so it
// — not the code default — is what production sends. It must declare season and
// the other list fields as JSON arrays; an untyped field list is what let the
// model answer "season": "پاییز" in the first place.
func TestVariantPromptConfigDeclaresArraySchema(t *testing.T) {
	raw, err := os.ReadFile("../config/ai_prompts.json")
	if err != nil {
		t.Fatalf("read prompt config: %v", err)
	}

	var doc struct {
		ProductMetadataGeneration AIPromptConfig `json:"product_metadata_generation"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("prompt config is not valid JSON: %v", err)
	}

	prompt := doc.ProductMetadataGeneration.VariantSystemPrompt
	for _, want := range []string{
		`"season":["string"]`,
		`"keywords":["string"]`,
		`"tags":["string"]`,
		`"occasionTags":["string"]`,
	} {
		if !strings.Contains(prompt, want) {
			t.Errorf("variant_system_prompt schema does not declare %s", want)
		}
	}
}

// validateMetadata filters seasons against the fixed list, so a wrapped scalar
// must reach it as a normal slice — and survive when it is a valid season.
func TestValidateVariantMetadataNormalizesWrappedScalarSeason(t *testing.T) {
	s := &AIMetadataService{}
	v := &VariantMetadataResponse{}
	v.Season = []string{"پاییز"}

	if err := s.validateVariantMetadata(v, map[string][]models.VocabularyMapping{}); err != nil {
		t.Fatalf("validate: %v", err)
	}
	if len(v.Season) != 1 || v.Season[0] != "پاییز" {
		t.Errorf("season = %v, want [پاییز]", v.Season)
	}
}
