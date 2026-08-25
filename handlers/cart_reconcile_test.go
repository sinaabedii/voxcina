package handlers

import (
	"encoding/json"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func stockedProduct() models.Product {
	return models.Product{
		ID:       primitive.NewObjectID(),
		Name:     "کاپشن",
		IsActive: true,
		InStock:  true,
		ColorVariants: []models.ColorVariant{{
			VariantID: "black",
			Color:     "#000000",
			ColorName: "مشکی",
			Sizes: []models.SizeVariant{
				{Size: "M", Quantity: 5},
				{Size: "L", Quantity: 2},
			},
		}},
	}
}

func cartItem(productID primitive.ObjectID, size string, quantity int) models.CartItem {
	return models.CartItem{
		ProductID: productID,
		Variant:   models.CartVariant{VariantID: "black", Size: size, Color: "#000000", ColorName: "مشکی"},
		Quantity:  quantity,
	}
}

func TestProductAvailabilityChangedIgnoresDescriptiveEdits(t *testing.T) {
	before := stockedProduct()
	after := before
	after.Name = "کاپشن زمستانی"
	after.Description = "توضیحات تازه"
	after.SearchMetadata = &models.ProductSearchMetadata{NamePersian: "کاپشن زمستانی"}
	after.ColorVariants = []models.ColorVariant{{
		VariantID: "black",
		Color:     "#000000",
		ColorName: "مشکی",
		AIMetadata: &models.VariantAIMetadata{
			ProductTypePersian: "کاپشن",
			MaterialPersian:    "پلی‌استر",
		},
		Sizes: []models.SizeVariant{
			{Size: "M", Quantity: 5},
			{Size: "L", Quantity: 2},
		},
	}}

	if productAvailabilityChanged(&before, &after) {
		t.Fatal("an AI/description-only edit must not be treated as an availability change")
	}
}

func TestProductAvailabilityChangedDetectsStockAndSaleFlags(t *testing.T) {
	base := stockedProduct()

	for name, mutate := range map[string]func(p *models.Product){
		"quantity lowered": func(p *models.Product) { p.ColorVariants[0].Sizes[0].Quantity = 1 },
		"quantity zeroed":  func(p *models.Product) { p.ColorVariants[0].Sizes[0].Quantity = 0 },
		"size removed":     func(p *models.Product) { p.ColorVariants[0].Sizes = p.ColorVariants[0].Sizes[:1] },
		"size added": func(p *models.Product) {
			p.ColorVariants[0].Sizes = append(p.ColorVariants[0].Sizes, models.SizeVariant{Size: "XL", Quantity: 3})
		},
		"deactivated":         func(p *models.Product) { p.IsActive = false },
		"marked out of stock": func(p *models.Product) { p.InStock = false },
	} {
		t.Run(name, func(t *testing.T) {
			after := stockedProduct()
			after.ID = base.ID
			after.ColorVariants = append([]models.ColorVariant(nil), after.ColorVariants...)
			after.ColorVariants[0].Sizes = append([]models.SizeVariant(nil), after.ColorVariants[0].Sizes...)
			mutate(&after)

			if !productAvailabilityChanged(&base, &after) {
				t.Fatalf("expected %s to count as an availability change", name)
			}
		})
	}
}

func TestReconcileCartItemsRemovesSoldOutAndReducesShortfall(t *testing.T) {
	product := stockedProduct()
	product.ColorVariants[0].Sizes = []models.SizeVariant{
		{Size: "M", Quantity: 0},
		{Size: "L", Quantity: 1},
	}
	otherProduct := primitive.NewObjectID()

	items := []models.CartItem{
		cartItem(product.ID, "M", 2),
		cartItem(product.ID, "L", 3),
		{ProductID: otherProduct, Variant: models.CartVariant{VariantID: "x", Size: "S"}, Quantity: 4},
	}

	var summary cartReconcileSummary
	kept, changed := reconcileCartItems(&product, items, &summary)

	if !changed {
		t.Fatal("expected the cart to be reported as changed")
	}
	if len(kept) != 2 {
		t.Fatalf("expected the sold-out item to be dropped, got %d items", len(kept))
	}
	if kept[0].Variant.Size != "L" || kept[0].Quantity != 1 {
		t.Fatalf("expected size L reduced to the remaining 1, got size %q quantity %d", kept[0].Variant.Size, kept[0].Quantity)
	}
	if kept[1].ProductID != otherProduct || kept[1].Quantity != 4 {
		t.Fatal("items belonging to other products must pass through untouched")
	}
	if summary.ItemsRemoved != 1 || summary.ItemsReduced != 1 {
		t.Fatalf("unexpected summary: %+v", summary)
	}
}

func TestReconcileCartItemsClearsProductPulledFromSale(t *testing.T) {
	for name, mutate := range map[string]func(p *models.Product){
		"deactivated":         func(p *models.Product) { p.IsActive = false },
		"marked out of stock": func(p *models.Product) { p.InStock = false },
	} {
		t.Run(name, func(t *testing.T) {
			product := stockedProduct()
			mutate(&product)
			other := primitive.NewObjectID()
			items := []models.CartItem{
				cartItem(product.ID, "M", 1),
				{ProductID: other, Quantity: 2},
			}

			var summary cartReconcileSummary
			kept, changed := reconcileCartItems(&product, items, &summary)

			if !changed || summary.ItemsRemoved != 1 {
				t.Fatalf("expected the item to be removed, summary: %+v", summary)
			}
			if len(kept) != 1 || kept[0].ProductID != other {
				t.Fatalf("expected only the other product's item to survive, got %+v", kept)
			}
		})
	}
}

func TestReconcileCartItemsLeavesStockedItemsAlone(t *testing.T) {
	product := stockedProduct()
	items := []models.CartItem{cartItem(product.ID, "M", 3)}

	var summary cartReconcileSummary
	kept, changed := reconcileCartItems(&product, items, &summary)

	if changed || summary != (cartReconcileSummary{}) {
		t.Fatalf("a cart within stock must be left alone, summary: %+v", summary)
	}
	if len(kept) != 1 || kept[0].Quantity != 3 {
		t.Fatalf("expected the item untouched, got %+v", kept)
	}
}

func TestReconcileCartItemsKeepsItemsWhoseVariantWasDeleted(t *testing.T) {
	product := stockedProduct()
	product.ColorVariants = nil
	items := []models.CartItem{cartItem(product.ID, "M", 2)}

	var summary cartReconcileSummary
	kept, changed := reconcileCartItems(&product, items, &summary)

	if changed || len(kept) != 1 {
		t.Fatalf("a deleted color/size is hidden by prepareCartResponse, not deleted here: %+v", kept)
	}
}

func TestProductUpdateResponseKeepsProductFieldsAtTopLevel(t *testing.T) {
	product := stockedProduct()
	body, err := json.Marshal(productUpdateResponse{
		Product:            product,
		CartReconciliation: &cartReconcileSummary{CartsChanged: 2, ItemsRemoved: 3},
	})
	if err != nil {
		t.Fatalf("marshalling the update response failed: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshalling the update response failed: %v", err)
	}
	if decoded["name"] != product.Name {
		t.Fatalf("expected product fields inline, got %v", decoded["name"])
	}
	if decoded["cartReconciliation"] == nil {
		t.Fatal("expected the cart summary alongside the product")
	}

	plain, err := json.Marshal(productUpdateResponse{Product: product})
	if err != nil {
		t.Fatalf("marshalling failed: %v", err)
	}
	var withoutSummary map[string]any
	if err := json.Unmarshal(plain, &withoutSummary); err != nil {
		t.Fatalf("unmarshalling failed: %v", err)
	}
	if _, present := withoutSummary["cartReconciliation"]; present {
		t.Fatal("an edit that touched no cart must not carry a summary")
	}
}
