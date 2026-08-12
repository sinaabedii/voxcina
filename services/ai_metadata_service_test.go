package services

import (
	"testing"

	"backEnd/models"
)

func TestNormalizeVariantPattern(t *testing.T) {
	tests := map[string]string{
		"plain":          "ساده",
		"راه راه":        "راه‌راه",
		"checked":        "چهارخانه",
		"floral print":   "گلدار",
		"logo graphic":   "لوگو",
		"unknown detail": "",
	}
	for input, want := range tests {
		if got := normalizeVariantPattern(input); got != want {
			t.Errorf("normalizeVariantPattern(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestCanonicalVocabularyPairPreservesPersianSearchValue(t *testing.T) {
	vocab := []models.VocabularyMapping{{
		PersianTerms:  []string{"پنبه", "نخی"},
		EnglishTerms:  []string{"cotton"},
		StandardValue: "cotton",
	}}

	persian, standard := canonicalVocabularyPair("cotton", vocab)
	if persian != "پنبه" || standard != "cotton" {
		t.Fatalf("canonicalVocabularyPair() = (%q, %q), want (%q, %q)", persian, standard, "پنبه", "cotton")
	}
}

func TestVariantMetadataConfidenceIsClamped(t *testing.T) {
	if got := clampConfidence(-0.2); got != 0 {
		t.Fatalf("negative confidence = %v, want 0", got)
	}
	if got := clampConfidence(1.5); got != 1 {
		t.Fatalf("high confidence = %v, want 1", got)
	}
}
