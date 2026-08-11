package handlers

import (
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func ensureColorVariantIDs(variants []models.ColorVariant) {
	models.EnsureColorVariantIDs(variants)
}

// preserveColorVariantIDs keeps IDs when older admin clients submit variants
// without the new field. New clients send the ID directly; the fallbacks only
// cover the migration window and never use a color value as the final ID.
func preserveColorVariantIDs(variants, existing []models.ColorVariant) {
	used := make(map[string]bool, len(existing))
	for i := range variants {
		if variants[i].VariantID != "" {
			used[variants[i].VariantID] = true
		}
	}

	for i := range variants {
		if variants[i].VariantID != "" {
			continue
		}

		for _, old := range existing {
			if old.VariantID == "" || used[old.VariantID] {
				continue
			}
			if strings.TrimSpace(old.Color) == strings.TrimSpace(variants[i].Color) &&
				strings.TrimSpace(old.ColorName) == strings.TrimSpace(variants[i].ColorName) {
				variants[i].VariantID = old.VariantID
				used[old.VariantID] = true
				break
			}
		}

		if variants[i].VariantID == "" && i < len(existing) && existing[i].VariantID != "" && !used[existing[i].VariantID] {
			variants[i].VariantID = existing[i].VariantID
			used[existing[i].VariantID] = true
		}
		if variants[i].VariantID == "" {
			variants[i].VariantID = primitive.NewObjectID().Hex()
			used[variants[i].VariantID] = true
		}
	}
}

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

func findColorVariantByID(product *models.Product, variantID string) (models.ColorVariant, int, bool) {
	if product == nil || variantID == "" {
		return models.ColorVariant{}, -1, false
	}
	for idx, variant := range product.ColorVariants {
		if variant.VariantID == variantID {
			return variant, idx, true
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
		VariantID: variant.VariantID,
		Size:      variant.Size,
		Color:     variant.Color,
		ColorName: variant.ColorName,
		SKU:       variant.SKU,
	}

	var cv models.ColorVariant
	var colorIdx int
	var ok bool
	if variant.VariantID != "" {
		cv, colorIdx, ok = findColorVariantByID(product, variant.VariantID)
	} else {
		cv, colorIdx, ok = findColorVariant(product, variant.Color, variant.ColorName)
	}
	if !ok {
		return enriched, -1, -1, false
	}

	enriched.Color = canonicalColorValue(cv)
	enriched.ColorName = cv.ColorName
	enriched.VariantID = cv.VariantID

	if sv, sizeIdx, ok := findSizeVariant(cv, variant.Size); ok {
		enriched.SKU = sv.SKU
		return enriched, colorIdx, sizeIdx, true
	}

	return enriched, colorIdx, -1, true
}

func normalizeOrderVariantFromProduct(product *models.Product, variant models.OrderVariant) (models.OrderVariant, int, int, bool) {
	normalized := models.OrderVariant{
		VariantID: variant.VariantID,
		Size:      variant.Size,
		Color:     variant.Color,
		ColorName: variant.ColorName,
		SKU:       variant.SKU,
	}

	var cv models.ColorVariant
	var colorIdx int
	var ok bool
	if variant.VariantID != "" {
		cv, colorIdx, ok = findColorVariantByID(product, variant.VariantID)
	} else {
		cv, colorIdx, ok = findColorVariant(product, variant.Color, variant.ColorName)
	}
	if !ok {
		return normalized, -1, -1, false
	}

	normalized.Color = canonicalColorValue(cv)
	normalized.ColorName = cv.ColorName
	normalized.VariantID = cv.VariantID

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
	if a.VariantID != "" && b.VariantID != "" && a.VariantID == b.VariantID {
		return true
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
