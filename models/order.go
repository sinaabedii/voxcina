package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderVariant represents product variant details
type OrderVariant struct {
	Size  string `bson:"size" json:"size"`
	Color string `bson:"color" json:"color"`
}

// OrderItem represents a single item in an order
type OrderItem struct {
	ProductID       primitive.ObjectID `bson:"product_id" json:"product_id"`           // Reference to products
	Variant         OrderVariant       `bson:"variant" json:"variant"`                 // Size and color information
	Quantity        int                `bson:"quantity" json:"quantity"`               // Number of items ordered
	PriceAtPurchase float64            `bson:"price_at_purchase" json:"price_at_purchase"` // Snapshot of price at order time
}

// ShippingAddress represents the delivery address for an order
type ShippingAddress struct {
	Street     string `bson:"street" json:"street"`
	City       string `bson:"city" json:"city"`
	State      string `bson:"state" json:"state"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country" json:"country"`
}

// Order represents a customer order
type Order struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID         primitive.ObjectID `bson:"user_id" json:"user_id"`               // Reference to users
	Items          []OrderItem        `bson:"items" json:"items"`                   // Items in the order
	TotalAmount    float64            `bson:"total_amount" json:"total_amount"`     // Total cost of the order
	ShippingAddress ShippingAddress    `bson:"shipping_address" json:"shipping_address"` // Delivery address
	Status         string             `bson:"status" json:"status"`                 // Values: "pending", "shipped", "delivered", etc.
	PaymentStatus  string             `bson:"payment_status" json:"payment_status"` // Values: "pending", "paid", "failed"
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
}

// Note: This model requires the following indexes:
// - user_id (For fetching a user's orders)
// - status + created_at (For order tracking) 