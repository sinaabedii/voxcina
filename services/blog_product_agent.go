package services

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

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

// ColorOption is one in-stock color choice on a candidate product, as shown
// to the matching agent so it can pick among colors itself.
type ColorOption struct {
	ColorHex  string `json:"colorHex"`
	ColorName string `json:"colorName"`
	Quantity  int    `json:"quantity"`
}

// ProductWithColors is a candidate product returned by the metadata search
// tool, together with every color it currently has in stock.
type ProductWithColors struct {
	ProductID string        `json:"productId"`
	Name      string        `json:"name"`
	Brand     string        `json:"brand,omitempty"`
	Price     float64       `json:"price"`
	Colors    []ColorOption `json:"colors"`
}

// ProductMatchAgent resolves a blog writer's short product description into
// a real, in-stock catalog product + color. It exposes a metadata search tool
// directly over the `products` collection (no dependency on the customer
// assistant's vector-search path, which isn't actually wired up in this
// deployment) and drives a small tool-use loop on top of it: the LLM can
// inspect a candidate product's available colors and pick one, or ask to
// search again with a refined query to look at a different product, repeating
// until it commits to a choice or gives up.
type ProductMatchAgent struct {
	db         *mongo.Database
	openRouter *OpenRouterStructuredClient
}

// NewProductMatchAgent creates a new ProductMatchAgent.
func NewProductMatchAgent(db *mongo.Database) *ProductMatchAgent {
	return &ProductMatchAgent{
		db:         db,
		openRouter: NewOpenRouterStructuredClient(),
	}
}

// searchProductsByMetadata is the agent's product-search tool: it matches the
// query against Persian + English catalog metadata and returns each matching
// product together with every color it currently has in stock (out-of-stock
// products/colors are never surfaced).
func (a *ProductMatchAgent) searchProductsByMetadata(ctx context.Context, query string, limit int) ([]ProductWithColors, error) {
	terms := strings.Fields(strings.ToLower(strings.TrimSpace(query)))
	if len(terms) == 0 {
		return nil, nil
	}
	if limit <= 0 {
		limit = 5
	}

	var orConditions []bson.M
	for _, term := range terms {
		orConditions = append(orConditions,
			bson.M{"search_metadata.name_persian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.description_persian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.keywords": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.tags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.material_persian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.material_tags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.style_persian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.occasion_tags": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.colors_persian.name_persian": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"search_metadata.colors_persian.synonyms": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"name": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"description": bson.M{"$regex": term, "$options": "i"}},
			bson.M{"brand": bson.M{"$regex": term, "$options": "i"}},
		)
	}

	filter := bson.M{
		"$and": []bson.M{
			{"$or": orConditions},
			{"is_active": true},
		},
	}

	// Fetch more than `limit` since some matches may have zero in-stock colors.
	cursor, err := a.db.Collection("products").Find(ctx, filter, options.Find().SetLimit(int64(limit*4)))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	results := make([]ProductWithColors, 0, limit)
	for cursor.Next(ctx) && len(results) < limit {
		var product models.Product
		if err := cursor.Decode(&product); err != nil {
			continue
		}
		colors := inStockColors(product)
		if len(colors) == 0 {
			continue
		}
		results = append(results, ProductWithColors{
			ProductID: product.ID.Hex(),
			Name:      product.Name,
			Brand:     product.Brand,
			Price:     product.Price,
			Colors:    colors,
		})
	}
	return results, nil
}

// inStockColors lists every color variant on a product that has at least one
// size with available inventory.
func inStockColors(product models.Product) []ColorOption {
	var colors []ColorOption
	for _, variant := range product.ColorVariants {
		quantity := colorVariantQuantity(variant)
		if quantity <= 0 {
			continue
		}
		colors = append(colors, ColorOption{
			ColorHex:  variant.Color,
			ColorName: variant.ColorName,
			Quantity:  quantity,
		})
	}
	return colors
}

