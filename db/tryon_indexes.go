package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateTryonIndexes creates indexes for the virtual_tryons and
// tryon_chats collections. Called once at startup. Both collections
// are kept indefinitely (no TTL) by design.
func CreateTryonIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// virtual_tryons
	virtualTryons := Database.Collection("virtual_tryons")
	virtualTryonsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "tryon_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("tryon_id_unique"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("user_history"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "garment_product_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("user_product_history").SetSparse(true),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "person_image_hash", Value: 1},
			},
			Options: options.Index().SetName("user_person_dedup").SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "task_id", Value: 1}},
			Options: options.Index().SetName("task_lookup").SetSparse(true),
		},
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "created_at", Value: 1},
			},
			Options: options.Index().SetName("status_created"),
		},
	}
	if names, err := virtualTryons.Indexes().CreateMany(ctx, virtualTryonsIndexes); err != nil {
		log.Printf("Error creating virtual_tryons indexes: %v", err)
		return err
	} else {
		log.Printf("virtual_tryons indexes: %v", names)
	}

	// tryon_chats
	tryonChats := Database.Collection("tryon_chats")
	tryonChatsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "chat_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("chat_id_unique"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "updated_at", Value: -1},
			},
			Options: options.Index().SetName("user_sessions"),
		},
		{
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "status", Value: 1},
				{Key: "updated_at", Value: -1},
			},
			Options: options.Index().SetName("user_status_sessions"),
		},
		{
			Keys:    bson.D{{Key: "tryon_ids", Value: 1}},
			Options: options.Index().SetName("tryon_link").SetSparse(true),
		},
		{
			Keys: bson.D{
				{Key: "messages.content", Value: "text"},
				{Key: "title", Value: "text"},
			},
			Options: options.Index().SetName("fulltext"),
		},
	}
	if names, err := tryonChats.Indexes().CreateMany(ctx, tryonChatsIndexes); err != nil {
		log.Printf("Error creating tryon_chats indexes: %v", err)
		return err
	} else {
		log.Printf("tryon_chats indexes: %v", names)
	}

	// negotiated_coupons: add tryon_id and chat_id indexes (sparse, optional)
	negotiatedCoupons := Database.Collection("negotiated_coupons")
	negotiatedIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "tryon_id", Value: 1}},
			Options: options.Index().SetName("coupon_tryon").SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "chat_id", Value: 1}},
			Options: options.Index().SetName("coupon_chat").SetSparse(true),
		},
	}
	if names, err := negotiatedCoupons.Indexes().CreateMany(ctx, negotiatedIndexes); err != nil {
		log.Printf("Error creating negotiated_coupons tryon/chat indexes: %v", err)
		// non-fatal
	} else {
		log.Printf("negotiated_coupons tryon/chat indexes: %v", names)
	}

	return nil
}
