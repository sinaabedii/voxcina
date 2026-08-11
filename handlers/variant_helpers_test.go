package handlers

import (
	"testing"

	"backEnd/models"
)

func TestFindColorVariantMatchesColorlessVariant(t *testing.T) {
	product := models.Product{ColorVariants: []models.ColorVariant{
		{Color: "#000000", ColorName: "مشکی"},
		{Color: "", ColorName: ""},
	}}

	variant, index, ok := findColorVariant(&product, "", "")
	if !ok {
		t.Fatal("expected an empty color selection to match the colorless variant")
	}
	if index != 1 || variant.Color != "" || variant.ColorName != "" {
		t.Fatalf("matched the wrong variant: index=%d variant=%+v", index, variant)
	}
}

func TestFindColorVariantDoesNotMatchEmptyColorToColoredVariant(t *testing.T) {
	product := models.Product{ColorVariants: []models.ColorVariant{
		{Color: "#000000", ColorName: "مشکی"},
	}}

	if _, _, ok := findColorVariant(&product, "", ""); ok {
		t.Fatal("empty color selection must not match a colored variant")
	}
}
