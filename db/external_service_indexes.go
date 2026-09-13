package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateExternalServiceIndexes creates the indexes backing the external
// service (bot/Instagram/Bale) integration:
//
//   - external_services: key_hash unique (the X-API-Key lookup), name unique,
//     and provider for admin filtering.
//   - external_identities: (provider, external_id) unique among ACTIVE rows —
//     a channel account can never point at two live users, while a revoked
//     row may coexist with the fresh row a later re-contact creates (unlink
//     then come back starts over, it never re-activates the old link). Plus
//     user_id for the profile's "connected accounts" listing. The legacy
//     full unique index treated a revoked row as still occupying the slot
//     and permanently bricked the channel account, so it is dropped first.
//   - link_codes: TTL on expires_at sweeps burned and abandoned codes.
//   - outbound_events: outbox polling needs status + next_attempt_at, and the
//     delivered rows are swept by the TTL index on updated_at well after any
//     redelivery window.
//   - external_service_audit: admin audit trail listing, newest first.
func CreateExternalServiceIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if _, err := Database.Collection("external_services").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "key_hash", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("key_hash_unique"),
		},
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("name_unique"),
		},
		{
			Keys:    bson.D{{Key: "provider", Value: 1}},
			Options: options.Index().SetName("provider_idx"),
		},
	}); err != nil {
		log.Printf("Error creating external_services indexes: %v", err)
		return err
	}

	// Legacy full unique index would block the fresh row a re-contact needs
	// after an unlink; replace it with the partial one below.
	_, _ = Database.Collection("external_identities").Indexes().DropOne(ctx, "provider_external_id_unique")
	if _, err := Database.Collection("external_identities").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "provider", Value: 1}, {Key: "external_id", Value: 1}},
			Options: options.Index().SetUnique(true).
				SetName("provider_external_id_active_unique").
				// Literal "active" (models.ExternalIdentityStatusActive):
				// db cannot import models — models reaches back into db
				// through utils.
				SetPartialFilterExpression(bson.M{"status": "active"}),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetName("user_id_idx"),
		},
	}); err != nil {
		log.Printf("Error creating external_identities indexes: %v", err)
		return err
	}

	if _, err := Database.Collection("link_codes").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "code", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("code_unique"),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetName("user_id_idx"),
		},
		{
			Keys:    bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0).SetName("link_code_ttl"),
		},
	}); err != nil {
		log.Printf("Error creating link_codes indexes: %v", err)
		return err
	}

	if _, err := Database.Collection("outbound_events").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "next_attempt_at", Value: 1},
			},
			Options: options.Index().SetName("outbox_poll_idx"),
		},
		{
			Keys:    bson.D{{Key: "service_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("service_history_idx"),
		},
		{
			Keys:    bson.D{{Key: "updated_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(int32((30 * 24 * time.Hour).Seconds())).SetName("outbound_event_ttl"),
		},
	}); err != nil {
		log.Printf("Error creating outbound_events indexes: %v", err)
		return err
	}

	if _, err := Database.Collection("external_service_audit").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "service_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("service_created_idx"),
		},
	}); err != nil {
		log.Printf("Error creating external_service_audit indexes: %v", err)
		return err
	}

	log.Println("External service integration indexes ensured.")
	return nil
}
