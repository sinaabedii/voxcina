package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

var activityService *services.UserActivityService

// InitUserActivityService initializes the user activity service
func InitUserActivityService(db *mongo.Database) {
	activityService = services.NewUserActivityService(db)
}

// TrackActivity handles POST /api/activity/track
// Tracks a single user activity event
func TrackActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var activity models.UserActivity
	if err := json.NewDecoder(r.Body).Decode(&activity); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Extract user ID from context if authenticated
	if userIDCtx := r.Context().Value("userID"); userIDCtx != nil {
		if userID, ok := userIDCtx.(primitive.ObjectID); ok {
			activity.UserID = userID
		}
	}

	// Extract IP address
	activity.IPAddress = getClientIP(r)

	// Extract User-Agent
	activity.UserAgent = r.UserAgent()

	// Parse device info from User-Agent
	activity.DeviceType = detectDeviceType(activity.UserAgent)
	activity.Browser = detectBrowser(activity.UserAgent)
	activity.OS = detectOS(activity.UserAgent)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := activityService.TrackActivity(ctx, &activity); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to track activity")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Activity tracked successfully",
	})
}

// TrackBatchActivities handles POST /api/activity/track/batch
// Tracks multiple activity events in one request
func TrackBatchActivities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var activities []models.UserActivity
	if err := json.NewDecoder(r.Body).Decode(&activities); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Extract user ID from context if authenticated
	var userID primitive.ObjectID
	if userIDCtx := r.Context().Value("userID"); userIDCtx != nil {
		if uid, ok := userIDCtx.(primitive.ObjectID); ok {
			userID = uid
		}
	}

	// Enrich each activity with request metadata
	ipAddress := getClientIP(r)
	userAgent := r.UserAgent()
	deviceType := detectDeviceType(userAgent)
	browser := detectBrowser(userAgent)
	os := detectOS(userAgent)

	for i := range activities {
		if !userID.IsZero() {
			activities[i].UserID = userID
		}
		activities[i].IPAddress = ipAddress
		activities[i].UserAgent = userAgent
		activities[i].DeviceType = deviceType
		activities[i].Browser = browser
		activities[i].OS = os
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := activityService.TrackBatch(ctx, activities); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Failed to track activities",
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Activities tracked successfully",
		"count":   len(activities),
	})
}

// GetUserActivities handles GET /api/activity/user
// Retrieves activity history for the authenticated user
func GetUserActivities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from context
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	// Parse query parameters
	filter := models.ActivityFilter{
		UserID: userID,
		Limit:  50,
	}

	if activityTypes := r.URL.Query().Get("types"); activityTypes != "" {
		filter.ActivityTypes = strings.Split(activityTypes, ",")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	activities, err := activityService.GetUserActivities(ctx, filter)
	if err != nil {
		log.Printf("Error getting user activities: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get activities")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"activities": activities,
		"count":      len(activities),
	})
}

// GetRecentlyViewed handles GET /api/activity/recently-viewed
// Returns recently viewed products for the authenticated user
func GetRecentlyViewed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from context
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	limit := 10 // Default limit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	products, err := activityService.GetRecentlyViewedProducts(ctx, userID, limit)
	if err != nil {
		log.Printf("Error getting recently viewed products: %v", err)
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Failed to get recently viewed products",
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"products": products,
	})
}

// GetUserActivitySummary handles GET /api/activity/summary
// Returns activity summary for the authenticated user
func GetUserActivitySummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from context
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	// Default to last 30 days
	fromDate := time.Now().AddDate(0, 0, -30)
	toDate := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	summary, err := activityService.GetUserActivitySummary(ctx, userID, fromDate, toDate)
	if err != nil {
		log.Printf("Error getting activity summary: %v", err)
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Failed to get activity summary",
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"summary": summary,
	})
}

// GetConversionFunnel handles GET /api/admin/activity/funnel
// Returns conversion funnel analytics (Admin only)
func GetConversionFunnel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Default to last 30 days
	fromDate := time.Now().AddDate(0, 0, -30)
	toDate := time.Now()

	// Parse optional date range
	if from := r.URL.Query().Get("from"); from != "" {
		if parsedDate, err := time.Parse("2006-01-02", from); err == nil {
			fromDate = parsedDate
		}
	}
	if to := r.URL.Query().Get("to"); to != "" {
		if parsedDate, err := time.Parse("2006-01-02", to); err == nil {
			toDate = parsedDate
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	funnel, err := activityService.GetConversionFunnel(ctx, fromDate, toDate)
	if err != nil {
		log.Printf("Error getting conversion funnel: %v", err)
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Failed to get conversion funnel",
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"funnel":  funnel,
		"period": map[string]string{
			"from": fromDate.Format("2006-01-02"),
			"to":   toDate.Format("2006-01-02"),
		},
	})
}

// GetSessionAnalytics handles GET /api/activity/session/{sessionId}
// Returns analytics for a specific session
func GetSessionAnalytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	if sessionID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Session ID is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	analytics, err := activityService.GetSessionAnalytics(ctx, sessionID)
	if err != nil {
		log.Printf("Error getting session analytics: %v", err)
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Failed to get session analytics",
		)
		return
	}

	if analytics == nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Session not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"analytics": analytics,
	})
}

// Helper functions

// getClientIP extracts the client's IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies)
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, get the first one
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// detectDeviceType detects device type from User-Agent
func detectDeviceType(userAgent string) string {
	ua := strings.ToLower(userAgent)

	if strings.Contains(ua, "mobile") || strings.Contains(ua, "android") ||
		strings.Contains(ua, "iphone") {
		return "mobile"
	}
	if strings.Contains(ua, "tablet") || strings.Contains(ua, "ipad") {
		return "tablet"
	}
	return "desktop"
}

// detectBrowser detects browser from User-Agent
func detectBrowser(userAgent string) string {
	ua := strings.ToLower(userAgent)

	if strings.Contains(ua, "edg/") {
		return "Edge"
	}
	if strings.Contains(ua, "chrome/") {
		return "Chrome"
	}
	if strings.Contains(ua, "firefox/") {
		return "Firefox"
	}
	if strings.Contains(ua, "safari/") && !strings.Contains(ua, "chrome") {
		return "Safari"
	}
	if strings.Contains(ua, "opera") || strings.Contains(ua, "opr/") {
		return "Opera"
	}
	return "Unknown"
}

// detectOS detects operating system from User-Agent
func detectOS(userAgent string) string {
	ua := strings.ToLower(userAgent)

	if strings.Contains(ua, "windows") {
		return "Windows"
	}
	if strings.Contains(ua, "mac os") || strings.Contains(ua, "macos") {
		return "macOS"
	}
	if strings.Contains(ua, "linux") {
		return "Linux"
	}
	if strings.Contains(ua, "android") {
		return "Android"
	}
	if strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad") {
		return "iOS"
	}
	return "Unknown"
}
