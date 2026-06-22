package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"backEnd/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ChatService handles chat operations
type ChatService struct {
	collection *mongo.Collection
}

// NewChatService creates a new chat service
func NewChatService(db *mongo.Database) *ChatService {
	return &ChatService{
		collection: db.Collection("chats"),
	}
}

// CreateChat creates a new chat session
func (s *ChatService) CreateChat(ctx context.Context, chat *models.Chat) error {
	if chat.CreatedAt.IsZero() {
		chat.CreatedAt = time.Now()
	}
	chat.UpdatedAt = time.Now()
	
	// Set default status
	if chat.Status == "" {
		chat.Status = "active"
	}

	// Initialize metadata
	chat.Metadata.FirstMessageAt = time.Now()
	chat.Metadata.LastMessageAt = time.Now()

	result, err := s.collection.InsertOne(ctx, chat)
	if err != nil {
		return fmt.Errorf("failed to create chat: %w", err)
	}

	chat.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetChatByID retrieves a chat by its MongoDB ID
func (s *ChatService) GetChatByID(ctx context.Context, id primitive.ObjectID) (*models.Chat, error) {
	var chat models.Chat
	err := s.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&chat)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("chat not found")
		}
		return nil, fmt.Errorf("failed to get chat: %w", err)
	}
	return &chat, nil
}

// GetChatByChatID retrieves a chat by its chat_id
func (s *ChatService) GetChatByChatID(ctx context.Context, chatID string) (*models.Chat, error) {
	var chat models.Chat
	err := s.collection.FindOne(ctx, bson.M{"chat_id": chatID}).Decode(&chat)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("chat not found")
		}
		return nil, fmt.Errorf("failed to get chat: %w", err)
	}
	return &chat, nil
}

// AddMessage adds a message to an existing chat
func (s *ChatService) AddMessage(ctx context.Context, chatID string, message models.ChatMessage) error {
	// Set message timestamp if not set
	if message.Timestamp.IsZero() {
		message.Timestamp = time.Now()
	}

	// Generate message ID if not set
	if message.ID == "" {
		message.ID = primitive.NewObjectID().Hex()
	}

	// Update chat with new message and metadata
	update := bson.M{
		"$push": bson.M{"messages": message},
		"$set": bson.M{
			"updated_at": time.Now(),
			"metadata.last_message_at": message.Timestamp,
		},
		"$inc": bson.M{
			"metadata.total_messages": 1,
		},
	}

	// Increment user or bot message counter
	if message.Sender == "user" {
		update["$inc"].(bson.M)["metadata.user_messages"] = 1
	} else {
		update["$inc"].(bson.M)["metadata.bot_messages"] = 1
	}

	// Add products recommended count
	if len(message.ProductIDs) > 0 {
		update["$inc"].(bson.M)["metadata.products_recommended"] = len(message.ProductIDs)
	}

	result, err := s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		update,
	)

	if err != nil {
		return fmt.Errorf("failed to add message: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("chat not found")
	}

	return nil
}

// UpdateChatMetadata recalculates and updates chat metadata
func (s *ChatService) UpdateChatMetadata(ctx context.Context, chatID string) error {
	// Get chat
	chat, err := s.GetChatByChatID(ctx, chatID)
	if err != nil {
		return err
	}

	// Recalculate metadata
	chat.UpdateMetadata()

	// Generate title if empty
	if chat.Title == "" {
		chat.GenerateChatTitle()
	}

	// Update in database
	_, err = s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		bson.M{
			"$set": bson.M{
				"metadata": chat.Metadata,
				"title":    chat.Title,
				"updated_at": time.Now(),
			},
		},
	)

	return err
}

// ListUserChats retrieves all chats for a user
func (s *ChatService) ListUserChats(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]models.ChatSession, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	skip := (page - 1) * limit

	// Build aggregation pipeline for lightweight sessions
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"user_id": userID,
			"status":  bson.M{"$ne": "deleted"},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":        1,
			"chat_id":    1,
			"user_id":    1,
			"title":      1,
			"status":     1,
			"created_at": 1,
			"updated_at": 1,
			"last_message": bson.M{
				"$arrayElemAt": bson.A{"$messages.text", -1},
			},
			"message_count": bson.M{"$size": "$messages"},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "updated_at", Value: -1}}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list chats: %w", err)
	}
	defer cursor.Close(ctx)

	var sessions []models.ChatSession
	if err = cursor.All(ctx, &sessions); err != nil {
		return nil, 0, fmt.Errorf("failed to decode chats: %w", err)
	}

	// Get total count
	totalCount, err := s.collection.CountDocuments(ctx, bson.M{
		"user_id": userID,
		"status":  bson.M{"$ne": "deleted"},
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count chats: %w", err)
	}

	return sessions, totalCount, nil
}

