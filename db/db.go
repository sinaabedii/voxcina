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

	// Ensure unique index for phone in users collection upon connection
	usersCollection := Database.Collection("users")
	phoneIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "phone", Value: 1}}, // 1 for ascending order
		Options: options.Index().SetUnique(true),
	}
	_, err = usersCollection.Indexes().CreateOne(context.Background(), phoneIndexModel)
	if err != nil {
		log.Printf("Warning: Could not ensure unique index for users phone: %v", err)
		// If index creation failure is critical, consider log.Fatal(err)
	}

	// Drop old non-sparse email index if it exists, then create sparse one
	// This is needed because the old index blocks empty email values
	_, _ = usersCollection.Indexes().DropOne(context.Background(), "email_1")
	
	// Ensure unique sparse index for email in users collection (allows multiple empty/null values)
	emailIndexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}}, // 1 for ascending order
		Options: options.Index().SetUnique(true).SetSparse(true).SetName("email_1_sparse"), // Sparse allows multiple null/empty values
	}
	_, err = usersCollection.Indexes().CreateOne(context.Background(), emailIndexModel)
	if err != nil {
		log.Printf("Warning: Could not ensure unique sparse index for users email: %v", err)
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

	// Ensure AI search indexes for agent-driven product retrieval
	if err := EnsureAISearchIndexes(Database); err != nil {
		log.Printf("Warning: Could not ensure AI search indexes: %v", err)
		// Non-critical, continue anyway
	}

	// Create user activity tracking indexes
	if err := CreateUserActivityIndexes(); err != nil {
		log.Printf("Warning: Could not ensure user activity indexes: %v", err)
		// Non-critical, continue anyway
	}

	// Create virtual try-on + tryon chat indexes
	if err := CreateTryonIndexes(); err != nil {
		log.Printf("Warning: Could not ensure tryon indexes: %v", err)
		// Non-critical, continue anyway
	}

	// Create blog AI pipeline indexes
	if err := EnsureBlogIndexes(Database); err != nil {
		log.Printf("Warning: Could not ensure blog indexes: %v", err)
		// Non-critical, continue anyway
	}

	// Ensure blog collections exist
	if err := EnsureBlogCollections(Database); err != nil {
		log.Printf("Warning: Could not ensure blog collections: %v", err)
		// Non-critical, continue anyway
	}

	log.Println("Database connected and indexes ensured.")
	return Database
}
