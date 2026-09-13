package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
	"backEnd/utils"
)

// Webhook outbox + dispatcher.
//
// Business flows insert one OutboundEvent row per subscribed service in the
// SAME request as the change they announce; a background dispatcher delivers
// them with HMAC signatures and exponential backoff. Consumers dedupe on the
// event ID; a webhook that fails repeatedly is auto-disabled.

// outboundDeliveryBackoff is the delay before attempt n+1 (index = attempts
// already made, clamped to the last entry).
var outboundDeliveryBackoff = []time.Duration{
	time.Minute, 5 * time.Minute, 30 * time.Minute, 2 * time.Hour, 6 * time.Hour,
}

// outboundPollInterval is how often the dispatcher scans the outbox.
const outboundPollInterval = 30 * time.Second

// outboundBatchSize bounds one dispatcher pass.
const outboundBatchSize = 20

// outboundHTTPTimeout bounds a single webhook delivery.
const outboundHTTPTimeout = 10 * time.Second

// EnqueueOutboundEvent writes one outbox row for a single service.
func EnqueueOutboundEvent(
	ctx context.Context,
	database *mongo.Database,
	eventType string,
	serviceID primitive.ObjectID,
	userID *primitive.ObjectID,
	payload map[string]interface{},
) (primitive.ObjectID, error) {
	if database == nil {
		return primitive.NilObjectID, fmt.Errorf("outbox: no database")
	}
	if !models.ValidOutboundEventType(eventType) {
		return primitive.NilObjectID, fmt.Errorf("outbox: unknown event type %q", eventType)
	}
	now := time.Now()
	event := models.OutboundEvent{
		ID:            primitive.NewObjectID(),
		Type:          eventType,
		ServiceID:     serviceID,
		UserID:        userID,
		Payload:       payload,
		Status:        models.OutboundEventStatusPending,
		Attempts:      0,
		NextAttemptAt: now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := database.Collection("outbound_events").InsertOne(ctx, event); err != nil {
		return primitive.NilObjectID, err
	}
	return event.ID, nil
}

// BroadcastOutboundEvent writes one outbox row per active webhook subscribed
// to the event type. Returns the number of rows written; missing subscribers
// are not an error.
//
// Events carrying a user are tenant-scoped: they are delivered only to the
// services of the channels the user ACTUALLY uses (their active external
// identities' providers). A payment or order-status change for a pure-web
// shopper — or for a Bale user — must never reach an unrelated Telegram bot.
// A user with no active identities produces zero rows. webhook.test is
// service-targeted and never passes through here.
func BroadcastOutboundEvent(
	ctx context.Context,
	database *mongo.Database,
	eventType string,
	userID *primitive.ObjectID,
	payload map[string]interface{},
) (int, error) {
	if !models.ValidOutboundEventType(eventType) {
		return 0, fmt.Errorf("outbox: unknown event type %q", eventType)
	}
	if eventType == models.OutboundEventWebhookTest {
		return 0, fmt.Errorf("outbox: webhook.test is service-targeted; use EnqueueOutboundEvent")
	}

	filter := bson.M{
		"status":         models.ExternalServiceStatusActive,
		"webhook.active": true,
		"webhook.url":    bson.M{"$gt": ""},
		"webhook.events": eventType,
	}
	if userID != nil && !userID.IsZero() {
		providers, err := database.Collection("external_identities").Distinct(ctx, "provider",
			bson.M{"user_id": *userID, "status": models.ExternalIdentityStatusActive})
		if err != nil {
			return 0, err
		}
		userProviders := make([]string, 0, len(providers))
		for _, p := range providers {
			if s, ok := p.(string); ok && s != "" {
				userProviders = append(userProviders, s)
			}
		}
		if len(userProviders) == 0 {
			return 0, nil
		}
		filter["provider"] = bson.M{"$in": userProviders}
	}

	findOpts := options.Find().SetProjection(bson.M{"_id": 1})
	cursor, err := database.Collection("external_services").Find(ctx, filter, findOpts)
	if err != nil {
		return 0, err
	}
	var services []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &services); err != nil {
		cursor.Close(ctx)
		return 0, err
	}
	cursor.Close(ctx)

	written := 0
	for _, svc := range services {
		if _, err := EnqueueOutboundEvent(ctx, database, eventType, svc.ID, userID, payload); err != nil {
			log.Printf("outbox: enqueue to service %s failed: %v", svc.ID.Hex(), err)
			continue
		}
		written++
	}
	return written, nil
}

