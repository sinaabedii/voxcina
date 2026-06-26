package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"backEnd/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TryonChatService struct {
	collection *mongo.Collection
}

func NewTryonChatService(db *mongo.Database) *TryonChatService {
	return &TryonChatService{collection: db.Collection("tryon_chats")}
}

func (s *TryonChatService) Upsert(ctx context.Context, chat *models.TryonChat) error {
	if chat.Status == "" {
		chat.Status = models.TryonChatStatusActive
	}
	now := time.Now()
	chat.UpdatedAt = now
	if chat.CreatedAt.IsZero() {
		chat.CreatedAt = now
	}
	if chat.Metadata.FirstMessageAt.IsZero() && len(chat.Messages) > 0 {
		chat.Metadata.FirstMessageAt = chat.Messages[0].Timestamp
	}
	chat.Metadata.LastMessageAt = now
	chat.Metadata.TotalMessages = len(chat.Messages)
	if chat.Title == "" {
		for _, m := range chat.Messages {
			if m.Role == models.TryonChatRoleUser && m.Content != "" {
				t := strings.TrimSpace(m.Content)
				if len(t) > 50 {
					t = t[:47] + "..."
				}
				chat.Title = t
				break
			}
		}
		if chat.Title == "" {
			chat.Title = "اتاق پرو مجازی"
		}
	}
	if len(chat.TryonIDs) == 0 {
		chat.TryonIDs = []string{}
	}
	if len(chat.Metadata.CouponsOffered) == 0 {
		chat.Metadata.CouponsOffered = []string{}
	}
	if len(chat.Metadata.ProductsRecommended) == 0 {
		chat.Metadata.ProductsRecommended = []string{}
	}

	filter := bson.M{"chat_id": chat.ChatID}
	update := bson.M{
		"$set": chat,
		"$setOnInsert": bson.M{
			"created_at": chat.CreatedAt,
		},
	}
	_, err := s.collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (s *TryonChatService) GetByChatID(ctx context.Context, chatID string) (*models.TryonChat, error) {
	var c models.TryonChat
	if err := s.collection.FindOne(ctx, bson.M{"chat_id": chatID}).Decode(&c); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (s *TryonChatService) AppendMessages(ctx context.Context, chatID string, messages []models.TryonChatMessage, userID primitive.ObjectID) error {
	now := time.Now()
	doc := bson.M{
		"chat_id":  chatID,
		"user_id":  userID,
		"status":   models.TryonChatStatusActive,
		"updated_at": now,
	}
	for _, m := range messages {
		doc["messages"] = bson.M{"$each": []models.TryonChatMessage{m}}
		break
	}

	filter := bson.M{"chat_id": chatID}
	update := bson.M{
		"$push": bson.M{"messages": bson.M{"$each": messages}},
		"$set": bson.M{
			"updated_at": now,
		},
		"$inc": bson.M{
			"metadata.total_messages": len(messages),
		},
		"$setOnInsert": bson.M{
			"created_at": now,
			"user_id":    userID,
			"status":     models.TryonChatStatusActive,
			"tryon_ids":  []string{},
		},
	}

	for _, m := range messages {
		switch m.Role {
		case models.TryonChatRoleUser:
			update["$inc"].(bson.M)["metadata.user_messages"] = 1
		case models.TryonChatRoleAgent:
			update["$inc"].(bson.M)["metadata.agent_messages"] = 1
			if m.ToolCall != nil {
				update["$inc"].(bson.M)["metadata.tool_messages"] = 1
			}
		case models.TryonChatRoleTool:
			update["$inc"].(bson.M)["metadata.tool_messages"] = 1
		case models.TryonChatRoleTryon:
			update["$inc"].(bson.M)["metadata.tryon_messages"] = 1
		}
	}

	_, err := s.collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (s *TryonChatService) LinkTryon(ctx context.Context, chatID string, userID primitive.ObjectID, tryonID string) error {
	filter := bson.M{"chat_id": chatID, "user_id": userID}
	update := bson.M{
		"$addToSet": bson.M{"tryon_ids": tryonID},
		"$set":      bson.M{"updated_at": time.Now()},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
			"user_id":    userID,
			"status":     models.TryonChatStatusActive,
			"messages":   []models.TryonChatMessage{},
		},
	}
	_, err := s.collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (s *TryonChatService) AddCouponCode(ctx context.Context, chatID string, code string) error {
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID}, bson.M{
		"$addToSet": bson.M{"metadata.coupons_offered": code},
		"$set":      bson.M{"updated_at": time.Now()},
	})
	return err
}

func (s *TryonChatService) AddRecommendedProduct(ctx context.Context, chatID string, productID string) error {
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID}, bson.M{
		"$addToSet": bson.M{"metadata.products_recommended": productID},
		"$set":      bson.M{"updated_at": time.Now()},
	})
	return err
}

