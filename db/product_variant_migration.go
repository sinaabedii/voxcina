package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EnsureProductVariantIDs backfills stable IDs for legacy color/pattern
// variants. The migration only writes products that still have missing IDs.
func EnsureProductVariantIDs() error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	collection := Database.Collection("products")
	cursor, err := collection.Find(ctx, bson.M{"color_variants": bson.M{"$exists": true}})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	updated := 0
	for cursor.Next(ctx) {
		var product struct {
			ID            primitive.ObjectID `bson:"_id"`
			ColorVariants []bson.M           `bson:"color_variants"`
		}
		if err := cursor.Decode(&product); err != nil {
			return err
		}

		changed := false
		for _, variant := range product.ColorVariants {
			variantID, _ := variant["variant_id"].(string)
			if variantID == "" {
				variant["variant_id"] = primitive.NewObjectID().Hex()
				changed = true
			}
		}
		if !changed {
			continue
		}

		if _, err := collection.UpdateOne(
			ctx,
			bson.M{"_id": product.ID},
			bson.M{"$set": bson.M{"color_variants": product.ColorVariants}},
		); err != nil {
			return err
		}
		updated++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	if updated > 0 {
		log.Printf("Backfilled variant IDs for %d products", updated)
	}
	return nil
}
