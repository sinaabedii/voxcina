package main

import (
	"log"
	"net/http"

	"backEnd/config"
	"backEnd/db"
	"backEnd/routes"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	_ = db.Connect(cfg)

	// Setup API router
	apiRouter := routes.NewRouter()

	// Create a new main mux
	mainMux := http.NewServeMux()

	// Mount the API router at /api
	mainMux.Handle("/api/", apiRouter)

	// Serve static files from the "admin" directory at /admin/
	adminFS := http.FileServer(http.Dir("./admin"))
	mainMux.Handle("/admin/", http.StripPrefix("/admin/", adminFS))

	log.Println("Server is running on port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mainMux); err != nil {
		log.Fatal(err)
	}
}
