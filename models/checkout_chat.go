package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CheckoutChatRoleUser  = "user"
	CheckoutChatRoleAgent = "agent"

	CheckoutChatStatusActive  = "active"
	CheckoutChatStatusDeleted = "deleted"
)

// CheckoutChat represents a checkout-page discount-negotiation conversation.
// One document per session, scoped to a user rather than a try-on room.
type CheckoutChat struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	ChatID string             `bson:"chat_id" json:"chat_id"`
	UserID primitive.ObjectID `bson:"user_id" json:"user_id"`

	Title    string                 `bson:"title" json:"title"`
	Messages []CheckoutChatMessage  `bson:"messages" json:"messages"`
	Metadata CheckoutChatMetadata   `bson:"metadata" json:"metadata"`
	Status   string                 `bson:"status" json:"status"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// CheckoutChatMessage represents a single message in a checkout negotiation chat.
type CheckoutChatMessage struct {
	ID        string    `bson:"id" json:"id"`
	Role      string    `bson:"role" json:"role"`
	Content   string    `bson:"content" json:"content"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`

	ToolCall *CheckoutChatToolCall `bson:"tool_call,omitempty" json:"tool_call,omitempty"`

	ModelUsed      string `bson:"model_used,omitempty" json:"model_used,omitempty"`
	ResponseTimeMs int64  `bson:"response_time_ms,omitempty" json:"response_time_ms,omitempty"`
}

// CheckoutChatToolCall is the embedded tool-call record (offer_coupon only).
type CheckoutChatToolCall struct {
	Name      string                 `bson:"name" json:"name"`
	Arguments map[string]interface{} `bson:"arguments" json:"arguments"`
	Result    map[string]interface{} `bson:"result,omitempty" json:"result,omitempty"`
}

// CheckoutChatMetadata stores per-session analytics.
type CheckoutChatMetadata struct {
	TotalMessages  int      `bson:"total_messages" json:"total_messages"`
	UserMessages   int      `bson:"user_messages" json:"user_messages"`
	AgentMessages  int      `bson:"agent_messages" json:"agent_messages"`
	CouponsOffered []string `bson:"coupons_offered,omitempty" json:"coupons_offered,omitempty"`
	FirstMessageAt time.Time `bson:"first_message_at,omitempty" json:"first_message_at,omitempty"`
	LastMessageAt  time.Time `bson:"last_message_at,omitempty" json:"last_message_at,omitempty"`
}
