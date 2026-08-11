package handlers

import (
	"testing"

	"backEnd/models"
)

func TestCartVariantsMatchFallsBackToColorWhenIDsDiffer(t *testing.T) {
	base := models.CartVariant{
		VariantID: "old-id",
		Size:      "XXL",
		Color:     "#697b81",
		ColorName: "آبی-خاکستری ملایم",
	}

	tests := []struct {
		name  string
		other models.CartVariant
		match bool
	}{
		{
			name:  "same color with refreshed variant id",
			other: models.CartVariant{VariantID: "new-id", Size: "XXL", Color: "#697b81"},
			match: true,
		},
		{
			name:  "different size",
			other: models.CartVariant{VariantID: "new-id", Size: "XL", Color: "#697b81"},
			match: false,
		},
		{
			name:  "different color",
			other: models.CartVariant{VariantID: "new-id", Size: "XXL", Color: "#ffffff"},
			match: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := cartVariantsMatch(base, test.other); got != test.match {
				t.Fatalf("cartVariantsMatch() = %v, want %v", got, test.match)
			}
		})
	}
}
