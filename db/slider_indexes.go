package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateSliderIndexes creates indexes for the sliders collection, which holds
// the admin-authored promotional slides rendered below the homepage hero.
//
// Every homepage render queries this collection with the published filter and
// the display sort, so the two are indexed together:
//
//  1. isActive + order — the public read path: match published slides, then
//     return them already ordered so Mongo can skip an in-memory sort.
//  2. startAt + endAt — supports the optional scheduling window on the same
//     read path; unscheduled slides leave both fields absent.
//
// The collection is small, so these exist for correctness of the sort order and
// to keep the homepage query covered rather than for scale.
func CreateSliderIndexes() error {
	collection := Database.Collection("sliders")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "isActive", Value: 1},
				{Key: "order", Value: 1},
			},
			Options: options.Index().SetName("slider_active_order"),
		},
		{
			Keys: bson.D{
				{Key: "startAt", Value: 1},
				{Key: "endAt", Value: 1},
			},
			Options: options.Index().SetName("slider_schedule_window"),
		},
	})

	return err
}
