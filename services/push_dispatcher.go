package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// Push outbox + dispatcher, the twin of services/outbound_webhooks.go.
//
// Business flows insert a PushOutbox row in the SAME request as the inbox row
// (inbox first — always); this background dispatcher delivers the rows to
// FCM with exponential backoff and bounded concurrency. Google being
// unreachable from this infrastructure is a routine condition, so a failed
// send is a rescheduled row, not an incident.
//
// Device rows are resolved at DELIVERY time (not enqueue time), so a token
// that rotated between the two still receives the push. A token that FCM
// bounces with UNREGISTERED / INVALID_ARGUMENT has its device row deleted —
// the only way a reinstalled or wiped device stops costing sends.

// pushDeliveryBackoff is the delay before attempt n+1 (index = attempts
// already made, clamped to the last entry) — same curve as the webhook outbox.
var pushDeliveryBackoff = []time.Duration{
	time.Minute, 5 * time.Minute, 30 * time.Minute, 2 * time.Hour, 6 * time.Hour,
}

// pushPollInterval is how often the dispatcher scans the outbox.
const pushPollInterval = 30 * time.Second

// pushBatchSize bounds one dispatcher pass.
const pushBatchSize = 20

// pushTokensConcurrency bounds the per-row fan-out to device tokens.
const pushTokensConcurrency = 4

// StartPushDispatcher launches the delivery loop; returns a stop function.
// The dispatcher runs with or without FCM configured: without it, rows simply
// back off through their attempt budget (the inbox keeps delivering — that is
// the reliable path by design).
func StartPushDispatcher(database *mongo.Database, fcm *FCMService) (stop func()) {
	if database == nil {
		return func() {}
	}
	stopCh := make(chan struct{})
	ticker := time.NewTicker(pushPollInterval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				processPushBatch(context.Background(), database, fcm)
			}
		}
	}()
	var once sync.Once
	return func() { once.Do(func() { close(stopCh) }) }
}

// processPushBatch claims and delivers up to pushBatchSize pending rows.
func processPushBatch(ctx context.Context, database *mongo.Database, fcm *FCMService) {
	deliverCtx, cancel := context.WithTimeout(ctx, 4*time.Minute)
	defer cancel()

	cursor, err := database.Collection("push_outbox").Find(deliverCtx, bson.M{
		"status":          models.PushOutboxStatusPending,
		"next_attempt_at": bson.M{"$lte": time.Now()},
	}, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: 1}}).
		SetLimit(pushBatchSize))
	if err != nil {
		log.Printf("push outbox: poll failed: %v", err)
		return
	}
	var rows []models.PushOutbox
	if err := cursor.All(deliverCtx, &rows); err != nil {
		log.Printf("push outbox: poll decode failed: %v", err)
		return
	}
	for i := range rows {
		if err := deliverPushRow(deliverCtx, database, fcm, &rows[i]); err != nil {
			log.Printf("push outbox: row %s delivery failed: %v", rows[i].ID.Hex(), err)
		}
	}
}

// deliverPushRow performs one delivery attempt for one outbox row and books
// the outcome.
func deliverPushRow(ctx context.Context, database *mongo.Database, fcm *FCMService, row *models.PushOutbox) error {
	coll := database.Collection("push_outbox")

	var notification models.Notification
	err := database.Collection("notifications").FindOne(ctx,
		bson.M{"_id": row.NotificationID}).Decode(&notification)
	if err != nil && err != mongo.ErrNoDocuments {
		log.Printf("push outbox: notification %s lookup failed: %v", row.NotificationID.Hex(), err)
		return reschedulePushRow(ctx, coll, row, "notification lookup failed")
	}
	if err == mongo.ErrNoDocuments {
		// ErrNoDocuments: the inbox row is gone (TTL sweep, user delete). The
		// push naming it would deliver a dead tap. Terminal, no retry.
		markPushRowFailed(ctx, coll, row, "notification row no longer exists")
		return nil
	}
	campaignID := primitive.NilObjectID
	if notification.CampaignID != nil {
		campaignID = *notification.CampaignID
	}

	if !fcm.Enabled() {
		// Unconfigured FCM is a configuration HOLD, not an event failure: the
		// row stays pending and delivers as soon as credentials arrive, mir-
		// roring the webhook outbox's hold behaviour. A row permanently without
		// FCM is swept when its notification's TTL passes and the dispatcher
		// skips it — cheap, because the poll filter is on next_attempt_at.
		_, _ = coll.UpdateOne(ctx, bson.M{"_id": row.ID}, bson.M{"$set": bson.M{
			"next_attempt_at": time.Now().Add(pushPollInterval),
			"last_error":      "fcm not configured",
			"updated_at":      time.Now(),
		}})
		return nil
	}

	devices, err := pushDevicesForUser(ctx, database, row.UserID)
	if err != nil {
		return reschedulePushRow(ctx, coll, row, fmt.Sprintf("device scan: %v", err))
	}
	if len(devices) == 0 {
		// No Play-Services install: the inbox is the delivery. Terminal.
		markPushRowFailed(ctx, coll, row, "no push-capable device")
		return nil
	}

	// Fan out to the user's tokens with bounded concurrency; collect outcomes.
	type outcome struct {
		token string
		err   error
	}
	results := make([]outcome, len(devices))
	var wg sync.WaitGroup
	sem := make(chan struct{}, pushTokensConcurrency)
	for i, device := range devices {
		wg.Add(1)
		go func(i int, device models.UserDevice) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			err := fcm.Send(ctx, FCMPushMessage{
				Token: device.Token,
				Data:  buildPushData(&notification),
			})
			results[i] = outcome{token: device.Token, err: err}
		}(i, device)
	}
	wg.Wait()

	for _, result := range results {
		if sendErr, ok := result.err.(*FCMSendError); ok && sendErr.IsPermanent() {
			// Bounced token: delete the device row. That is how a reinstalled
			// or wiped phone stops costing sends.
			DeleteDevicesWithToken(ctx, database, result.token)
		}
	}

	sent := 0
	permanent := 0
	retryable := 0
	var lastErr string
	for _, result := range results {
		switch {
		case result.err == nil:
			sent++
		case isPermanentPushError(result.err):
			permanent++
			lastErr = result.err.Error()
		default:
			retryable++
			lastErr = result.err.Error()
		}
	}

	switch {
	case sent > 0:
		// At least one device confirmed; the rest are dead tokens whose rows
		// are now deleted. The push happened.
		markPushRowDelivered(ctx, coll, row)
		incrementCampaignDelivered(ctx, database, campaignID)
	case permanent > 0 && retryable == 0:
		// Every token is permanently dead — e.g. the user reinstalled after
		// the row was enqueued.
		markPushRowFailed(ctx, coll, row, lastErr)
	default:
		return reschedulePushRow(ctx, coll, row, lastErr)
	}
	return nil
}

