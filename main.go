package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"go.mongodb.org/mongo-driver/bson"

	"backEnd/config"
	"backEnd/db"
	"backEnd/handlers"
	"backEnd/mongo_data"
	"backEnd/routes"
)

func main() {
	// Parse command line flags
	seedDB := flag.Bool("seed", false, "Seed the database with initial data")
	healthCheck := flag.Bool("healthcheck", false, "Check MongoDB connection")
	checkVocab := flag.Bool("check-vocab", false, "Check vocabulary mappings count")
	flag.Parse()

	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	database := db.Connect(cfg)

	// Handle special commands
	if *healthCheck {
		// Simple health check - if we can connect, exit with code 0
		if database != nil {
			os.Exit(0)
		} else {
			os.Exit(1)
		}
	}

	if *checkVocab {
		// Check vocabulary mappings count
		if database == nil {
			fmt.Println("0")
			os.Exit(1)
		}

		collection := database.Collection("vocabulary_mappings")
		count, err := collection.CountDocuments(context.Background(), bson.M{})
		if err != nil {
			fmt.Println("0")
			os.Exit(1)
		}
		fmt.Printf("%d\n", count)
		os.Exit(0)
	}

	// Initialize chat service
	handlers.InitChatService(database)
	log.Println("Chat service initialized")

	// Initialize user activity service
	handlers.InitUserActivityService(database)
	log.Println("User activity service initialized")

	// Initialize Zibal payment service
	handlers.InitZibalService()
	log.Println("Zibal payment service initialized")

	// Seed database if requested
	if *seedDB {
		log.Println("Seeding database...")
		if err := mongo_data.SeedDatabase(); err != nil {
			log.Fatalf("Database seeding failed: %v", err)
		}
		log.Println("Database seeding completed!")
		return
	}

	// Setup API router
	apiRouter := routes.NewRouter()

	// Create a new main mux
	mainMux := http.NewServeMux()

	// Mount the API router at /api
	mainMux.Handle("/api/", apiRouter)

	// Serve static files from the "admin" directory at /admin/
	adminFS := http.FileServer(http.Dir("./admin"))
	mainMux.Handle("/admin/", http.StripPrefix("/admin/", adminFS))

	// Serve static files from the "uploads" directory at /uploads/
	uploadsFS := http.FileServer(http.Dir("./uploads"))
	mainMux.Handle("/uploads/", http.StripPrefix("/uploads/", uploadsFS))

	log.Println("Server is running on port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mainMux); err != nil {
		log.Fatal(err)
	}
}
