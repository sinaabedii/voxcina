package services

import (
	"reflect"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func TestGenderFilterValues(t *testing.T) {
	male := GenderFilterValues("مردانه")
	wantMale := []string{"مردانه", "male", "men", "man", "یونیسکس", "unisex"}
	if !reflect.DeepEqual(male, wantMale) {
		t.Errorf("مردانه = %q, want %q", male, wantMale)
	}
	if got := genderFilterValues("مردانه"); !reflect.DeepEqual(got, wantMale) {
		t.Errorf("unexported مردانه = %q, want %q", got, wantMale)
	}

	female := GenderFilterValues("زنانه")
	wantFemale := []string{"زنانه", "female", "women", "woman", "یونیسکس", "unisex"}
	if !reflect.DeepEqual(female, wantFemale) {
		t.Errorf("زنانه = %q, want %q", female, wantFemale)
	}

	for _, g := range []string{"یونیسکس", "unisex", "", "male", "unknown"} {
		if got := GenderFilterValues(g); got != nil {
			t.Errorf("GenderFilterValues(%q) = %q, want nil (no restriction)", g, got)
		}
		if got := genderFilterValues(g); got != nil {
			t.Errorf("genderFilterValues(%q) = %q, want nil (no restriction)", g, got)
		}
	}
}

func TestEffectiveProductGender(t *testing.T) {
	female := models.Product{ColorVariants: []models.ColorVariant{
		{AIMetadata: &models.VariantAIMetadata{Gender: "زنانه"}},
		{AIMetadata: &models.VariantAIMetadata{Gender: "یونیسکس"}},
	}}
	if got := EffectiveProductGender(female); got != "زنانه" {
		t.Errorf("EffectiveProductGender = %q, want زنانه", got)
	}
	if got := GenderFilterValues(EffectiveProductGender(female)); len(got) == 0 {
		t.Error("female product yields no gender filter, want restriction")
	}

	// Search-metadata fallback when variants carry no gender.
	meta := models.Product{
		SearchMetadata: &models.ProductSearchMetadata{Gender: "مردانه"},
	}
	if got := EffectiveProductGender(meta); got != "مردانه" {
		t.Errorf("EffectiveProductGender (metadata) = %q, want مردانه", got)
	}

	// Unisex-only or empty → no restriction.
	for _, p := range []models.Product{
		{},
		{ColorVariants: []models.ColorVariant{{AIMetadata: &models.VariantAIMetadata{Gender: "یونیسکس"}}}},
		{SearchMetadata: &models.ProductSearchMetadata{Gender: "unisex"}},
	} {
		if got := EffectiveProductGender(p); got != "" {
			t.Errorf("EffectiveProductGender = %q, want empty (no restriction)", got)
		}
		if got := GenderFilterValues(EffectiveProductGender(p)); got != nil {
			t.Errorf("unisex/empty filter = %q, want nil", got)
		}
	}
}

func TestVariantStockKeepsOnlyPositiveQuantities(t *testing.T) {
	sizes := bson.A{
		bson.M{"size": "S", "quantity": 3},
		bson.M{"size": "M", "quantity": 0},
		bson.M{"size": "L", "quantity": int32(2)},
		bson.M{"size": "XL", "quantity": int64(0)},
		bson.M{"size": "XXL", "quantity": float64(1)},
		bson.M{"size": "", "quantity": 5},
		bson.M{"size": "XXXL"},
	}
	inStock, names := variantStock(sizes)
	if !inStock {
		t.Error("variantStock = not in stock, want in stock")
	}
	if want := []string{"S", "L", "XXL"}; !reflect.DeepEqual(names, want) {
		t.Errorf("variantStock names = %q, want %q", names, want)
	}
}

func TestVariantStockAllZeroIsOutOfStock(t *testing.T) {
	sizes := bson.A{
		bson.M{"size": "S", "quantity": 0},
		bson.M{"size": "M", "quantity": int32(0)},
	}
	inStock, names := variantStock(sizes)
	if inStock {
		t.Error("variantStock = in stock, want out of stock")
	}
	if len(names) != 0 {
		t.Errorf("variantStock names = %q, want empty", names)
	}
}

func TestDocToHitComputesTrueStock(t *testing.T) {
	doc := bson.M{
		"_id":  primitive.NewObjectID(),
		"name": "مانتو زنانه",
		"color_variants": bson.M{
			"variant_id": "v1",
			"color_name": "مشکی",
			"sizes": bson.A{
				bson.M{"size": "S", "quantity": 2},
				bson.M{"size": "M", "quantity": 0},
			},
		},
	}
	hit := docToHit(doc)
	if !hit.InStock {
		t.Error("docToHit.InStock = false, want true (S has quantity 2)")
	}
	if want := []string{"S"}; !reflect.DeepEqual(hit.Sizes, want) {
		t.Errorf("docToHit.Sizes = %q, want %q", hit.Sizes, want)
	}
}

func TestDocToHitOverrideStillWins(t *testing.T) {
	doc := bson.M{
		"_id":  primitive.NewObjectID(),
		"name": "مانتو زنانه",
		"color_variants": bson.M{
			"variant_id": "v1",
			"color_name": "مشکی",
			"sizes": bson.A{
				bson.M{"size": "S", "quantity": 0},
			},
		},
		"__variant_in_stock": true,
	}
	if hit := docToHit(doc); !hit.InStock {
		t.Error("docToHit with __variant_in_stock=true = false, want override to win")
	}
}
