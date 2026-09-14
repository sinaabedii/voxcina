package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// Notification fan-out core.
//
// THE ORDER IS NOT NEGOTIABLE: the inbox row is written first, the push outbox
// row second. The app marks a row read by the id carried in the push payload;
// a push naming a row that does not exist yet produces a 404 on that write.
//
// Notify is best-effort in the same way the webhook outbox is: business
// handlers call it asynchronously and a failure is logged, never propagated.

// NotifyInput is one notification to one user.
type NotifyInput struct {
	UserID      primitive.ObjectID `bson:"-" json:"-"`
	Type        string
	Audience    string // models.NotificationAudience*
	Title       string // empty → rendered from the type's template
	Body        string
	Image       string
	TargetType  string
	TargetID    string
	TargetExtra string
	CampaignID  *primitive.ObjectID
	// Data fills the {{placeholders}} of the type's template when Title is empty.
	Data map[string]string
}

// PreferencesForUser loads the user's five-channel opt-out state, defaulting
// to all-on for users without a document (transactional notifications are
// opt-out, not opt-in).
func PreferencesForUser(ctx context.Context, database *mongo.Database, userID primitive.ObjectID) (models.NotificationPreferences, error) {
	prefs := models.DefaultNotificationPreferences()
	if database == nil {
		return prefs, fmt.Errorf("notifications: no database")
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	var doc models.NotificationPreferences
	err := database.Collection("notification_preferences").FindOne(ctx, bson.M{"user_id": userID}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return prefs, nil
	}
	if err != nil {
		// Fail OPEN on a transient error: a DB blip must not silently mute
		// transactional notifications for everyone.
		log.Printf("notifications: preferences lookup for %s failed (defaulting on): %v", userID.Hex(), err)
		return prefs, nil
	}
	return doc, nil
}

// SaveNotificationPreferences upserts the five booleans and returns the saved
// state. Missing fields keep the stored value; a user with no stored document
// starts from all-on.
func SaveNotificationPreferences(ctx context.Context, database *mongo.Database, userID primitive.ObjectID, patch models.NotificationPreferences) (models.NotificationPreferences, error) {
	current, err := PreferencesForUser(ctx, database, userID)
	if err != nil {
		return current, err
	}
	// The PUT payload's zero-value booleans mean "not present", so merge over
	// the current state: the handler pre-resolves absent fields to false only
	// when the client actually sent them. To keep the wire simple the client
	// always sends all five, which makes patch the complete new state.
	current.Orders = patch.Orders
	current.Payments = patch.Payments
	current.Support = patch.Support
	current.Offers = patch.Offers
	current.Announcements = patch.Announcements
	current.UserID = userID
	current.UpdatedAt = time.Now()

	if database == nil {
		return current, fmt.Errorf("notifications: no database")
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	_, err = database.Collection("notification_preferences").UpdateOne(ctx,
		bson.M{"user_id": userID},
		bson.M{"$set": current},
		options.Update().SetUpsert(true))
	if err != nil {
		return current, err
	}
	return current, nil
}

// prefAllowedFor reports whether the type's channel is enabled for the user.
func prefAllowedFor(prefs models.NotificationPreferences, notificationType string) bool {
	switch models.NotificationPreferenceKeyOf(notificationType) {
	case models.NotificationPrefOrders:
		return prefs.Orders
	case models.NotificationPrefPayments:
		return prefs.Payments
	case models.NotificationPrefSupport:
		return prefs.Support
	case models.NotificationPrefOffers:
		return prefs.Offers
	default:
		return prefs.Announcements
	}
}

// Notify writes the inbox row, then the push outbox row — in that order, every
// time. It consults the type's template when no explicit copy is supplied and
// the user's preference for the type's channel BEFORE writing anything: a
// muted category produces neither row. Returns the inbox row's id (or nil when
// nothing was written).
func Notify(
	ctx context.Context,
	database *mongo.Database,
	input NotifyInput,
) (*primitive.ObjectID, error) {
	if database == nil {
		return nil, fmt.Errorf("notifications: no database")
	}
	if !models.ValidNotificationType(input.Type) {
		return nil, fmt.Errorf("notifications: unknown type %q", input.Type)
	}
	if input.UserID.IsZero() {
		return nil, fmt.Errorf("notifications: zero user id")
	}
	if input.Audience == "" {
		input.Audience = models.NotificationAudienceUser
	}

	prefs, err := PreferencesForUser(ctx, database, input.UserID)
	if err != nil {
		return nil, err
	}
	if !prefAllowedFor(prefs, input.Type) {
		return nil, nil // muted channel: no row, no push, no error
	}

	// Copy resolution: explicit copy wins; otherwise the type's template.
	title, body := input.Title, input.Body
	if title == "" || body == "" {
		copied, ok := ResolveNotificationCopy(ctx, database, input.Type, input.Data)
		if !ok {
			return nil, nil // event muted by a disabled template
		}
		if title == "" {
			title = copied.Title
		}
		if body == "" {
			body = copied.Body
		}
	}
	if title == "" && body == "" {
		return nil, fmt.Errorf("notifications: empty copy for %q", input.Type)
	}
	if !models.ValidNotificationTargetType(input.TargetType) {
		input.TargetType, input.TargetID, input.TargetExtra = "", "", ""
	}

	now := time.Now()
	notification := models.Notification{
		ID:          primitive.NewObjectID(),
		UserID:      input.UserID,
		Type:        input.Type,
		Audience:    models.NotificationAudienceForApp(input.Audience),
		Title:       title,
		Body:        body,
		Image:       input.Image,
		TargetType:  input.TargetType,
		TargetID:    input.TargetID,
		TargetExtra: input.TargetExtra,
		CampaignID:  input.CampaignID,
		CreatedAt:   now,
		ExpiresAt:   now.Add(models.NotificationRetention),
	}
	if _, err := database.Collection("notifications").InsertOne(ctx, notification); err != nil {
		return nil, err
	}

	// Inbox row first (done), push outbox second.
	pushRow := models.PushOutbox{
		ID:             primitive.NewObjectID(),
		NotificationID: notification.ID,
		UserID:         input.UserID,
		Status:         models.PushOutboxStatusPending,
		NextAttemptAt:  now,
		CreatedAt:      now,
		UpdatedAt:      now,
		ExpiresAt:      notification.ExpiresAt,
	}
	if _, err := database.Collection("push_outbox").InsertOne(ctx, pushRow); err != nil {
		// The inbox row stands; the push is the optimisation and the
		// dispatcher's retries were never promised for the enqueue itself.
		// Polling delivers the row regardless.
		log.Printf("notifications: push enqueue for row %s failed: %v", notification.ID.Hex(), err)
	} else if input.CampaignID != nil && !input.CampaignID.IsZero() {
		incrementCampaignPushed(ctx, database, *input.CampaignID)
	}

	id := notification.ID
	return &id, nil
}

// UpsertUserDevice registers or refreshes one install. install_id is the upsert
// key; user_id rides on the row so sign-out can clear it. push_provider "none"
// is a real, expected value — the install can never be pushed to, and the
// dispatcher skips it rather than spending a send and a failure on it.
func UpsertUserDevice(ctx context.Context, database *mongo.Database, device models.UserDevice) error {
	if database == nil {
		return fmt.Errorf("notifications: no database")
	}
	now := time.Now()
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, err := database.Collection("user_devices").UpdateOne(ctx,
		bson.M{"install_id": device.InstallID},
		bson.M{"$set": bson.M{
			"user_id":       device.UserID,
			"token":         device.Token,
			"platform":      device.Platform,
			"push_provider": device.PushProvider,
			"app_version":   device.AppVersion,
			"locale":        device.Locale,
			"last_seen_at":  now,
			"updated_at":    now,
		}, "$setOnInsert": bson.M{
			"created_at": now,
		}},
		options.Update().SetUpsert(true))
	return err
}

// DeleteUserDevice is the sign-out write. 404 is treated as success by the
// caller; a missing row is already the desired end state.
func DeleteUserDevice(ctx context.Context, database *mongo.Database, userID primitive.ObjectID, installID string) error {
	if database == nil {
		return fmt.Errorf("notifications: no database")
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, err := database.Collection("user_devices").DeleteOne(ctx,
		bson.M{"install_id": installID, "user_id": userID})
	return err
}

// DeleteDevicesWithToken removes device rows whose token FCM has bounced with
// a permanent error. That is the only way a reinstalled or wiped device stops
// costing sends.
func DeleteDevicesWithToken(ctx context.Context, database *mongo.Database, token string) {
	if database == nil || token == "" {
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if _, err := database.Collection("user_devices").DeleteMany(ctx, bson.M{"token": token}); err != nil {
		log.Printf("notifications: deleting bounced device token failed: %v", err)
	}
}
