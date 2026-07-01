package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Address represents a shipping or billing address for a user
type Address struct {
	// Frontend Persian-specific fields
	Title        string  `bson:"title,omitempty"         json:"title,omitempty"`
	FirstName    string  `bson:"first_name,omitempty"    json:"first_name,omitempty"`
	LastName     string  `bson:"last_name,omitempty"     json:"last_name,omitempty"`
	PhoneNumber  string  `bson:"phone_number,omitempty"  json:"phone_number,omitempty"`
	Province     string  `bson:"province,omitempty"      json:"province,omitempty"`
	ProvinceCode int     `bson:"province_code,omitempty" json:"province_code,omitempty"`
	Address      string  `bson:"address,omitempty"       json:"address,omitempty"`
	PostalCode   string  `bson:"postal_code"             json:"postal_code"`
	Latitude     float64 `bson:"latitude,omitempty"      json:"latitude,omitempty"`
	Longitude    float64 `bson:"longitude,omitempty"     json:"longitude,omitempty"`

	// Original backend fields (kept for compatibility)
	Street    string `bson:"street,omitempty"    json:"street,omitempty"`
	City      string `bson:"city"                json:"city"`
	CityCode  int    `bson:"city_code,omitempty" json:"city_code,omitempty"`
	State     string `bson:"state,omitempty"     json:"state,omitempty"`
	Country   string `bson:"country,omitempty"   json:"country,omitempty"`
	IsDefault bool   `bson:"is_default"          json:"is_default"`
}

// User represents a registered user
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Name         string             `bson:"name"                json:"name"`
	Email        string             `bson:"email,omitempty"     json:"email,omitempty"` // Optional
	PasswordHash string             `bson:"password_hash"       json:"-"`               // Don't include in JSON responses
	Phone        string             `bson:"phone"               json:"phone"`           // Required, Unique - IR phone number (09xxxxxxxxx)
	Addresses    []Address          `bson:"addresses,omitempty" json:"addresses,omitempty"`
	Role         string             `bson:"role"                json:"role"`      // Values: "customer", "admin"
	IsActive     bool               `bson:"is_active"           json:"is_active"` // Soft delete flag
	CreatedAt    time.Time          `bson:"created_at"          json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at"          json:"updated_at"`
	Reviews      []Review           `bson:"-"               json:"reviews,omitempty"` // Populated programmatically, not stored in MongoDB

	// Mobile app tracking fields
	HasMobileApp bool       `bson:"has_mobile_app"          json:"has_mobile_app"`           // Indicates if user has used mobile app
	LastAppOpen  *time.Time `bson:"last_app_open,omitempty" json:"last_app_open,omitempty"`  // Timestamp of last app activity
	AppPlatform  string     `bson:"app_platform,omitempty"  json:"app_platform,omitempty"`   // "android" or "ios"
	AppVersion   string     `bson:"app_version,omitempty"   json:"app_version,omitempty"`    // Version of the mobile app (e.g., "1.2.3")

	// Auth tracking
	LastLogin *time.Time `bson:"last_login,omitempty" json:"last_login,omitempty"` // Timestamp of last successful login
}