// StartOutboundEventDispatcher launches the background delivery loop and
// returns a stop function. The stop signal is a channel close: it is
// idempotent (double-stop cannot panic on a closed channel), non-blocking
// (it does not wait out an in-flight batch — the delivery context caps that
// anyway and process exit cuts it), and a nil-database dispatcher gets a
// no-op.
func StartOutboundEventDispatcher(database *mongo.Database) (stop func()) {
	if database == nil {
		return func() {}
	}
	stopCh := make(chan struct{})
	ticker := time.NewTicker(outboundPollInterval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				processOutboundBatch(context.Background(), database)
			}
		}
	}()
	var once sync.Once
	return func() {
		once.Do(func() { close(stopCh) })
	}
}

// outboundDeliverBudget bounds one dispatcher pass.
const outboundDeliverBudget = 2 * time.Minute

// outboundMinDeliverWindow is the smallest remaining budget under which a
// new delivery is not started; the event stays pending for the next pass.
const outboundMinDeliverWindow = 2 * time.Second

// processOutboundBatch claims and delivers up to outboundBatchSize events.
// The batch budget (outboundDeliverBudget) is smaller than the worst case of
// outboundBatchSize × outboundHTTPTimeout deliveries, so the loop tracks the
// remaining time: it shrinks each event's window to what is left and stops
// early instead of letting tail events die on a context deadline and burn a
// retry attempt for nothing.
//
// The poll also excludes services without a live webhook: their held backlog
// is the OLDEST pending set (sort: created_at), so without this exclusion a
// dead integration's backlog would fill every batch and silently starve all
// the other webhooks.
func processOutboundBatch(ctx context.Context, database *mongo.Database) {
	deliverCtx, cancel := context.WithTimeout(ctx, outboundDeliverBudget)
	defer cancel()

	activeServiceIDs, err := activeWebhookServiceIDs(deliverCtx, database)
	if err != nil {
		log.Printf("outbox: service scan failed: %v", err)
		return
	}
	if len(activeServiceIDs) == 0 {
		return
	}

	cursor, err := database.Collection("outbound_events").Find(deliverCtx, bson.M{
		"status":          models.OutboundEventStatusPending,
		"next_attempt_at": bson.M{"$lte": time.Now()},
		"service_id":      bson.M{"$in": activeServiceIDs},
	}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}).SetLimit(outboundBatchSize))
	if err != nil {
		log.Printf("outbox: poll failed: %v", err)
		return
	}
	var events []models.OutboundEvent
	if err := cursor.All(deliverCtx, &events); err != nil {
		log.Printf("outbox: poll decode failed: %v", err)
		return
	}
	deadline, hasDeadline := deliverCtx.Deadline()
	for i := range events {
		if !hasDeadline {
			deliverOutboundEvent(deliverCtx, database, &events[i])
			continue
		}
		remaining := time.Until(deadline)
		if remaining <= outboundMinDeliverWindow {
			log.Printf("outbox: batch budget exhausted; leaving %d event(s) pending for the next pass", len(events)-i)
			break
		}
		window := outboundHTTPTimeout
		if remaining < window {
			window = remaining
		}
		eventCtx, eventCancel := context.WithTimeout(deliverCtx, window)
		deliverOutboundEvent(eventCtx, database, &events[i])
		eventCancel()
	}
}

// activeWebhookServiceIDs lists the services whose webhook can currently
// deliver (active service, active webhook, configured URL). Used to keep
// disabled integrations' backlogs out of the delivery batch.
func activeWebhookServiceIDs(ctx context.Context, database *mongo.Database) ([]primitive.ObjectID, error) {
	raw, err := database.Collection("external_services").Distinct(ctx, "_id", bson.M{
		"status":         models.ExternalServiceStatusActive,
		"webhook.active": true,
		"webhook.url":    bson.M{"$gt": ""},
	})
	if err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(raw))
	for _, id := range raw {
		if oid, ok := id.(primitive.ObjectID); ok {
			ids = append(ids, oid)
		}
	}
	return ids, nil
}

