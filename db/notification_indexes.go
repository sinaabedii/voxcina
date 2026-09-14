package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateNotificationIndexes backs the notification system:
//
//   - notifications: the inbox query ({user_id, created_at desc}), the unread
//     filter ({user_id, is_read}), the per-campaign read stats ({campaign_id})
//     and the retention TTL ({expires_at} expireAfterSeconds: 0 — the rows
//     themselves carry expires_at = created_at + 90 days, so the TTL index
//     with a zero-second rule sweeps each row exactly at its own expiry).
//   - user_devices: unique install_id (the upsert key — FCM rotates tokens,
//     so the token must never be the key) and user_id for the fan-out scan.
//   - notification_preferences: user_id unique (one document per user).
//   - notification_campaigns: created_at desc for the dashboard history.
//   - push_outbox: the dispatcher poll ({status, next_attempt_at}) and the
//     per-user scan when delivering.
//
// Index creation is best-effort and never fatal; every failure is logged.
func CreateNotificationIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	notifications := Database.Collection("notifications")
	inboxIdx := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("user_created_at_desc"),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "is_read", Value: 1}},
			Options: options.Index().SetName("user_is_read"),
		},
		{
			Keys:    bson.D{{Key: "campaign_id", Value: 1}},
			Options: options.Index().SetName("campaign_id"),
		},
		{
			Keys: bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().
				SetExpireAfterSeconds(0).
				SetName("expires_at_ttl"),
		},
	}
	if _, err := notifications.Indexes().CreateMany(ctx, inboxIdx); err != nil {
		log.Printf("WARNING: notification indexes incomplete: %v", err)
	}

	devices := Database.Collection("user_devices")
	if _, err := devices.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "install_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("install_id_unique"),
	}); err != nil {
		log.Printf("WARNING: could not create the unique index on user_devices.install_id: %v", err)
	}
	if _, err := devices.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetName("user_id"),
	}); err != nil {
		log.Printf("WARNING: user_devices.user_id index incomplete: %v", err)
	}

	if _, err := Database.Collection("notification_preferences").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("user_id_unique"),
	}); err != nil {
		log.Printf("WARNING: notification_preferences.user_id index incomplete: %v", err)
	}

	if _, err := Database.Collection("notification_campaigns").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "created_at", Value: -1}},
		Options: options.Index().SetName("created_at_desc"),
	}); err != nil {
		log.Printf("WARNING: notification_campaigns.created_at index incomplete: %v", err)
	}

	if _, err := Database.Collection("push_outbox").Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "status", Value: 1}, {Key: "next_attempt_at", Value: 1}},
			Options: options.Index().
				SetPartialFilterExpression(bson.M{"status": "pending"}).
				SetName("pending_next_attempt"),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetName("user_id"),
		},
		{
			Keys:    bson.D{{Key: "notification_id", Value: 1}},
			Options: options.Index().SetName("notification_id"),
		},
		{
			Keys: bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().
				SetExpireAfterSeconds(0).
				SetName("expires_at_ttl"),
		},
	}); err != nil {
		log.Printf("WARNING: push_outbox indexes incomplete: %v", err)
	}

	return nil
}
