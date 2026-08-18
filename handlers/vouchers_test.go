package handlers

import (
	"context"
	"testing"

	"backEnd/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestVoucherColorVariantRejectsMissingRequestedColor(t *testing.T) {
	product := models.Product{ColorVariants: []models.ColorVariant{
		{Color: "#0000ff", ColorName: "آبی"},
	}}

	if _, ok := voucherColorVariant(&product, "#ff0000", "قرمز"); ok {
		t.Fatal("missing requested color must not resolve to another variant")
	}
}

func TestVoucherAnyColorVariantInStock(t *testing.T) {
	variants := []models.ColorVariant{
		{Sizes: []models.SizeVariant{{Quantity: 0}}},
		{Sizes: []models.SizeVariant{{Quantity: 2}}},
	}

	if !voucherAnyColorVariantInStock(variants) {
		t.Fatal("expected stock from a non-first color variant")
	}
}

func TestBuildTargetedVoucherSkipsCategoryScopedDiscount(t *testing.T) {
	discount := models.Discount{
		ApplicableTo: models.DiscountApplicability{
			CategoryIDs: []primitive.ObjectID{primitive.NewObjectID()},
		},
	}

	if _, ok := buildTargetedVoucher(context.Background(), discount); ok {
		t.Fatal("category-scoped discount must not be returned as an unrestricted voucher")
	}
}

func TestFormatPriceFaHandlesNegativeAmount(t *testing.T) {
	if got := formatPriceFa(-1234567); got != "-۱٬۲۳۴٬۵۶۷" {
		t.Fatalf("formatPriceFa(-1234567) = %q, want %q", got, "-۱٬۲۳۴٬۵۶۷")
	}
}