// isPermanentPushError reports errors that will not improve on retry.
func isPermanentPushError(err error) bool {
	var sendErr *FCMSendError
	return errors.As(err, &sendErr) && sendErr.IsPermanent()
}

// pushDevicesForUser lists the install rows this user can currently be pushed
// to: FCM provider, a token, a user still attached (sign-out clears user_id),
// and not stale.
func pushDevicesForUser(ctx context.Context, database *mongo.Database, userID primitive.ObjectID) ([]models.UserDevice, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	cursor, err := database.Collection("user_devices").Find(ctx, bson.M{
		"user_id":       userID,
		"push_provider": models.PushProviderFCM,
		"token":         bson.M{"$gt": ""},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var devices []models.UserDevice
	if err := cursor.All(ctx, &devices); err != nil {
		return nil, err
	}
	return devices, nil
}

// buildPushData is the wire format the app's VoxcinaMessagingService parses.
// STRINGS ONLY — FCM data values are strings, and the inbox row's own id is
// what the tap marks read. The payload never carries a route or a URL: the
// app resolves target_type through a closed `when`, which is what keeps a
// forged extra from steering it to an arbitrary screen.
func buildPushData(n *models.Notification) map[string]string {
	data := map[string]string{
		"notification_id": n.ID.Hex(),
		"type":            n.Type,
		"title":           n.Title,
		"body":            n.Body,
		"target_extra":    n.TargetExtra,
	}
	if n.TargetType != "" {
		data["target_type"] = n.TargetType
	}
	if n.TargetID != "" {
		data["target_id"] = n.TargetID
	}
	if n.Image != "" {
		data["image"] = n.Image
	}
	return data
}

// reschedulePushRow books a failed attempt with backoff; exhausting the
// attempt budget marks the row failed for good.
func reschedulePushRow(ctx context.Context, coll *mongo.Collection, row *models.PushOutbox, reason string) error {
	now := time.Now()
	attempts := row.Attempts + 1
	if attempts >= models.PushOutboxMaxAttempts {
		markPushRowFailed(ctx, coll, row, reason)
		return nil
	}
	backoff := pushDeliveryBackoff[len(pushDeliveryBackoff)-1]
	if row.Attempts < len(pushDeliveryBackoff) {
		backoff = pushDeliveryBackoff[row.Attempts]
	}
	_, err := coll.UpdateOne(ctx, bson.M{"_id": row.ID}, bson.M{"$set": bson.M{
		"attempts":        attempts,
		"next_attempt_at": now.Add(backoff),
		"last_error":      reason,
		"updated_at":      now,
	}})
	return err
}

// markPushRowFailed terminally fails a push row.
func markPushRowFailed(ctx context.Context, coll *mongo.Collection, row *models.PushOutbox, reason string) {
	now := time.Now()
	_, _ = coll.UpdateOne(ctx, bson.M{"_id": row.ID}, bson.M{"$set": bson.M{
		"status":     models.PushOutboxStatusFailed,
		"last_error": reason,
		"updated_at": now,
	}})
}

// markPushRowDelivered books a confirmed delivery.
func markPushRowDelivered(ctx context.Context, coll *mongo.Collection, row *models.PushOutbox) {
	now := time.Now()
	_, _ = coll.UpdateOne(ctx, bson.M{"_id": row.ID}, bson.M{"$set": bson.M{
		"status":       models.PushOutboxStatusDelivered,
		"delivered_at": now,
		"attempts":     row.Attempts + 1,
		"last_error":   "",
		"updated_at":   now,
	}})
}

// incrementCampaignPushed books one push enqueue on the campaign dashboard.
func incrementCampaignPushed(ctx context.Context, database *mongo.Database, campaignID primitive.ObjectID) {
	if campaignID.IsZero() {
		return
	}
	_, _ = database.Collection("notification_campaigns").UpdateOne(ctx,
		bson.M{"_id": campaignID}, bson.M{"$inc": bson.M{"pushed": 1}})
}

// incrementCampaignDelivered books one confirmed push on the campaign
// dashboard. The join runs through the notification row, whose campaign_id is
// the campaign it was fanned out for.
func incrementCampaignDelivered(ctx context.Context, database *mongo.Database, campaignID primitive.ObjectID) {
	if campaignID.IsZero() {
		return
	}
	_, _ = database.Collection("notification_campaigns").UpdateOne(ctx,
		bson.M{"_id": campaignID}, bson.M{"$inc": bson.M{"delivered": 1}})
}
