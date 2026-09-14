package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// The nine /users/** endpoints the Android app already calls
// (data/remote/NotificationApi.kt). Everything sits behind AuthMiddleware; the
// error shape is utils.ErrorResponse, whose payload key is `error` — the app
// reads `error ?: message`.

// notificationInboxPage is the app's default inbox page size.
const notificationInboxPage = 30

// ListNotifications is the inbox: newest first, unread_count riding on every
// list response so opening it corrects the badge for free, and total_count
// counted across every page matching the filter (like the returns endpoint).
func ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID}
	if r.URL.Query().Get("unread_only") == "true" {
		filter["is_read"] = false
	}
	page := utils.GetIntFromQuery(r, "page", 1)
	if page < 1 {
		page = 1
	}
	limit := utils.GetIntFromQuery(r, "limit", notificationInboxPage)
	if limit < 1 || limit > 50 {
		limit = notificationInboxPage
	}
	skip := int64((page - 1) * limit)

	coll := db.Database.Collection("notifications")
	total, err := coll.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting notifications")
		return
	}
	cursor, err := coll.Find(ctx, filter,
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetSkip(skip).
			SetLimit(int64(limit)))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching notifications")
		return
	}
	defer cursor.Close(ctx)
	rows := []models.Notification{}
	if err := cursor.All(ctx, &rows); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding notifications")
		return
	}
	unread, err := coll.CountDocuments(ctx, bson.M{"user_id": userID, "is_read": false})
	if err != nil {
		unread = 0
	}
	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"notifications": rows,
		"unread_count":  unread,
		"pagination": map[string]interface{}{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"page_size":    limit,
		},
	})
}

// NotificationUnreadCount is the badge call — hit often, kept to one indexed
// count and nothing else.
func NotificationUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	count, err := db.Database.Collection("notifications").CountDocuments(ctx,
		bson.M{"user_id": userID, "is_read": false})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting unread notifications")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"unread_count": count,
	})
}

