package services

import (
	"context"
	"fmt"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
)

// SearchCatalogVariants is the server-side implementation of the negotiator's
// search_catalog tool. It returns variant-level hits (one per color variant),
// scored by structured filters + FAISS vector KNN over per-variant embeddings
// (VariantAIMetadata.EmbeddingVector). Missing AI fields degrade to
// product-level search_metadata + plain color regex; missing FAISS degrades to
// text/structured only. All paths return ColorVariantListItem-shaped hits.
func SearchCatalogVariants(ctx context.Context, p searchCatalogToolParams) ([]CatalogVariantHit, error) {
	p = enrichCatalogParams(ctx, p)
	limit := 6
	if p.Limit != nil && *p.Limit > 0 && *p.Limit <= 12 {
		limit = *p.Limit
	}
	collection := db.Database.Collection("products")

	// 1) Structured Mongo filter (variant-aware where possible)
	filter := buildCatalogFilter(p)

	// 2) Variant KNN (vector) — best-effort, returns variant keys
	vectorOrder := map[string]int{}
	if strings.TrimSpace(p.Query) != "" {
		if vec, _, err := GenerateEmbedding(ctx, strings.TrimSpace(p.Query)); err == nil && len(vec) > 0 {
			if fc := NewFaissClientFromEnv(); fc != nil {
				k := limit*3 + 4
				if ids, err2 := fc.SearchSimilarVariants(ctx, vec, k); err2 == nil {
					for idx, id := range ids {
						vid := id
						if _, v := ParseVariantFAISSKey(id); v != "" {
							vid = id
						}
						if _, ok := vectorOrder[vid]; !ok {
							vectorOrder[vid] = idx
						}
					}
				}
			}
		}
	}

	// 3) Text score for ranking when vector missing
	//    — we rely on the ai_persian_text_search weights already created.

	baseFilter := bson.M{"is_active": true}
	// Merge structured filter into base
	for k, v := range filter {
		baseFilter[k] = v
	}

	// Fetch candidates; choose aggregation that unwinds variants so we score at variant level.
	pipeline := buildVariantPipeline(baseFilter, p, vectorOrder, limit)
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		// Fallback: simple find + in-memory scoring
		return fallbackCatalogSearch(ctx, collection, baseFilter, p, limit, vectorOrder)
	}
	defer cursor.Close(ctx)

	var raw []bson.M
	if err := cursor.All(ctx, &raw); err != nil {
		return nil, err
	}

	hits := make([]CatalogVariantHit, 0, len(raw))
	for _, doc := range raw {
		hit := docToHit(doc)
		if hit.ProductID == "" {
			continue
		}
		// Apply vector re-ranking if we had ordering
		hits = append(hits, hit)
	}
	if len(vectorOrder) > 0 {
		hits = rerankHitsByVector(hits, vectorOrder)
	}
	if len(hits) > limit {
		hits = hits[:limit]
	}
	// If no results from pipeline but vector order had keys, resolve those keys.
	if len(hits) == 0 && len(vectorOrder) > 0 {
		fb, _ := fallbackCatalogSearch(ctx, collection, baseFilter, p, limit, vectorOrder)
		return fb, nil
	}
	return hits, nil
}

