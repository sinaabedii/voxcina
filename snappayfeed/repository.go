package snappayfeed

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// maxCategoryDepth guards the parent_id walk against a cycle introduced by a
// mis-edited category; a breadcrumb was never going to be deeper than this.
const maxCategoryDepth = 8

// maxSurrogateScan bounds the fallback scan that resolves a surrogate variant
// key (see repository.resolveSurrogateKeys).
const maxSurrogateScan = 5000

// feedProjection strips the two embedding-carrying fields from every read.
// AGENTS.md: these must be named with their BSON spelling — using the Go JSON
// tag (aiMetadata) silently matches nothing and ships hundreds of KB per page.
var feedProjection = bson.M{
	"color_variants.ai_metadata": 0,
	"search_metadata":            0,
}

// unsetStage is the aggregation-pipeline form of feedProjection.
var unsetStage = bson.D{{Key: "$unset", Value: bson.A{"color_variants.ai_metadata", "search_metadata"}}}

// activeFilter is the only visibility rule the feed applies: is_active is the
// storefront toggle, and a hidden product must not be advertised in SnappPay
// search either.
var activeFilter = bson.M{"is_active": true}

// repository holds the read-only catalog queries. Every method here is a Find
// or an Aggregate — the package never writes (see doc.go).
type repository struct {
	db *mongo.Database
}

func (r repository) products() *mongo.Collection {
	return r.db.Collection("products")
}

// page returns one page of the catalog plus the grand total, in a single
// round trip.
//
// In variant granularity the unit of pagination is the colour variant, not the
// product — the same $unwind-inside-$facet shape ListProducts already uses —
// so `limit` means "this many feed rows" and count/max_pages describe rows
// rather than products. Each returned document carries exactly the one variant
// it was unwound from, re-wrapped into a single-element array so it still
// decodes as a models.Product without touching the model.
func (r repository) page(ctx context.Context, cfg Config, limit, page int) ([]models.Product, int, error) {
	cursor, err := r.products().Aggregate(ctx, pagePipeline(cfg, limit, page))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var faceted []struct {
		Rows  []models.Product `bson:"rows"`
		Total []struct {
			Count int `bson:"count"`
		} `bson:"total"`
	}
	if err := cursor.All(ctx, &faceted); err != nil {
		return nil, 0, err
	}
	if len(faceted) == 0 {
		return nil, 0, nil
	}

	total := 0
	if len(faceted[0].Total) > 0 {
		total = faceted[0].Total[0].Count
	}
	return faceted[0].Rows, total, nil
}

// pagePipeline builds the paging aggregation. It is split out from page() so
// its shape can be asserted without a database — the field paths below are
// BSON names, and getting one wrong fails silently at runtime (AGENTS.md).
func pagePipeline(cfg Config, limit, page int) mongo.Pipeline {
	skip := (page - 1) * limit

	rows := mongo.Pipeline{
		bson.D{{Key: "$skip", Value: skip}},
		bson.D{{Key: "$limit", Value: limit}},
	}

	// $match and $sort stay adjacent at the head so the _id index can serve
	// the sort; everything that reshapes documents comes after.
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: activeFilter}},
		bson.D{{Key: "$sort", Value: bson.D{{Key: "_id", Value: -1}}}},
		unsetStage,
	}

	if cfg.Granularity == GranularityVariant {
		pipeline = append(pipeline, bson.D{{Key: "$unwind", Value: "$color_variants"}})
		// $unwind leaves color_variants as a single subdocument; re-wrapping
		// it into a one-element array is what lets the result decode as a
		// models.Product without adding a feed-shaped struct to models/.
		rows = append(rows, bson.D{{Key: "$addFields", Value: bson.M{
			"color_variants": bson.A{"$color_variants"},
		}}})
	}

	return append(pipeline, bson.D{{Key: "$facet", Value: bson.M{
		"rows":  rows,
		"total": mongo.Pipeline{bson.D{{Key: "$count", Value: "count"}}},
	}}})
}

// byProductIDs answers a targeted refresh. Unknown ids simply produce no row,
// which is how the plugin behaves for an id that is not published (L157-167).
func (r repository) byProductIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.Product, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	filter := bson.M{"_id": bson.M{"$in": ids}, "is_active": true}
	return r.find(ctx, filter, 0)
}

// byVariantIDs resolves a slugs= refresh against the real variant ids.
func (r repository) byVariantIDs(ctx context.Context, keys []string) ([]models.Product, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	filter := bson.M{"color_variants.variant_id": bson.M{"$in": keys}, "is_active": true}
	return r.find(ctx, filter, 0)
}

// resolveSurrogateKeys covers the products whose variants predate variant_id:
// their feed key is a hash we compute, so Mongo cannot index it. It is a
// bounded scan of slim documents (ids and colour names only) that runs ONLY
// when a slugs= refresh asked for a key no variant_id matched — never on the
// crawl path.
func (r repository) resolveSurrogateKeys(ctx context.Context, keys map[string]bool) ([]primitive.ObjectID, error) {
	if len(keys) == 0 {
		return nil, nil
	}

	opts := options.Find().
		SetProjection(bson.M{
			"_id":                       1,
			"color_variants.variant_id": 1,
			"color_variants.color":      1,
			"color_variants.color_name": 1,
		}).
		SetLimit(maxSurrogateScan)

	cursor, err := r.products().Find(ctx, activeFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var matched []primitive.ObjectID
	for cursor.Next(ctx) {
		var candidate models.Product
		if err := cursor.Decode(&candidate); err != nil {
			continue
		}
		productID := candidate.ID.Hex()
		for _, v := range candidate.ColorVariants {
			if keys[variantKey(productID, v)] {
				matched = append(matched, candidate.ID)
				break
			}
		}
	}
	return matched, cursor.Err()
}

func (r repository) find(ctx context.Context, filter bson.M, limit int64) ([]models.Product, error) {
	opts := options.Find().
		SetProjection(feedProjection).
		SetSort(bson.D{{Key: "_id", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}

	cursor, err := r.products().Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}
	return products, nil
}

// categoryPaths builds "زنانه > پوشاک > بامبر" breadcrumbs for every category,
// in one read of a small collection. Source #3 rejects flat category names.
func (r repository) categoryPaths(ctx context.Context) (map[string]string, error) {
	cursor, err := r.db.Collection("categories").Find(ctx, bson.M{}, options.Find().
		SetProjection(bson.M{"_id": 1, "name": 1, "parent_id": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	return buildCategoryPaths(categories), nil
}

// buildCategoryPaths is split out from the query so it can be unit-tested
// without Mongo.
func buildCategoryPaths(categories []models.Category) map[string]string {
	byID := make(map[string]models.Category, len(categories))
	for _, c := range categories {
		byID[c.ID.Hex()] = c
	}

	paths := make(map[string]string, len(categories))
	for _, c := range categories {
		names := []string{}
		current := c
		for depth := 0; depth < maxCategoryDepth; depth++ {
			name := strings.TrimSpace(current.Name)
			if name == "" {
				break
			}
			names = append([]string{name}, names...)

			if current.ParentID.IsZero() {
				break
			}
			parent, ok := byID[current.ParentID.Hex()]
			if !ok || parent.ID == current.ID {
				break
			}
			current = parent
		}
		if len(names) > 0 {
			paths[c.ID.Hex()] = strings.Join(names, " > ")
		}
	}
	return paths
}
