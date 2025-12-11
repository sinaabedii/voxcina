package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateStoreIndexes creates indexes for the stores collection
func CreateStoreIndexes() {
	if Database == nil {
		log.Println("Database not initialized, skipping store indexes")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	storeCollection := Database.Collection("stores")

	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "owner_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "slug", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "is_active", Value: 1}},
		},
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "is_active", Value: 1},
			},
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
	}

	_, err := storeCollection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Error creating store indexes: %v", err)
	} else {
		log.Println("Store indexes created successfully")
	}

	// Create index for store_id on products collection
	productCollection := Database.Collection("products")
	_, err = productCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "store_id", Value: 1}},
	})
	if err != nil {
		log.Printf("Error creating product store_id index: %v", err)
	}

	// Create index for store_id on order items
	orderCollection := Database.Collection("orders")
	_, err = orderCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "items.store_id", Value: 1}},
	})
	if err != nil {
		log.Printf("Error creating order items.store_id index: %v", err)
	}

	// Create store_reviews collection indexes
	storeReviewCollection := Database.Collection("store_reviews")
	storeReviewIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "store_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "user_id", Value: 1}},
		},
		{
			Keys: bson.D{
				{Key: "store_id", Value: 1},
				{Key: "user_id", Value: 1},
				{Key: "order_id", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
	}

	_, err = storeReviewCollection.Indexes().CreateMany(ctx, storeReviewIndexes)
	if err != nil {
		log.Printf("Error creating store review indexes: %v", err)
	}
}
