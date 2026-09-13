package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Outbound event types pushed to subscribed external services. The set is
// closed; the dispatcher rejects anything else.
const (
	OutboundEventPaymentPaid          = "payment.paid"
	OutboundEventPaymentFailed        = "payment.failed"
	OutboundEventOrderStatusChanged   = "order.status_changed"
	OutboundEventReturnRequestDecided = "return_request.decided"
	OutboundEventIdentityMerged       = "identity.merged"
	OutboundEventWebhookTest          = "webhook.test"
)

// Delivery lifecycle of an outbox row.
const (
	OutboundEventStatusPending   = "pending"
	OutboundEventStatusDelivered = "delivered"
	OutboundEventStatusFailed    = "failed"
)

// OutboundEventMaxAttempts is how many delivery tries an event gets before it
// is marked failed for good.
const OutboundEventMaxAttempts = 8

// ValidOutboundEventType reports whether t is an emit-able event type.
func ValidOutboundEventType(t string) bool {
	switch t {
	case OutboundEventPaymentPaid,
		OutboundEventPaymentFailed,
		OutboundEventOrderStatusChanged,
		OutboundEventReturnRequestDecided,
		OutboundEventIdentityMerged,
		OutboundEventWebhookTest:
		return true
	}
	return false
}

// OutboundEvent is one queued webhook delivery: an outbox row written in the
// same request as the business change it announces, then delivered
// asynchronously with retries. Consumers dedupe on ID; bodies are signed with
// the per-service HMAC secret.
type OutboundEvent struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty"      json:"id,omitempty"`
	Type      string                 `bson:"type"               json:"type"`
	ServiceID primitive.ObjectID     `bson:"service_id"         json:"service_id"`
	UserID    *primitive.ObjectID    `bson:"user_id,omitempty"  json:"user_id,omitempty"`
	Payload   map[string]interface{} `bson:"payload"         json:"payload"`

	Status        string     `bson:"status"                 json:"status"`
	Attempts      int        `bson:"attempts"               json:"attempts"`
	NextAttemptAt time.Time  `bson:"next_attempt_at"       json:"next_attempt_at"`
	DeliveredAt   *time.Time `bson:"delivered_at,omitempty" json:"delivered_at,omitempty"`
	LastError     string     `bson:"last_error,omitempty"   json:"last_error,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
