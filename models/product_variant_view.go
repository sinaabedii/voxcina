package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ProductVariantView stores the materialized visit count for one product
// color/pattern variant. VariantID is the identity; color fields are snapshots
// used for diagnostics and older data inspection only.
type ProductVariantView struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	ProductID     primitive.ObjectID `bson:"product_id" json:"productId"`
	VariantID     string             `bson:"variant_id" json:"variantId"`
	Color         string             `bson:"color,omitempty" json:"color,omitempty"`
	ColorName     string             `bson:"color_name,omitempty" json:"colorName,omitempty"`
	SwatchImage   string             `bson:"swatch_image,omitempty" json:"swatchImage,omitempty"`
	ViewCount     int64              `bson:"view_count" json:"viewCount"`
	FirstViewedAt time.Time          `bson:"first_viewed_at" json:"firstViewedAt"`
	LastViewedAt  time.Time          `bson:"last_viewed_at" json:"lastViewedAt"`
}
