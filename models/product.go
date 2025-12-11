package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SizeVariant represents a specific size option for a color with its inventory
type SizeVariant struct {
	Size     string `bson:"size" json:"size"`         // e.g., "S", "M", "L", "XL", "XXL"
	SKU      string `bson:"sku" json:"sku"`           // Unique SKU for this color+size combination
	Quantity int    `bson:"quantity" json:"quantity"` // Available inventory for this specific size
}

// ColorVariant represents a color option with its images and available sizes
type ColorVariant struct {
	Color      string        `bson:"color" json:"color"`                                 // Hex code or color name (e.g., "#FF5733", "Red")
	ColorName  string        `bson:"color_name" json:"colorName"`                        // Display name in Persian/English (e.g., "قرمز", "Red")
	Images     []string      `bson:"images" json:"images"`                               // Multiple product images for this color (different angles)
	TryOnImage string        `bson:"try_on_image,omitempty" json:"tryOnImage,omitempty"` // Virtual try-on / AR image for this color
	Sizes      []SizeVariant `bson:"sizes" json:"sizes"`                                 // Available sizes for this color with inventory
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
	Price         float64              `bson:"price"                    json:"price"`                           // Base price
	OriginalPrice float64              `bson:"original_price"           json:"originalPrice"`                   // Original price before any discounts
	MainImages    []string             `bson:"main_images,omitempty"    json:"mainImages,omitempty"`            // Main product images (shared across all colors)
	ColorVariants []ColorVariant       `bson:"color_variants"           json:"colorVariants"`                   // Color variants with their own images and size inventory
	CategoryIDs   []primitive.ObjectID `bson:"category_ids"             json:"category_ids"`                    // References to `categories`
	BrandID       primitive.ObjectID   `bson:"brand_id"                 json:"brand_id"`                        // Reference to `brands`
	Brand         string               `bson:"brand"                    json:"brand"`                           // Brand name
	Collection    string               `bson:"collection,omitempty"     json:"collection,omitempty"`            // Product collection (from seasons: بهار, تابستان, پاییز, زمستان)
	Attributes    []ProductAttribute   `bson:"attributes"               json:"attributes"`                      // Product-wide metadata
	IsFlashSale   bool                 `bson:"is_flash_sale"            json:"is_flash_sale"`                   // Part of flash-sale campaign?
	IsActive      bool                 `bson:"is_active"                json:"is_active"`                       // Soft delete flag
	InStock       bool                 `bson:"in_stock"                 json:"inStock"`                         // Calculated: true if any color+size has quantity > 0
	CreatedAt     time.Time            `bson:"created_at"               json:"created_at"`
	UpdatedAt     time.Time            `bson:"updated_at"               json:"updated_at"`
	AverageRating float64              `bson:"average_rating,omitempty" json:"average_rating,omitempty"`        // Average rating calculated from reviews
	ReviewCount   int                  `bson:"review_count,omitempty"   json:"review_count,omitempty"`          // Total number of reviews
	Reviews       []Review             `bson:"-"                        json:"reviews,omitempty"`               // Populated programmatically, not stored in MongoDB

	// AI Agent Search Optimization (embedded for fast retrieval)
	SearchMetadata *ProductSearchMetadata `bson:"search_metadata,omitempty" json:"searchMetadata,omitempty"` // AI-optimized search fields

	// C2C Marketplace fields (for seller products)
	StoreID   primitive.ObjectID `bson:"store_id,omitempty"   json:"store_id,omitempty"`   // Reference to seller's store
	StoreName string             `bson:"store_name,omitempty" json:"store_name,omitempty"` // Store name for display
	SellerID  primitive.ObjectID `bson:"seller_id,omitempty"  json:"seller_id,omitempty"`  // Reference to seller user
	Images    []string           `bson:"images,omitempty"     json:"images,omitempty"`     // Simple image URLs for seller products
	Variants  []ProductVariant   `bson:"variants,omitempty"   json:"variants,omitempty"`   // Simple variants for seller products
}

// ProductVariant represents a simple variant for C2C seller products
type ProductVariant struct {
	Size     string  `bson:"size"     json:"size"`
	Color    string  `bson:"color"    json:"color"`
	SKU      string  `bson:"sku"      json:"sku"`
	Price    float64 `bson:"price"    json:"price"`
	Quantity int     `bson:"quantity" json:"quantity"`
}

// ColorVariantListItem is used for the product list API - represents one color variant as a separate item
type ColorVariantListItem struct {
	ProductID     string       `json:"productId"`     // Original product ID
	ColorVariant  ColorVariant `json:"colorVariant"`  // The specific color variant
	
	// Product-level fields (duplicated for each color in the list)
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Price         float64  `json:"price"`
	OriginalPrice float64  `json:"originalPrice"`
	Brand         string   `json:"brand"`
	BrandID       string   `json:"brand_id"`
	CategoryIDs   []string `json:"category_ids"`
	Collection    string   `json:"collection,omitempty"`
	IsFlashSale   bool     `json:"is_flash_sale"`
	AverageRating float64  `json:"average_rating,omitempty"`
	ReviewCount   int      `json:"review_count,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	
	// Calculated fields
	TotalInventory int  `json:"totalInventory"` // Sum of all sizes for this color
	InStock        bool `json:"inStock"`        // True if totalInventory > 0
}
