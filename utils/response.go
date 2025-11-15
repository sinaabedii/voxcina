package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func JSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func ErrorResponse(w http.ResponseWriter, status int, message string) {
	JSONResponse(w, status, map[string]string{"error": message})
}

func SuccessResponse(w http.ResponseWriter, status int, message string, data interface{}) {
	JSONResponse(w, status, map[string]interface{}{
		"message": message,
		"data":    data,
	})
}

// LogAction logs an action with a timestamp and related information
// This can be expanded later to log to files or external monitoring systems
func LogAction(action string, details string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("[%s] %s: %s\n", timestamp, action, details)
}

// GetIntFromQuery gets an integer from URL query parameters with a default value
func GetIntFromQuery(r *http.Request, key string, defaultValue int) int {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue
	}
	
	var value int
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	if err != nil {
		return defaultValue
	}
	
	return value
}
