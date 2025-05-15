package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Address represents a shipping or billing address for a user
type Address struct {
	Street     string `bson:"street"      json:"street"`
	City       string `bson:"city"        json:"city"`
	State      string `bson:"state"       json:"state"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country"     json:"country"`
	IsDefault  bool   `bson:"is_default"  json:"is_default"`
}

// User represents a registered user
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Name         string             `bson:"name"                json:"name"`
	Email        string             `bson:"email"               json:"email"`           // Unique
	PasswordHash string             `bson:"password_hash"       json:"-"`               // Don't include in JSON responses
	Phone        string             `bson:"phone,omitempty"     json:"phone,omitempty"` // Optional
	Addresses    []Address          `bson:"addresses,omitempty" json:"addresses,omitempty"`
	Role         string             `bson:"role"                json:"role"`      // Values: "customer", "admin"
	IsActive     bool               `bson:"is_active"           json:"is_active"` // Soft delete flag
	CreatedAt    time.Time          `bson:"created_at"          json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at"          json:"updated_at"`
}