// FindCandidates searches the catalog for products matching the given query
// text and flattens each result down to one entry per in-stock color, for the
// admin's manual-search UI (which picks a single product+color directly).
func (a *ProductMatchAgent) FindCandidates(ctx context.Context, query string, limit int) ([]MatchedProduct, error) {
	if limit <= 0 {
		limit = 8
	}

	products, err := a.searchProductsByMetadata(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	candidates := make([]MatchedProduct, 0, limit)
	for _, p := range products {
		for _, c := range p.Colors {
			if len(candidates) >= limit {
				return candidates, nil
			}
			match, err := a.buildMatch(ctx, p.ProductID, c.ColorHex)
			if err != nil {
				continue
			}
			candidates = append(candidates, *match)
		}
	}
	return candidates, nil
}

const productMatchSystemPrompt = `You are a product-matching agent for Voxcina, a Persian fashion e-commerce platform.

You are given a short description of what kind of product to recommend for a blog article. You have one tool:

search_products(query) — searches the real product catalog and returns matching products, each with the list of colors it currently has in stock (colors not listed are out of stock and must never be picked).

Your job: pick exactly ONE product and ONE color from its in-stock colors that best fits the description. Only pick a color that literally appears in that product's "colors" list.

If none of the current candidates are a good fit, you may search again with a refined or different query to look at other products — you can repeat this a few times. If after exploring you still find nothing suitable, give up rather than forcing a bad match.

Respond ONLY with a JSON object matching the required schema — no extra text.`

type productMatchDecision struct {
	Action    string `json:"action"` // "select" | "search" | "give_up"
	ProductID string `json:"productId,omitempty"`
	ColorHex  string `json:"colorHex,omitempty"`
	Query     string `json:"query,omitempty"`
	Reasoning string `json:"reasoning,omitempty"`
}

func productMatchDecisionSchema() map[string]interface{} {
	return map[string]interface{}{
		"name": "product_match_decision",
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"action":    map[string]interface{}{"type": "string", "enum": []string{"select", "search", "give_up"}},
				"productId": map[string]interface{}{"type": "string"},
				"colorHex":  map[string]interface{}{"type": "string"},
				"query":     map[string]interface{}{"type": "string"},
				"reasoning": map[string]interface{}{"type": "string"},
			},
			"required": []string{"action", "reasoning"},
		},
	}
}

// AutoMatch runs a small tool-use loop: search the catalog, let the LLM
// inspect a candidate's in-stock colors and either select one or refine the
// query to try a different product, repeating up to maxTurns. Every selection
// is re-validated against the live database before being returned, so the LLM
// can never fabricate a product/color that doesn't actually exist or isn't
// in stock.
func (a *ProductMatchAgent) AutoMatch(ctx context.Context, description string) (*MatchedProduct, error) {
	const maxTurns = 4
	seen := map[string]bool{}
	query := description

	messages := []OpenRouterMessage{
		{Role: "system", Content: productMatchSystemPrompt},
		{Role: "user", Content: "Product description to match: " + description},
	}

	for turn := 0; turn < maxTurns; turn++ {
		candidates, err := a.searchProductsByMetadata(ctx, query, 5)
		if err != nil {
			return nil, err
		}

		fresh := candidates[:0:0]
		for _, c := range candidates {
			if seen[c.ProductID] {
				continue
			}
			seen[c.ProductID] = true
			fresh = append(fresh, c)
		}

		if len(fresh) == 0 && turn == 0 {
			return nil, ErrNoProductMatch
		}

		resultsJSON, _ := json.Marshal(fresh)
		messages = append(messages, OpenRouterMessage{
			Role: "user",
			Content: "Search results for query \"" + query + "\":\n" + string(resultsJSON) +
				"\n\nPick the best product+color from these results, or search again with a different query if none fit.",
		})

		output, err := a.openRouter.CallStructured(ctx, StructuredRequest{
			Model:    defaultStructuredModel,
			Messages: messages,
			Schema:   productMatchDecisionSchema(),
		})
		if err != nil {
			return nil, err
		}

		var decision productMatchDecision
		if err := parseBSONToStruct(output, &decision); err != nil {
			log.Printf("[blog] product match: failed to parse decision: %v", err)
			continue
		}
		messages = append(messages, OpenRouterMessage{Role: "assistant", Content: output.Content})

		switch decision.Action {
		case "select":
			match, err := a.buildMatch(ctx, decision.ProductID, decision.ColorHex)
			if err != nil {
				// Hallucinated or now-invalid pick — let the loop try again.
				log.Printf("[blog] product match: rejected selection (%s/%s): %v", decision.ProductID, decision.ColorHex, err)
				continue
			}
			return match, nil
		case "search":
			if decision.Query != "" {
				query = decision.Query
			}
		default: // "give_up" or unrecognized
			return nil, ErrNoProductMatch
		}
	}

	return nil, ErrNoProductMatch
}

// buildMatch re-fetches the product from the database and validates the
// color, so a MatchedProduct is always built from live truth rather than
// anything the LLM (or an admin request) claims.
func (a *ProductMatchAgent) buildMatch(ctx context.Context, productID, colorHex string) (*MatchedProduct, error) {
	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return nil, err
	}

	var product models.Product
	if err := a.db.Collection("products").FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&product); err != nil {
		return nil, err
	}

	variant, _, err := ResolveColorVariant(&product, colorHex)
	if err != nil {
		return nil, err
	}

	return &MatchedProduct{
		ProductID:     product.ID.Hex(),
		Name:          product.Name,
		Image:         variantImage(product, *variant),
		ColorHex:      variant.Color,
		ColorName:     variant.ColorName,
		Price:         product.Price,
		OriginalPrice: product.OriginalPrice,
	}, nil
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
