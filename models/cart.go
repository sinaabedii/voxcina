package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CartVariant represents product variant details in a cart
type CartVariant struct {
	Size  string `bson:"size" json:"size"`
	Color string `bson:"color" json:"color"`
}

// CartItem represents an item in a user's cart
type CartItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Variant   CartVariant        `bson:"variant" json:"variant"`
	Quantity  int                `bson:"quantity" json:"quantity"`
}

// Cart represents a shopping cart for a user
type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`     // Reference to users
	Items     []CartItem         `bson:"items" json:"items"`
	IsActive  bool               `bson:"is_active" json:"is_active"` // Soft delete flag
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// Note: This model requires the following index:
// - user_id (Unique: One cart per user) 