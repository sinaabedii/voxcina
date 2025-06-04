package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Review represents a product review
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"        json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id"              json:"user_id"`    // Reference to users
	UserName  string             `bson:"user_name"            json:"user_name"`  // Snapshot of user's name at review time
	ProductID primitive.ObjectID `bson:"product_id"           json:"product_id"` // Reference to products
	Rating    int                `bson:"rating"               json:"rating"`     // 1-5
	Comment   string             `bson:"comment"              json:"comment"`
	IsRecommended bool           `bson:"is_recommended,omitempty" json:"isRecommended,omitempty"`
	Status    string             `bson:"status"               json:"status"` // "pending", "approved", "rejected"
	CreatedAt time.Time          `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"` // Omit if not set
}

// Note: This model requires the following indexes:
// - product_id (For fetching product reviews)
// - user_id (For fetching reviews written by a specific user)
// - status (For counting pending reviews moderation)
// - Optional compound index: {user_id: 1, product_id: 1} (Can be used for faster lookup of a user's reviews on a product; should NOT be unique to allow multiple reviews)
