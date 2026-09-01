package services

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"regexp"
	"sort"
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
// over the `products` collection via a hybrid vector → text → ranked-regex
// path (mirroring the negotiator's variant KNN strategy): the LLM can inspect
// a candidate product's available colors and pick one, or ask to search again
// with a refined query to look at a different product, repeating until it
// commits to a choice or gives up.
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

// searchProductsByMetadata is the agent's product-search tool: it returns the
// most related in-stock products for a free-form Persian description. The
// previous implementation used an unranked regex Find with natural/_id order
// and truncated to the first N hits, so the "most related" product could be
// at position 21+ and never surface. This hybrid implementation degrades
// gracefully: 1) FAISS vector KNN via per-variant embeddings (best-effort,
// ordered by semantic distance), 2) Mongo $text search on the weighted
// ai_persian_text_search index, 3) regex candidates scored and sorted in Go
// by term coverage + popularity (deterministic relevance).
func (a *ProductMatchAgent) searchProductsByMetadata(ctx context.Context, query string, limit int) ([]ProductWithColors, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, nil
	}
	if limit <= 0 {
		limit = 5
	}

	// 1) Vector (semantic) — best-effort, already ordered by distance.
	if vecRes, err := a.vectorSearchProducts(ctx, query, limit); err == nil && len(vecRes) > 0 {
		return vecRes, nil
	} else if err != nil {
		log.Printf("[blog] vector search fallback: %v", err)
	}

	// 2) Text index (weighted ai_persian_text_search).
	if textRes, err := a.textSearchProducts(ctx, query, limit); err == nil && len(textRes) > 0 {
		return textRes, nil
	}

	// 3) Ranked regex fallback — deterministic term-coverage sort.
	return a.rankedRegexSearchProducts(ctx, query, limit)
}

// vectorSearchProducts runs a FAISS variant-KNN query and resolves the ids
// back to in-stock ProductWithColors, preserving vector order.
func (a *ProductMatchAgent) vectorSearchProducts(ctx context.Context, query string, limit int) ([]ProductWithColors, error) {
	vec, _, err := GenerateEmbedding(ctx, query)
	if err != nil || len(vec) == 0 {
		return nil, err
	}
	fc := NewFaissClientFromEnv()
	if fc == nil {
		return nil, errors.New("faiss not configured")
	}
	k := limit*4 + 4
	if k < 12 {
		k = 12
	}
	ids, err := fc.SearchSimilarVariants(ctx, vec, k)
	if err != nil || len(ids) == 0 {
		return nil, err
	}
	seen := map[string]bool{}
	results := make([]ProductWithColors, 0, limit)
	for _, fid := range ids {
		if len(results) >= limit {
			break
		}
		pid, _ := ParseVariantFAISSKey(fid)
		if pid == "" {
			pid = fid
		}
		if seen[pid] {
			continue
		}
		objID, err := primitive.ObjectIDFromHex(pid)
		if err != nil {
			continue
		}
		var product models.Product
		if err := a.db.Collection("products").FindOne(ctx, bson.M{"_id": objID, "is_active": true}).Decode(&product); err != nil {
			continue
		}
		colors := inStockColors(product)
		if len(colors) == 0 {
			continue
		}
		seen[pid] = true
		results = append(results, ProductWithColors{
			ProductID: product.ID.Hex(),
			Name:      product.Name,
			Brand:     product.Brand,
			Price:     product.Price,
			Colors:    colors,
		})
	}
	if len(results) == 0 {
		return nil, errors.New("no vector hits resolved")
	}
	return results, nil
}

