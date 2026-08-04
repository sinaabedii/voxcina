package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
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

// InsertPost inserts a new blog post.
func (r *BlogRepository) InsertPost(ctx context.Context, post *models.BlogPost) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.InsertOne(ctx, post)
	return err
}

// InsertBlogPost inserts a new blog post, retrying with a short unique suffix
// if the generated slug collides with an existing post (e.g. two posts about
// the same or a similarly-titled topic).
func (r *BlogRepository) InsertBlogPost(ctx context.Context, post *models.BlogPost) error {
	baseSlug := post.Slug
	for attempt := 0; attempt < 5; attempt++ {
		err := r.InsertPost(ctx, post)
		if err == nil {
			return nil
		}
		if !mongo.IsDuplicateKeyError(err) {
			return err
		}
		post.ID = primitive.NewObjectID()
		post.Slug = fmt.Sprintf("%s-%s", baseSlug, post.ID.Hex()[len(post.ID.Hex())-6:])
	}
	return fmt.Errorf("failed to insert blog post: slug %q still colliding after retries", baseSlug)
}

// UpdateBlogPost updates all mutable fields of a blog post by ID.
func (r *BlogRepository) UpdateBlogPost(ctx context.Context, post *models.BlogPost) error {
	set := bson.M{
		"title":           post.Title,
		"slug":            post.Slug,
		"excerpt":         post.Excerpt,
		"blocks":          post.Blocks,
		"cover_image_id":  post.CoverImageID,
		"category":        post.Category,
		"tags":            post.Tags,
		"status":          post.Status,
		"pipeline_run_id": post.PipelineRunID,
		"author_snapshot": post.AuthorSnapshot,
		"read_time":       post.ReadTime,
		"updated_at":      post.UpdatedAt,
	}
	if post.PublishedAt != nil {
		set["published_at"] = post.PublishedAt
	}
	return r.UpdatePost(ctx, post.ID, set)
}

// GetBlogPostByID is an alias for FindPostByID used by the workflow.
func (r *BlogRepository) GetBlogPostByID(ctx context.Context, id primitive.ObjectID) (*models.BlogPost, error) {
	return r.FindPostByID(ctx, id)
}

// PublishMedia moves all media for a post into the published state.
func (r *BlogRepository) PublishMedia(ctx context.Context, postID primitive.ObjectID) error {
	media, err := r.FindMediaByPostID(ctx, postID)
	if err != nil {
		return err
	}
	for _, m := range media {
		now := time.Now()
		if err := r.UpdateMedia(ctx, m.ID, bson.M{
			"public_path":  m.FilePath,
			"published_at": &now,
			"updated_at":   now,
		}); err != nil {
			log.Printf("[blog] Warning: failed to publish media %s: %v", m.ID.Hex(), err)
		}
	}
	return nil
}

// UnpublishMedia moves all media for a post back to draft state.
func (r *BlogRepository) UnpublishMedia(ctx context.Context, postID primitive.ObjectID) error {
	media, err := r.FindMediaByPostID(ctx, postID)
	if err != nil {
		return err
	}
	for _, m := range media {
		if err := r.UpdateMedia(ctx, m.ID, bson.M{
			"public_path":  "",
			"published_at": nil,
			"updated_at":   time.Now(),
		}); err != nil {
			log.Printf("[blog] Warning: failed to unpublish media %s: %v", m.ID.Hex(), err)
		}
	}
	return nil
}

// UpdatePost updates a blog post by ID with the given $set fields.
func (r *BlogRepository) UpdatePost(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// UpdatePostBlocks atomically replaces a post's blocks and bumps its content
// revision counter. Kept separate from UpdatePost, which only ever performs a
// $set, since content_revision must be incremented, not overwritten.
func (r *BlogRepository) UpdatePostBlocks(ctx context.Context, id primitive.ObjectID, blocks []models.BlogBlock, contentHash string) error {
	collection := r.db.Collection("blog_posts")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"blocks":       blocks,
			"content_hash": contentHash,
			"updated_at":   time.Now(),
		},
		"$inc": bson.M{"content_revision": 1},
	})
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
	result, err := collection.InsertOne(ctx, run)
	if err != nil {
		return err
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		run.ID = oid
	}
	return nil
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

