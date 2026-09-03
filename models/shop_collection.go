package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Field limits for admin-authored curated collections. They are mirrored by
// front_end/src/types/shopCollection.ts, so change both together.
const (
	ShopCollectionTitleMaxLength       = 120
	ShopCollectionDescriptionMaxLength = 500
	ShopCollectionMaxImages            = 12
	ShopCollectionMinItems             = 2
	ShopCollectionMaxItems             = 20
	ShopCollectionsPageLimit           = 100
)

// ShopCollectionItem is one product color-variant inside a curated collection.
// It stores a reference, never a copy: the product name, image, price and
// stock are resolved from the products collection at read time so a price
// change or a sell-out is reflected without touching the collection document.
type ShopCollectionItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	VariantID string             `bson:"variant_id" json:"variant_id"` // stable ColorVariant.VariantID
}

// ShopCollection is a curated bundle of specific product color variants,
// authored by an admin in /admin/collections and served publicly from
// /api/shop-collections.
//
// Price follows the admin's choice of mode: when PriceMode is
// ShopCollectionPriceAuto the bundle costs the sum of its items' current
// prices (always recomputed on read); when it is ShopCollectionPriceCustom
// the stored Price wins, and the API additionally reports whether that
// custom value exceeds the live sum so the admin UI can warn about it.
//
// In-stock status is never stored — ShopCollectionView.InStock is computed
// from the referenced variants at read time, so one sold-out variant empties
// the whole bundle without any write to this document.
type ShopCollection struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id,omitempty"`
	Title       string               `bson:"title"         json:"title"`
	Description string               `bson:"description"   json:"description"`
	Images      []string             `bson:"images"        json:"images"`
	Items       []ShopCollectionItem `bson:"items"       json:"items"`

	PriceMode string  `bson:"price_mode" json:"price_mode"` // auto | custom
	Price     float64 `bson:"price"      json:"price"`      // stored only for custom mode

	// IsActive is the publish toggle: an inactive collection disappears from
	// the public endpoints but stays editable in the admin panel.
	IsActive     bool `bson:"is_active"     json:"is_active"`
	DisplayOrder int  `bson:"display_order" json:"display_order"`

	CreatedBy *primitive.ObjectID `bson:"created_by,omitempty" json:"-"`
	CreatedAt time.Time           `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time           `bson:"updated_at"           json:"updated_at"`
}

const (
	ShopCollectionPriceAuto   = "auto"
	ShopCollectionPriceCustom = "custom"
)

// ValidShopCollectionPriceMode reports whether mode is one of the two prices.
func ValidShopCollectionPriceMode(mode string) bool {
	return mode == ShopCollectionPriceAuto || mode == ShopCollectionPriceCustom
}

// ShopCollectionItemView is a resolved collection item: the stored reference
// plus everything read from the product at request time. ProductFound and
// VariantFound stay false when the product was hard-deleted or the color was
// removed, which counts as out of stock by design — a bundle must never
// advertise an item that cannot actually be bought.
type ShopCollectionItemView struct {
	ProductID    string  `json:"product_id"`
	VariantID    string  `json:"variant_id"`
	Link         string  `json:"link"` // /products/{id}?variant={variantId}
	Name         string  `json:"name"`
	ColorName    string  `json:"color_name,omitempty"`
	Color        string  `json:"color,omitempty"`
	Image        string  `json:"image,omitempty"`
	Price        float64 `json:"price"`
	Quantity     int     `json:"quantity"` // sum of sizes for this color
	InStock      bool    `json:"in_stock"`
	ProductFound bool    `json:"product_found"`
	VariantFound bool    `json:"variant_found"`
}

// ShopCollectionView is a collection with its computed price/stock fields.
// The stored document fields are embedded, so existing consumers see the same
// shape plus the computed ones.
type ShopCollectionView struct {
	ShopCollection

	ItemsTotal     float64                  `json:"items_total"`     // live sum of item prices
	EffectivePrice float64                  `json:"effective_price"` // what the bundle costs right now
	PriceWarning   bool                     `json:"price_warning"`   // custom price exceeds items_total
	InStock        bool                     `json:"in_stock"`        // every item in stock
	ItemViews      []ShopCollectionItemView `json:"item_views"`
}
