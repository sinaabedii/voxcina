package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateRefreshTokenIndexes creates optimized indexes for the refresh_tokens
// collection used by the access/refresh-token rotation + reuse-detection flow.
//
// Indexes:
//  1. jti (unique)            - fast per-token lookup and rotation/revoke updates
//  2. user_id + expires_at     - enumerate a user's active refresh tokens (logout-all)
//  3. family                  - revoke an entire token family on reuse detection
//  4. TTL on expires_at        - eventually purge dead rows. Android tokens carry a
//     far-future expires_at and live until revoked; every revocation path re-stamps
//     expires_at to now+grace (services.refreshTokenPurgeGrace), which is what makes
//     this index the sweeper for those rows too. The key must stay expires_at.
//
// jti must be unique so two distinct refresh tokens never collide and so a
// single UpdateOne matching jti hits exactly the intended record.
func CreateRefreshTokenIndexes() error {
	collection := Database.Collection("refresh_tokens")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "jti", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("jti_unique"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "expires_at", Value: -1},
			},
			Options: options.Index().SetName("user_refresh_lookup"),
		},
		{
			Keys:    bson.D{{Key: "family", Value: 1}},
			Options: options.Index().SetName("family_revoke"),
		},
		{
			Keys: bson.D{
				{Key: "expires_at", Value: 1},
			},
			Options: options.Index().
				SetName("refresh_token_ttl").
				SetExpireAfterSeconds(int32(time.Hour.Seconds())), // graceful sweep
		},
	}

	log.Println("Creating refresh_tokens collection indexes...")
	indexNames, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Error creating refresh_tokens indexes: %v", err)
		// If the unique index already exists with different options this will
		// fail non-fatally; the server keeps using the existing index.
		return err
	}

	log.Printf("Successfully created %d indexes for refresh_tokens collection: %v", len(indexNames), indexNames)
	return nil
}

// EnsureRefreshTokenCollection makes the refresh_tokens collection exist (sharded
// / capped setups aside, Mongo creates on first write, but we expose this for
// explicit initialization symmetry with other collections).
func EnsureRefreshTokenCollection(database *mongo.Database) error {
	coll := database.Collection("refresh_tokens")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = coll
	// Nothing to do for now; indexes are created via CreateRefreshTokenIndexes.
	_ = ctx
	return nil
}