// SearchChats searches chats with advanced filters
func (s *ChatService) SearchChats(ctx context.Context, req models.ChatSearchRequest) ([]models.ChatSession, int64, error) {
	filter := bson.M{}

	// User filter
	if req.UserID != "" {
		userID, err := primitive.ObjectIDFromHex(req.UserID)
		if err == nil {
			filter["user_id"] = userID
		}
	}

	// Text search in messages
	if req.Query != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": req.Query, "$options": "i"}},
			{"messages.text": bson.M{"$regex": req.Query, "$options": "i"}},
		}
	}

	// Status filter
	if req.Status != "" {
		filter["status"] = req.Status
	} else {
		filter["status"] = bson.M{"$ne": "deleted"}
	}

	// Date range filter
	if !req.FromDate.IsZero() {
		filter["created_at"] = bson.M{"$gte": req.FromDate}
	}
	if !req.ToDate.IsZero() {
		if filter["created_at"] == nil {
			filter["created_at"] = bson.M{}
		}
		filter["created_at"].(bson.M)["$lte"] = req.ToDate
	}

	// Tags filter
	if len(req.Tags) > 0 {
		filter["tags"] = bson.M{"$in": req.Tags}
	}

	// Intent filter
	if req.Intent != "" {
		filter["messages.intent"] = req.Intent
	}

	// Sentiment filter
	if req.Sentiment != "" {
		filter["messages.sentiment"] = req.Sentiment
	}

	// Pagination
	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	skip := (page - 1) * limit

	// Sort
	sortField := req.SortBy
	if sortField == "" {
		sortField = "updated_at"
	}
	sortOrder := -1 // default desc
	if req.SortOrder == "asc" {
		sortOrder = 1
	}

	// Aggregation pipeline
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$project", Value: bson.M{
			"_id":        1,
			"chat_id":    1,
			"user_id":    1,
			"title":      1,
			"status":     1,
			"created_at": 1,
			"updated_at": 1,
			"last_message": bson.M{
				"$arrayElemAt": bson.A{"$messages.text", -1},
			},
			"message_count": bson.M{"$size": "$messages"},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: sortField, Value: sortOrder}}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search chats: %w", err)
	}
	defer cursor.Close(ctx)

	var sessions []models.ChatSession
	if err = cursor.All(ctx, &sessions); err != nil {
		return nil, 0, fmt.Errorf("failed to decode search results: %w", err)
	}

	// Get total count
	totalCount, err := s.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count search results: %w", err)
	}

	return sessions, totalCount, nil
}

// UpdateChatStatus updates the status of a chat
func (s *ChatService) UpdateChatStatus(ctx context.Context, chatID string, status string) error {
	result, err := s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)

	if err != nil {
		return fmt.Errorf("failed to update chat status: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("chat not found")
	}

	return nil
}

// DeleteChat soft deletes a chat
func (s *ChatService) DeleteChat(ctx context.Context, chatID string) error {
	return s.UpdateChatStatus(ctx, chatID, "deleted")
}

// TrackProductClick tracks when a user clicks a recommended product
func (s *ChatService) TrackProductClick(ctx context.Context, chatID string, productID string) error {
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		bson.M{
			"$addToSet": bson.M{
				"metadata.products_clicked": productID,
			},
			"$set": bson.M{
				"updated_at": time.Now(),
			},
		},
	)

	if err != nil {
		return fmt.Errorf("failed to track product click: %w", err)
	}

	return nil
}

// TrackConversion marks that a user made a purchase from this chat
func (s *ChatService) TrackConversion(ctx context.Context, chatID string) error {
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		bson.M{
			"$set": bson.M{
				"metadata.conversion_occurred": true,
				"updated_at":                   time.Now(),
			},
		},
	)

	if err != nil {
		return fmt.Errorf("failed to track conversion: %w", err)
	}

	return nil
}

// SetAutoExpiry sets expiry date for a chat (for GDPR compliance)
func (s *ChatService) SetAutoExpiry(ctx context.Context, chatID string, days int) error {
	expiresAt := time.Now().AddDate(0, 0, days)

	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"chat_id": chatID},
		bson.M{
			"$set": bson.M{
				"expires_at": expiresAt,
				"updated_at": time.Now(),
			},
		},
	)

	return err
}

// CleanupExpiredChats deletes expired chats
func (s *ChatService) CleanupExpiredChats(ctx context.Context) (int64, error) {
	filter := bson.M{
		"expires_at": bson.M{"$lte": time.Now()},
		"status":     bson.M{"$ne": "deleted"},
	}

	result, err := s.collection.DeleteMany(ctx, filter)
	if err != nil {
		log.Printf("Error cleaning up expired chats: %v", err)
		return 0, err
	}

	log.Printf("Deleted %d expired chats", result.DeletedCount)
	return result.DeletedCount, nil
}

// LinkChatToUser links an anonymous chat to a user account
func (s *ChatService) LinkChatToUser(ctx context.Context, chatID string, userID primitive.ObjectID) error {
	filter := bson.M{"chat_id": chatID}
	update := bson.M{
		"$set": bson.M{
			"user_id":    userID,
			"updated_at": time.Now(),
		},
	}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("chat not found")
	}

	log.Printf("Linked chat %s to user %s", chatID, userID.Hex())
	return nil
}

