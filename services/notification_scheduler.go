package services

import (
	"context"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
	"backEnd/utils"
)

// Scheduled, data-driven notifications: voucher_expiring and cart_reminder.
//
// Both are crons over existing collections with a "sent once per state" marker
// written back, so a reminder is never repeated while the state stands still.
// The windows are short on purpose: the scheduler is a best-effort nudger, not
// a billing system — a missed pass simply skips one cycle.

// schedulerPollInterval is how often the cron ticks.
const schedulerPollInterval = 30 * time.Minute

// VoucherExpiringWindow is how close to expiry a coupon must be to warn.
const VoucherExpiringWindow = 48 * time.Hour

// CartReminderIdleWindow is how long a cart must sit untouched before a
// reminder. carts.updated_at moves on every item change, which is the same
// notion of "untouched" the cart-recovery SMS uses — no second clock.
const CartReminderIdleWindow = 24 * time.Hour

// StartNotificationScheduler launches the cron; returns a stop function.
func StartNotificationScheduler(database *mongo.Database) (stop func()) {
	if database == nil {
		return func() {}
	}
	stopCh := make(chan struct{})
	ticker := time.NewTicker(schedulerPollInterval)
	// Fire once at startup so a fresh deployment does not wait 30 minutes.
	go processScheduledNotifications(context.Background(), database)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				processScheduledNotifications(context.Background(), database)
			}
		}
	}()
	var once sync.Once
	return func() { once.Do(func() { close(stopCh) }) }
}

// notifyScheduled wraps Notify for the cron paths: failures are logged, never
// fatal, and the caller only marks "sent" when Notify returned a row.
func notifyScheduled(ctx context.Context, database *mongo.Database, input NotifyInput) (*primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return Notify(ctx, database, input)
}

// processScheduledNotifications runs both crons once.
func processScheduledNotifications(ctx context.Context, database *mongo.Database) {
	if database == nil {
		return
	}
	notifyVouchersExpiring(ctx, database)
	notifyAbandonedCarts(ctx, database)
}

// notifyVouchersExpiring warns users whose unused negotiated coupon expires
// within the window. valid_until is stamped on the coupon at issue, so the
// marker (notification_sent_at) prevents repeats until the coupon is used and
// a new one replaces it.
func notifyVouchersExpiring(ctx context.Context, database *mongo.Database) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	filter := bson.M{
		"used":                 false,
		"valid_until":          bson.M{"$gt": time.Now(), "$lte": time.Now().Add(VoucherExpiringWindow)},
		"notification_sent_at": bson.M{"$exists": false},
	}
	cursor, err := database.Collection("negotiated_coupons").Find(ctx, filter)
	if err != nil {
		log.Printf("scheduler: voucher scan failed: %v", err)
		return
	}
	defer cursor.Close(ctx)
	var coupons []models.NegotiatedCoupon
	if err := cursor.All(ctx, &coupons); err != nil {
		log.Printf("scheduler: voucher decode failed: %v", err)
		return
	}
	for _, coupon := range coupons {
		data := map[string]string{
			"code":        coupon.Code,
			"valid_until": formatJalaliDeadline(coupon.ValidUntil),
		}
		id, err := notifyScheduled(ctx, database, NotifyInput{
			UserID:     coupon.UserID,
			Type:       models.NotificationTypeVoucherExpiring,
			TargetType: models.NotificationTargetVouchers,
			Data:       data,
		})
		if err != nil {
			log.Printf("scheduler: voucher_expiring for %s failed: %v", coupon.ID.Hex(), err)
			continue
		}
		if id == nil {
			continue // muted channel: leave unmarked so a later re-enable warns once
		}
		_, _ = database.Collection("negotiated_coupons").UpdateOne(ctx,
			bson.M{"_id": coupon.ID, "notification_sent_at": bson.M{"$exists": false}},
			bson.M{"$set": bson.M{"notification_sent_at": time.Now()}})
	}
}

// notifyAbandonedCarts reminds users whose active cart has been untouched for
// the idle window.
//
// The marker rides on the cart document and re-arms when the cart moves: a cart
// qualifies if it was never reminded, OR if it has been edited since the last
// reminder (updated_at > reminder_sent_at). Matching on "reminder_sent_at does
// not exist" alone would give each cart exactly one reminder for its entire
// lifetime — a user who abandons a cart, buys, and abandons a new one months
// later would never be nudged again.
func notifyAbandonedCarts(ctx context.Context, database *mongo.Database) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	filter := bson.M{
		"is_active":  true,
		"items.0":    bson.M{"$exists": true},
		"updated_at": bson.M{"$lt": time.Now().Add(-CartReminderIdleWindow)},
		"$or": []bson.M{
			{"reminder_sent_at": bson.M{"$exists": false}},
			{"$expr": bson.M{"$lt": bson.A{"$reminder_sent_at", "$updated_at"}}},
		},
	}
	cursor, err := database.Collection("carts").Find(ctx, filter,
		// Bounded: a reminder sweep over a huge stale backlog must not run for
		// minutes; the rest wait for the next tick.
		options.Find().SetLimit(200).SetSort(bson.D{{Key: "updated_at", Value: 1}}))
	if err != nil {
		log.Printf("scheduler: cart scan failed: %v", err)
		return
	}
	defer cursor.Close(ctx)
	var carts []models.Cart
	if err := cursor.All(ctx, &carts); err != nil {
		log.Printf("scheduler: cart decode failed: %v", err)
		return
	}
	for _, cart := range carts {
		id, err := notifyScheduled(ctx, database, NotifyInput{
			UserID:     cart.UserID,
			Type:       models.NotificationTypeCartReminder,
			TargetType: models.NotificationTargetCart,
		})
		if err != nil {
			log.Printf("scheduler: cart_reminder for cart %s failed: %v", cart.ID.Hex(), err)
			continue
		}
		if id == nil {
			continue
		}
		// Unconditional: the re-arm above is driven by updated_at, so the marker
		// is refreshed rather than written once.
		_, _ = database.Collection("carts").UpdateOne(ctx,
			bson.M{"_id": cart.ID},
			bson.M{"$set": bson.M{"reminder_sent_at": time.Now()}})
	}
}

// formatJalaliDeadline renders a deadline in the Persian calendar the app's
// copy reads naturally in ("۲۴ شهریور ۱۴۰۴"); utils.ToJalaliDateString is the
// shop-wide date renderer.
func formatJalaliDeadline(t time.Time) string {
	return utils.ToJalaliDateString(t)
}
