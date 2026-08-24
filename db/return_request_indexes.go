package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateReturnRequestIndexes creates indexes for the return_requests collection.
//
// Indexes:
//  1. order_id where status == pending (unique, partial) — DB-level guarantee
//     that two concurrent submissions can never both become the single active
//     request for an order; the second insert fails with a duplicate key error.
//  2. user_id + created_at — a user's return history, newest first.
//  3. status + created_at — admin queue listing (pending first).
func CreateReturnRequestIndexes() error {
	collection := Database.Collection("return_requests")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "order_id", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("order_pending_unique").
				SetPartialFilterExpression(bson.M{"status": "pending"}),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("user_created_idx"),
		},
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("status_created_idx"),
		},
	}

	log.Println("Creating return_requests collection indexes...")
	indexNames, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Error creating return_requests indexes: %v", err)
		return err
	}

	log.Printf("Successfully created %d indexes for return_requests collection: %v", len(indexNames), indexNames)
	return nil
}
