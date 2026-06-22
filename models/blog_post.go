package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BlogAuthor represents the author information for a blog post
type BlogAuthor struct {
	Name   string `bson:"name"   json:"name"`
	Avatar string `bson:"avatar" json:"avatar"`
}

// BlogPost represents a blog post
type BlogPost struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"   json:"id,omitempty"`
	Title       string             `bson:"title"           json:"title"`
	Slug        string             `bson:"slug"            json:"slug"`        // Unique URL-friendly identifier
	Excerpt     string             `bson:"excerpt"         json:"excerpt"`     // Short description/summary
	Content     string             `bson:"content"         json:"content"`     // Full blog post content (HTML/Markdown)
	CoverImage  string             `bson:"cover_image"     json:"coverImage"`  // URL to cover image
	Author      BlogAuthor         `bson:"author"          json:"author"`      // Author information
	Category    string             `bson:"category"        json:"category"`    // Blog category
	Tags        []string           `bson:"tags"            json:"tags"`        // Array of tags
	ReadTime    int                `bson:"read_time"       json:"readTime"`    // Estimated read time in minutes
	IsPublished bool               `bson:"is_published"    json:"isPublished"` // Publication status
	IsActive    bool               `bson:"is_active"       json:"isActive"`    // Soft delete flag
	PublishedAt *time.Time         `bson:"published_at"    json:"publishedAt"` // Publication timestamp (nullable)
	CreatedAt   time.Time          `bson:"created_at"      json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at"      json:"updatedAt"`
} 