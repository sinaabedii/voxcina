package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Review represents a product review
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"        json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id"              json:"user_id"`    // Reference to users
	ProductID primitive.ObjectID `bson:"product_id"           json:"product_id"` // Reference to products
	Rating    int                `bson:"rating"               json:"rating"`     // 1-5
	Comment   string             `bson:"comment"              json:"comment"`
	CreatedAt time.Time          `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"` // Omit if not set
}

// Note: This model requires the following indexes:
// - product_id (For fetching product reviews)
// - Compound index: {user_id: 1, product_id: 1} (Prevent duplicate reviews)
