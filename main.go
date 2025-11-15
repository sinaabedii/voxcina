package main

import (
	"flag"
	"log"
	"net/http"

	"backEnd/config"
	"backEnd/db"
	"backEnd/handlers"
	"backEnd/mongo_data"
	"backEnd/routes"
)

func main() {
	// Parse command line flags
	seedDB := flag.Bool("seed", false, "Seed the database with initial data")
	flag.Parse()

	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	database := db.Connect(cfg)

	// Initialize chat service
	handlers.InitChatService(database)
	log.Println("Chat service initialized")

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
