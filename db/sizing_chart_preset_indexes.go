package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const sizingChartPresetsCollection = "sizing_chart_presets"

// CreateSizingChartPresetIndexes creates indexes for the sizing_chart_presets
// collection (distinct filled size charts archived per sizing template):
//  1. sizing_type_id + content_hash — unique, making the upsert-by-content
//     dedupe race-safe (concurrent identical inserts collide here and fall
//     back to touching the winner).
//  2. sizing_type_id + updated_at — serves the admin list sort (newest first)
//     and the keep-newest-20 prune query.
func CreateSizingChartPresetIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := Database.Collection(sizingChartPresetsCollection)
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "sizing_type_id", Value: 1},
				{Key: "content_hash", Value: 1},
			},
			Options: options.Index().SetName("sizing_chart_preset_type_content_unique").SetUnique(true),
		},
		{
			Keys: bson.D{
				{Key: "sizing_type_id", Value: 1},
				{Key: "updated_at", Value: -1},
			},
			Options: options.Index().SetName("sizing_chart_preset_type_recency_idx"),
		},
	}

	log.Println("Creating sizing_chart_presets collection indexes...")
	if _, err := collection.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Error creating sizing_chart_presets indexes: %v", err)
		return err
	}
	return nil
}