// GetPipelineRunByID is an alias for FindPipelineRunByID used by the workflow.
func (r *BlogRepository) GetPipelineRunByID(ctx context.Context, id primitive.ObjectID) (*models.BlogPipelineRun, error) {
	return r.FindPipelineRunByID(ctx, id)
}

// UpdatePipelineRunStatus updates a pipeline run by ID with the given $set fields.
func (r *BlogRepository) UpdatePipelineRunStatus(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	collection := r.db.Collection("blog_pipeline_runs")
	_, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set})
	return err
}

// UpdatePipelineRun updates a pipeline run entity by persisting its mutable fields.
func (r *BlogRepository) UpdatePipelineRun(ctx context.Context, run *models.BlogPipelineRun) error {
	set := bson.M{
		"status":     run.Status,
		"updated_at": run.UpdatedAt,
	}
	if run.ApprovedAt != nil {
		set["approved_at"] = run.ApprovedAt
	}
	if run.PostID != "" {
		set["post_id"] = run.PostID
	}
	return r.UpdatePipelineRunStatus(ctx, run.ID, set)
}

// DeletePipelineRunByID deletes a pipeline run by ID.
func (r *BlogRepository) DeletePipelineRunByID(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.db.Collection("blog_pipeline_runs").DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// DeleteExecutionsByRunID deletes all agent executions for a pipeline run.
func (r *BlogRepository) DeleteExecutionsByRunID(ctx context.Context, runID primitive.ObjectID) error {
	_, err := r.db.Collection("blog_agent_executions").DeleteMany(ctx, bson.M{"pipeline_run_id": runID})
	return err
}

// DeleteExecutionsByStage deletes agent executions for a specific stage.
func (r *BlogRepository) DeleteExecutionsByStage(ctx context.Context, runID primitive.ObjectID, stage string) error {
	_, err := r.db.Collection("blog_agent_executions").DeleteMany(ctx, bson.M{"pipeline_run_id": runID, "stage": stage})
	return err
}

// DeleteSourcesByRunID deletes all research sources for a pipeline run.
func (r *BlogRepository) DeleteSourcesByRunID(ctx context.Context, runID primitive.ObjectID) error {
	_, err := r.db.Collection("blog_research_sources").DeleteMany(ctx, bson.M{"pipeline_run_id": runID})
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

// InsertAgentExecution is an alias for InsertExecution used by the agents.
func (r *BlogRepository) InsertAgentExecution(ctx context.Context, exec *models.BlogAgentExecution) error {
	return r.InsertExecution(ctx, exec)
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
	// The driver decodes ParsedOutput (an interface{} field) as bson.D, which
	// Go's encoding/json serializes as an array of {Key,Value} pairs instead
	// of a plain object. Convert it so API consumers see normal JSON objects.
	for i := range execs {
		if execs[i].ParsedOutput != nil {
			execs[i].ParsedOutput = convertBSONToMap(execs[i].ParsedOutput)
		}
	}
	return execs, nil
}

// FindCompletedExecution returns the most recent completed execution for a run and stage.
func (r *BlogRepository) FindCompletedExecution(ctx context.Context, runID primitive.ObjectID, stage string) (*models.BlogAgentExecution, error) {
	collection := r.db.Collection("blog_agent_executions")
	var exec models.BlogAgentExecution
	err := collection.FindOne(ctx, bson.M{
		"pipeline_run_id": runID,
		"stage":           stage,
		"status":          "completed",
	}).Decode(&exec)
	if err != nil {
		return nil, err
	}
	if exec.ParsedOutput != nil {
		exec.ParsedOutput = convertBSONToMap(exec.ParsedOutput)
	}
	return &exec, nil
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
		// Try to parse as JSON to store as object, otherwise store as string
		var parsed interface{}
		if err := json.Unmarshal([]byte(parsedOutput), &parsed); err == nil {
			set["parsed_output"] = parsed
		} else {
			set["parsed_output"] = parsedOutput
		}
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
