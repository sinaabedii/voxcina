package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/config"
)

var Client *mongo.Client
var Database *mongo.Database

func Connect(cfg *config.Config) *mongo.Database {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.DBURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("Mongo connect error:", err)
	}
	Client = client
	Database = client.Database(cfg.DBName)

	// Ensure unique index for email in users collection upon connection
	usersCollection := Database.Collection("users")
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}}, // 1 for ascending order
		Options: options.Index().SetUnique(true),
	}
	_, err = usersCollection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		log.Printf("Warning: Could not ensure unique index for users email: %v", err)
		// If index creation failure is critical, consider log.Fatal(err)
	}

	// Ensure unique index for slug in blog_posts collection
	blogPostsCollection := Database.Collection("blog_posts")
	blogSlugIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}}, // 1 for ascending order
		Options: options.Index().SetUnique(true),
	}
	_, err = blogPostsCollection.Indexes().CreateOne(context.Background(), blogSlugIndexModel)
	if err != nil {
		log.Printf("Warning: Could not ensure unique index for blog_posts slug: %v", err)
	}

	log.Println("Database connected and indexes ensured.")
	return Database
}