// MarkNotificationRead flags one row read. Idempotent: re-reading answers 200
// without touching the row (the status-filtered update no-ops).
func MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	notificationID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid notification id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var row models.Notification
	err = db.Database.Collection("notifications").FindOne(ctx,
		bson.M{"_id": notificationID, "user_id": userID},
	).Decode(&row)
	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "Notification not found")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error loading notification")
		return
	}
	if !row.IsRead {
		now := time.Now()
		res, err := db.Database.Collection("notifications").UpdateOne(ctx,
			bson.M{"_id": notificationID, "user_id": userID, "is_read": false},
			bson.M{"$set": bson.M{"is_read": true, "read_at": now}})
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error marking notification read")
			return
		}
		if res.ModifiedCount > 0 && row.CampaignID != nil {
			// The campaign dashboard's read counter.
			_, _ = db.Database.Collection("notification_campaigns").UpdateOne(ctx,
				bson.M{"_id": *row.CampaignID}, bson.M{"$inc": bson.M{"read": 1}})
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// MarkAllNotificationsRead clears the badge in one write.
func MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := db.Database.Collection("notifications").UpdateMany(ctx,
		bson.M{"user_id": userID, "is_read": false},
		bson.M{"$set": bson.M{"is_read": true, "read_at": time.Now()}})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error marking notifications read")
		return
	}
	if res.ModifiedCount > 0 {
		// Credit the campaigns this user's freshly-read rows belong to. One
		// aggregation, then one small update per affected campaign.
		ctxAgg, cancelAgg := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelAgg()
		cursor, err := db.Database.Collection("notifications").Aggregate(ctxAgg, bson.A{
			bson.M{"$match": bson.M{
				"user_id":     userID,
				"is_read":     true,
				"campaign_id": bson.M{"$ne": nil},
				// Only rows whose campaign counter has not been credited yet —
				// approximately, via rows read within the last few minutes.
				"read_at": bson.M{"$gte": time.Now().Add(-2 * time.Minute)},
			}},
			bson.M{"$group": bson.M{"_id": "$campaign_id", "count": bson.M{"$sum": 1}}},
		})
		if err == nil {
			defer cursor.Close(ctxAgg)
			var counts []struct {
				CampaignID primitive.ObjectID `bson:"_id"`
				Count      int                `bson:"count"`
			}
			if cursor.All(ctxAgg, &counts) == nil {
				for _, c := range counts {
					_, _ = db.Database.Collection("notification_campaigns").UpdateOne(ctxAgg,
						bson.M{"_id": c.CampaignID}, bson.M{"$inc": bson.M{"read": c.Count}})
				}
			}
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// DeleteNotification removes a row from THIS user's inbox. Scoped by user_id:
// a guessed id deletes nothing.
func DeleteNotification(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	notificationID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid notification id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := db.Database.Collection("notifications").DeleteOne(ctx,
		bson.M{"_id": notificationID, "user_id": userID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting notification")
		return
	}
	if res.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Notification not found")
		return
	}
	// Its push outbox row is now pointless: the inbox row the tap would mark
	// read is gone.
	_, _ = db.Database.Collection("push_outbox").DeleteMany(ctx,
		bson.M{"notification_id": notificationID})
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// RegisterDevice handles POST /users/devices. install_id is the upsert key
// (FCM rotates tokens; keying on the token accumulates a dead row per
// rotation); push_provider "none" is a real, expected value — the install can
// never be pushed to and the dispatcher skips it. token may be null.
func RegisterDevice(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var payload struct {
		Token        *string `json:"token"`
		Platform     string  `json:"platform"`
		PushProvider string  `json:"push_provider"`
		AppVersion   string  `json:"app_version"`
		InstallID    string  `json:"install_id"`
		Locale       string  `json:"locale"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(payload.InstallID) == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "install_id is required")
		return
	}
	switch payload.PushProvider {
	case models.PushProviderFCM, models.PushProviderNone:
	case "":
		payload.PushProvider = models.PushProviderNone
	default:
		utils.ErrorResponse(w, http.StatusBadRequest, "push_provider must be fcm or none")
		return
	}
	if payload.PushProvider == models.PushProviderFCM {
		if payload.Token == nil || strings.TrimSpace(*payload.Token) == "" {
			// fcm without a token is self-contradictory; record the install as
			// unable to receive instead of a row the dispatcher bounces.
			payload.PushProvider = models.PushProviderNone
		}
	}
	token := ""
	if payload.Token != nil {
		token = strings.TrimSpace(*payload.Token)
	}
	device := models.UserDevice{
		UserID:       userID,
		InstallID:    strings.TrimSpace(payload.InstallID),
		Token:        token,
		Platform:     payload.Platform,
		PushProvider: payload.PushProvider,
		AppVersion:   payload.AppVersion,
		Locale:       payload.Locale,
	}
	if err := services.UpsertUserDevice(r.Context(), db.Database, device); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error registering device")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// DeleteDevice handles DELETE /users/devices/{installId} — the sign-out write.
// The app sends it BEFORE clearing its tokens, so it arrives authenticated.
// A missing row is success: the desired end state already holds.
func DeleteDevice(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	installID := mux.Vars(r)["installId"]
	if installID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "installId is required")
		return
	}
	if err := services.DeleteUserDevice(r.Context(), db.Database, userID, installID); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting device")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// GetNotificationPreferences returns the five-channel opt-out state, all-on
// when the user has never set it.
func GetNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	prefs, err := services.PreferencesForUser(r.Context(), db.Database, userID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error loading notification preferences")
		return
	}
	// FLAT, not wrapped: the app parses the body straight into
	// NotificationPreferencesDto (data/remote/dto/NotificationDtos.kt), whose
	// five keys are top-level. A {"preferences": {...}} envelope decodes to
	// five nulls, which toDomain() reads as ALL_ENABLED — the user's mutes
	// would silently never load.
	utils.JSONResponse(w, http.StatusOK, prefs)
}

// UpdateNotificationPreferences stores the PUT body and returns the saved
// state. The client sends all five booleans.
func UpdateNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var payload models.NotificationPreferences
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	prefs, err := services.SaveNotificationPreferences(r.Context(), db.Database, userID, payload)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving notification preferences")
		return
	}
	// Flat, for the same reason as the GET: the app takes the PUT response as
	// authoritative over what it sent ("the server's copy wins"), so an
	// envelope here makes every switch the user turns off flip back on.
	utils.JSONResponse(w, http.StatusOK, prefs)
}