// GetAnalytics generates analytics for a time period
func (s *ChatService) GetAnalytics(ctx context.Context, fromDate, toDate time.Time) (*models.ChatAnalytics, error) {
	matchFilter := bson.M{
		"created_at": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
		"status": bson.M{"$ne": "deleted"},
	}

	// Total chats
	totalChats, err := s.collection.CountDocuments(ctx, matchFilter)
	if err != nil {
		return nil, err
	}

	// Aggregations for detailed metrics
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchFilter}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"total_messages": bson.M{"$sum": "$metadata.total_messages"},
			"total_products_recommended": bson.M{"$sum": "$metadata.products_recommended"},
			"total_products_clicked": bson.M{"$sum": bson.M{"$size": "$metadata.products_clicked"}},
			"total_response_time": bson.M{"$sum": "$metadata.avg_response_time"},
			"conversions": bson.M{"$sum": bson.M{"$cond": bson.A{"$metadata.conversion_occurred", 1, 0}}},
			"avg_sentiment": bson.M{"$avg": "$metadata.sentiment_score"},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var result struct {
		TotalMessages             int64   `bson:"total_messages"`
		TotalProductsRecommended  int64   `bson:"total_products_recommended"`
		TotalProductsClicked      int64   `bson:"total_products_clicked"`
		TotalResponseTime         float64 `bson:"total_response_time"`
		Conversions               int64   `bson:"conversions"`
		AvgSentiment              float64 `bson:"avg_sentiment"`
	}

	if cursor.Next(ctx) {
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
	}

	analytics := &models.ChatAnalytics{
		TotalChats:                totalChats,
		TotalMessages:             result.TotalMessages,
		AverageMessagesPerChat:    float64(result.TotalMessages) / float64(totalChats),
		AverageResponseTime:       result.TotalResponseTime / float64(totalChats),
		TotalProductsRecommended:  result.TotalProductsRecommended,
		TotalProductsClicked:      result.TotalProductsClicked,
		Period:                    "custom",
	}

	// Calculate rates
	if result.TotalProductsRecommended > 0 {
		analytics.ClickThroughRate = float64(result.TotalProductsClicked) / float64(result.TotalProductsRecommended) * 100
	}

	if totalChats > 0 {
		analytics.ConversionRate = float64(result.Conversions) / float64(totalChats) * 100
	}

	// Get top intents
	analytics.TopIntents, _ = s.getTopIntents(ctx, fromDate, toDate)

	// Get peak hours
	analytics.PeakHours, _ = s.getPeakHours(ctx, fromDate, toDate)

	// Get device breakdown
	analytics.DeviceBreakdown, _ = s.getDeviceBreakdown(ctx, fromDate, toDate)

	return analytics, nil
}

func (s *ChatService) getTopIntents(ctx context.Context, fromDate, toDate time.Time) ([]models.IntentCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": fromDate, "$lte": toDate},
		}}},
		{{Key: "$unwind", Value: "$messages"}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$messages.intent",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "count", Value: -1}}}},
		{{Key: "$limit", Value: 10}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.IntentCount
	for cursor.Next(ctx) {
		var item struct {
			Intent string `bson:"_id"`
			Count  int64  `bson:"count"`
		}
		if err := cursor.Decode(&item); err != nil {
			continue
		}
		if item.Intent != "" {
			results = append(results, models.IntentCount{
				Intent: item.Intent,
				Count:  item.Count,
			})
		}
	}

	return results, nil
}

func (s *ChatService) getPeakHours(ctx context.Context, fromDate, toDate time.Time) ([]models.HourCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": fromDate, "$lte": toDate},
		}}},
		{{Key: "$unwind", Value: "$messages"}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{"$hour": "$messages.timestamp"},
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.HourCount
	for cursor.Next(ctx) {
		var item struct {
			Hour  int   `bson:"_id"`
			Count int64 `bson:"count"`
		}
		if err := cursor.Decode(&item); err != nil {
			continue
		}
		results = append(results, models.HourCount{
			Hour:  item.Hour,
			Count: item.Count,
		})
	}

	return results, nil
}

func (s *ChatService) getDeviceBreakdown(ctx context.Context, fromDate, toDate time.Time) ([]models.DeviceCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"created_at": bson.M{"$gte": fromDate, "$lte": toDate},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$metadata.device_type",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "count", Value: -1}}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.DeviceCount
	for cursor.Next(ctx) {
		var item struct {
			Device string `bson:"_id"`
			Count  int64  `bson:"count"`
		}
		if err := cursor.Decode(&item); err != nil {
			continue
		}
		if item.Device != "" {
			results = append(results, models.DeviceCount{
				Device: item.Device,
				Count:  item.Count,
			})
		}
	}

	return results, nil
}

// CreateIndexes creates necessary database indexes for chats
func (s *ChatService) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "chat_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "created_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "updated_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0),
		},
		{
			Keys: bson.D{{Key: "messages.text", Value: "text"}, {Key: "title", Value: "text"}},
		},
		{
			Keys: bson.D{{Key: "tags", Value: 1}},
		},
	}

	_, err := s.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
