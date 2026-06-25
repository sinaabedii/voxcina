package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category represents a product category (e.g., "Men's Shirts", "Women's Dresses")
type Category struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"        json:"id,omitempty"`
	Name        string             `bson:"name"                 json:"name"`
	Slug        string             `bson:"slug"                 json:"slug"`                // URL-friendly (e.g., "mens-shirts")
	ParentID    primitive.ObjectID `bson:"parent_id,omitempty"  json:"parent_id,omitempty"` // Optional: For hierarchical categories
	Description string             `bson:"description"          json:"description"`
	Image       string             `bson:"image"                json:"image"`     // URL to category image
	Avatar      string             `bson:"avatar,omitempty"     json:"avatar,omitempty"` // Path to a flat icon under /uploads/avatars/categories/ (e.g. "/uploads/avatars/categories/shirt.svg")
	IsActive    bool               `bson:"is_active"            json:"is_active"`           // Whether the category is active (defaults to true)
	ShowInHeader bool              `bson:"show_in_header"       json:"show_in_header,omitempty"`
	CreatedAt   time.Time          `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt   time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

// Note: This model requires the following indexes:
// - slug (Unique)
// - parent_id (For hierarchical queries)
