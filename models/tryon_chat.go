package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	TryonChatRoleUser   = "user"
	TryonChatRoleAgent  = "agent"
	TryonChatRoleTool   = "tool"
	TryonChatRoleTryon  = "tryon"
	TryonChatRoleSystem = "system"

	TryonChatStatusActive   = "active"
	TryonChatStatusArchived = "archived"
	TryonChatStatusDeleted  = "deleted"
)

// TryonChat represents a fitting-room conversation.
// One document per session; can span multiple tryons.
type TryonChat struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	ChatID string             `bson:"chat_id" json:"chat_id"`
	UserID primitive.ObjectID `bson:"user_id" json:"user_id"`

	TryonIDs []string `bson:"tryon_ids" json:"tryon_ids"`

	Title    string             `bson:"title" json:"title"`
	Messages []TryonChatMessage `bson:"messages" json:"messages"`
	Metadata TryonChatMetadata  `bson:"metadata" json:"metadata"`
	Status   string             `bson:"status" json:"status"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// TryonChatMessage represents a single message in a fitting-room chat.
type TryonChatMessage struct {
	ID        string    `bson:"id" json:"id"`
	Role      string    `bson:"role" json:"role"`
	Content   string    `bson:"content" json:"content"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`

	// role=tryon only
	TryonData *TryonChatTryonData `bson:"tryon_data,omitempty" json:"tryon_data,omitempty"`

	// role=agent only
	ToolCall *TryonChatToolCall `bson:"tool_call,omitempty" json:"tool_call,omitempty"`

	// role=agent only
	ModelUsed      string `bson:"model_used,omitempty" json:"model_used,omitempty"`
	ResponseTimeMs int64  `bson:"response_time_ms,omitempty" json:"response_time_ms,omitempty"`
}

// TryonChatTryonData is the embedded tryon card metadata.
type TryonChatTryonData struct {
	RoomNumber  int                `bson:"room_number" json:"room_number"`
	BeforeImage string             `bson:"before_image" json:"before_image"`
	AfterImage  string             `bson:"after_image" json:"after_image"`
	ProductID   primitive.ObjectID `bson:"product_id,omitempty" json:"product_id,omitempty"`
	ProductName string             `bson:"product_name" json:"product_name"`
	Color       string             `bson:"color,omitempty" json:"color,omitempty"`
	Size        string             `bson:"size,omitempty" json:"size,omitempty"`
	GarmentType string             `bson:"garment_type" json:"garment_type"`
	TryonID     string             `bson:"tryon_id" json:"tryon_id"`
}

// TryonChatToolCall is the embedded tool-call record.
type TryonChatToolCall struct {
	Name      string                 `bson:"name" json:"name"`
	Arguments map[string]interface{} `bson:"arguments" json:"arguments"`
	Result    map[string]interface{} `bson:"result,omitempty" json:"result,omitempty"`
}

// TryonChatMetadata stores per-room analytics.
type TryonChatMetadata struct {
	TotalMessages       int       `bson:"total_messages" json:"total_messages"`
	UserMessages        int       `bson:"user_messages" json:"user_messages"`
	AgentMessages       int       `bson:"agent_messages" json:"agent_messages"`
	ToolMessages        int       `bson:"tool_messages" json:"tool_messages"`
	TryonMessages       int       `bson:"tryon_messages" json:"tryon_messages"`
	CouponsOffered      []string  `bson:"coupons_offered,omitempty" json:"coupons_offered,omitempty"`
	ProductsRecommended []string  `bson:"products_recommended,omitempty" json:"products_recommended,omitempty"`
	FirstMessageAt      time.Time `bson:"first_message_at,omitempty" json:"first_message_at,omitempty"`
	LastMessageAt       time.Time `bson:"last_message_at,omitempty" json:"last_message_at,omitempty"`
	DurationSeconds     int       `bson:"duration_seconds" json:"duration_seconds"`
	DeviceType          string    `bson:"device_type,omitempty" json:"device_type,omitempty"`
	Browser             string    `bson:"browser,omitempty" json:"browser,omitempty"`
	OS                  string    `bson:"os,omitempty" json:"os,omitempty"`
}

// TryonChatSession is a lightweight projection of a fitting room,
// used for list endpoints (no messages, just summary fields).
type TryonChatSession struct {
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	ChatID        string             `bson:"chat_id" json:"chat_id"`
	UserID        primitive.ObjectID `bson:"user_id" json:"user_id"`
	Title         string             `bson:"title,omitempty" json:"title,omitempty"`
	TryonCount    int                `bson:"tryon_count" json:"tryon_count"`
	MessageCount  int                `bson:"message_count" json:"message_count"`
	UserMessages  int                `bson:"user_messages" json:"user_messages,omitempty"`
	AgentMessages int                `bson:"agent_messages" json:"agent_messages,omitempty"`
	TryonMessages int                `bson:"tryon_messages" json:"tryon_messages,omitempty"`
	LastMessage   string             `bson:"last_message,omitempty" json:"last_message,omitempty"`
	LastMessageAt time.Time          `bson:"last_message_at,omitempty" json:"last_message_at,omitempty"`
	Status        string             `bson:"status" json:"status"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
}
