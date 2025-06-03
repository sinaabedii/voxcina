package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ProductVariant represents a size/color variant of a product
type ProductVariant struct {
	Size     string   `bson:"size"     json:"size"`     // e.g., "S", "M", "L"
	Color    string   `bson:"color"    json:"color"`    // e.g., "Red", "Blue"
	SKU      string   `bson:"sku"      json:"sku"`      // Unique per variant (e.g., "TSHIRT-RED-M")
	Quantity int      `bson:"quantity" json:"quantity"` // Available stock
	Images   []string `bson:"images"   json:"images"`   // Optional variant-specific images
}

// ProductAttribute represents product-wide metadata (non-variant)
type ProductAttribute struct {
	Name  string `bson:"name"  json:"name"`  // e.g., "Material", "Care Instructions"
	Value string `bson:"value" json:"value"` // e.g., "Cotton", "Machine Washable"
}

// Product represents a product in the shop
type Product struct {
	ID            primitive.ObjectID   `bson:"_id,omitempty"            json:"id,omitempty"`
	Name          string               `bson:"name"                     json:"name"`
	Description   string               `bson:"description"              json:"description"`
	Price         float64              `bson:"price"                    json:"price"`                // Base price
	OriginalPrice float64              `bson:"original_price"           json:"originalPrice"`        // Original price before any discounts
	Images        []string             `bson:"images"                   json:"images"`               // Main product images (URLs)
	TryOnImage    string               `bson:"try_on_image,omitempty"   json:"tryOnImage,omitempty"` // Image used for virtual try-on feature
	CategoryIDs   []primitive.ObjectID `bson:"category_ids"             json:"category_ids"`         // References to `categories`
	BrandID       primitive.ObjectID   `bson:"brand_id"                 json:"brand_id"`             // Reference to `brands`
	Brand         string               `bson:"brand"                    json:"brand"`                // Brand name
	Variants      []ProductVariant     `bson:"variants"                 json:"variants"`             // Size/color-specific data
	Attributes    []ProductAttribute   `bson:"attributes"               json:"attributes"`           // Product-wide metadata
	IsFlashSale   bool                 `bson:"is_flash_sale"            json:"is_flash_sale"`        // Part of flash-sale campaign?
	IsActive      bool                 `bson:"is_active"                json:"is_active"`            // Soft delete flag
	InStock       bool                 `bson:"in_stock"                 json:"inStock"`              // Indicates if product is in stock
	CreatedAt     time.Time            `bson:"created_at"               json:"created_at"`
	UpdatedAt     time.Time            `bson:"updated_at"               json:"updated_at"`
	AverageRating float64              `bson:"average_rating,omitempty" json:"average_rating,omitempty"` // Average rating calculated from reviews
	ReviewCount   int                  `bson:"review_count,omitempty"   json:"review_count,omitempty"`   // Total number of reviews
	Reviews       []Review             `bson:"-"                        json:"reviews,omitempty"`        // Populated programmatically, not stored in MongoDB
}
