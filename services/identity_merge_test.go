package services

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

// mergeCartLines is a pure fold over cart items (stock lookups are skipped
// with a nil database), so its clamp/idempotency behavior is unit-testable.

func TestMergeCartLinesAppendsNewItems(t *testing.T) {
	target := []models.CartItem{}
	shadow := []models.CartItem{cartLine(primitive.NewObjectID(), "v1", "M", 2)}

	merged, changed := mergeCartLines(target, shadow, nil, t.Context())
	if !changed {
		t.Fatalf("appending a new line must report a change")
	}
	if len(merged) != 1 || merged[0].Quantity != 2 {
		t.Fatalf("unexpected merged cart: %+v", merged)
	}
}

func TestMergeCartLinesClampsDuplicateLinesToCap(t *testing.T) {
	product := primitive.NewObjectID()
	target := []models.CartItem{cartLine(product, "v1", "M", 6)}
	shadow := []models.CartItem{cartLine(product, "v1", "M", 9)}

	// Nil database: no live stock, so only the shared 10-line cap applies.
	merged, changed := mergeCartLines(target, shadow, nil, t.Context())
	if !changed {
		t.Fatalf("a clamped duplicate must report a change")
	}
	if len(merged) != 1 {
		t.Fatalf("duplicate lines must fold into one, got %d", len(merged))
	}
	if merged[0].Quantity != mergeMaxItemQuantity {
		t.Fatalf("quantity must clamp to %d, got %d", mergeMaxItemQuantity, merged[0].Quantity)
	}
}

func TestMergeCartLinesDifferentSizesStaySeparate(t *testing.T) {
	product := primitive.NewObjectID()
	target := []models.CartItem{cartLine(product, "v1", "M", 2)}
	shadow := []models.CartItem{cartLine(product, "v1", "L", 1)}

	merged, changed := mergeCartLines(target, shadow, nil, t.Context())
	if !changed || len(merged) != 2 {
		t.Fatalf("different sizes must not fold together, got %+v changed=%v", merged, changed)
	}
}

func TestMergeCartLinesEmptyShadowIsNoOp(t *testing.T) {
	target := []models.CartItem{cartLine(primitive.NewObjectID(), "v1", "M", 2)}
	merged, changed := mergeCartLines(target, nil, nil, t.Context())
	if changed {
		t.Fatalf("empty shadow must not change the cart")
	}
	if len(merged) != 1 || merged[0].Quantity != 2 {
		t.Fatalf("target cart must be untouched, got %+v", merged)
	}
}

func cartLine(product primitive.ObjectID, variantID, size string, qty int) models.CartItem {
	return models.CartItem{
		ProductID: product,
		Variant:   models.CartVariant{VariantID: variantID, Size: size},
		Quantity:  qty,
	}
}