func (s *TryonChatService) UpdateMetadataTiming(ctx context.Context, chatID string) error {
	now := time.Now()
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID}, bson.M{
		"$set": bson.M{
			"metadata.last_message_at": now,
			"updated_at":               now,
		},
	})
	return err
}

func (s *TryonChatService) SetDeviceInfo(ctx context.Context, chatID string, deviceType, browser, os string) error {
	set := bson.M{"updated_at": time.Now()}
	if deviceType != "" {
		set["metadata.device_type"] = deviceType
	}
	if browser != "" {
		set["metadata.browser"] = browser
	}
	if os != "" {
		set["metadata.os"] = os
	}
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID}, bson.M{"$set": set})
	return err
}

func (s *TryonChatService) Delete(ctx context.Context, chatID string, userID primitive.ObjectID) error {
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID, "user_id": userID}, bson.M{
		"$set": bson.M{
			"status":     models.TryonChatStatusDeleted,
			"updated_at": time.Now(),
		},
	})
	return err
}

func (s *TryonChatService) ListSessionsByUser(ctx context.Context, userID primitive.ObjectID, page, limit int, includeArchived bool) ([]models.TryonChatSession, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	skip := int64((page - 1) * limit)

	filter := bson.M{"user_id": userID}
	if !includeArchived {
		filter["status"] = models.TryonChatStatusActive
	} else {
		filter["status"] = bson.M{"$ne": models.TryonChatStatusDeleted}
	}

	total, err := s.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$project", Value: bson.M{
			"_id":             1,
			"chat_id":         1,
			"user_id":         1,
			"title":           1,
			"status":          1,
			"created_at":      1,
			"updated_at":      1,
			"tryon_count":     bson.M{"$size": bson.M{"$ifNull": []interface{}{"$tryon_ids", []string{}}}},
			"message_count":   bson.M{"$size": bson.M{"$ifNull": []interface{}{"$messages", []models.TryonChatMessage{}}}},
			"last_message":    bson.M{"$arrayElemAt": []interface{}{"$messages.content", -1}},
			"last_message_at": "$metadata.last_message_at",
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "updated_at", Value: -1}}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: int64(limit)}},
	}

	cur, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.TryonChatSession
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (s *TryonChatService) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "chat_id", Value: 1}}, Options: options.Index().SetUnique(true).SetName("chat_id_unique")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "updated_at", Value: -1}}, Options: options.Index().SetName("user_sessions")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "status", Value: 1}, {Key: "updated_at", Value: -1}}, Options: options.Index().SetName("user_status_sessions")},
		{Keys: bson.D{{Key: "tryon_ids", Value: 1}}, Options: options.Index().SetName("tryon_link").SetSparse(true)},
		{Keys: bson.D{{Key: "messages.content", Value: "text"}, {Key: "title", Value: "text"}}, Options: options.Index().SetName("fulltext")},
	}
	_, err := s.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
