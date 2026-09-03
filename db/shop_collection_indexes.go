package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const shopCollectionsCollection = "shop_collections"

// CreateShopCollectionIndexes creates indexes for the admin-curated product
// collections (bundles of specific color variants).
//
//  1. is_active + display_order — the public listing, in the admin's order.
//  2. display_order — the admin listing, which shows inactive bundles too.
//  3. items.product_id — supports a future "which collections contain this
//     product" lookup; deleting a product today leaves the reference behind
//     and the read path resolves it as out-of-stock, so nothing depends on
//     this index yet, but maintaining it on every product edit would be a
//     full scan without it.
func CreateShopCollectionIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collections := Database.Collection(shopCollectionsCollection)
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "is_active", Value: 1},
				{Key: "display_order", Value: 1},
			},
			Options: options.Index().SetName("active_order_idx"),
		},
		{
			Keys:    bson.D{{Key: "display_order", Value: 1}},
			Options: options.Index().SetName("display_order_idx"),
		},
		{
			Keys:    bson.D{{Key: "items.product_id", Value: 1}},
			Options: options.Index().SetName("items_product_idx"),
		},
	}

	log.Println("Creating shop_collections collection indexes...")
	if _, err := collections.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Error creating shop_collections indexes: %v", err)
		return err
	}

	log.Println("Successfully created shop collection indexes")
	return nil
}
