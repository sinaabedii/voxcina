package handlers

import (
	"testing"

	"backEnd/models"
)

func TestValidateVariantStockRejectsColorlessAndIncompleteVariants(t *testing.T) {
	product := &models.Product{ColorVariants: []models.ColorVariant{
		{VariantID: "colored", Color: "#000000", ColorName: "مشکی", Sizes: []models.SizeVariant{{Size: "M", Quantity: 2}}},
		{VariantID: "colorless", Color: "", ColorName: "", Sizes: []models.SizeVariant{{Size: "Free-Size", Quantity: 2}}},
	}}

	for name, variant := range map[string]models.CartVariant{
		"missing variant ID": {Size: "M", Color: "#000000"},
		"missing size":       {VariantID: "colored", Color: "#000000"},
		"colorless variant":  {VariantID: "colorless", Size: "Free-Size"},
	} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := validateVariantStock(product, variant, 1); err == nil {
				t.Fatalf("expected variant to be rejected: %+v", variant)
			}
		})
	}
}

func TestIsConcreteCartVariant(t *testing.T) {
	valid := models.CartVariant{VariantID: "variant-1", Size: "M", Color: "#000000"}
	if !isConcreteCartVariant(valid) {
		t.Fatal("expected a variant with ID, size, and color to be valid")
	}

	invalid := []models.CartVariant{
		{VariantID: "", Size: "M", Color: "#000000"},
		{VariantID: "variant-1", Size: "", Color: "#000000"},
		{VariantID: "variant-1", Size: "M", Color: "", ColorName: ""},
	}
	for _, variant := range invalid {
		if isConcreteCartVariant(variant) {
			t.Fatalf("expected invalid cart variant: %+v", variant)
		}
	}
}

func TestIsConcreteOrderVariantRejectsColorlessItems(t *testing.T) {
	if isConcreteOrderVariant(models.OrderVariant{VariantID: "variant-1", Size: "Free-Size"}) {
		t.Fatal("colorless order variants must be rejected")
	}
	if !isConcreteOrderVariant(models.OrderVariant{VariantID: "variant-1", Size: "M", ColorName: "مشکی"}) {
		t.Fatal("colored order variants should be accepted")
	}
}