// deliverOutboundEvent performs one delivery attempt and books the outcome.
func deliverOutboundEvent(ctx context.Context, database *mongo.Database, event *models.OutboundEvent) {
	collection := database.Collection("outbound_events")

	var service models.ExternalService
	err := database.Collection("external_services").FindOne(ctx, bson.M{"_id": event.ServiceID}).Decode(&service)
	if err != nil {
		markOutboundEventFailed(ctx, collection, event, "service no longer exists")
		return
	}
	if service.Webhook == nil || !service.Webhook.Active || service.Webhook.URL == "" {
		// Configuration failure, not an event failure: HOLD the event as
		// pending instead of terminal-failing it. Terminally failing here
		// would silently destroy everything queued while the webhook was
		// auto-disabled; held events deliver as soon as the webhook is
		// re-enabled, and the outbox TTL sweeps them if it never is.
		holdOutboundEvent(ctx, collection, event, "webhook disabled or unconfigured")
		return
	}

	secret, err := utils.DecryptWebhookSecret(service.Webhook.Secret)
	if err != nil || secret == "" {
		log.Printf("outbox: service %s webhook secret unavailable: %v", service.ID.Hex(), err)
		markOutboundEventFailed(ctx, collection, event, "webhook secret unavailable")
		return
	}

	body, err := json.Marshal(map[string]interface{}{
		"id":         event.ID.Hex(),
		"type":       event.Type,
		"created_at": event.CreatedAt,
		"data":       event.Payload,
	})
	if err != nil {
		markOutboundEventFailed(ctx, collection, event, "payload marshal failed")
		return
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, service.Webhook.URL, bytes.NewReader(body))
	if err != nil {
		markOutboundEventFailed(ctx, collection, event, err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", utils.SignWebhookPayload(secret, body))
	req.Header.Set("X-Event-Id", event.ID.Hex())
	req.Header.Set("X-Event-Type", event.Type)

	client := &http.Client{Timeout: outboundHTTPTimeout}
	resp, err := client.Do(req)
	if err != nil {
		rescheduleOutboundEvent(ctx, collection, event, err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		now := time.Now()
		_, _ = collection.UpdateOne(ctx, bson.M{"_id": event.ID}, bson.M{"$set": bson.M{
			"status":       models.OutboundEventStatusDelivered,
			"delivered_at": now,
			"attempts":     event.Attempts + 1,
			"last_error":   "",
			"updated_at":   now,
		}})
		// Success clears the consecutive-failure counter.
		_, _ = database.Collection("external_services").UpdateOne(ctx, bson.M{"_id": service.ID}, bson.M{
			"$set": bson.M{"webhook_failure_count": 0},
		})
		return
	}

	rescheduleOutboundEvent(ctx, collection, event, fmt.Sprintf("HTTP %d", resp.StatusCode))
}

// rescheduleOutboundEvent books a failed attempt with backoff; exhausting the
// attempt budget (or tripping the service's consecutive-failure threshold)
// marks the event failed / disables the webhook.
func rescheduleOutboundEvent(ctx context.Context, collection *mongo.Collection, event *models.OutboundEvent, reason string) {
	now := time.Now()
	attempts := event.Attempts + 1
	if attempts >= models.OutboundEventMaxAttempts {
		markOutboundEventFailed(ctx, collection, event, reason)
		return
	}
	backoff := outboundDeliveryBackoff[len(outboundDeliveryBackoff)-1]
	if event.Attempts < len(outboundDeliveryBackoff) {
		backoff = outboundDeliveryBackoff[event.Attempts]
	}
	_, _ = collection.UpdateOne(ctx, bson.M{"_id": event.ID}, bson.M{"$set": bson.M{
		"attempts":        attempts,
		"next_attempt_at": now.Add(backoff),
		"last_error":      reason,
		"updated_at":      now,
	}})

	// Consecutive-failure accounting on the service.
	servicesColl := collection.Database().Collection("external_services")
	var service models.ExternalService
	if err := servicesColl.FindOne(ctx, bson.M{"_id": event.ServiceID},
		options.FindOne().SetProjection(bson.M{"webhook_failure_count": 1, "webhook": 1}),
	).Decode(&service); err != nil {
		return
	}
	failures := service.WebhookFailureCount + 1
	update := bson.M{"webhook_failure_count": failures}
	if failures >= models.ExternalServiceWebhookFailureThreshold && service.Webhook != nil && service.Webhook.Active {
		update["webhook.active"] = false
		log.Printf("outbox: service %s webhook auto-disabled after %d consecutive failures", service.ID.Hex(), failures)
	}
	_, _ = servicesColl.UpdateOne(ctx, bson.M{"_id": service.ID}, bson.M{"$set": update})
}

// markOutboundEventFailed terminally fails an event.
func markOutboundEventFailed(ctx context.Context, collection *mongo.Collection, event *models.OutboundEvent, reason string) {
	now := time.Now()
	_, _ = collection.UpdateOne(ctx, bson.M{"_id": event.ID}, bson.M{"$set": bson.M{
		"status":     models.OutboundEventStatusFailed,
		"last_error": reason,
		"updated_at": now,
	}})
}

// holdOutboundEvent keeps a pending event pending through a configuration
// problem (webhook disabled/unconfigured, or disabled between the poll scan
// and the delivery). It deliberately does NOT touch updated_at: that field is
// the outbox TTL key, and re-stamping it on every hold would reset the sweep
// clock forever, accumulating events for a permanently dead webhook.
func holdOutboundEvent(ctx context.Context, collection *mongo.Collection, event *models.OutboundEvent, reason string) {
	now := time.Now()
	_, _ = collection.UpdateOne(ctx,
		bson.M{"_id": event.ID, "status": models.OutboundEventStatusPending},
		bson.M{"$set": bson.M{
			"next_attempt_at": now.Add(outboundPollInterval),
			"last_error":      reason,
		}},
	)
}
