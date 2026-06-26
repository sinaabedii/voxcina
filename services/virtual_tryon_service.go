package services

import (
	"context"
	"errors"
	"time"

	"backEnd/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type VirtualTryonService struct {
	collection *mongo.Collection
}

func NewVirtualTryonService(db *mongo.Database) *VirtualTryonService {
	return &VirtualTryonService{collection: db.Collection("virtual_tryons")}
}

func (s *VirtualTryonService) Create(ctx context.Context, t *models.VirtualTryon) error {
	if t.ID.IsZero() {
		t.ID = primitive.NewObjectID()
	}
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now()
	}
	if t.Status == "" {
		t.Status = models.TryonStatusProcessing
	}
	_, err := s.collection.InsertOne(ctx, t)
	return err
}

func (s *VirtualTryonService) GetByTryonID(ctx context.Context, tryonID string) (*models.VirtualTryon, error) {
	var t models.VirtualTryon
	if err := s.collection.FindOne(ctx, bson.M{"tryon_id": tryonID}).Decode(&t); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (s *VirtualTryonService) GetByTaskID(ctx context.Context, taskID string) (*models.VirtualTryon, error) {
	var t models.VirtualTryon
	if err := s.collection.FindOne(ctx, bson.M{"task_id": taskID}).Decode(&t); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (s *VirtualTryonService) UpdateStatus(ctx context.Context, tryonID, status string) error {
	update := bson.M{"$set": bson.M{"status": status, "updated_at": time.Now()}}
	_, err := s.collection.UpdateOne(ctx, bson.M{"tryon_id": tryonID}, update)
	return err
}

func (s *VirtualTryonService) Complete(ctx context.Context, tryonID, resultImageURL, modelUsed, promptText string, durationMs int64) error {
	now := time.Now()
	_, err := s.collection.UpdateOne(ctx, bson.M{"tryon_id": tryonID}, bson.M{
		"$set": bson.M{
			"status":          models.TryonStatusDone,
			"result_image_url": resultImageURL,
			"model_used":      modelUsed,
			"prompt_text":     promptText,
			"duration_ms":     durationMs,
			"completed_at":    now,
		},
	})
	return err
}

func (s *VirtualTryonService) Fail(ctx context.Context, tryonID, errMsg string, durationMs int64) error {
	now := time.Now()
	_, err := s.collection.UpdateOne(ctx, bson.M{"tryon_id": tryonID}, bson.M{
		"$set": bson.M{
			"status":       models.TryonStatusError,
			"error":        errMsg,
			"duration_ms":  durationMs,
			"completed_at": now,
		},
	})
	return err
}

func (s *VirtualTryonService) ListByUser(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]models.VirtualTryon, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	skip := int64((page - 1) * limit)
	filter := bson.M{"user_id": userID}

	total, err := s.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cur, err := s.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.VirtualTryon
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (s *VirtualTryonService) ListByChat(ctx context.Context, userID primitive.ObjectID, tryonIDs []string) ([]models.VirtualTryon, error) {
	if len(tryonIDs) == 0 {
		return []models.VirtualTryon{}, nil
	}
	cur, err := s.collection.Find(ctx, bson.M{
		"user_id":   userID,
		"tryon_id":  bson.M{"$in": tryonIDs},
	})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []models.VirtualTryon
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *VirtualTryonService) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "tryon_id", Value: 1}}, Options: options.Index().SetUnique(true).SetName("tryon_id_unique")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("user_history")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "garment_product_id", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("user_product_history")},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "person_image_hash", Value: 1}}, Options: options.Index().SetName("user_person_dedup").SetSparse(true)},
		{Keys: bson.D{{Key: "task_id", Value: 1}}, Options: options.Index().SetName("task_lookup").SetSparse(true)},
	}
	_, err := s.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
