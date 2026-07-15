package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Blog block types (discriminated union).
const (
	BlockTypeTitle      = "title"
	BlockTypeHeader     = "header"
	BlockTypeSection    = "section"
	BlockTypeSubsection = "subsection"
	BlockTypeText       = "text"
	BlockTypeImage      = "image"
)

// Valid blog statuses.
const (
	StatusDraft              = "draft"
	StatusResearchReview     = "research_review"
	StatusContentReview      = "content_review"
	StatusImagePending       = "image_pending"
	StatusReady              = "ready"
	StatusPublished          = "published"
	StatusArchived           = "archived"
)

// Pipeline run statuses.
const (
	PipelineBrief            = "brief"
	PipelineResearching      = "researching"
	PipelineResearchApproved = "research_approved"
	PipelineWriting          = "writing"
	PipelineContentApproved  = "content_approved"
	PipelinePrompts          = "prompts"
	PipelinePromptsGenerated = "prompts_generated"
	PipelinePromptsApproved  = "prompts_approved"
	PipelineMediaPending     = "media_pending"
	PipelineReady            = "ready"
	PipelinePublished        = "published"
	PipelineArchived         = "archived"
)

// Agent execution stages.
const (
	StageResearch = "research"
	StageWrite    = "write"
	StagePrompts  = "prompts"
)

// Agent execution statuses.
const (
	ExecutionPending   = "pending"
	ExecutionProcessing = "processing"
	ExecutionCompleted  = "completed"
	ExecutionFailed     = "failed"
)

// Claim is an alias for SourceClaim for ergonomic use in agent code.
type Claim = SourceClaim

// BlogBlock is a single content block within a blog post.
type BlogBlock struct {
	ID          string `bson:"id" json:"id"`
	Type        string `bson:"type" json:"type"`
	Order       int    `bson:"order" json:"order"`
	Text        string `bson:"text,omitempty" json:"text,omitempty"`
	ImageSlotID string `bson:"image_slot_id,omitempty" json:"imageSlotId,omitempty"`
	ImageID     string `bson:"image_id,omitempty" json:"imageId,omitempty"`
	Alt         string `bson:"alt,omitempty" json:"alt,omitempty"`
	Caption     string `bson:"caption,omitempty" json:"caption,omitempty"`
}

// AuthorSnapshot is a lightweight author reference embedded in blog posts.
type AuthorSnapshot struct {
	Name   string `bson:"name" json:"name"`
	Avatar string `bson:"avatar" json:"avatar"`
}

// BlogPost is the new block-based blog post model (SchemaVersion 2).
type BlogPost struct {
	SchemaVersion int            `bson:"schema_version" json:"schemaVersion"`
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title         string         `bson:"title" json:"title"`
	Slug          string         `bson:"slug" json:"slug"`
	Excerpt       string         `bson:"excerpt" json:"excerpt"`
	Blocks        []BlogBlock    `bson:"blocks" json:"blocks"`
	CoverImageID  string         `bson:"cover_image_id" json:"coverImageId"`
	Category      string         `bson:"category" json:"category"`
	Tags          []string       `bson:"tags" json:"tags"`
	Status        string         `bson:"status" json:"status"`
	PipelineRunID string         `bson:"pipeline_run_id,omitempty" json:"pipelineRunId,omitempty"`
	ContentRevision int          `bson:"content_revision" json:"contentRevision"`
	ContentHash   string         `bson:"content_hash" json:"contentHash"`
	AuthorID      string         `bson:"author_id" json:"authorId"`
	AuthorSnapshot AuthorSnapshot `bson:"author_snapshot" json:"authorSnapshot"`
	ReadTime      int            `bson:"read_time" json:"readTime"`
	PublishedAt   *time.Time     `bson:"published_at,omitempty" json:"publishedAt,omitempty"`
	CreatedAt     time.Time      `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time      `bson:"updated_at" json:"updatedAt"`
	IsActive      bool           `bson:"is_active" json:"isActive"`
}

// BlogPipelineRun tracks an AI generation pipeline run.
type BlogPipelineRun struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Topic           string             `bson:"topic" json:"topic"`
	Locale          string             `bson:"locale" json:"locale"`
	TargetAudience  string             `bson:"target_audience" json:"targetAudience"`
	DesiredLength   int                `bson:"desired_length" json:"desiredLength"`
	Tone            string             `bson:"tone" json:"tone"`
	Keywords        []string           `bson:"keywords" json:"keywords"`
	Category        string             `bson:"category" json:"category"`
	SourcePreferences []string         `bson:"source_preferences" json:"sourcePreferences"`
	AdditionalNotes string             `bson:"additional_notes,omitempty" json:"additionalNotes,omitempty"`
	Status          string             `bson:"status" json:"status"`
	PostID          string             `bson:"post_id,omitempty" json:"postId,omitempty"`
	CreatedBy       string             `bson:"created_by" json:"createdBy"`
	CreatedAt       time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updated_at" json:"updatedAt"`
	ApprovedAt      *time.Time         `bson:"approved_at,omitempty" json:"approvedAt,omitempty"`
}

