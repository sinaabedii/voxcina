package handlers

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
)

// An admin product edit can strand what shoppers are already holding: dropping
// a size to zero, or pulling the product from sale, leaves cart items that can
// never be checked out. Instead of refusing the edit while the product sits in
// carts, the carts are reconciled against the product as it was just saved.

// cartReconcileSummary reports what a reconciliation pass changed. It rides
// along with the admin update response so the admin sees the consequence of an
// inventory correction instead of having it happen silently.
type cartReconcileSummary struct {
	CartsChanged int `json:"cartsChanged"`
	ItemsRemoved int `json:"itemsRemoved"`
	ItemsReduced int `json:"itemsReduced"`
}

func (s cartReconcileSummary) touchedAnything() bool {
	return s.CartsChanged > 0
}

// variantStockKey identifies a color+size combination. Variant IDs are kept
// stable across updates by preserveColorVariantIDs, so they are the reliable
// half of the key; the canonical color covers legacy variants saved before
// IDs existed.
func variantStockKey(cv models.ColorVariant, size string) string {
	identity := cv.VariantID
	if identity == "" {
		identity = canonicalColorValue(cv)
	}
	return identity + "\x00" + size
}

// variantStockLevels maps every color+size combination to its stock count.
func variantStockLevels(product *models.Product) map[string]int {
	levels := make(map[string]int)
	if product == nil {
		return levels
	}
	for _, cv := range product.ColorVariants {
		for _, size := range cv.Sizes {
			levels[variantStockKey(cv, size.Size)] = size.Quantity
		}
	}
	return levels
}

// productAvailabilityChanged reports whether an edit could invalidate a cart:
// the product-level sale flags, or any per-variant stock count. An edit that
// touches only descriptive fields — AI metadata, names, descriptions, images —
// leaves every one of these identical, so it never reaches the carts.
func productAvailabilityChanged(before, after *models.Product) bool {
	if before == nil || after == nil {
		return false
	}
	if before.IsActive != after.IsActive || before.InStock != after.InStock {
		return true
	}

	beforeStock := variantStockLevels(before)
	afterStock := variantStockLevels(after)
	if len(beforeStock) != len(afterStock) {
		return true
	}
	for key, quantity := range beforeStock {
		if afterStock[key] != quantity {
			return true
		}
	}
	return false
}

// reconcileCartItems returns the items as they should stand once the product is
// saved, reporting whether anything changed. Items belonging to other products
// pass through untouched.
//
// A sold-out color+size is removed outright. A size that still has stock but
// less than the cart holds is reduced to what is left, so the shopper keeps
// what can actually be sold to them. A color or size the admin deleted
// entirely is left in place: prepareCartResponse already hides those from the
// shopper, and removing the row here would discard the cart entry while an
// admin is mid-way through re-adding the variant.
func reconcileCartItems(product *models.Product, items []models.CartItem, summary *cartReconcileSummary) ([]models.CartItem, bool) {
	kept := make([]models.CartItem, 0, len(items))
	if product == nil {
		return append(kept, items...), false
	}

	changed := false
	onSale := product.IsActive && product.InStock

	for _, item := range items {
		if item.ProductID != product.ID {
			kept = append(kept, item)
			continue
		}

		if !onSale {
			summary.ItemsRemoved++
			changed = true
			continue
		}

		_, colorIdx, sizeIdx, ok := enrichCartVariantFromProduct(product, item.Variant)
		if !ok || colorIdx == -1 || sizeIdx == -1 {
			kept = append(kept, item)
			continue
		}

		available := product.ColorVariants[colorIdx].Sizes[sizeIdx].Quantity
		if available <= 0 {
			summary.ItemsRemoved++
			changed = true
			continue
		}
		if item.Quantity > available {
			item.Quantity = available
			summary.ItemsReduced++
			changed = true
		}
		kept = append(kept, item)
	}

	return kept, changed
}

// reconcileCartsForProduct rewrites every active cart holding the product so it
// matches the product's current availability. The cart_item_product_idx index
// keeps the lookup from scanning every cart.
func reconcileCartsForProduct(ctx context.Context, product *models.Product) (cartReconcileSummary, error) {
	var summary cartReconcileSummary
	if product == nil {
		return summary, nil
	}

	carts := db.Database.Collection("carts")
	cursor, err := carts.Find(ctx, bson.M{"is_active": true, "items.product_id": product.ID})
	if err != nil {
		return summary, err
	}
	defer cursor.Close(ctx)

	var writes []mongo.WriteModel
	now := time.Now()
	for cursor.Next(ctx) {
		var cart models.Cart
		if err := cursor.Decode(&cart); err != nil {
			return summary, err
		}

		items, changed := reconcileCartItems(product, cart.Items, &summary)
		if !changed {
			continue
		}
		summary.CartsChanged++
		writes = append(writes, mongo.NewUpdateOneModel().
			SetFilter(bson.M{"_id": cart.ID, "is_active": true}).
			SetUpdate(bson.M{"$set": bson.M{"items": items, "updated_at": now}}))
	}
	if err := cursor.Err(); err != nil {
		return summary, err
	}
	if len(writes) == 0 {
		return summary, nil
	}

	if _, err := carts.BulkWrite(ctx, writes); err != nil {
		return summary, err
	}
	return summary, nil
}
