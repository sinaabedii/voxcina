package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Return request lifecycle statuses.
//
// State machine:
//
//	pending ──approve──────────> approved   (terminal)
//	pending ──reject───────────> rejected   (terminal)
//	pending ──user cancellation> cancelled  (terminal)
//
// Terminal states are immutable; no transition may leave them. A rejected or
// cancelled request frees the order for a fresh request while the return
// window is still open, but an approved one never does.
const (
	ReturnStatusPending   = "pending"
	ReturnStatusApproved  = "approved"
	ReturnStatusRejected  = "rejected"
	ReturnStatusCancelled = "cancelled"
)

// ReturnWindowDuration is how long after delivery an order stays eligible for
// a return request. Boundary is inclusive: a request submitted exactly at
// delivered_at + ReturnWindowDuration is still accepted.
const ReturnWindowDuration = 7 * 24 * time.Hour

// ReturnReasonMaxLength caps the free-text reason users attach to a request.
const ReturnReasonMaxLength = 1000

// ReturnRequestItem snapshots one order item being returned. Snapshots (name,
// variant, price) are taken at request time so the record stays accurate even
// if the product is later renamed, re-imaged or deleted.
type ReturnRequestItem struct {
	ProductID       primitive.ObjectID `bson:"product_id"        json:"product_id"`
	ProductName     string             `bson:"product_name"      json:"product_name"`
	Variant         OrderVariant       `bson:"variant"           json:"variant"`
	Quantity        int                `bson:"quantity"          json:"quantity"`
	PriceAtPurchase float64            `bson:"price_at_purchase" json:"price_at_purchase"`
}

// ReturnRequest is a customer's request to send back part of a delivered
// order. Exactly one non-terminal request may exist per order; this is
// enforced by a partial unique index on (order_id) where status == pending
// plus handler-level checks for the approved state.
type ReturnRequest struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty"       json:"id,omitempty"`
	OrderID      primitive.ObjectID  `bson:"order_id"            json:"order_id"`
	OrderNumber  string              `bson:"order_number"        json:"order_number"`
	UserID       primitive.ObjectID  `bson:"user_id"             json:"user_id"`
	Items        []ReturnRequestItem `bson:"items"               json:"items"`
	Reason       string              `bson:"reason"              json:"reason"`
	Status       string              `bson:"status"              json:"status"`
	DeliveredAt  time.Time           `bson:"delivered_at"        json:"delivered_at"`   // snapshot when request created
	WindowEndsAt time.Time           `bson:"window_ends_at"      json:"window_ends_at"` // delivered_at + ReturnWindowDuration
	AdminID      *primitive.ObjectID `bson:"admin_id,omitempty"  json:"admin_id,omitempty"`
	AdminName    string              `bson:"admin_name,omitempty" json:"admin_name,omitempty"`
	AdminNote    string              `bson:"admin_note,omitempty" json:"admin_note,omitempty"`
	DecidedAt    *time.Time          `bson:"decided_at,omitempty" json:"decided_at,omitempty"`
	CreatedAt    time.Time           `bson:"created_at"          json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at"          json:"updated_at"`
}

// IsTerminal reports whether the status ends the lifecycle.
func (r *ReturnRequest) IsTerminal() bool {
	return r.Status == ReturnStatusApproved ||
		r.Status == ReturnStatusRejected ||
		r.Status == ReturnStatusCancelled
}
