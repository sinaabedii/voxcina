package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DiscountApplicability defines which products/categories a discount applies to
type DiscountApplicability struct {
	ProductIDs  []primitive.ObjectID `bson:"product_ids,omitempty" json:"product_ids,omitempty"`   // Optional: Restrict to products
	CategoryIDs []primitive.ObjectID `bson:"category_ids,omitempty" json:"category_ids,omitempty"` // Optional: Restrict to categories
}

// Discount represents a promotional code or discount
type Discount struct {
	ID             primitive.ObjectID   `bson:"_id,omitempty" json:"id,omitempty"`
	Code           string               `bson:"code" json:"code"`                       // Unique (e.g., "SUMMER20")
	Type           string               `bson:"type" json:"type"`                       // Values: "percentage", "fixed"
	Value          float64              `bson:"value" json:"value"`                     // e.g., 20 (for 20% or $20 off)
	MinOrderAmount float64              `bson:"min_order_amount" json:"min_order_amount"`
	ValidFrom      time.Time            `bson:"valid_from" json:"valid_from"`
	ValidTo        time.Time            `bson:"valid_to" json:"valid_to"`
	MaxUses        int                  `bson:"max_uses,omitempty" json:"max_uses,omitempty"` // Optional: Max redemptions
	UsedCount      int                  `bson:"used_count" json:"used_count"`                 // Track redemptions
	ApplicableTo   DiscountApplicability `bson:"applicable_to,omitempty" json:"applicable_to,omitempty"` // Optional: Restrict to products/categories
	CreatedAt      time.Time            `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt      time.Time            `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

// Note: This model requires the following indexes:
// - code (Unique)
// - valid_from + valid_to (For active discounts) 