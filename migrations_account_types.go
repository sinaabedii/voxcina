package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// -migrate-account-types backfills the account identity fields introduced for
// the external-service (bot/channel) integration.
//
// Every pre-existing user was created through the site's phone registration,
// so every document with a non-empty phone and no account_type is stamped
// "registered". Phone-less documents are REPORTED ONLY — none should exist in
// production data (phone used to be required), and any that do need a human
// decision, not a silent guess.
//
// With -dry-run the migration reports what it would change without writing.
//
// Idempotent: the update filter only matches documents still missing
// account_type, so re-running after a partial run finishes the job.
func accountTypesMigrationEntryPoint(database *mongo.Database, dryRun bool) int {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	users := database.Collection("users")

	// 1. Stamp registered accounts.
	filter := bson.M{
		"phone":        bson.M{"$type": "string", "$ne": ""},
		"account_type": bson.M{"$in": bson.A{nil, ""}},
	}
	count, err := users.CountDocuments(ctx, filter)
	if err != nil {
		log.Printf("Error counting users for account-type backfill: %v", err)
		return 1
	}
	if count == 0 {
		log.Println("No users need an account_type backfill.")
	} else if dryRun {
		log.Printf("Dry run: would stamp %d users as account_type=registered", count)
	} else {
		result, err := users.UpdateMany(ctx, filter, bson.M{"$set": bson.M{
			"account_type": "registered",
			"updated_at":   time.Now(),
		}})
		if err != nil {
			log.Printf("Error backfilling account_type: %v", err)
			return 1
		}
		log.Printf("Stamped %d users as account_type=registered", result.ModifiedCount)
	}

	// 2. Report phone-less documents (informational; never modified).
	phoneLessFilter := bson.M{"$or": []bson.M{
		{"phone": bson.M{"$exists": false}},
		{"phone": ""},
	}}
	phoneLess, err := users.CountDocuments(ctx, phoneLessFilter)
	if err != nil {
		log.Printf("Error counting phone-less users: %v", err)
		return 1
	}
	if phoneLess > 0 {
		log.Printf("WARNING: %d user document(s) carry no phone. External (bot-channel) accounts are created that way; production site data should have none. Listed below:", phoneLess)
		cursor, err := users.Find(ctx, phoneLessFilter)
		if err != nil {
			log.Printf("Error listing phone-less users: %v", err)
			return 1
		}
		defer cursor.Close(ctx)
		for cursor.Next(ctx) {
			var doc struct {
				ID        primitive.ObjectID `bson:"_id"`
				Name      string             `bson:"name"`
				CreatedAt time.Time          `bson:"created_at"`
			}
			if err := cursor.Decode(&doc); err != nil {
				continue
			}
			fmt.Printf("  phone-less user: _id=%s name=%q created_at=%s\n", doc.ID.Hex(), doc.Name, doc.CreatedAt.Format(time.RFC3339))
		}
	} else {
		log.Println("No phone-less user documents found.")
	}

	// 3. Report any already-stamped non-registered accounts (informational).
	channelCounts, err := users.CountDocuments(ctx, bson.M{"account_type": bson.M{"$in": bson.A{"external", "merged"}}})
	if err != nil {
		log.Printf("Error counting non-registered accounts: %v", err)
		return 1
	}
	log.Printf("Existing external/merged accounts: %d", channelCounts)

	log.Println("Account-type migration finished.")
	return 0
}
