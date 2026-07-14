package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureBlogIndexes creates all necessary indexes for the blog AI pipeline collections.
func EnsureBlogIndexes(database *mongo.Database) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// ===== BLOG_POSTS COLLECTION INDEXES =====
	blogPostsCollection := database.Collection("blog_posts")

	// 1. Unique slug index (already created in db.go, but ensure it exists)
	_, err := blogPostsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true).SetName("blog_posts_slug_unique"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure unique slug index on blog_posts: %v", err)
	}

	// 2. Compound index for published/active queries
	_, err = blogPostsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "is_active", Value: 1},
			{Key: "published_at", Value: -1},
		},
		Options: options.Index().SetName("blog_posts_published_active_date"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure published/active index on blog_posts: %v", err)
	}

	// 3. Status + category index for admin filtering
	_, err = blogPostsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "category", Value: 1},
		},
		Options: options.Index().SetName("blog_posts_status_category"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure status/category index on blog_posts: %v", err)
	}

	// 4. Pipeline run ID lookup
	_, err = blogPostsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "pipeline_run_id", Value: 1}},
		Options: options.Index().SetName("blog_posts_pipeline_run_id"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure pipeline_run_id index on blog_posts: %v", err)
	}

	// 5. Tags index for tag-based queries
	_, err = blogPostsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "tags", Value: 1}},
		Options: options.Index().SetName("blog_posts_tags"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure tags index on blog_posts: %v", err)
	}

	log.Println("✓ Blog posts indexes created")

	// ===== BLOG_PIPELINE_RUNS COLLECTION INDEXES =====
	pipelineRunsCollection := database.Collection("blog_pipeline_runs")

	// 1. Status + created_at for listing
	_, err = pipelineRunsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().SetName("blog_pipeline_runs_status_created"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure status/created index on blog_pipeline_runs: %v", err)
	}

	// 2. Post ID lookup
	_, err = pipelineRunsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "post_id", Value: 1}},
		Options: options.Index().SetName("blog_pipeline_runs_post_id"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure post_id index on blog_pipeline_runs: %v", err)
	}

	log.Println("✓ Blog pipeline runs indexes created")

	// ===== BLOG_AGENT_EXECUTIONS COLLECTION INDEXES =====
	executionsCollection := database.Collection("blog_agent_executions")

	// 1. Pipeline run ID + stage + attempt for worker dispatch
	_, err = executionsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "pipeline_run_id", Value: 1},
			{Key: "stage", Value: 1},
			{Key: "attempt", Value: 1},
		},
		Options: options.Index().SetName("blog_agent_executions_run_stage_attempt"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure run/stage/attempt index on blog_agent_executions: %v", err)
	}

	// 2. Status + stage for pending execution lookup
	_, err = executionsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "stage", Value: 1},
		},
		Options: options.Index().SetName("blog_agent_executions_status_stage"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure status/stage index on blog_agent_executions: %v", err)
	}

	// 3. Created_at for TTL (30 days)
	_, err = executionsCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "created_at", Value: 1}},
		Options: options.Index().
			SetName("blog_agent_executions_ttl").
			SetExpireAfterSeconds(30 * 24 * 60 * 60), // 30 days
	})
	if err != nil {
		log.Printf("Warning: Could not ensure TTL index on blog_agent_executions: %v", err)
	}

	log.Println("✓ Blog agent executions indexes created")

	// ===== BLOG_RESEARCH_SOURCES COLLECTION INDEXES =====
	sourcesCollection := database.Collection("blog_research_sources")

	// 1. Pipeline run ID lookup
	_, err = sourcesCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "pipeline_run_id", Value: 1}},
		Options: options.Index().SetName("blog_research_sources_run_id"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure pipeline_run_id index on blog_research_sources: %v", err)
	}

	// 2. Provider index for filtering
	_, err = sourcesCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "provider", Value: 1}},
		Options: options.Index().SetName("blog_research_sources_provider"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure provider index on blog_research_sources: %v", err)
	}

	// 3. Created_at for TTL (90 days)
	_, err = sourcesCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "created_at", Value: 1}},
		Options: options.Index().
			SetName("blog_research_sources_ttl").
			SetExpireAfterSeconds(90 * 24 * 60 * 60), // 90 days
	})
	if err != nil {
		log.Printf("Warning: Could not ensure TTL index on blog_research_sources: %v", err)
	}

	log.Println("✓ Blog research sources indexes created")

	// ===== BLOG_MEDIA COLLECTION INDEXES =====
	mediaCollection := database.Collection("blog_media")

	// 1. Post ID + slot for media lookup
	_, err = mediaCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "post_id", Value: 1},
			{Key: "slot", Value: 1},
		},
		Options: options.Index().SetName("blog_media_post_slot"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure post_id/slot index on blog_media: %v", err)
	}

	// 2. Slot index for slot-based queries
	_, err = mediaCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slot", Value: 1}},
		Options: options.Index().SetName("blog_media_slot"),
	})
	if err != nil {
		log.Printf("Warning: Could not ensure slot index on blog_media: %v", err)
	}

	log.Println("✓ Blog media indexes created")

	return nil
}

// EnsureBlogCollections creates blog collections with appropriate settings.
func EnsureBlogCollections(database *mongo.Database) error {
	// Collections are created automatically on first insert in MongoDB,
	// but we can ensure they exist with minimal documents if needed.
	// For now, this is a no-op as MongoDB creates collections lazily.

	// However, we can create the collections explicitly to set TTL indexes
	collections := []string{
		"blog_posts",
		"blog_pipeline_runs",
		"blog_agent_executions",
		"blog_research_sources",
		"blog_media",
	}

	for _, collName := range collections {
		// Use CreateCollection with valid options; suppress error if collection already exists
		opts := options.CreateCollection()
		err := database.CreateCollection(context.Background(), collName, opts)
		if err != nil {
			// If collection already exists, MongoDB returns NamespaceExists (48)
			// We ignore that specific case and log others.
			if mongo.IsDuplicateKeyError(err) || err.Error() == "collection already exists" {
				continue
			}
			log.Printf("Warning: Could not ensure collection %s: %v", collName, err)
		}
	}

	log.Println("✓ Blog collections ensured")
	return nil
}
