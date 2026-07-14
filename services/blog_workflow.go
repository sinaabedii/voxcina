package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

// Workflow manages approval transitions between pipeline stages
type Workflow struct {
	repository *BlogRepository
}

// NewWorkflow creates a new workflow manager
func NewWorkflow(repository *BlogRepository) *Workflow {
	return &Workflow{
		repository: repository,
	}
}

// ValidTransitions defines allowed state transitions
var ValidTransitions = map[string][]string{
	"brief":              {"researching"},
	"researching":        {"research_approved", "error"},
	"research_approved":  {"writing"},
	"writing":            {"content_approved", "error"},
	"content_approved":   {"prompts"},
	"prompts":            {"prompts_approved", "error"},
	"prompts_approved":   {"media_pending"},
	"media_pending":      {"ready", "error"},
	"ready":              {"published", "archived"},
	"published":          {"archived", "unpublished"},
	"unpublished":        {"ready"},
	"archived":           {"restored"},
	"restored":           {"ready"},
	"error":              {"brief"}, // Reset to brief on error
}

// ApproveResearch transitions from research to writing
func (w *Workflow) ApproveResearch(ctx context.Context, runID primitive.ObjectID, adminID primitive.ObjectID) error {
	run, err := w.repository.GetPipelineRunByID(ctx, runID)
	if err != nil {
		return fmt.Errorf("failed to get pipeline run: %w", err)
	}

	if run.Status != "research_approved" {
		return fmt.Errorf("invalid transition: run is in status '%s', expected 'research_approved'", run.Status)
	}

	run.Status = "writing"
	run.UpdatedAt = time.Now()

	if err := w.repository.UpdatePipelineRun(ctx, run); err != nil {
		return fmt.Errorf("failed to update pipeline run: %w", err)
	}

	log.Printf("[blog] Run %s approved research, transitioning to writing", runID.Hex())
	return nil
}

// ApproveContent transitions from writing to prompts
func (w *Workflow) ApproveContent(ctx context.Context, runID primitive.ObjectID, adminID primitive.ObjectID) error {
	run, err := w.repository.GetPipelineRunByID(ctx, runID)
	if err != nil {
		return fmt.Errorf("failed to get pipeline run: %w", err)
	}

	if run.Status != "content_approved" {
		return fmt.Errorf("invalid transition: run is in status '%s', expected 'content_approved'", run.Status)
	}

	run.Status = "prompts"
	run.UpdatedAt = time.Now()

	if err := w.repository.UpdatePipelineRun(ctx, run); err != nil {
		return fmt.Errorf("failed to update pipeline run: %w", err)
	}

	log.Printf("[blog] Run %s approved content, transitioning to prompts", runID.Hex())
	return nil
}

// ApprovePrompts transitions from prompts to media_pending
func (w *Workflow) ApprovePrompts(ctx context.Context, runID primitive.ObjectID, adminID primitive.ObjectID) error {
	run, err := w.repository.GetPipelineRunByID(ctx, runID)
	if err != nil {
		return fmt.Errorf("failed to get pipeline run: %w", err)
	}

	if run.Status != "prompts_approved" {
		return fmt.Errorf("invalid transition: run is in status '%s', expected 'prompts_approved'", run.Status)
	}

	run.Status = "media_pending"
	run.UpdatedAt = time.Now()

	if err := w.repository.UpdatePipelineRun(ctx, run); err != nil {
		return fmt.Errorf("failed to update pipeline run: %w", err)
	}

	log.Printf("[blog] Run %s approved prompts, transitioning to media_pending", runID.Hex())
	return nil
}

// PublishPost publishes a ready post
func (w *Workflow) PublishPost(ctx context.Context, postID primitive.ObjectID, adminID primitive.ObjectID) error {
	post, err := w.repository.GetBlogPostByID(ctx, postID)
	if err != nil {
		return fmt.Errorf("failed to get blog post: %w", err)
	}

	if post.Status != "ready" {
		return fmt.Errorf("invalid transition: post is in status '%s', expected 'ready'", post.Status)
	}

	now := time.Now()
	post.Status = "published"
	post.PublishedAt = &now
	post.UpdatedAt = now

	if err := w.repository.UpdateBlogPost(ctx, post); err != nil {
		return fmt.Errorf("failed to update blog post: %w", err)
	}

	// Move media from draft to public paths
	if err := w.repository.PublishMedia(ctx, postID); err != nil {
		log.Printf("[blog] Warning: failed to publish media for post %s: %v", postID.Hex(), err)
	}

	log.Printf("[blog] Post %s published", postID.Hex())
	return nil
}

// UnpublishPost unpublishes a published post
func (w *Workflow) UnpublishPost(ctx context.Context, postID primitive.ObjectID, adminID primitive.ObjectID) error {
	post, err := w.repository.GetBlogPostByID(ctx, postID)
	if err != nil {
		return fmt.Errorf("failed to get blog post: %w", err)
	}

	if post.Status != "published" {
		return fmt.Errorf("invalid transition: post is in status '%s', expected 'published'", post.Status)
	}

	post.Status = "unpublished"
	post.PublishedAt = nil
	post.UpdatedAt = time.Now()

	if err := w.repository.UpdateBlogPost(ctx, post); err != nil {
		return fmt.Errorf("failed to update blog post: %w", err)
	}

	// Move media from public to draft paths
	if err := w.repository.UnpublishMedia(ctx, postID); err != nil {
		log.Printf("[blog] Warning: failed to unpublish media for post %s: %v", postID.Hex(), err)
	}

	log.Printf("[blog] Post %s unpublished", postID.Hex())
	return nil
}

// ArchivePost archives a post
func (w *Workflow) ArchivePost(ctx context.Context, postID primitive.ObjectID, adminID primitive.ObjectID) error {
	post, err := w.repository.GetBlogPostByID(ctx, postID)
	if err != nil {
		return fmt.Errorf("failed to get blog post: %w", err)
	}

	if post.Status != "ready" && post.Status != "published" {
		return fmt.Errorf("invalid transition: post is in status '%s', expected 'ready' or 'published'", post.Status)
	}

	post.Status = "archived"
	post.IsActive = false
	post.UpdatedAt = time.Now()

	if err := w.repository.UpdateBlogPost(ctx, post); err != nil {
		return fmt.Errorf("failed to update blog post: %w", err)
	}

	log.Printf("[blog] Post %s archived", postID.Hex())
	return nil
}

// RestorePost restores an archived post
func (w *Workflow) RestorePost(ctx context.Context, postID primitive.ObjectID, adminID primitive.ObjectID) error {
	post, err := w.repository.GetBlogPostByID(ctx, postID)
	if err != nil {
		return fmt.Errorf("failed to get blog post: %w", err)
	}

	if post.Status != "archived" {
		return fmt.Errorf("invalid transition: post is in status '%s', expected 'archived'", post.Status)
	}

	post.Status = "restored"
	post.IsActive = true
	post.UpdatedAt = time.Now()

	if err := w.repository.UpdateBlogPost(ctx, post); err != nil {
		return fmt.Errorf("failed to update blog post: %w", err)
	}

	log.Printf("[blog] Post %s restored", postID.Hex())
	return nil
}

// ValidateTransition checks if a state transition is valid
func (w *Workflow) ValidateTransition(fromStatus, toStatus string) error {
	validTargets, exists := ValidTransitions[fromStatus]
	if !exists {
		return fmt.Errorf("unknown status: %s", fromStatus)
	}

	for _, valid := range validTargets {
		if valid == toStatus {
			return nil
		}
	}

	return fmt.Errorf("invalid transition from '%s' to '%s'", fromStatus, toStatus)
}
