package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Brand represents a clothing brand (e.g., "Nike", "Zara")
type Brand struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Name        string             `bson:"name"                json:"name"`                // Brand name
	Slug        string             `bson:"slug"                json:"slug"`                // URL-friendly (e.g., "nike")
	Logo        string             `bson:"logo"                json:"logo"`                // URL to logo image
	Description string             `bson:"description"         json:"description"`         // Brand description
	IsActive    bool               `bson:"isActive,omitempty"  json:"isActive,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"` // Added CreatedAt
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"` // Added UpdatedAt
}

// Note: This model requires the following indexes:
// - name (Unique)
// - slug (Unique)
