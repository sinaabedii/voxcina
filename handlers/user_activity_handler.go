package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

var activityService *services.UserActivityService
var activityUserCollection *mongo.Collection

// InitUserActivityService initializes the user activity service
func InitUserActivityService(db *mongo.Database) {
	activityService = services.NewUserActivityService(db)
	activityUserCollection = db.Collection("users")
}

func resolveActivityUser(ctx context.Context, r *http.Request) (primitive.ObjectID, string) {
	var userID primitive.ObjectID

	if userIDCtx := r.Context().Value("userID"); userIDCtx != nil {
		if uid, ok := userIDCtx.(primitive.ObjectID); ok {
			userID = uid
		}
	}

	if userID.IsZero() {
		authHeader := r.Header.Get("Authorization")
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(parts[1], claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return GetJWTKey(), nil
			})
			if err == nil && token.Valid {
				userID = claims.UserID
			}
		}
	}

	if userID.IsZero() || activityUserCollection == nil {
		return userID, ""
	}

	var user struct {
		Name  string `bson:"name"`
		Phone string `bson:"phone"`
	}
	if err := activityUserCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		log.Printf("Error resolving activity user name for ID %s: %v", userID.Hex(), err)
		return userID, ""
	}
	name := user.Name
	if name == "" {
		name = user.Phone
	}
	return userID, name
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	activity.UserID = primitive.ObjectID{}
	activity.UserName = ""
	if userID, userName := resolveActivityUser(ctx, r); !userID.IsZero() {
		activity.UserID = userID
		activity.UserName = userName
	}

	// Extract IP address
	activity.IPAddress = getClientIP(r)

	// Extract User-Agent
	activity.UserAgent = r.UserAgent()

	// Parse device info from User-Agent
	if activity.DeviceType == "" {
		activity.DeviceType = detectDeviceType(activity.UserAgent)
	}
	activity.Browser = detectBrowser(activity.UserAgent)
	activity.OS = detectOS(activity.UserAgent, activity.DeviceType)

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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID, userName := resolveActivityUser(ctx, r)

	// Enrich each activity with request metadata
	ipAddress := getClientIP(r)
	userAgent := r.UserAgent()
	defaultDeviceType := detectDeviceType(userAgent)
	browser := detectBrowser(userAgent)

	for i := range activities {
		activities[i].UserID = primitive.ObjectID{}
		activities[i].UserName = ""
		if !userID.IsZero() {
			activities[i].UserID = userID
			activities[i].UserName = userName
		}
		activities[i].IPAddress = ipAddress
		activities[i].UserAgent = userAgent
		if activities[i].DeviceType == "" {
			activities[i].DeviceType = defaultDeviceType
		}
		activities[i].Browser = browser
		activities[i].OS = detectOS(userAgent, activities[i].DeviceType)
	}

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

// GetAllActivities handles GET /api/admin/activity/logs
// Returns a paginated list of all user activity events (Admin only).
func GetAllActivities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	q := r.URL.Query()

	limit := 20
	if l := q.Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	page := 1
	if p := q.Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}

	skip := (page - 1) * limit
	if s := q.Get("skip"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v >= 0 {
			skip = v
		}
	}

	filter := models.ActivityFilter{
		Limit: limit,
		Skip:  skip,
	}

	if types := q.Get("types"); types != "" {
		filter.ActivityTypes = strings.Split(types, ",")
	}
	if userID := q.Get("user_id"); userID != "" {
		if id, err := primitive.ObjectIDFromHex(userID); err == nil {
			filter.UserID = id
		}
	}
	if deviceType := q.Get("device_type"); deviceType != "" {
		filter.DeviceType = deviceType
	}
	if from := q.Get("from"); from != "" {
		if parsed, err := time.Parse(time.RFC3339, from); err == nil {
			filter.FromDate = parsed
		} else if parsed, err := time.Parse("2006-01-02", from); err == nil {
			filter.FromDate = parsed
		}
	}
	if to := q.Get("to"); to != "" {
		if parsed, err := time.Parse(time.RFC3339, to); err == nil {
			filter.ToDate = parsed
		} else if parsed, err := time.Parse("2006-01-02", to); err == nil {
			filter.ToDate = parsed
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	activities, total, err := activityService.GetAllActivities(ctx, filter)
	if err != nil {
		log.Printf("Error getting all activities: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get activities")
		return
	}

	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"activities": activities,
		"pagination": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
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

	if strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet") || (strings.Contains(ua, "android") && !strings.Contains(ua, "mobile")) {
		return "tablet"
	}
	if strings.Contains(ua, "mobile") || strings.Contains(ua, "android") || strings.Contains(ua, "iphone") {
		return "mobile"
	}
	return "desktop"
}

// detectBrowser detects browser from User-Agent
func detectBrowser(userAgent string) string {
	ua := strings.ToLower(userAgent)

	if strings.Contains(ua, "edg/") || strings.Contains(ua, "edge/") {
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

// detectOS detects operating system from User-Agent and device type
func detectOS(userAgent string, deviceType string) string {
	ua := strings.ToLower(userAgent)

	if strings.Contains(ua, "windows") {
		return "Windows"
	}
	if strings.Contains(ua, "mac os") || strings.Contains(ua, "macos") {
		if deviceType == "tablet" {
			return "iOS"
		}
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
