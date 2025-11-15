package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Chat represents a conversation session
type Chat struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatID    string             `bson:"chat_id" json:"chat_id" validate:"required"`         // Unique chat session ID
	UserID    primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`         // Authenticated user (optional)
	SessionID string             `bson:"session_id,omitempty" json:"session_id,omitempty"`   // Anonymous session ID
	Title     string             `bson:"title" json:"title"`                                 // Auto-generated from first message
	Messages  []ChatMessage      `bson:"messages" json:"messages"`                           // Array of messages
	Metadata  ChatMetadata       `bson:"metadata" json:"metadata"`                           // Analytics metadata
	Status    string             `bson:"status" json:"status"`                               // active, archived, deleted
	Tags      []string           `bson:"tags,omitempty" json:"tags,omitempty"`               // For categorization
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
	ExpiresAt *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`   // Auto-delete after N days
}

// ChatMessage represents a single message in a chat
type ChatMessage struct {
	ID            string             `bson:"id" json:"id"`                                           // Unique message ID
	Text          string             `bson:"text" json:"text" validate:"required"`                   // Message content
	Sender        string             `bson:"sender" json:"sender" validate:"required,oneof=user bot"` // user or bot
	Timestamp     time.Time          `bson:"timestamp" json:"timestamp"`                             // When message was sent
	IsAIGenerated bool               `bson:"is_ai_generated" json:"is_ai_generated"`                 // Whether AI generated this
	ModelUsed     string             `bson:"model_used,omitempty" json:"model_used,omitempty"`       // AI model name
	ProductIDs    []primitive.ObjectID `bson:"product_ids,omitempty" json:"product_ids,omitempty"`   // Recommended products
	Products      []Product          `bson:"-" json:"products,omitempty"`                            // Populated products
	Sentiment     string             `bson:"sentiment,omitempty" json:"sentiment,omitempty"`         // positive, neutral, negative
	Intent        string             `bson:"intent,omitempty" json:"intent,omitempty"`               // search, complaint, question
	ResponseTime  int                `bson:"response_time,omitempty" json:"response_time,omitempty"` // Milliseconds
}

// ChatMetadata stores analytics and tracking information
type ChatMetadata struct {
	TotalMessages      int       `bson:"total_messages" json:"total_messages"`
	UserMessages       int       `bson:"user_messages" json:"user_messages"`
	BotMessages        int       `bson:"bot_messages" json:"bot_messages"`
	ProductsRecommended int      `bson:"products_recommended" json:"products_recommended"`
	ProductsClicked    []string  `bson:"products_clicked,omitempty" json:"products_clicked,omitempty"`
	AverageResponseTime float64  `bson:"avg_response_time" json:"avg_response_time"` // In seconds
	SentimentScore     float64   `bson:"sentiment_score" json:"sentiment_score"`     // -1 to 1
	UserSatisfied      *bool     `bson:"user_satisfied,omitempty" json:"user_satisfied,omitempty"`
	ConversionOccurred bool      `bson:"conversion_occurred" json:"conversion_occurred"` // Did user buy?
	DeviceType         string    `bson:"device_type,omitempty" json:"device_type,omitempty"` // mobile, desktop, tablet
	Browser            string    `bson:"browser,omitempty" json:"browser,omitempty"`
	IPAddress          string    `bson:"ip_address,omitempty" json:"ip_address,omitempty"`
	Country            string    `bson:"country,omitempty" json:"country,omitempty"`
	FirstMessageAt     time.Time `bson:"first_message_at" json:"first_message_at"`
	LastMessageAt      time.Time `bson:"last_message_at" json:"last_message_at"`
	Duration           int       `bson:"duration" json:"duration"` // Total chat duration in seconds
}

// ChatSession represents a lightweight session for listing
type ChatSession struct {
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	ChatID        string             `bson:"chat_id" json:"chat_id"`
	UserID        primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`
	Title         string             `bson:"title" json:"title"`
	LastMessage   string             `bson:"last_message" json:"last_message"`
	MessageCount  int                `bson:"message_count" json:"message_count"`
	Status        string             `bson:"status" json:"status"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
}

// ChatAnalytics represents aggregated analytics data
type ChatAnalytics struct {
	TotalChats              int64              `json:"total_chats"`
	TotalMessages           int64              `json:"total_messages"`
	AverageMessagesPerChat  float64            `json:"avg_messages_per_chat"`
	AverageResponseTime     float64            `json:"avg_response_time"`
	TotalProductsRecommended int64             `json:"total_products_recommended"`
	TotalProductsClicked    int64              `json:"total_products_clicked"`
	ClickThroughRate        float64            `json:"click_through_rate"` // percentage
	ConversionRate          float64            `json:"conversion_rate"`    // percentage
	TopIntents              []IntentCount      `json:"top_intents"`
	TopProducts             []ProductCount     `json:"top_products"`
	SentimentBreakdown      SentimentBreakdown `json:"sentiment_breakdown"`
	PeakHours               []HourCount        `json:"peak_hours"`
	DeviceBreakdown         []DeviceCount      `json:"device_breakdown"`
	Period                  string             `json:"period"` // daily, weekly, monthly
}