// enrichCatalogParams maps words from the free-form customer query through the
// existing vocabulary_mappings collection. This avoids a second LLM round trip
// while making "قرمز" match the canonical variant metadata and "شلوار جین"
// match both Persian and standard product-type values.
func enrichCatalogParams(ctx context.Context, p searchCatalogToolParams) searchCatalogToolParams {
	if db.Database == nil || strings.TrimSpace(p.Query) == "" {
		return p
	}
	tokens := strings.Fields(strings.ToLower(strings.TrimSpace(p.Query)))
	if len(tokens) == 0 {
		return p
	}
	terms := make([]interface{}, 0, len(tokens)+1)
	for _, token := range tokens {
		terms = append(terms, token)
	}
	terms = append(terms, strings.TrimSpace(p.Query))
	cur, err := db.Database.Collection("vocabulary_mappings").Find(ctx, bson.M{
		"$or": []bson.M{
			{"persian_terms": bson.M{"$in": terms}},
			{"english_terms": bson.M{"$in": terms}},
			{"related_terms": bson.M{"$in": terms}},
		},
	}, options.Find().SetLimit(50))
	if err != nil {
		return p
	}
	defer cur.Close(ctx)
	var mappings []models.VocabularyMapping
	if cur.All(ctx, &mappings) != nil {
		return p
	}
	for _, mapping := range mappings {
		values := append([]string{}, mapping.PersianTerms...)
		values = append(values, mapping.EnglishTerms...)
		values = append(values, mapping.StandardValue)
		switch mapping.Type {
		case "color":
			p.Colors = appendUniqueSearchValues(p.Colors, values...)
		case "product_type":
			p.ProductTypes = appendUniqueSearchValues(p.ProductTypes, values...)
		case "material":
			p.Materials = appendUniqueSearchValues(p.Materials, values...)
		case "style":
			p.Styles = appendUniqueSearchValues(p.Styles, values...)
		case "occasion":
			p.Occasions = appendUniqueSearchValues(p.Occasions, values...)
		}
	}
	return p
}

func appendUniqueSearchValues(values []string, additions ...string) []string {
	seen := make(map[string]struct{}, len(values)+len(additions))
	for _, value := range values {
		seen[value] = struct{}{}
	}
	for _, value := range additions {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; !exists {
			values = append(values, value)
			seen[value] = struct{}{}
		}
	}
	return values
}

func buildCatalogFilter(p searchCatalogToolParams) bson.M {
	f := bson.M{}
	// Price range at product level
	if p.PriceMin != nil || p.PriceMax != nil {
		price := bson.M{}
		if p.PriceMin != nil {
			price["$gte"] = *p.PriceMin
		}
		if p.PriceMax != nil {
			price["$lte"] = *p.PriceMax
		}
		f["price"] = price
	}
	if p.InStock != nil && *p.InStock {
		f["in_stock"] = true
	}
	if len(p.Brands) > 0 {
		f["brand"] = bson.M{"$in": p.Brands}
	}
	if len(p.CategoryIDs) > 0 {
		var oids []primitive.ObjectID
		for _, s := range p.CategoryIDs {
			if oid, err := primitive.ObjectIDFromHex(s); err == nil {
				oids = append(oids, oid)
			}
		}
		if len(oids) > 0 {
			f["category_ids"] = bson.M{"$in": oids}
		}
	}
	return f
}

