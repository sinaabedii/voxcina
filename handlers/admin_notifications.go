package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// Admin notification surface: compose + send (queued → the fan-out worker),
// the audience-count preview, campaign history, copy templates, and the
// per-user view support asks for first. Every endpoint sits on adminRouter
// (/api/admin, AdminAuthMiddleware).

// AdminPreviewNotificationAudience resolves an audience rule and returns the
// count BEFORE sending — fanning a mistake out to every user writes a row
// each and cannot be recalled.
func AdminPreviewNotificationAudience(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		AudienceKind string                 `json:"audience_kind"`
		AudienceUser string                 `json:"audience_user"`
		Segment      map[string]interface{} `json:"segment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	count, err := resolveAudienceCount(ctx, payload.AudienceKind, payload.AudienceUser, payload.Segment)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"count": count})
}

// resolveAudienceCount is the preview path shared by the compose validation.
func resolveAudienceCount(ctx context.Context, audienceKind, audienceUser string, segment map[string]interface{}) (int, error) {
	switch audienceKind {
	case models.NotificationAudienceAll:
		n, err := db.Database.Collection("users").CountDocuments(ctx,
			bson.M{"is_active": bson.M{"$ne": false}})
		if err != nil {
			return 0, err
		}
		return int(n), nil
	case models.NotificationAudienceUser:
		if _, err := primitive.ObjectIDFromHex(strings.TrimSpace(audienceUser)); err != nil {
			return 0, errors.New("audience_user must be a user id hex")
		}
		return 1, nil
	case models.NotificationAudienceSegment:
		if err := services.ValidateSegment(segment); err != nil {
			return 0, err
		}
		return services.CountSegment(ctx, db.Database, segment)
	default:
		return 0, errors.New("audience_kind must be all, segment or user")
	}
}

// AdminCreateNotificationCampaign composes a campaign and queues it (send now,
// or at send_at for scheduled sends). The fan-out worker — never this request —
// writes the rows.
func AdminCreateNotificationCampaign(w http.ResponseWriter, r *http.Request) {
	adminID, _, ok := adminIdentity(r.Context(), r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var payload struct {
		Type         string                 `json:"type"`
		AudienceKind string                 `json:"audience_kind"`
		AudienceUser string                 `json:"audience_user"`
		Segment      map[string]interface{} `json:"segment"`
		Title        string                 `json:"title"`
		Body         string                 `json:"body"`
		Image        string                 `json:"image"`
		TargetType   string                 `json:"target_type"`
		TargetID     string                 `json:"target_id"`
		TargetExtra  string                 `json:"target_extra"`
		SendAt       *time.Time             `json:"send_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !models.ValidNotificationType(payload.Type) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown notification type")
		return
	}
	payload.Title, payload.Body = strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body)
	if payload.Title == "" || payload.Body == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Persian title and body are required")
		return
	}
	if len(payload.Title) > 120 || len(payload.Body) > 400 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Title or body too long")
		return
	}
	targetType, targetID, targetExtra := payload.TargetType, strings.TrimSpace(payload.TargetID), payload.TargetExtra
	if targetType != "" {
		if !models.ValidNotificationTargetType(targetType) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Unknown target_type")
			return
		}
		if err := validateTargetID(targetType, targetID); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
	} else {
		targetID, targetExtra = "", ""
	}

	// Validate the audience before queueing, so a bad rule fails at compose
	// time — the preview endpoint is a courtesy, this is the guarantee.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	var audienceUser *primitive.ObjectID
	switch payload.AudienceKind {
	case models.NotificationAudienceUser:
		oid, err := primitive.ObjectIDFromHex(strings.TrimSpace(payload.AudienceUser))
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "audience_user must be a user id hex")
			return
		}
		audienceUser = &oid
	case models.NotificationAudienceSegment:
		if err := services.ValidateSegment(payload.Segment); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
	case models.NotificationAudienceAll:
	default:
		utils.ErrorResponse(w, http.StatusBadRequest, "audience_kind must be all, segment or user")
		return
	}

	now := time.Now()
	campaign := models.NotificationCampaign{
		ID:           primitive.NewObjectID(),
		Type:         payload.Type,
		AudienceKind: payload.AudienceKind,
		AudienceUser: audienceUser,
		Segment:      payload.Segment,
		Title:        payload.Title,
		Body:         payload.Body,
		Image:        strings.TrimSpace(payload.Image),
		TargetType:   targetType,
		TargetID:     targetID,
		TargetExtra:  targetExtra,
		SendAt:       payload.SendAt,
		CreatedBy:    adminID,
		Status:       models.NotificationCampaignStatusQueued,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := db.Database.Collection("notification_campaigns").InsertOne(ctx, campaign); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error queueing campaign")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{"campaign": campaign})
}

// validateTargetID enforces the §5 vocabulary's id rules: ObjectID hex where
// the target needs one, free text where it does not.
func validateTargetID(targetType, targetID string) error {
	if models.TargetTypeNeedsID(targetType) {
		if targetID == "" {
			return errors.New("target_id is required for " + targetType)
		}
		if _, err := primitive.ObjectIDFromHex(targetID); err != nil {
			return errors.New("target_id must be an id hex for " + targetType)
		}
		return nil
	}
	return nil
}

// AdminListNotificationCampaigns is the history tab.
func AdminListNotificationCampaigns(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	page := utils.GetIntFromQuery(r, "page", 1)
	if page < 1 {
		page = 1
	}
	limit := utils.GetIntFromQuery(r, "limit", 20)
	if limit < 1 || limit > 100 {
		limit = 20
	}
	coll := db.Database.Collection("notification_campaigns")
	total, err := coll.CountDocuments(ctx, bson.M{})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting campaigns")
		return
	}
	cursor, err := coll.Find(ctx, bson.M{},
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetSkip(int64((page-1)*limit)).
			SetLimit(int64(limit)))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching campaigns")
		return
	}
	defer cursor.Close(ctx)
	campaigns := []models.NotificationCampaign{}
	if err := cursor.All(ctx, &campaigns); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding campaigns")
		return
	}
	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"campaigns": campaigns,
		"pagination": map[string]interface{}{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"page_size":    limit,
		},
	})
}

