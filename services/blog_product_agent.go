package services

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// ErrNoProductMatch is returned when no in-stock product/color variant can be
// found for a given description.
var ErrNoProductMatch = errors.New("no in-stock product match found")

// MatchedProduct is a single product+color candidate resolved for a blog
// "product" block, already narrowed down to one specific in-stock color.
type MatchedProduct struct {
	ProductID     string  `json:"productId"`
	Name          string  `json:"name"`
	Image         string  `json:"image"`
	ColorHex      string  `json:"colorHex"`
	ColorName     string  `json:"colorName"`
	Price         float64 `json:"price"`
	OriginalPrice float64 `json:"originalPrice"`
}

// ProductMatchAgent resolves a blog writer's short product description into
// real, in-stock catalog products for an admin to pick from (manually or via
// AutoMatch), reusing the existing hybrid product search built for the
// customer-facing AI assistant.
type ProductMatchAgent struct {
	aiService *CustomerAIService
}

// NewProductMatchAgent creates a new ProductMatchAgent. Construction is cheap
// and never hard-fails (see CustomerAIService.NewCustomerAIService).
func NewProductMatchAgent(db *mongo.Database) (*ProductMatchAgent, error) {
	aiService, err := NewCustomerAIService(db)
	if err != nil {
		return nil, err
	}
	return &ProductMatchAgent{aiService: aiService}, nil
}

// FindCandidates searches the catalog for products matching the given query
// text (typically the writer's productDescription), expands each result to
// its in-stock color variants, and returns up to `limit` candidates, ranked
// in the order the underlying hybrid search returned them.
func (a *ProductMatchAgent) FindCandidates(ctx context.Context, query string, limit int) ([]MatchedProduct, error) {
	if limit <= 0 {
		limit = 8
	}

	products, _, err := a.aiService.toolSearchProducts(ctx, query, ParsedFilters{})
	if err != nil {
		return nil, err
	}

	candidates := make([]MatchedProduct, 0, limit)
	for _, product := range products {
		if !product.IsActive || !product.InStock {
			continue
		}
		for _, variant := range product.ColorVariants {
			if len(candidates) >= limit {
				return candidates, nil
			}
			quantity := colorVariantQuantity(variant)
			if quantity <= 0 {
				continue
			}
			candidates = append(candidates, MatchedProduct{
				ProductID:     product.ID.Hex(),
				Name:          product.Name,
				Image:         variantImage(product, variant),
				ColorHex:      variant.Color,
				ColorName:     variant.ColorName,
				Price:         product.Price,
				OriginalPrice: product.OriginalPrice,
			})
		}
	}

	return candidates, nil
}

// AutoMatch returns the single best in-stock candidate for a description, or
// ErrNoProductMatch if the search turned up nothing sellable.
func (a *ProductMatchAgent) AutoMatch(ctx context.Context, description string) (*MatchedProduct, error) {
	candidates, err := a.FindCandidates(ctx, description, 5)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, ErrNoProductMatch
	}
	return &candidates[0], nil
}

// ResolveColorVariant validates that colorHex is an actual in-stock color on
// the given product, returning the variant and its total inventory. Used by
// the manual-select endpoint to reject an admin picking an out-of-stock color.
func ResolveColorVariant(product *models.Product, colorHex string) (*models.ColorVariant, int, error) {
	for i := range product.ColorVariants {
		variant := &product.ColorVariants[i]
		if variant.Color != colorHex {
			continue
		}
		quantity := colorVariantQuantity(*variant)
		if quantity <= 0 {
			return nil, 0, errors.New("selected color is out of stock")
		}
		return variant, quantity, nil
	}
	return nil, 0, errors.New("color not found on product")
}

// colorVariantQuantity sums inventory across all sizes for a color variant.
func colorVariantQuantity(variant models.ColorVariant) int {
	total := 0
	for _, size := range variant.Sizes {
		total += size.Quantity
	}
	return total
}

// variantImage picks the best available image for a color variant, falling
// back to the product's shared main images.
func variantImage(product models.Product, variant models.ColorVariant) string {
	if len(variant.Images) > 0 {
		return variant.Images[0]
	}
	if len(product.MainImages) > 0 {
		return product.MainImages[0]
	}
	return ""
}