func buildVariantPipeline(base bson.M, p searchCatalogToolParams, _ map[string]int, limit int) mongo.Pipeline {
	// Unwind → per-variant filter → sort → limit
	// Variant filter mirrors p but as match on unwound color_variants fields.
	var variantAnd []bson.M
	if len(p.Colors) > 0 {
		variantAnd = append(variantAnd, bson.M{"$or": []bson.M{
			{"color_variants.color_name": bson.M{"$in": p.Colors}},
			{"color_variants.color": bson.M{"$in": p.Colors}},
			{"color_variants.ai_metadata.color_family": bson.M{"$in": p.Colors}},
		}})
	}
	if len(p.ProductTypes) > 0 {
		variantAnd = append(variantAnd, bson.M{"$or": []bson.M{
			{"color_variants.ai_metadata.product_type_standard": bson.M{"$in": p.ProductTypes}},
			{"color_variants.ai_metadata.product_type_persian": bson.M{"$in": p.ProductTypes}},
			{"search_metadata.keywords": bson.M{"$in": p.ProductTypes}},
		}})
	}
	if len(p.Materials) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.material_persian": bson.M{"$in": p.Materials}})
	}
	if len(p.Styles) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.style_persian": bson.M{"$in": p.Styles}})
	}
	if len(p.Patterns) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.pattern_persian": bson.M{"$in": p.Patterns}})
	}
	if len(p.FitTypes) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.fit_type": bson.M{"$in": p.FitTypes}})
	}
	if len(p.Seasons) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.season": bson.M{"$in": p.Seasons}})
	}
	if len(p.Genders) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.gender": bson.M{"$in": p.Genders}})
	}
	if len(p.Occasions) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.ai_metadata.occasion_tags": bson.M{"$in": p.Occasions}})
	}
	if len(p.Sizes) > 0 {
		variantAnd = append(variantAnd, bson.M{"color_variants.sizes.size": bson.M{"$in": p.Sizes}})
	}
	if p.InStock != nil && *p.InStock {
		variantAnd = append(variantAnd, bson.M{"color_variants.sizes.quantity": bson.M{"$gt": 0}})
	}

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: base}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$color_variants"}}},
	}
	if len(variantAnd) > 0 {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"$and": variantAnd}}})
	}
	// Text search bonus if query present — $text would require text index on ai_metadata but we also support later vector rerank
	if q := strings.TrimSpace(p.Query); q != "" && len(variantAnd) == 0 {
		// light free-text on product name + variant color; keeps pipeline index-friendly
		terms := strings.Fields(q)
		if len(terms) > 0 {
			var or []bson.M
			for _, t := range terms {
				rx := primitive.Regex{Pattern: t, Options: "i"}
				or = append(or,
					bson.M{"name": rx},
					bson.M{"search_metadata.namePersian": rx},
					bson.M{"search_metadata.keywords": rx},
					bson.M{"color_variants.color_name": rx},
					bson.M{"color_variants.ai_metadata.keywords": rx},
					bson.M{"color_variants.ai_metadata.product_type_persian": rx},
				)
			}
			pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"$or": or}}})
		}
	}
	pipeline = append(pipeline, bson.D{{Key: "$sort", Value: bson.D{{Key: "search_metadata.popularity_score", Value: -1}, {Key: "created_at", Value: -1}}}})
	pipeline = append(pipeline, bson.D{{Key: "$limit", Value: limit * 2}})
	pipeline = append(pipeline, bson.D{{Key: "$project", Value: bson.M{
		"_id":            1,
		"name":           1,
		"price":          1,
		"color_variants": 1,
	}}})
	if limit > 0 {
		pipeline = append(pipeline, bson.D{{Key: "$limit", Value: limit * 3}})
	}
	return pipeline
}

func docToHit(doc bson.M) CatalogVariantHit {
	idVal, _ := doc["_id"].(primitive.ObjectID)
	productID := idVal.Hex()
	name, _ := doc["name"].(string)
	price, _ := doc["price"].(float64)
	if price == 0 {
		if pi, ok := doc["price"].(int32); ok {
			price = float64(pi)
		} else if pf, ok := doc["price"].(int); ok {
			price = float64(pf)
		}
	}
	cvRaw, _ := doc["color_variants"].(bson.M)
	if cvRaw == nil {
		// Also handle primitive.M path for older driver
		if m, ok := doc["color_variants"].(map[string]interface{}); ok {
			cvRaw = m
		}
	}
	var variantID, color, colorName, swatch string
	var sizes []string
	if cvRaw != nil {
		variantID, _ = cvRaw["variant_id"].(string)
		color, _ = cvRaw["color"].(string)
		colorName, _ = cvRaw["color_name"].(string)
		swatch, _ = cvRaw["swatch_image"].(string)
		if rawSizes, ok := cvRaw["sizes"].(bson.A); ok {
			for _, raw := range rawSizes {
				if sizeDoc, ok := raw.(bson.M); ok {
					if size, ok := sizeDoc["size"].(string); ok {
						sizes = append(sizes, size)
					}
				}
			}
		}
		if swatch == "" {
			if img, ok := cvRaw["images"].(bson.A); ok && len(img) > 0 {
				if s, ok := img[0].(string); ok {
					swatch = s
				}
			} else if img2, ok := cvRaw["images"].([]interface{}); ok && len(img2) > 0 {
				if s, ok := img2[0].(string); ok {
					swatch = s
				}
			}
		}
	}
	if swatch == "" {
		if v, ok := doc["__variant_image"].(string); ok {
			swatch = v
		}
	}
	inStock := false
	if b, ok := doc["__variant_in_stock"].(bool); ok {
		inStock = b
	}
	if variantID == "" {
		variantID = colorName
		if variantID == "" {
			variantID = color
		}
	}
	return CatalogVariantHit{
		ProductID:   productID,
		VariantID:   variantID,
		ProductName: name,
		Price:       price,
		Color:       color,
		ColorName:   colorName,
		Image:       swatch,
		InStock:     inStock,
		Sizes:       sizes,
	}
}

