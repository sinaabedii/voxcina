package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// StoreStatus represents the approval status of a store
type StoreStatus string

const (
	StoreStatusPending  StoreStatus = "pending"
	StoreStatusApproved StoreStatus = "approved"
	StoreStatusRejected StoreStatus = "rejected"
	StoreStatusSuspended StoreStatus = "suspended"
)

// StoreBankInfo represents bank account information for payouts
type StoreBankInfo struct {
	BankName      string `bson:"bank_name"       json:"bank_name"`
	AccountNumber string `bson:"account_number"  json:"account_number"`
	IBAN          string `bson:"iban"            json:"iban"`
	AccountHolder string `bson:"account_holder"  json:"account_holder"`
}

// StoreAddress represents the physical address of a store
type StoreAddress struct {
	Province   string  `bson:"province"    json:"province"`
	City       string  `bson:"city"        json:"city"`
	Address    string  `bson:"address"     json:"address"`
	PostalCode string  `bson:"postal_code" json:"postal_code"`
	Latitude   float64 `bson:"latitude,omitempty"  json:"latitude,omitempty"`
	Longitude  float64 `bson:"longitude,omitempty" json:"longitude,omitempty"`
}

// Store represents a seller's store in the C2C marketplace
type Store struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"    json:"id,omitempty"`
	OwnerID     primitive.ObjectID `bson:"owner_id"         json:"owner_id"`      // Reference to users collection
	Name        string             `bson:"name"             json:"name"`          // Store display name
	Slug        string             `bson:"slug"             json:"slug"`          // URL-friendly store identifier
	Description string             `bson:"description"      json:"description"`
	Logo        string             `bson:"logo,omitempty"   json:"logo,omitempty"`
	Banner      string             `bson:"banner,omitempty" json:"banner,omitempty"`
	Phone       string             `bson:"phone"            json:"phone"`
	Email       string             `bson:"email"            json:"email"`
	Address     StoreAddress       `bson:"address"          json:"address"`
	BankInfo    StoreBankInfo      `bson:"bank_info"        json:"bank_info"`
	
	// Store metrics
	Rating        float64 `bson:"rating"         json:"rating"`
	ReviewCount   int     `bson:"review_count"   json:"review_count"`
	ProductCount  int     `bson:"product_count"  json:"product_count"`
	TotalSales    int     `bson:"total_sales"    json:"total_sales"`
	
	// Status and verification
	Status       StoreStatus `bson:"status"        json:"status"`
	IsVerified   bool        `bson:"is_verified"   json:"is_verified"`
	IsActive     bool        `bson:"is_active"     json:"is_active"`
	
	// Commission rate (percentage taken by platform)
	CommissionRate float64 `bson:"commission_rate" json:"commission_rate"`
	
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// StoreReview represents a review for a store
type StoreReview struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	StoreID   primitive.ObjectID `bson:"store_id"      json:"store_id"`
	UserID    primitive.ObjectID `bson:"user_id"       json:"user_id"`
	OrderID   primitive.ObjectID `bson:"order_id"      json:"order_id"` // The order this review is based on
	Rating    int                `bson:"rating"        json:"rating"`   // 1-5
	Comment   string             `bson:"comment"       json:"comment"`
	IsActive  bool               `bson:"is_active"     json:"is_active"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}
