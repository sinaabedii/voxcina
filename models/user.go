package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Address defines the structure for a user's address.
// Note: Frontend expects Address.id as string, using ObjectID here for DB consistency.
// Ensure conversion logic if necessary when sending data to the frontend.
type Address struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title       string             `bson:"title" json:"title"`
	FirstName   string             `bson:"first_name" json:"firstName"`
	LastName    string             `bson:"last_name" json:"lastName"`
	PhoneNumber string             `bson:"phone_number" json:"phoneNumber"`
	Province    string             `bson:"province" json:"province"`
	City        string             `bson:"city" json:"city"`
	Address     string             `bson:"address" json:"address"`
	PostalCode  string             `bson:"postal_code" json:"postalCode"`
	IsDefault   bool               `bson:"is_default" json:"isDefault"`
}

// User defines the structure for user data.
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name      string             `bson:"name" json:"name"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password" json:"password"` // Allow password in requests, but clear before response
	Avatar    string             `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Role      string             `bson:"role" json:"role"` // Consider using constants or enums for roles
	Addresses []Address          `bson:"addresses,omitempty" json:"addresses,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}
