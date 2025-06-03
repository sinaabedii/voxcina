package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Address represents a shipping or billing address for a user
type Address struct {
	// Frontend Persian-specific fields
	Title       string  `bson:"title,omitempty"        json:"title,omitempty"`
	FirstName   string  `bson:"first_name,omitempty"   json:"first_name,omitempty"`
	LastName    string  `bson:"last_name,omitempty"    json:"last_name,omitempty"`
	PhoneNumber string  `bson:"phone_number,omitempty" json:"phone_number,omitempty"`
	Province    string  `bson:"province,omitempty"     json:"province,omitempty"`
	Address     string  `bson:"address,omitempty"      json:"address,omitempty"`
	PostalCode  string  `bson:"postal_code"            json:"postal_code"`
	Latitude    float64 `bson:"latitude,omitempty"    json:"latitude,omitempty"`
	Longitude   float64 `bson:"longitude,omitempty"   json:"longitude,omitempty"`

	// Original backend fields (kept for compatibility)
	Street    string `bson:"street,omitempty"  json:"street,omitempty"`
	City      string `bson:"city"              json:"city"`
	State     string `bson:"state,omitempty"   json:"state,omitempty"`
	Country   string `bson:"country,omitempty" json:"country,omitempty"`
	IsDefault bool   `bson:"is_default"        json:"is_default"`
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
	Reviews      []Review           `bson:"-"               json:"reviews,omitempty"` // Populated programmatically, not stored in MongoDB
}