// textSearchProducts uses the weighted ai_persian_text_search text index
// (name_persian:10, keywords:8, tags:5, description_persian:3).
func (a *ProductMatchAgent) textSearchProducts(ctx context.Context, query string, limit int) ([]ProductWithColors, error) {
	filter := bson.M{
		"$text":     bson.M{"$search": query},
		"is_active": true,
	}
	opts := options.Find().
		SetProjection(bson.M{"score": bson.M{"$meta": "textScore"}}).
		SetSort(bson.M{"score": bson.M{"$meta": "textScore"}}).
		SetLimit(int64(limit * 4))
	cursor, err := a.db.Collection("products").Find(ctx, filter, opts)
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

// rankedRegexSearchProducts is the deterministic fallback: regex candidates
// are scored in Go by how many distinct query terms they actually contain
// (across Persian/English metadata, name/description/brand and variant AI
// fields), then sorted by score desc + popularity desc.
func (a *ProductMatchAgent) rankedRegexSearchProducts(ctx context.Context, query string, limit int) ([]ProductWithColors, error) {
	rawTerms := strings.Fields(strings.ToLower(strings.TrimSpace(query)))
	if len(rawTerms) == 0 {
		return nil, nil
	}
	// Deduplicate terms to avoid double-counting.
	seenTerm := map[string]bool{}
	var terms []string
	for _, t := range rawTerms {
		if !seenTerm[t] {
			seenTerm[t] = true
			terms = append(terms, t)
		}
	}
	var orConditions []bson.M
	for _, term := range terms {
		esc := regexp.QuoteMeta(term)
		orConditions = append(orConditions,
			bson.M{"search_metadata.name_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.description_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.keywords": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.tags": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.material_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.material_tags": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.style_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.occasion_tags": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.colors_persian.name_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"search_metadata.colors_persian.synonyms": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"name": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"description": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"brand": bson.M{"$regex": esc, "$options": "i"}},
			// Variant AI metadata — so "پنبه" / "کژوال" stored per color is findable.
			bson.M{"color_variants.ai_metadata.material_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"color_variants.ai_metadata.style_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"color_variants.ai_metadata.product_type_persian": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"color_variants.ai_metadata.keywords": bson.M{"$regex": esc, "$options": "i"}},
			bson.M{"color_variants.color_name": bson.M{"$regex": esc, "$options": "i"}},
		)
	}
	filter := bson.M{
		"$and": []bson.M{
			{"$or": orConditions},
			{"is_active": true},
		},
	}
	// Pull a larger pool for scoring; sorting happens in Go so the order is
	// deterministic regardless of Mongo natural order.
	poolSize := limit * 8
	if poolSize < 20 {
		poolSize = 20
	}
	cursor, err := a.db.Collection("products").Find(ctx, filter, options.Find().SetLimit(int64(poolSize)))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	type scored struct {
		pwc        ProductWithColors
		score      int
		popularity float64
	}
	var pool []scored
	for cursor.Next(ctx) {
		var product models.Product
		if err := cursor.Decode(&product); err != nil {
			continue
		}
		colors := inStockColors(product)
		if len(colors) == 0 {
			continue
		}
		score := productRelevanceScore(product, terms)
		pop := 0.0
		if product.SearchMetadata != nil {
			pop = product.SearchMetadata.PopularityScore
		}
		pool = append(pool, scored{
			pwc: ProductWithColors{
				ProductID: product.ID.Hex(),
				Name:      product.Name,
				Brand:     product.Brand,
				Price:     product.Price,
				Colors:    colors,
			},
			score:      score,
			popularity: pop,
		})
	}
	if len(pool) == 0 {
		return nil, nil
	}
	sort.Slice(pool, func(i, j int) bool {
		if pool[i].score != pool[j].score {
			return pool[i].score > pool[j].score
		}
		return pool[i].popularity > pool[j].popularity
	})
	results := make([]ProductWithColors, 0, limit)
	for i := 0; i < len(pool) && len(results) < limit; i++ {
		results = append(results, pool[i].pwc)
	}
	return results, nil
}

// productRelevanceScore counts how many distinct query terms appear as
// substrings in the concatenated searchable text of a product (product-level
// + all variant AI fields). Case-insensitive, Persian-friendly.
func productRelevanceScore(product models.Product, terms []string) int {
	var b strings.Builder
	if product.SearchMetadata != nil {
		m := product.SearchMetadata
		b.WriteString(strings.ToLower(m.NamePersian + " "))
		b.WriteString(strings.ToLower(m.DescriptionPersian + " "))
		b.WriteString(strings.ToLower(strings.Join(m.Keywords, " ") + " "))
		b.WriteString(strings.ToLower(strings.Join(m.Tags, " ") + " "))
		b.WriteString(strings.ToLower(m.MaterialPersian + " "))
		b.WriteString(strings.ToLower(strings.Join(m.MaterialTags, " ") + " "))
		b.WriteString(strings.ToLower(m.StylePersian + " "))
		b.WriteString(strings.ToLower(strings.Join(m.OccasionTags, " ") + " "))
		for _, cm := range m.ColorsPersian {
			b.WriteString(strings.ToLower(cm.NamePersian + " "))
			b.WriteString(strings.ToLower(strings.Join(cm.Synonyms, " ") + " "))
		}
	}
	b.WriteString(strings.ToLower(product.Name + " "))
	b.WriteString(strings.ToLower(product.Description + " "))
	b.WriteString(strings.ToLower(product.Brand + " "))
	for _, cv := range product.ColorVariants {
		b.WriteString(strings.ToLower(cv.ColorName + " "))
		if cv.AIMetadata != nil {
			am := cv.AIMetadata
			b.WriteString(strings.ToLower(am.ProductTypePersian + " "))
			b.WriteString(strings.ToLower(am.MaterialPersian + " "))
			b.WriteString(strings.ToLower(am.StylePersian + " "))
			b.WriteString(strings.ToLower(am.PatternPersian + " "))
			b.WriteString(strings.ToLower(am.ColorFamily + " "))
			b.WriteString(strings.ToLower(strings.Join(am.Keywords, " ") + " "))
			b.WriteString(strings.ToLower(strings.Join(am.Tags, " ") + " "))
		}
	}
	haystack := b.String()
	score := 0
	for _, term := range terms {
		if term != "" && strings.Contains(haystack, term) {
			score++
		}
	}
	return score
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
