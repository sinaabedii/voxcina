package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// BlogRepository provides CRUD operations for all blog-related collections.
type BlogRepository struct {
	db *mongo.Database
}

// NewBlogRepository creates a new BlogRepository.
func NewBlogRepository(db *mongo.Database) *BlogRepository {
	return &BlogRepository{db: db}
}

// ---------- blog_posts ----------

// FindPublishedPosts returns paginated published+active blog posts with public projection.
func (r *BlogRepository) FindPublishedPosts(ctx context.Context, page, limit int64, category, tag, search string) ([]models.BlogPost, int64, error) {
	collection := r.db.Collection("blog_posts")

	filter := bson.M{
		"status":    models.StatusPublished,
		"is_active": true,
	}

	if category != "" {
		filter["category"] = bson.M{"$regex": category, "$options": "i"}
	}
	if tag != "" {
		filter["tags"] = bson.M{"$in": []string{tag}}
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": search, "$options": "i"}},
			{"excerpt": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.D{{Key: "published_at", Value: -1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []models.BlogPost
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}
	if posts == nil {
		posts = []models.BlogPost{}
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return posts, total, nil
}

// FindPostBySlug returns a published post with full blocks and media.
func (r *BlogRepository) FindPostBySlug(ctx context.Context, slug string) (*models.BlogPost, error) {
	collection := r.db.Collection("blog_posts")
	var post models.BlogPost
	err := collection.FindOne(ctx, bson.M{
		"slug":    slug,
		"status":  models.StatusPublished,
		"is_active": true,
	}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// FindPostByID returns a post by its ObjectID (admin use).
func (r *BlogRepository) FindPostByID(ctx context.Context, id primitive.ObjectID) (*models.BlogPost, error) {
	collection := r.db.Collection("blog_posts")
	var post models.BlogPost
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// FindPostByPipelineRunID returns a post linked to a pipeline run.
func (r *BlogRepository) FindPostByPipelineRunID(ctx context.Context, runID primitive.ObjectID) (*models.BlogPost, error) {
	collection := r.db.Collection("blog_posts")
	var post models.BlogPost
	err := collection.FindOne(ctx, bson.M{"pipeline_run_id": runID.Hex()}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// InsertPost inserts a new blog post.
func (r *BlogRepository) InsertPost(ctx context.Context, post *models.BlogPost) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.InsertOne(ctx, post)
	return err
}

// UpdatePost updates a blog post by ID with the given $set fields.
func (r *BlogRepository) UpdatePost(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// DeletePostByID soft-deletes a post (sets is_active=false).
func (r *BlogRepository) DeletePostByID(ctx context.Context, id primitive.ObjectID) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{"is_active": false, "updated_at": time.Now()},
	})
	return err
}

// GetDistinctCategories returns distinct categories from published posts.
func (r *BlogRepository) GetDistinctCategories(ctx context.Context) ([]interface{}, error) {
	return r.db.Collection("blog_posts").Distinct(ctx, "category", bson.M{
		"status":    models.StatusPublished,
		"is_active": true,
		"category":  bson.M{"$ne": ""},
	})
}

// GetDistinctTags returns distinct tags from published posts.
func (r *BlogRepository) GetDistinctTags(ctx context.Context) ([]interface{}, error) {
	collection := r.db.Collection("blog_posts")
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"status": models.StatusPublished, "is_active": true}}},
		{{Key: "$unwind", Value: "$tags"}},
		{{Key: "$group", Value: bson.M{"_id": "$tags"}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var result []bson.M
	if err := cursor.All(ctx, &result); err != nil {
		return nil, err
	}
	var tags []interface{}
	for _, item := range result {
		if tag, ok := item["_id"].(string); ok && tag != "" {
			tags = append(tags, tag)
		}
	}
	if tags == nil {
		tags = []interface{}{}
	}
	return tags, nil
}

// AtomicStatusTransition atomically transitions a post's status if currently in `fromStatus`.
func (r *BlogRepository) AtomicStatusTransition(ctx context.Context, id primitive.ObjectID, fromStatus, toStatus string) (bool, error) {
	collection := r.db.Collection("blog_posts")
	result, err := collection.UpdateOne(ctx, bson.M{
		"_id":    id,
		"status": fromStatus,
	}, bson.M{
		"$set": bson.M{"status": toStatus, "updated_at": time.Now()},
	})
	if err != nil {
		return false, err
	}
	return result.ModifiedCount > 0, nil
}

// ---------- blog_pipeline_runs ----------

// InsertPipelineRun inserts a new pipeline run.
func (r *BlogRepository) InsertPipelineRun(ctx context.Context, run *models.BlogPipelineRun) error {
	collection := r.db.Collection("blog_pipeline_runs")
	_, err := collection.InsertOne(ctx, run)
	return err
}

// FindPipelineRunByID returns a pipeline run by ID.
func (r *BlogRepository) FindPipelineRunByID(ctx context.Context, id primitive.ObjectID) (*models.BlogPipelineRun, error) {
	collection := r.db.Collection("blog_pipeline_runs")
	var run models.BlogPipelineRun
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&run)
	if err != nil {
		return nil, err
	}
	return &run, nil
}

// UpdatePipelineRun updates a pipeline run by ID.
func (r *BlogRepository) UpdatePipelineRun(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	collection := r.db.Collection("blog_pipeline_runs")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// ListPipelineRuns returns paginated pipeline runs.
func (r *BlogRepository) ListPipelineRuns(ctx context.Context, page, limit int64) ([]models.BlogPipelineRun, int64, error) {
	collection := r.db.Collection("blog_pipeline_runs")
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)
	var runs []models.BlogPipelineRun
	if err := cursor.All(ctx, &runs); err != nil {
		return nil, 0, err
	}
	if runs == nil {
		runs = []models.BlogPipelineRun{}
	}
	total, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}
	return runs, total, nil
}

// ---------- blog_agent_executions ----------

// InsertExecution appends a new agent execution record.
func (r *BlogRepository) InsertExecution(ctx context.Context, exec *models.BlogAgentExecution) error {
	collection := r.db.Collection("blog_agent_executions")
	_, err := collection.InsertOne(ctx, exec)
	return err
}

// FindExecutionsByRunID returns all executions for a pipeline run.
func (r *BlogRepository) FindExecutionsByRunID(ctx context.Context, runID primitive.ObjectID) ([]models.BlogAgentExecution, error) {
	collection := r.db.Collection("blog_agent_executions")
	cursor, err := collection.Find(ctx, bson.M{"pipeline_run_id": runID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var execs []models.BlogAgentExecution
	if err := cursor.All(ctx, &execs); err != nil {
		return nil, err
	}
	if execs == nil {
		execs = []models.BlogAgentExecution{}
	}
	return execs, nil
}

// FindPendingExecution returns the next pending execution to lease.
func (r *BlogRepository) FindPendingExecution(ctx context.Context, stage string) (*models.BlogAgentExecution, error) {
	collection := r.db.Collection("blog_agent_executions")
	var exec models.BlogAgentExecution
	err := collection.FindOne(ctx, bson.M{
		"stage":  stage,
		"status": "pending",
	}).Decode(&exec)
	if err != nil {
		return nil, err
	}
	return &exec, nil
}

// LeaseExecution atomically claims a pending execution for processing.
func (r *BlogRepository) LeaseExecution(ctx context.Context, id primitive.ObjectID, workerID string) (*models.BlogAgentExecution, error) {
	collection := r.db.Collection("blog_agent_executions")
	var exec models.BlogAgentExecution
	now := time.Now()
	err := collection.FindOneAndUpdate(ctx,
		bson.M{"_id": id, "status": "pending"},
		bson.M{
			"$set": bson.M{
				"status":      "processing",
				"lease_info":  workerID,
				"started_at":  now,
				"updated_at":  now,
			},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&exec)
	if err != nil {
		return nil, err
	}
	return &exec, nil
}

// CompleteExecution marks an execution as completed or failed.
func (r *BlogRepository) CompleteExecution(ctx context.Context, id primitive.ObjectID, status, error string, durationMs int64, parsedOutput, rawResponse, promptKey, promptVersion, provider, model string, tokenUsage int, costMetadata string) error {
	collection := r.db.Collection("blog_agent_executions")
	now := time.Now()
	set := bson.M{
		"status":        status,
		"completed_at":  now,
		"duration_ms":   durationMs,
		"updated_at":    now,
	}
	if error != "" {
		set["error"] = error
	}
	if parsedOutput != "" {
		set["parsed_output"] = parsedOutput
	}
	if rawResponse != "" {
		set["raw_response"] = rawResponse
	}
	if promptKey != "" {
		set["prompt_key"] = promptKey
	}
	if promptVersion != "" {
		set["prompt_version"] = promptVersion
	}
	if provider != "" {
		set["provider"] = provider
	}
	if model != "" {
		set["model"] = model
	}
	if tokenUsage > 0 {
		set["token_usage"] = tokenUsage
	}
	if costMetadata != "" {
		set["cost_metadata"] = costMetadata
	}
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// IncrementRetryCount increments the retry counter and resets status to pending.
func (r *BlogRepository) IncrementRetryCount(ctx context.Context, id primitive.ObjectID) error {
	collection := r.db.Collection("blog_agent_executions")
	now := time.Now()
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$inc": bson.M{"retry_count": 1},
		"$set": bson.M{
			"status":     "pending",
			"lease_info": "",
			"started_at": nil,
			"updated_at": now,
		},
	})
	return err
}

// ExpireStaleLeases releases all executions leased by workers that are no longer alive.
func (r *BlogRepository) ExpireStaleLeases(ctx context.Context, maxIdle time.Duration) (int64, error) {
	collection := r.db.Collection("blog_agent_executions")
	cutoff := time.Now().Add(-maxIdle)
	result, err := collection.UpdateMany(ctx, bson.M{
		"status":     "processing",
		"started_at": bson.M{"$lt": cutoff},
	}, bson.M{
		"$set": bson.M{
			"status":     "pending",
			"lease_info": "",
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		return 0, err
	}
	return result.ModifiedCount, nil
}

// ---------- blog_research_sources ----------

// InsertResearchSource adds a new research source.
func (r *BlogRepository) InsertResearchSource(ctx context.Context, src *models.BlogResearchSource) error {
	collection := r.db.Collection("blog_research_sources")
	_, err := collection.InsertOne(ctx, src)
	return err
}

// FindSourcesByRunID returns all research sources for a pipeline run.
func (r *BlogRepository) FindSourcesByRunID(ctx context.Context, runID primitive.ObjectID) ([]models.BlogResearchSource, error) {
	collection := r.db.Collection("blog_research_sources")
	cursor, err := collection.Find(ctx, bson.M{"pipeline_run_id": runID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var sources []models.BlogResearchSource
	if err := cursor.All(ctx, &sources); err != nil {
		return nil, err
	}
	if sources == nil {
		sources = []models.BlogResearchSource{}
	}
	return sources, nil
}

// ---------- blog_media ----------

// InsertMedia adds a new media record.
func (r *BlogRepository) InsertMedia(ctx context.Context, media *models.BlogMedia) error {
	collection := r.db.Collection("blog_media")
	_, err := collection.InsertOne(ctx, media)
	return err
}

// FindMediaByPostID returns all media for a blog post.
func (r *BlogRepository) FindMediaByPostID(ctx context.Context, postID primitive.ObjectID) ([]models.BlogMedia, error) {
	collection := r.db.Collection("blog_media")
	cursor, err := collection.Find(ctx, bson.M{"post_id": postID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var medias []models.BlogMedia
	if err := cursor.All(ctx, &medias); err != nil {
		return nil, err
	}
	if medias == nil {
		medias = []models.BlogMedia{}
	}
	return medias, nil
}

// FindMediaByPostIDAndSlot returns a specific media asset.
func (r *BlogRepository) FindMediaByPostIDAndSlot(ctx context.Context, postID primitive.ObjectID, slot string) (*models.BlogMedia, error) {
	collection := r.db.Collection("blog_media")
	var media models.BlogMedia
	err := collection.FindOne(ctx, bson.M{"post_id": postID, "slot": slot}).Decode(&media)
	if err != nil {
		return nil, err
	}
	return &media, nil
}

// UpdateMedia updates a media record by ID.
func (r *BlogRepository) UpdateMedia(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	collection := r.db.Collection("blog_media")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// DeleteMediaByID removes a media record.
func (r *BlogRepository) DeleteMediaByID(ctx context.Context, id primitive.ObjectID) (bool, error) {
	collection := r.db.Collection("blog_media")
	result, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return false, err
	}
	return result.DeletedCount > 0, nil
}

// FindMediaByPostIDAndSlotID returns media by post ID and image slot ID (UUID).
func (r *BlogRepository) FindMediaByPostIDAndSlotID(ctx context.Context, postID primitive.ObjectID, slotID string) (*models.BlogMedia, error) {
	collection := r.db.Collection("blog_media")
	var media models.BlogMedia
	err := collection.FindOne(ctx, bson.M{"post_id": postID, "slot": slotID}).Decode(&media)
	if err != nil {
		return nil, err
	}
	return &media, nil
}

// ---------- helpers ----------

// ComputeContentHash computes a SHA-256 hash from the serialized blocks.
func ComputeContentHash(blocks []models.BlogBlock) string {
	data, _ := json.Marshal(blocks)
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

// ValidateStatusTransition checks if a status transition is allowed.
func ValidateStatusTransition(from, to string) error {
	validTransitions := map[string][]string{
		models.StatusDraft:             {models.StatusResearchReview, models.StatusContentReview, models.StatusImagePending, models.StatusReady, models.StatusPublished, models.StatusArchived},
		models.StatusResearchReview:    {models.StatusContentReview, models.StatusImagePending, models.StatusReady, models.StatusPublished, models.StatusArchived, models.StatusDraft},
		models.StatusContentReview:     {models.StatusImagePending, models.StatusReady, models.StatusPublished, models.StatusArchived, models.StatusResearchReview, models.StatusDraft},
		models.StatusImagePending:      {models.StatusReady, models.StatusContentReview, models.StatusPublished, models.StatusArchived, models.StatusDraft},
		models.StatusReady:             {models.StatusPublished, models.StatusArchived, models.StatusContentReview, models.StatusDraft},
		models.StatusPublished:         {models.StatusArchived, models.StatusReady, models.StatusContentReview, models.StatusDraft},
		models.StatusArchived:          {models.StatusDraft, models.StatusReady},
	}
	allowed, ok := validTransitions[from]
	if !ok {
		return fmt.Errorf("unknown status: %s", from)
	}
	for _, a := range allowed {
		if a == to {
			return nil
		}
	}
	return fmt.Errorf("invalid status transition: %s -> %s", from, to)
}

// CountWords counts whitespace-separated words in a string.
func CountWords(s string) int {
	return len(strings.Fields(s))
}
