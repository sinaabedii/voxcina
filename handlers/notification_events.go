package handlers

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
)

// Notification emission for the Go-side business flows — the twin of
// handlers/outbound_events.go with the same contract: every emit is
// best-effort and asynchronous; a notification never blocks, fails, or rolls
// back the business change it announces. The inbox row is written here, the
// push outbox row right behind it, and the dispatcher in
// services.StartPushDispatcher delivers the push with retries.

// emitNotification runs one Notify call off the request path.
func emitNotification(input services.NotifyInput) {
	if db.Database == nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if _, err := services.Notify(ctx, db.Database, input); err != nil {
			log.Printf("notification %s for %s failed: %v", input.Type, input.UserID.Hex(), err)
		}
	}()
}

// notifyOrderPlaced emits order_placed the moment a checkout creates the
// (still unpaid) order.
func notifyOrderPlaced(order *models.Order) {
	emitNotification(services.NotifyInput{
		UserID:     order.UserID,
		Type:       models.NotificationTypeOrderPlaced,
		TargetType: models.NotificationTargetOrderDetail,
		TargetID:   order.ID.Hex(),
	})
}

// notifyOrderStatusChanged emits order_status_changed for admin status edits.
func notifyOrderStatusChanged(order *models.Order, newStatus string) {
	emitNotification(services.NotifyInput{
		UserID:     order.UserID,
		Type:       models.NotificationTypeOrderStatus,
		TargetType: models.NotificationTargetOrderDetail,
		TargetID:   order.ID.Hex(),
	})
}

// notifyPaymentSucceeded emits payment_succeeded where the payment turns
// paid. Called from the FinalizeVerifiedPayment chokepoint (which DigiPay and
// SnappPay share) and Zibal's VerifyPayment.
func notifyPaymentSucceeded(userID primitive.ObjectID, order *models.Order) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypePaymentSucceeded,
		TargetType: models.NotificationTargetOrderDetail,
		TargetID:   order.ID.Hex(),
	})
}

// notifyPaymentFailed emits payment_failed for a terminal non-paid outcome.
func notifyPaymentFailed(userID primitive.ObjectID, order *models.Order) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypePaymentFailed,
		TargetType: models.NotificationTargetOrderDetail,
		TargetID:   order.ID.Hex(),
	})
}

// notifyReturnDecided emits return_decided for an admin's approve/reject.
// Target is the ORDER detail — that is where the app shows the return state.
func notifyReturnDecided(request *models.ReturnRequest, newStatus string) {
	emitNotification(services.NotifyInput{
		UserID:     request.UserID,
		Type:       models.NotificationTypeReturnDecided,
		TargetType: models.NotificationTargetOrderDetail,
		TargetID:   request.OrderID.Hex(),
	})
}

// notifyTicketReplied emits ticket_replied when a support agent answers.
func notifyTicketReplied(userID primitive.ObjectID) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypeTicketReplied,
		TargetType: models.NotificationTargetTickets,
	})
}

// notifyTryonReply emits tryon_reply after the agent answers in the fitting
// room. Coupons must never be minted or offered here (the checkout page owns
// discounts) — a notification naming the room is all this is.
func notifyTryonReply(userID primitive.ObjectID) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypeTryonReply,
		TargetType: models.NotificationTargetTryon,
	})
}

// notifyCouponOffer emits coupon_offer for a negotiated or cart-recovery
// coupon: target `cart` with the code in target_id, which the app auto-applies
// on tap.
func notifyCouponOffer(userID primitive.ObjectID, code string) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypeCouponOffer,
		TargetType: models.NotificationTargetCart,
		TargetID:   code,
	})
}

// notifyVoucherGranted emits voucher_granted for a targeted discount assigned
// to specific users. The app lands on the vouchers screen.
func notifyVoucherGranted(userID primitive.ObjectID, code string) {
	emitNotification(services.NotifyInput{
		UserID:     userID,
		Type:       models.NotificationTypeVoucherGranted,
		TargetType: models.NotificationTargetVouchers,
	})
}
