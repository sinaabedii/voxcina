package handlers

import (
	"strings"

	"backEnd/models"
)

func cleanVariantValue(value string) string {
	return strings.TrimSpace(value)
}

func variantLookupValues(color, colorName string) []string {
	values := []string{}
	seen := map[string]bool{}
	for _, value := range []string{color, colorName} {
		value = cleanVariantValue(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		values = append(values, value)
	}
	return values
}

func colorVariantMatches(cv models.ColorVariant, color, colorName string) bool {
	values := variantLookupValues(color, colorName)
	if len(values) == 0 {
		return false
	}

	for _, value := range values {
		if cleanVariantValue(cv.Color) == value || cleanVariantValue(cv.ColorName) == value {
			return true
		}
	}
	return false
}

func findColorVariant(product *models.Product, color, colorName string) (models.ColorVariant, int, bool) {
	if product == nil {
		return models.ColorVariant{}, -1, false
	}

	for idx, cv := range product.ColorVariants {
		if colorVariantMatches(cv, color, colorName) {
			return cv, idx, true
		}
	}
	return models.ColorVariant{}, -1, false
}

func findSizeVariant(cv models.ColorVariant, size string) (models.SizeVariant, int, bool) {
	for idx, sv := range cv.Sizes {
		if sv.Size == size {
			return sv, idx, true
		}
	}
	return models.SizeVariant{}, -1, false
}

func canonicalColorValue(cv models.ColorVariant) string {
	if cleanVariantValue(cv.Color) != "" {
		return cv.Color
	}
	return cv.ColorName
}

func enrichCartVariantFromProduct(product *models.Product, variant models.CartVariant) (models.CartVariant, int, int, bool) {
	enriched := models.CartVariant{
		Size:      variant.Size,
		Color:     variant.Color,
		ColorName: variant.ColorName,
		SKU:       variant.SKU,
	}

	cv, colorIdx, ok := findColorVariant(product, variant.Color, variant.ColorName)
	if !ok {
		return enriched, -1, -1, false
	}

	enriched.Color = canonicalColorValue(cv)
	enriched.ColorName = cv.ColorName

	if sv, sizeIdx, ok := findSizeVariant(cv, variant.Size); ok {
		enriched.SKU = sv.SKU
		return enriched, colorIdx, sizeIdx, true
	}

	return enriched, colorIdx, -1, true
}

func normalizeOrderVariantFromProduct(product *models.Product, variant models.OrderVariant) (models.OrderVariant, int, int, bool) {
	normalized := models.OrderVariant{
		Size:      variant.Size,
		Color:     variant.Color,
		ColorName: variant.ColorName,
		SKU:       variant.SKU,
	}

	cv, colorIdx, ok := findColorVariant(product, variant.Color, variant.ColorName)
	if !ok {
		return normalized, -1, -1, false
	}

	normalized.Color = canonicalColorValue(cv)
	normalized.ColorName = cv.ColorName

	if sv, sizeIdx, ok := findSizeVariant(cv, variant.Size); ok {
		normalized.SKU = sv.SKU
		return normalized, colorIdx, sizeIdx, true
	}

	return normalized, colorIdx, -1, true
}

func cartVariantsMatch(a, b models.CartVariant) bool {
	if a.Size != b.Size {
		return false
	}
	aValues := variantLookupValues(a.Color, a.ColorName)
	bValues := variantLookupValues(b.Color, b.ColorName)
	if len(aValues) == 0 && len(bValues) == 0 {
		return true
	}
	for _, av := range aValues {
		for _, bv := range bValues {
			if av == bv {
				return true
			}
		}
	}
	return false
}

func variantKeyColor(variant models.CartVariant) string {
	if cleanVariantValue(variant.Color) != "" {
		return variant.Color
	}
	return variant.ColorName
}

func selectedVariantImage(product models.Product, color, colorName string) string {
	if cv, _, ok := findColorVariant(&product, color, colorName); ok && len(cv.Images) > 0 {
		return cv.Images[0]
	}
	if len(product.MainImages) > 0 {
		return product.MainImages[0]
	}
	if len(product.ColorVariants) > 0 && len(product.ColorVariants[0].Images) > 0 {
		return product.ColorVariants[0].Images[0]
	}
	return ""
}
