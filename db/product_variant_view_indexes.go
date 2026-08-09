package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateProductVariantViewIndexes creates the indexes used by the trending
// endpoint and its atomic upsert path.
func CreateProductVariantViewIndexes() error {
	collection := Database.Collection("product_variant_views")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "product_id", Value: 1}, {Key: "variant_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("product_variant_unique"),
		},
		{
			Keys:    bson.D{{Key: "view_count", Value: -1}, {Key: "last_viewed_at", Value: -1}},
			Options: options.Index().SetName("trending_variant_views"),
		},
	})
	return err
}
