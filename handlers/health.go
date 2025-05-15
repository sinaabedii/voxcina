package handlers

import (
	"net/http"

	"backEnd/utils"
)

// HealthCheck handles GET /api/health
// Simple endpoint to check if the API is up and running
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "API is running",
	})
}
