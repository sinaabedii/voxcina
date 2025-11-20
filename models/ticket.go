package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TicketMessage represents a single message in a support ticket conversation
type TicketMessage struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Sender    string             `bson:"sender" json:"sender"`             // "user" or "support"
	Body      string             `bson:"body" json:"body"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

// Ticket represents a customer support ticket
type Ticket struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	TicketNumber string              `bson:"ticket_number" json:"ticket_number"`
	UserID       primitive.ObjectID  `bson:"user_id" json:"user_id"`                                 // Owner of the ticket
	Subject      string              `bson:"subject" json:"subject"`
	Category     string              `bson:"category" json:"category"`                               // e.g., "order", "product", "payment", "technical", "general"
	Priority     string              `bson:"priority" json:"priority"`                               // "low", "medium", "high", "urgent"
	Status       string              `bson:"status" json:"status"`                                   // "open", "pending", "answered", "closed"
	OrderID      *primitive.ObjectID `bson:"order_id,omitempty" json:"order_id,omitempty"`           // Optional related order
	Messages     []TicketMessage     `bson:"messages" json:"messages"`
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at" json:"updated_at"`
}
