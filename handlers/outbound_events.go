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

// Outbound webhook emission for the Go-side business flows.
//
// Every emit is best-effort and asynchronous: a webhook never blocks, fails,
// or rolls back the business change it announces. The outbox row is written
// in this request; the dispatcher in services.StartOutboundEventDispatcher
// delivers it with retries.

// emitOutboundEvent enqueues one event to every subscribed active webhook.
// Safe to call from anywhere: nil database, unknown event types and transport
// failures are logged, never propagated.
func emitOutboundEvent(eventType string, userID *primitive.ObjectID, payload map[string]interface{}) {
	if db.Database == nil {
		return
	}
	if _, err := services.BroadcastOutboundEvent(context.Background(), db.Database, eventType, userID, payload); err != nil {
		log.Printf("outbound event %s broadcast failed: %v", eventType, err)
	}
}

// emitOrderPlacedEvent emits payment.paid once an order transitions to paid.
// Called asynchronously from the payment flows so the emit never delays the
// response.
func emitPaymentPaid(userID primitive.ObjectID, order *models.Order, gateway string) {
	orderID := order.ID
	emitOutboundEvent(models.OutboundEventPaymentPaid, &userID, map[string]interface{}{
		"order_id":       orderID.Hex(),
		"order_number":   order.OrderNumber,
		"total_amount":   order.TotalAmount,
		"gateway":        gateway,
		"payment_status": "paid",
	})
}

// emitPaymentFailed emits payment.failed for a terminal non-paid outcome.
func emitPaymentFailed(userID primitive.ObjectID, order *models.Order, gateway, status, reason string) {
	orderID := order.ID
	emitOutboundEvent(models.OutboundEventPaymentFailed, &userID, map[string]interface{}{
		"order_id":       orderID.Hex(),
		"order_number":   order.OrderNumber,
		"gateway":        gateway,
		"payment_status": status,
		"reason":         reason,
		"at":             time.Now(),
	})
}

// emitOrderStatusChanged emits order.status_changed for admin status edits.
func emitOrderStatusChanged(order *models.Order, previousStatus, newStatus string) {
	userID := order.UserID
	emitOutboundEvent(models.OutboundEventOrderStatusChanged, &userID, map[string]interface{}{
		"order_id":        order.ID.Hex(),
		"order_number":    order.OrderNumber,
		"previous_status": previousStatus,
		"new_status":      newStatus,
	})
}

// emitReturnRequestDecided emits return_request.decided for admin decisions.
func emitReturnRequestDecided(request *models.ReturnRequest, newStatus string) {
	userID := request.UserID
	requestID := request.ID
	emitOutboundEvent(models.OutboundEventReturnRequestDecided, &userID, map[string]interface{}{
		"request_id": requestID.Hex(),
		"order_id":   request.OrderID.Hex(),
		"status":     newStatus,
	})
}
