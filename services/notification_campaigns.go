package services

import (
	"context"
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

// Campaign fan-out worker.
//
// Composing a broadcast resolves the audience rule into user ids and writes
// one inbox row per user. That is O(users) writes and NEVER happens in the
// admin's HTTP request — the handler enqueues a campaign row, and this worker
// drains queued/scheduled campaigns in batches. Every user processed through
// services.Notify, so preferences are honored and the inbox row always lands
// before the push outbox row.

// campaignFanOutBatchSize is how many users one fan-out pass reads.
const campaignFanOutBatchSize = 500

// campaignPollInterval is how often the worker looks for due campaigns.
const campaignPollInterval = 30 * time.Second

// StartNotificationCampaignWorker launches the fan-out loop; returns a stop
// function. A nil-database worker is a no-op.
func StartNotificationCampaignWorker(database *mongo.Database) (stop func()) {
	if database == nil {
		return func() {}
	}
	stopCh := make(chan struct{})
	ticker := time.NewTicker(campaignPollInterval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
				processDueCampaigns(ctx, database)
				cancel()
			}
		}
	}()
	var once sync.Once
	return func() { once.Do(func() { close(stopCh) }) }
}

// processDueCampaigns claims and fans out campaigns that are queued (send now)
// or scheduled with a past SendAt.
func processDueCampaigns(ctx context.Context, database *mongo.Database) {
	coll := database.Collection("notification_campaigns")
	// One campaign per pass: a broadcast to everyone dominates a batch, and
	// claiming a single campaign by atomically flipping queued → sending keeps
	// two replicas from double-fanning-out. next_attempt on failure is simply
	// the next poll (the row stays "sending" only while this function runs; a
	// crashed pass leaves it stuck, handled by the staleness reset below).
	var campaign models.NotificationCampaign
	err := coll.FindOneAndUpdate(ctx,
		bson.M{
			"status": models.NotificationCampaignStatusQueued,
			"$or": []bson.M{
				{"send_at": bson.M{"$exists": false}},
				{"send_at": nil},
				{"send_at": bson.M{"$lte": time.Now()}},
			},
		},
		bson.M{"$set": bson.M{"status": models.NotificationCampaignStatusSending, "updated_at": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&campaign)
	if err != nil {
		// No due campaign is the normal case; anything louder gets logged.
		if err != mongo.ErrNoDocuments {
			log.Printf("campaigns: claim failed: %v", err)
		}
		return
	}

	// Reset campaigns stuck in "sending" from a crashed pass: anything claimed
	// more than an hour ago goes back to queued and re-fans-out. Rows are
	// idempotent per user (campaign_id dedupe below), so a replay is safe.
	_, _ = coll.UpdateMany(ctx, bson.M{
		"status":     models.NotificationCampaignStatusSending,
		"updated_at": bson.M{"$lt": time.Now().Add(-time.Hour)},
	}, bson.M{"$set": bson.M{"status": models.NotificationCampaignStatusQueued}})

	if err := fanOutCampaign(ctx, database, &campaign); err != nil {
		_, _ = coll.UpdateOne(ctx, bson.M{"_id": campaign.ID}, bson.M{"$set": bson.M{
			"status":     models.NotificationCampaignStatusFailed,
			"error":      err.Error(),
			"updated_at": time.Now(),
		}})
		log.Printf("campaigns: fan-out for %s failed: %v", campaign.ID.Hex(), err)
	}
}

// fanOutCampaign writes one inbox row per resolved user, then flips the
// campaign to sent with its counters. Per-user dedupe: a user who already has
// a row for this campaign (from a replayed pass) is skipped.
func fanOutCampaign(ctx context.Context, database *mongo.Database, campaign *models.NotificationCampaign) error {
	userIDs, err := resolveCampaignAudience(ctx, database, campaign)
	if err != nil {
		return err
	}

	coll := database.Collection("notification_campaigns")
	written := 0
	pushed := 0
	batch := make([]interface{}, 0, campaignFanOutBatchSize)
	now := time.Now()
	expires := now.Add(models.NotificationRetention)

	flush := func() error {
		if len(batch) == 0 {
			return nil
		}
		if _, err := database.Collection("notifications").InsertMany(ctx, batch); err != nil {
			// BulkWriteException dup keys are expected only if we ever make
			// rows unique; today a replayed pass would double-write, so the
			// per-user dedupe in the loop is the guarantee.
			return err
		}
		written += len(batch)

		pushRows := make([]interface{}, 0, len(batch))
		for _, row := range batch {
			n := row.(models.Notification)
			pushRows = append(pushRows, models.PushOutbox{
				ID:             primitive.NewObjectID(),
				NotificationID: n.ID,
				UserID:         n.UserID,
				Status:         models.PushOutboxStatusPending,
				NextAttemptAt:  now,
				CreatedAt:      now,
				UpdatedAt:      now,
				ExpiresAt:      n.ExpiresAt,
			})
		}
		if _, err := database.Collection("push_outbox").InsertMany(ctx, pushRows); err != nil {
			log.Printf("campaigns: push enqueue after fan-out failed: %v", err)
		} else {
			pushed += len(pushRows)
		}
		batch = batch[:0]
		return nil
	}

	for _, userID := range userIDs {
		// Campaign replay dedupe: skip users who already have a row for this
		// campaign. One extra CountDocuments per user is affordable at 500
		// users/pass against an indexed {campaign_id, user_id} probe; the
		// common path (fresh campaign) pays one cheap index hit per row.
		count, err := database.Collection("notifications").CountDocuments(ctx,
			bson.M{"campaign_id": campaign.ID, "user_id": userID}, options.Count().SetLimit(1))
		if err != nil {
			log.Printf("campaigns: dedupe check failed for %s: %v", userID.Hex(), err)
			continue
		}
		if count > 0 {
			continue
		}

		// Campaign copy is admin-authored; no template resolution, but the
		// muted-channel rule still applies (preferences before enqueue).
		prefs, err := PreferencesForUser(ctx, database, userID)
		if err != nil {
			return err
		}
		if !prefAllowedFor(prefs, campaign.Type) {
			continue
		}

		row := models.Notification{
			ID:          primitive.NewObjectID(),
			UserID:      userID,
			Type:        campaign.Type,
			Audience:    campaign.AudienceKind,
			Title:       campaign.Title,
			Body:        campaign.Body,
			Image:       campaign.Image,
			TargetType:  campaign.TargetType,
			TargetID:    campaign.TargetID,
			TargetExtra: campaign.TargetExtra,
			CampaignID:  &campaign.ID,
			CreatedAt:   now,
			ExpiresAt:   expires,
		}
		batch = append(batch, row)
		if len(batch) >= campaignFanOutBatchSize {
			if err := flush(); err != nil {
				return err
			}
		}
	}
	if err := flush(); err != nil {
		return err
	}

	sentAt := time.Now()
	_, err = coll.UpdateOne(ctx, bson.M{"_id": campaign.ID}, bson.M{"$set": bson.M{
		"status":     models.NotificationCampaignStatusSent,
		"fanned_out": written,
		"pushed":     pushed,
		"sent_at":    sentAt,
		"updated_at": sentAt,
	}})
	return err
}

// resolveCampaignAudience resolves the audience kind to user ids.
func resolveCampaignAudience(ctx context.Context, database *mongo.Database, campaign *models.NotificationCampaign) ([]primitive.ObjectID, error) {
	switch campaign.AudienceKind {
	case models.NotificationAudienceAll:
		// Every active user.
		ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		raw, err := database.Collection("users").Distinct(ctx, "_id", bson.M{"is_active": bson.M{"$ne": false}})
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
	case models.NotificationAudienceUser:
		if campaign.AudienceUser == nil || campaign.AudienceUser.IsZero() {
			return nil, fmt.Errorf("campaign: user audience without a user id")
		}
		return []primitive.ObjectID{*campaign.AudienceUser}, nil
	case models.NotificationAudienceSegment:
		return ResolveSegment(ctx, database, campaign.Segment)
	default:
		return nil, fmt.Errorf("campaign: unknown audience kind %q", campaign.AudienceKind)
	}
}
