package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/utils"
)

// OrderTimelineEntry represents a single entry in the order timeline
type OrderTimelineEntry struct {
	Status    string             `bson:"status"               json:"status"`
	Timestamp time.Time          `bson:"timestamp"            json:"timestamp"`
	Note      string             `bson:"note,omitempty"       json:"note,omitempty"`
	AdminID   primitive.ObjectID `bson:"admin_id,omitempty"   json:"admin_id,omitempty"`
	AdminName string             `bson:"admin_name,omitempty" json:"admin_name,omitempty"`
}

// OrderNote represents an internal admin note on an order
type OrderNote struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"  json:"id,omitempty"`
	Content   string             `bson:"content"        json:"content"`
	AdminID   primitive.ObjectID `bson:"admin_id"       json:"admin_id"`
	AdminName string             `bson:"admin_name"     json:"admin_name"`
	CreatedAt time.Time          `bson:"created_at"     json:"created_at"`
}

// OrderVariant represents product variant details
type OrderVariant struct {
	VariantID string `bson:"variant_id,omitempty" json:"variantId,omitempty"`
	Size      string `bson:"size"                json:"size"`
	Color     string `bson:"color"               json:"color"`
	ColorName string `bson:"color_name,omitempty" json:"colorName,omitempty"` // Display name for the color
	SKU       string `bson:"sku,omitempty"        json:"sku,omitempty"`       // Unique SKU for this variant
}

// OrderItem represents a single item in an order
type OrderItem struct {
	ProductID       primitive.ObjectID `bson:"product_id"        json:"product_id"`        // Reference to products
	ProductName     string             `bson:"product_name"      json:"product_name"`      // Snapshot of product name at purchase time
	ProductImage    string             `bson:"product_image"     json:"product_image"`     // Snapshot of main product image
	Variant         OrderVariant       `bson:"variant"           json:"variant"`           // Size and color information
	Quantity        int                `bson:"quantity"          json:"quantity"`          // Number of items ordered
	PriceAtPurchase float64            `bson:"price_at_purchase" json:"price_at_purchase"` // Snapshot of price at order time
}

// Order represents a customer order
type Order struct {
	ID                          primitive.ObjectID   `bson:"_id,omitempty"              json:"id,omitempty"`
	UserID                      primitive.ObjectID   `bson:"user_id"                    json:"user_id"`                                  // Reference to users
	OrderNumber                 string               `bson:"order_number"               json:"order_number"`                             // Human-readable order ID (e.g., "DGS-10001")
	Items                       []OrderItem          `bson:"items"                      json:"items"`                                    // Items in the order
	TotalAmount                 float64              `bson:"total_amount"               json:"total_amount"`                             // Total cost of the order
	ShippingCost                float64              `bson:"shipping_cost"              json:"shipping_cost"`                            // Shipping cost
	TaxAmount                   float64              `bson:"tax_amount"                 json:"tax_amount"`                               // Tax included in the order total
	DiscountAmount              float64              `bson:"discount_amount"            json:"discount_amount"`                          // Discount amount applied
	DiscountCode                string               `bson:"discount_code,omitempty"    json:"discount_code,omitempty"`                  // Discount code used
	ShippingAddress             Address              `bson:"shipping_address"           json:"shipping_address"`                         // Delivery address, uses Address struct from user.go
	Status                      string               `bson:"status"                     json:"status"`                                   // Values: "pending", "shipped", "delivered", "cancelled", etc.
	StatusText                  string               `bson:"status_text"                json:"status_text"`                              // Localized status description (e.g., Persian)
	PaymentStatus               string               `bson:"payment_status"             json:"payment_status"`                           // Values: "pending", "paid", "failed"
	PaymentMethod               string               `bson:"payment_method"             json:"payment_method"`                           // Payment method: "online", "wallet", "cod"
	ZibalTrackID                *int64               `bson:"zibal_track_id,omitempty"   json:"zibal_track_id,omitempty"`                 // Zibal payment tracking ID
	ZibalRefNumber              *string              `bson:"zibal_ref_number,omitempty" json:"zibal_ref_number,omitempty"`               // Zibal reference number
	GatewayName                 string               `bson:"gateway_name,omitempty"     json:"gateway_name,omitempty"`                   // Payment gateway: "zibal" | "digipay" | "snappay"
	MerchantTransactionID       string               `bson:"merchant_transaction_id,omitempty" json:"merchant_transaction_id,omitempty"` // Transaction ID generated by this store; the only one the customer sees
	GatewayTransactionID        string               `bson:"gateway_transaction_id,omitempty" json:"gateway_transaction_id,omitempty"`   // Transaction ID returned by the provider (admin only)
	GatewayReference            string               `bson:"gateway_reference,omitempty" json:"gateway_reference,omitempty"`             // Provider payment token/reference
	DigipayTrackingCode         string               `bson:"digipay_tracking_code,omitempty" json:"digipay_tracking_code,omitempty"`     // DigiPay bank tracking code
	TrackingCode                *string              `bson:"tracking_code,omitempty"    json:"tracking_code,omitempty"`                  // Shipping tracking number (nullable)
	Timeline                    []OrderTimelineEntry `bson:"timeline,omitempty"         json:"timeline,omitempty"`                       // Order status change history
	Notes                       []OrderNote          `bson:"notes,omitempty"            json:"notes,omitempty"`                          // Internal admin notes
	IsActive                    bool                 `bson:"is_active"                  json:"is_active"`                                // Soft delete flag
	CreatedAt                   time.Time            `bson:"created_at"                 json:"created_at"`
	UpdatedAt                   time.Time            `bson:"updated_at"                 json:"updated_at"`
	PaidAt                      *time.Time           `bson:"paid_at,omitempty"          json:"paid_at,omitempty"`      // Payment completion time
	DeliveredAt                 *time.Time           `bson:"delivered_at,omitempty"     json:"delivered_at,omitempty"` // When the order transitioned to "delivered"; drives the 7-day return window
	SnappPayLastOperationAt     *time.Time           `bson:"snappay_last_operation_at,omitempty" json:"-"`
	SnappPayOperationInProgress bool                 `bson:"snappay_operation_in_progress,omitempty" json:"-"`
	SnappPayOperationStartedAt  *time.Time           `bson:"snappay_operation_started_at,omitempty" json:"-"`
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
