package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DiscountApplicability defines which products/categories a discount applies to
type DiscountApplicability struct {
	ProductIDs  []primitive.ObjectID `bson:"product_ids,omitempty"  json:"product_ids,omitempty"`  // Optional: Restrict to products
	CategoryIDs []primitive.ObjectID `bson:"category_ids,omitempty" json:"category_ids,omitempty"` // Optional: Restrict to categories
}

// TargetingCriteria defines criteria for automatically targeting users for promotions
type TargetingCriteria struct {
	HasMobileApp     *bool      `bson:"has_mobile_app,omitempty"     json:"has_mobile_app,omitempty"`     // Filter by mobile app installation
	MinOrders        *int       `bson:"min_orders,omitempty"         json:"min_orders,omitempty"`         // Minimum number of orders
	MaxOrders        *int       `bson:"max_orders,omitempty"         json:"max_orders,omitempty"`         // Maximum number of orders
	InactiveDays     *int       `bson:"inactive_days,omitempty"      json:"inactive_days,omitempty"`      // Users inactive for X days
	RegisteredAfter  *time.Time `bson:"registered_after,omitempty"   json:"registered_after,omitempty"`   // Registered after date
	RegisteredBefore *time.Time `bson:"registered_before,omitempty"  json:"registered_before,omitempty"`  // Registered before date
}

// Discount represents a promotional code or discount
type Discount struct {
	ID             primitive.ObjectID    `bson:"_id,omitempty"           json:"id,omitempty"`
	Code           string                `bson:"code"                    json:"code"`  // Unique (e.g., "SUMMER20")
	Type           string                `bson:"type"                    json:"type"`  // Values: "percentage", "fixed"
	Value          float64               `bson:"value"                   json:"value"` // e.g., 20 (for 20% or $20 off)
	MinOrderAmount float64               `bson:"min_order_amount"        json:"min_order_amount"`
	ValidFrom      time.Time             `bson:"valid_from"              json:"valid_from"`
	ValidTo        time.Time             `bson:"valid_to"                json:"valid_to"`
	MaxUses        int                   `bson:"max_uses,omitempty"      json:"max_uses,omitempty"`      // Optional: Max redemptions
	UsedCount      int                   `bson:"used_count"              json:"used_count"`              // Track redemptions
	ApplicableTo   DiscountApplicability `bson:"applicable_to,omitempty" json:"applicable_to,omitempty"` // Optional: Restrict to products/categories
	CreatedAt      time.Time             `bson:"created_at,omitempty"    json:"created_at,omitempty"`
	UpdatedAt      time.Time             `bson:"updated_at,omitempty"    json:"updated_at,omitempty"`

	// Targeting fields for public/targeted promotions
	IsPublic          bool                 `bson:"is_public"                    json:"is_public"`                              // true = available to all, false = targeted
	AssignedUsers     []primitive.ObjectID `bson:"assigned_users,omitempty"     json:"assigned_users,omitempty"`               // User IDs who can use targeted promotion
	TargetingCriteria *TargetingCriteria   `bson:"targeting_criteria,omitempty" json:"targeting_criteria,omitempty"`           // Criteria used to auto-select users
}

// Note: This model requires the following indexes:
// - code (Unique)
// - valid_from + valid_to (For active discounts)
