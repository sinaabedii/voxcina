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

// CheckoutChatService persists the discount-negotiation transcript shown on
// the checkout page. It mirrors TryonChatService's shape but is scoped to a
// user/cart negotiation rather than a fitting room, so the two flows stay
// independent collections.
type CheckoutChatService struct {
	collection *mongo.Collection
}

func NewCheckoutChatService(db *mongo.Database) *CheckoutChatService {
	return &CheckoutChatService{collection: db.Collection("checkout_chats")}
}

func (s *CheckoutChatService) GetByChatID(ctx context.Context, chatID string) (*models.CheckoutChat, error) {
	var c models.CheckoutChat
	if err := s.collection.FindOne(ctx, bson.M{"chat_id": chatID}).Decode(&c); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// AppendMessages upserts the chat document on the first call for a chat_id,
// exactly like TryonChatService.AppendMessages — no separate "create session"
// step is needed.
func (s *CheckoutChatService) AppendMessages(ctx context.Context, chatID string, messages []models.CheckoutChatMessage, userID primitive.ObjectID) error {
	now := time.Now()
	filter := bson.M{"chat_id": chatID}
	var userCount, agentCount int
	for _, m := range messages {
		switch m.Role {
		case models.CheckoutChatRoleUser:
			userCount++
		case models.CheckoutChatRoleAgent:
			agentCount++
		}
	}
	inc := bson.M{"metadata.total_messages": len(messages)}
	if userCount > 0 {
		inc["metadata.user_messages"] = userCount
	}
	if agentCount > 0 {
		inc["metadata.agent_messages"] = agentCount
	}

	title := ""
	for _, m := range messages {
		if m.Role == models.CheckoutChatRoleUser && m.Content != "" {
			t := strings.TrimSpace(m.Content)
			if len(t) > 50 {
				t = t[:47] + "..."
			}
			title = t
			break
		}
	}
	setOnInsert := bson.M{
		"created_at": now,
		"user_id":    userID,
		"status":     models.CheckoutChatStatusActive,
	}
	if title != "" {
		setOnInsert["title"] = title
	} else {
		setOnInsert["title"] = "چت تخفیف تسویه حساب"
	}

	update := bson.M{
		"$push":        bson.M{"messages": bson.M{"$each": messages}},
		"$set":         bson.M{"updated_at": now},
		"$inc":         inc,
		"$setOnInsert": setOnInsert,
	}

	_, err := s.collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (s *CheckoutChatService) AddCouponCode(ctx context.Context, chatID string, code string) error {
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID}, bson.M{
		"$addToSet": bson.M{"metadata.coupons_offered": code},
		"$set":      bson.M{"updated_at": time.Now()},
	})
	return err
}

func (s *CheckoutChatService) Delete(ctx context.Context, chatID string, userID primitive.ObjectID) error {
	_, err := s.collection.UpdateOne(ctx, bson.M{"chat_id": chatID, "user_id": userID}, bson.M{
		"$set": bson.M{
			"status":     models.CheckoutChatStatusDeleted,
			"updated_at": time.Now(),
		},
	})
	return err
}

func (s *CheckoutChatService) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "chat_id", Value: 1}}, Options: options.Index().SetUnique(true).SetName("chat_id_unique")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "updated_at", Value: -1}}, Options: options.Index().SetName("user_sessions")},
	}
	_, err := s.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
