package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// runProductWeightMigration ensures every product carries a product-level
// `weight` field (grams). Any product whose weight is missing, null, or zero is
// set to 0 — the safe default until an admin supplies a real value.
//
// The field is intentionally product-scoped (not per color variant), matching
// the Product.Weight model. The migration is idempotent: re-running it only
// touches products that still have no (or zero) weight, so already-populated
// weights are never overwritten.
func runProductWeightMigration(database *mongo.Database, dryRun bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	coll := database.Collection("products")

	cursor, err := coll.Find(ctx, bson.M{
		"$or": []bson.M{
			{"weight": bson.M{"$exists": false}},
			{"weight": nil},
			{"weight": 0},
		},
	})
	if err != nil {
		return fmt.Errorf("find products without weight: %w", err)
	}
	defer cursor.Close(ctx)

	var updated int
	for cursor.Next(ctx) {
		var doc struct {
			ID   interface{} `bson:"_id"`
			Name string      `bson:"name"`
		}
		if err := cursor.Decode(&doc); err != nil {
			log.Printf("migration: decode error: %v", err)
			continue
		}
		if dryRun {
			log.Printf("migration: [dry-run] would set weight=0 on %q", doc.Name)
			updated++
			continue
		}
		if _, err := coll.UpdateOne(ctx,
			bson.M{"_id": doc.ID},
			bson.M{"$set": bson.M{"weight": 0.0, "updated_at": time.Now()}},
		); err != nil {
			log.Printf("migration: update %v failed: %v", doc.ID, err)
			continue
		}
		log.Printf("migration: set weight=0 on %q", doc.Name)
		updated++
	}
	if err := cursor.Err(); err != nil {
		return fmt.Errorf("cursor: %w", err)
	}

	log.Printf("migration: done — %d product(s) updated%s", updated, map[bool]string{true: " (dry-run, nothing written)", false: ""}[dryRun])
	return nil
}

// productWeightMigrationEntryPoint is wired up in main.go to allow running the
// migration as `./main -migrate-product-weight [-dry-run]`. It expects a
// connected *mongo.Database from the caller and returns an exit code so the
// caller can use os.Exit.
func productWeightMigrationEntryPoint(database *mongo.Database, dryRun bool) int {
	if err := runProductWeightMigration(database, dryRun); err != nil {
		log.Printf("migration: %v", err)
		return 1
	}
	return 0
}
