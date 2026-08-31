package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateCheckoutChatIndexes creates indexes for the checkout_chats collection
// (the checkout-page discount-negotiation transcript store). Called once at
// startup, kept separate from CreateTryonIndexes since this collection is
// unrelated to the fitting room.
func CreateCheckoutChatIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	checkoutChats := Database.Collection("checkout_chats")
	indexes := []mongo.IndexModel{
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
	}
	if names, err := checkoutChats.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Error creating checkout_chats indexes: %v", err)
		return err
	} else {
		log.Printf("checkout_chats indexes: %v", names)
	}

	return nil
}
