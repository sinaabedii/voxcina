package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/utils"
)

// OrderVariant represents product variant details
type OrderVariant struct {
	Size      string `bson:"size"                json:"size"`
	Color     string `bson:"color"               json:"color"`
	ColorName string `bson:"color_name,omitempty" json:"colorName,omitempty"` // Display name for the color
	SKU       string `bson:"sku,omitempty"        json:"sku,omitempty"`       // Unique SKU for this variant
}

// OrderItem represents a single item in an order
type OrderItem struct {
	ProductID       primitive.ObjectID `bson:"product_id"        json:"product_id"`        // Reference to products
	Variant         OrderVariant       `bson:"variant"           json:"variant"`           // Size and color information
	Quantity        int                `bson:"quantity"          json:"quantity"`          // Number of items ordered
	PriceAtPurchase float64            `bson:"price_at_purchase" json:"price_at_purchase"` // Snapshot of price at order time
}

// Order represents a customer order
type Order struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"           json:"id,omitempty"`
	UserID          primitive.ObjectID `bson:"user_id"                 json:"user_id"`                 // Reference to users
	OrderNumber     string             `bson:"order_number"            json:"order_number"`            // Human-readable order ID (e.g., "DGS-10001")
	Items           []OrderItem        `bson:"items"                   json:"items"`                   // Items in the order
	TotalAmount     float64            `bson:"total_amount"            json:"total_amount"`            // Total cost of the order
	ShippingAddress Address            `bson:"shipping_address"        json:"shipping_address"`        // Delivery address, uses Address struct from user.go
	Status          string             `bson:"status"                  json:"status"`                  // Values: "pending", "shipped", "delivered", "cancelled", etc.
	StatusText      string             `bson:"status_text"             json:"status_text"`             // Localized status description (e.g., Persian)
	PaymentStatus   string             `bson:"payment_status"          json:"payment_status"`          // Values: "pending", "paid", "failed"
	PaymentMethod   string             `bson:"payment_method"          json:"payment_method"`          // Payment method: "online", "wallet", "cod"
	ZibalTrackID    *int64             `bson:"zibal_track_id,omitempty" json:"zibal_track_id,omitempty"` // Zibal payment tracking ID
	ZibalRefNumber  *string            `bson:"zibal_ref_number,omitempty" json:"zibal_ref_number,omitempty"` // Zibal reference number
	TrackingCode    *string            `bson:"tracking_code,omitempty" json:"tracking_code,omitempty"` // Shipping tracking number (nullable)
	IsActive        bool               `bson:"is_active"               json:"is_active"`               // Soft delete flag
	CreatedAt       time.Time          `bson:"created_at"              json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"              json:"updated_at"`
	PaidAt          *time.Time         `bson:"paid_at,omitempty"       json:"paid_at,omitempty"`       // Payment completion time
}

// GetProductCount returns the total number of products in the order
func (o *Order) GetProductCount() int {
	count := 0
	for _, item := range o.Items {
		count += item.Quantity
	}
	return count
}

// OrderResponse represents the API response for an order, including Jalali dates
type OrderResponse struct {
	Order
	JalaliCreatedAt string `json:"jalali_created_at"`
	JalaliUpdatedAt string `json:"jalali_updated_at"`
}

// ToResponse converts an Order to an OrderResponse with additional fields
func (o *Order) ToResponse() OrderResponse {
	return OrderResponse{
		Order:           *o,
		JalaliCreatedAt: utils.ToJalaliDateString(o.CreatedAt),
		JalaliUpdatedAt: utils.ToJalaliDateString(o.UpdatedAt),
	}
}

// GetJalaliCreatedAt returns the creation date in Jalali format
func (o *Order) GetJalaliCreatedAt() string {
	return utils.ToJalaliDateString(o.CreatedAt)
}

// GetJalaliUpdatedAt returns the update date in Jalali format
func (o *Order) GetJalaliUpdatedAt() string {
	return utils.ToJalaliDateString(o.UpdatedAt)
}

// Note: This model requires the following indexes:
// - user_id (For fetching a user's orders)
// - status + created_at (For order tracking)
