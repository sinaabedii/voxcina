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

	// Setup router
	router := routes.NewRouter()

	// Start server
	log.Println("Server is running on port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatal(err)
	}
}