// BlogAgentExecution records a single AI agent invocation.
type BlogAgentExecution struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	PipelineRunID primitive.ObjectID `bson:"pipeline_run_id" json:"pipelineRunId"`
	Stage         string             `bson:"stage" json:"stage"`
	Attempt       int                `bson:"attempt" json:"attempt"`
	InputSnapshot bson.M             `bson:"input_snapshot,omitempty" json:"inputSnapshot,omitempty"`
	ParsedOutput  bson.M             `bson:"parsed_output,omitempty" json:"parsedOutput,omitempty"`
	PromptKey     string             `bson:"prompt_key,omitempty" json:"promptKey,omitempty"`
	PromptVersion string             `bson:"prompt_version,omitempty" json:"promptVersion,omitempty"`
	RenderedPrompt string            `bson:"rendered_prompt,omitempty" json:"renderedPrompt,omitempty"`
	Provider      string             `bson:"provider" json:"provider"`
	Model         string             `bson:"model" json:"model"`
	TokenUsage    int                `bson:"token_usage" json:"tokenUsage"`
	CostMetadata  string             `bson:"cost_metadata,omitempty" json:"costMetadata,omitempty"`
	DurationMs    int64              `bson:"duration_ms" json:"durationMs"`
	Status        string             `bson:"status" json:"status"`
	Error         string             `bson:"error,omitempty" json:"error,omitempty"`
	RetryCount    int                `bson:"retry_count" json:"retryCount"`
	LeaseInfo     string             `bson:"lease_info,omitempty" json:"leaseInfo,omitempty"`
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"`
	StartedAt     *time.Time         `bson:"started_at,omitempty" json:"startedAt,omitempty"`
	CompletedAt   *time.Time         `bson:"completed_at,omitempty" json:"completedAt,omitempty"`
}

// BlogResearchSource tracks a single research source (Brave Search or manual).
type BlogResearchSource struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	PipelineRunID    primitive.ObjectID `bson:"pipeline_run_id" json:"pipelineRunId"`
	Query            string             `bson:"query" json:"query"`
	Provider         string             `bson:"provider" json:"provider"`
	URL              string             `bson:"url" json:"url"`
	Title            string             `bson:"title" json:"title"`
	Snippet          string             `bson:"snippet" json:"snippet"`
	ExtractedContent string             `bson:"extracted_content,omitempty" json:"extractedContent,omitempty"`
	Claims           []SourceClaim      `bson:"claims,omitempty" json:"claims,omitempty"`
	PublishedAt      *time.Time         `bson:"published_at,omitempty" json:"publishedAt,omitempty"`
	FetchedAt        time.Time          `bson:"fetched_at" json:"fetchedAt"`
	SourceIndex      int                `bson:"source_index" json:"sourceIndex"`
	CreatedAt        time.Time          `bson:"created_at" json:"createdAt"`
}

// SourceClaim captures a verifiable claim extracted from a research source.
type SourceClaim struct {
	Claim      string  `bson:"claim" json:"claim"`
	Evidence   string  `bson:"evidence" json:"evidence"`
	Confidence float64 `bson:"confidence" json:"confidence"`
}

// BlogMedia tracks uploaded/generated media assets for a blog post.
type BlogMedia struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	PostID        primitive.ObjectID `bson:"post_id" json:"postId"`
	Slot          string             `bson:"slot" json:"slot"`
	FilePath      string             `bson:"file_path" json:"filePath"`
	PublicPath    string             `bson:"public_path,omitempty" json:"publicPath,omitempty"`
	Width         int                `bson:"width,omitempty" json:"width,omitempty"`
	Height        int                `bson:"height,omitempty" json:"height,omitempty"`
	AspectRatio   string             `bson:"aspect_ratio,omitempty" json:"aspectRatio,omitempty"`
	MimeType      string             `bson:"mime_type" json:"mimeType"`
	FileSize      int64              `bson:"file_size" json:"fileSize"`
	ChecksumSHA256 string            `bson:"checksum_sha256" json:"checksumSha256"`
	UploaderID    string             `bson:"uploader_id" json:"uploaderId"`
	UploadedAt    time.Time          `bson:"uploaded_at" json:"uploadedAt"`
	PublishedAt   *time.Time         `bson:"published_at,omitempty" json:"publishedAt,omitempty"`
}

// GenerationBrief is the admin-facing input for starting a new pipeline run.
type GenerationBrief struct {
	Topic             string   `json:"topic"`
	Locale            string   `json:"locale"`
	TargetAudience    string   `json:"targetAudience"`
	DesiredLength     int      `json:"desiredLength"`
	Tone              string   `json:"tone"`
	Keywords          []string `json:"keywords"`
	Category          string   `json:"category"`
	SourcePreferences []string `json:"sourcePreferences"`
	AdditionalNotes   string   `json:"additionalNotes"`
}