// IntentCount represents intent frequency
type IntentCount struct {
	Intent string `json:"intent"`
	Count  int64  `json:"count"`
}

// ProductCount represents product recommendation frequency
type ProductCount struct {
	ProductID   string `json:"product_id"`
	ProductName string `json:"product_name"`
	Count       int64  `json:"count"`
}

// SentimentBreakdown represents sentiment distribution
type SentimentBreakdown struct {
	Positive int64   `json:"positive"`
	Neutral  int64   `json:"neutral"`
	Negative int64   `json:"negative"`
	Average  float64 `json:"average"` // -1 to 1
}

// HourCount represents message count by hour
type HourCount struct {
	Hour  int   `json:"hour"`  // 0-23
	Count int64 `json:"count"`
}

// DeviceCount represents device usage statistics
type DeviceCount struct {
	Device string `json:"device"`
	Count  int64  `json:"count"`
}

// ChatSearchRequest represents a search query for chats
type ChatSearchRequest struct {
	UserID    string    `json:"user_id,omitempty"`
	Query     string    `json:"query,omitempty"`     // Search in messages
	Status    string    `json:"status,omitempty"`    // active, archived
	FromDate  time.Time `json:"from_date,omitempty"`
	ToDate    time.Time `json:"to_date,omitempty"`
	Tags      []string  `json:"tags,omitempty"`
	Intent    string    `json:"intent,omitempty"`
	Sentiment string    `json:"sentiment,omitempty"`
	Page      int       `json:"page"`
	Limit     int       `json:"limit"`
	SortBy    string    `json:"sort_by"` // created_at, updated_at, message_count
	SortOrder string    `json:"sort_order"` // asc, desc
}

// ChatExportRequest represents a request to export chat data
type ChatExportRequest struct {
	ChatIDs  []string `json:"chat_ids"`
	Format   string   `json:"format"`   // json, csv, txt
	UserID   string   `json:"user_id,omitempty"`
	FromDate time.Time `json:"from_date,omitempty"`
	ToDate   time.Time `json:"to_date,omitempty"`
}

// ChatFeedback represents user feedback on a chat
type ChatFeedback struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatID     string             `bson:"chat_id" json:"chat_id"`
	MessageID  string             `bson:"message_id,omitempty" json:"message_id,omitempty"`
	UserID     primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`
	Rating     int                `bson:"rating" json:"rating"` // 1-5
	Helpful    *bool              `bson:"helpful,omitempty" json:"helpful,omitempty"`
	Comment    string             `bson:"comment,omitempty" json:"comment,omitempty"`
	Issues     []string           `bson:"issues,omitempty" json:"issues,omitempty"` // wrong_product, incorrect_info, etc.
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

// GenerateChatTitle generates a title from the first user message
func (c *Chat) GenerateChatTitle() {
	if c.Title != "" {
		return
	}

	for _, msg := range c.Messages {
		if msg.Sender == "user" && msg.Text != "" {
			// Take first 50 characters or less
			title := msg.Text
			if len(title) > 50 {
				title = title[:47] + "..."
			}
			c.Title = title
			return
		}
	}

	// Fallback title
	c.Title = "گفتگو با پشتیبانی"
}

// UpdateMetadata recalculates chat metadata
func (c *Chat) UpdateMetadata() {
	c.Metadata.TotalMessages = len(c.Messages)
	c.Metadata.UserMessages = 0
	c.Metadata.BotMessages = 0
	c.Metadata.ProductsRecommended = 0

	if len(c.Messages) == 0 {
		return
	}

	c.Metadata.FirstMessageAt = c.Messages[0].Timestamp
	c.Metadata.LastMessageAt = c.Messages[len(c.Messages)-1].Timestamp
	c.Metadata.Duration = int(c.Metadata.LastMessageAt.Sub(c.Metadata.FirstMessageAt).Seconds())

	var totalResponseTime int
	responseCount := 0

	for _, msg := range c.Messages {
		if msg.Sender == "user" {
			c.Metadata.UserMessages++
		} else {
			c.Metadata.BotMessages++
			if msg.ResponseTime > 0 {
				totalResponseTime += msg.ResponseTime
				responseCount++
			}
		}

		// Count recommended products
		c.Metadata.ProductsRecommended += len(msg.ProductIDs)
	}

	// Calculate average response time
	if responseCount > 0 {
		c.Metadata.AverageResponseTime = float64(totalResponseTime) / float64(responseCount) / 1000.0 // Convert to seconds
	}
}