// AdminGetNotificationCampaign reports one campaign with a fresh read count.
func AdminGetNotificationCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var campaign models.NotificationCampaign
	if err := db.Database.Collection("notification_campaigns").FindOne(ctx,
		bson.M{"_id": campaignID}).Decode(&campaign); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Campaign not found")
		return
	}
	// Read is re-counted live; the $inc path can drift.
	read, err := db.Database.Collection("notifications").CountDocuments(ctx,
		bson.M{"campaign_id": campaignID, "is_read": true})
	if err == nil {
		campaign.Read = int(read)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"campaign": campaign})
}

// AdminDeleteNotificationCampaign cancels a queued campaign or removes a
// finished one from the history. A campaign that is mid-fan-out cannot be
// deleted (the worker owns it).
func AdminDeleteNotificationCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := db.Database.Collection("notification_campaigns").DeleteOne(ctx, bson.M{
		"_id": campaignID,
		"status": bson.M{"$in": []string{
			models.NotificationCampaignStatusDraft,
			models.NotificationCampaignStatusQueued,
			models.NotificationCampaignStatusSent,
			models.NotificationCampaignStatusFailed,
			models.NotificationCampaignStatusCanceled,
		}},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting campaign")
		return
	}
	if res.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusConflict, "Campaign is currently sending; try again after it finishes")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// AdminListNotificationTemplates returns the effective copy for every type:
// DB override wins, then the config file, then the built-in default — with
// which layer supplied each field, so the admin knows what an edit changes.
func AdminListNotificationTemplates(w http.ResponseWriter, r *http.Request) {
	rows := make([]map[string]interface{}, 0, 16)
	for _, notificationType := range notificationTypeOrder {
		copied, enabled := services.ResolveNotificationCopy(r.Context(), db.Database, notificationType, nil)
		rows = append(rows, map[string]interface{}{
			"type":    notificationType,
			"enabled": enabled,
			"title":   copied.Title,
			"body":    copied.Body,
		})
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"templates": rows})
}

// notificationTypeOrder is the stable display order of the closed type set.
var notificationTypeOrder = []string{
	models.NotificationTypeOrderPlaced,
	models.NotificationTypeOrderStatus,
	models.NotificationTypePaymentSucceeded,
	models.NotificationTypePaymentFailed,
	models.NotificationTypeReturnDecided,
	models.NotificationTypeTicketReplied,
	models.NotificationTypeTryonReply,
	models.NotificationTypeVoucherGranted,
	models.NotificationTypeVoucherExpiring,
	models.NotificationTypeCouponOffer,
	models.NotificationTypeCartReminder,
	models.NotificationTypePriceDrop,
	models.NotificationTypeBackInStock,
	models.NotificationTypePromotion,
	models.NotificationTypeAnnouncement,
}

// AdminUpdateNotificationTemplate upserts one type's copy override into
// notification_templates. Effective immediately (30s template cache).
func AdminUpdateNotificationTemplate(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Type    string `json:"type"`
		Enabled *bool  `json:"enabled"`
		Title   string `json:"title"`
		Body    string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !models.ValidNotificationType(payload.Type) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown notification type")
		return
	}
	if payload.Enabled == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "enabled is required")
		return
	}
	payload.Title, payload.Body = strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body)
	if *payload.Enabled && (payload.Title == "" || payload.Body == "") {
		utils.ErrorResponse(w, http.StatusBadRequest, "An enabled template needs title and body")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	doc := models.NotificationTemplate{
		Type:      payload.Type,
		Enabled:   *payload.Enabled,
		Title:     payload.Title,
		Body:      payload.Body,
		UpdatedAt: time.Now(),
	}
	_, err := db.Database.Collection("notification_templates").UpdateOne(ctx,
		bson.M{"type": payload.Type},
		bson.M{"$set": doc},
		options.Update().SetUpsert(true))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving template")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"template": doc})
}

// AdminDeleteNotificationTemplate clears a DB override so the type falls back
// to the config-file / built-in copy.
func AdminDeleteNotificationTemplate(w http.ResponseWriter, r *http.Request) {
	notificationType := mux.Vars(r)["type"]
	if !models.ValidNotificationType(notificationType) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown notification type")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := db.Database.Collection("notification_templates").DeleteOne(ctx,
		bson.M{"type": notificationType}); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting template")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "ok"})
}

// AdminListUserNotifications is the per-user view on the user detail page:
// what they were sent and whether they read it — the first thing support asks.
func AdminListUserNotifications(w http.ResponseWriter, r *http.Request) {
	userID, err := primitive.ObjectIDFromHex(mux.Vars(r)["userId"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user id")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	page := utils.GetIntFromQuery(r, "page", 1)
	if page < 1 {
		page = 1
	}
	limit := utils.GetIntFromQuery(r, "limit", 30)
	if limit < 1 || limit > 100 {
		limit = 30
	}
	coll := db.Database.Collection("notifications")
	filter := bson.M{"user_id": userID}
	total, err := coll.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting notifications")
		return
	}
	cursor, err := coll.Find(ctx, filter,
		options.Find().
			SetSort(bson.D{{Key: "created_at", Value: -1}}).
			SetSkip(int64((page-1)*limit)).
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
	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"notifications": rows,
		"pagination": map[string]interface{}{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"page_size":    limit,
		},
	})
}
