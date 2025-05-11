package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// Category represents a product category (e.g., "Men's Shirts", "Women's Dresses")
type Category struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	Name        string              `bson:"name" json:"name"`
	Slug        string              `bson:"slug" json:"slug"`               // URL-friendly (e.g., "mens-shirts")
	ParentID    primitive.ObjectID  `bson:"parent_id,omitempty" json:"parent_id,omitempty"` // Optional: For hierarchical categories
	Description string              `bson:"description" json:"description"`
	Image       string              `bson:"image" json:"image"`             // URL to category image
	CreatedAt   time.Time           `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt   time.Time           `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

// Note: This model requires the following indexes:
// - slug (Unique)
// - parent_id (For hierarchical queries) 