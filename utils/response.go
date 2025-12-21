package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Auth error codes for consistent client handling
const (
	ErrCodeMissingHeader    = "MISSING_AUTH_HEADER"
	ErrCodeInvalidFormat    = "INVALID_TOKEN_FORMAT"
	ErrCodeTokenExpired     = "TOKEN_EXPIRED"
	ErrCodeInvalidToken     = "INVALID_TOKEN"
	ErrCodeInsufficientRole = "INSUFFICIENT_ROLE"
)

func JSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func ErrorResponse(w http.ResponseWriter, status int, message string) {
	JSONResponse(w, status, map[string]string{"error": message})
}

// AuthErrorResponse returns a standardized auth error response with error code
func AuthErrorResponse(w http.ResponseWriter, statusCode int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
		"code":  code,
	})
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
