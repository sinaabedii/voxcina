package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const sizingTypesCollection = "sizing_types"

// CreateSizingTypeIndexes creates indexes for the sizing_types collection:
//  1. slug — unique lookup key.
//  2. is_active + display_order — public storefront ordering.
//  3. display_order — admin listing ordering.
func CreateSizingTypeIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := Database.Collection(sizingTypesCollection)
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "slug", Value: 1}},
			Options: options.Index().SetName("sizing_type_slug_unique").SetUnique(true),
		},
		{
			Keys: bson.D{
				{Key: "is_active", Value: 1},
				{Key: "display_order", Value: 1},
			},
			Options: options.Index().SetName("sizing_type_active_order_idx"),
		},
		{
			Keys:    bson.D{{Key: "display_order", Value: 1}},
			Options: options.Index().SetName("sizing_type_display_order_idx"),
		},
	}

	log.Println("Creating sizing_types collection indexes...")
	if _, err := collection.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Error creating sizing_types indexes: %v", err)
		return err
	}
	return nil
}