func rerankHitsByVector(hits []CatalogVariantHit, order map[string]int) []CatalogVariantHit {
	// Stable sort by vector rank; preserve Mongo sort as tiebreaker
	n := len(hits)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			ki := fmt.Sprintf("%s:%s", hits[i].ProductID, hits[i].VariantID)
			kj := fmt.Sprintf("%s:%s", hits[j].ProductID, hits[j].VariantID)
			oi, hasI := order[ki]
			oj, hasJ := order[kj]
			// Also try product-only key when variant FAISS key is product-level
			if !hasI {
				if v, ok := order[hits[i].ProductID]; ok {
					oi, hasI = v, true
				}
			}
			if !hasJ {
				if v, ok := order[hits[j].ProductID]; ok {
					oj, hasJ = v, true
				}
			}
			shouldSwap := false
			if hasI && hasJ {
				shouldSwap = oj < oi
			} else if hasI && !hasJ {
				shouldSwap = false
			} else if !hasI && hasJ {
				shouldSwap = true
			}
			if shouldSwap {
				hits[i], hits[j] = hits[j], hits[i]
			}
		}
	}
	return hits
}

func fallbackCatalogSearch(ctx context.Context, coll *mongo.Collection, base bson.M, p searchCatalogToolParams, limit int, vectorOrder map[string]int) ([]CatalogVariantHit, error) {
	opts := options.Find().SetLimit(int64(limit * 4))
	cur, err := coll.Find(ctx, base, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var products []models.Product
	if err := cur.All(ctx, &products); err != nil {
		return nil, err
	}
	var hits []CatalogVariantHit
	for _, prod := range products {
		for _, cv := range prod.ColorVariants {
			if len(p.Colors) > 0 && !containsStr(p.Colors, cv.ColorName) && !containsStr(p.Colors, cv.Color) {
				continue
			}
			if p.InStock != nil && *p.InStock {
				q := 0
				for _, s := range cv.Sizes {
					q += s.Quantity
				}
				if q <= 0 {
					continue
				}
			}
			img := ""
			if len(cv.Images) > 0 {
				img = cv.Images[0]
			}
			inStock := false
			var sizes []string
			for _, s := range cv.Sizes {
				if s.Quantity > 0 {
					sizes = append(sizes, s.Size)
					inStock = true
				}
			}
			vid := cv.VariantID
			if vid == "" {
				vid = cv.ColorName
			}
			hits = append(hits, CatalogVariantHit{
				ProductID:   prod.ID.Hex(),
				VariantID:   vid,
				ProductName: prod.Name,
				Price:       prod.Price,
				Color:       cv.Color,
				ColorName:   cv.ColorName,
				Image:       img,
				InStock:     inStock,
				Sizes:       sizes,
			})
			if len(hits) >= limit*3 {
				break
			}
		}
		if len(hits) >= limit*3 {
			break
		}
	}
	hits = rerankHitsByVector(hits, vectorOrder)
	if len(hits) > limit {
		hits = hits[:limit]
	}
	return hits, nil
}

func containsStr(arr []string, s string) bool {
	for _, v := range arr {
		if v == s {
			return true
		}
	}
	return false
}
