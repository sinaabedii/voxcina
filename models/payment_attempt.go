package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PaymentAttempt represents a single attempt to pay for an order via a gateway.
// Each retry creates a new attempt with a fresh providerId; previous attempts remain intact.
type PaymentAttempt struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"         json:"id,omitempty"`
	OrderID          primitive.ObjectID `bson:"order_id"              json:"order_id"`
	UserID           primitive.ObjectID `bson:"user_id"               json:"user_id"`
	Gateway          string             `bson:"gateway"               json:"gateway"`
	ProviderID       string             `bson:"provider_id"           json:"provider_id"`
	GatewayReference string             `bson:"gateway_reference"     json:"gateway_reference"`
	GatewayRefNumber string             `bson:"gateway_ref_number"     json:"gateway_ref_number"`
	ExpectedAmount   int64              `bson:"expected_amount"       json:"expected_amount"`
	Status           string             `bson:"status"                json:"status"`
	CallbackType     int                `bson:"callback_type"         json:"callback_type"`
	GatewayData      bson.M             `bson:"gateway_data,omitempty" json:"gateway_data,omitempty"`
	CreatedAt        time.Time          `bson:"created_at"            json:"created_at"`
	VerifiedAt       *time.Time         `bson:"verified_at,omitempty" json:"verified_at,omitempty"`
}

// Note: This model requires the following indexes:
// - Unique: { gateway: 1, provider_id: 1 }
// - Unique: { gateway: 1, gateway_reference: 1 }
// - { order_id: 1, status: 1 }
