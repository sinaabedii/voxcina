package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SliderStats represents statistics for a slide.
type SliderStats struct {
	Items   string `bson:"items"   json:"items"`
	Brands  string `bson:"brands"  json:"brands"`
	Reviews string `bson:"reviews" json:"reviews"`
}

// Slider represents a slide in the homepage slider.
type Slider struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Title       string             `bson:"title"               json:"title"`
	Subtitle    string             `bson:"subtitle"            json:"subtitle"`
	Description string             `bson:"description"         json:"description"`
	Image       string             `bson:"image"               json:"image"`
	ButtonText  string             `bson:"buttonText"         json:"buttonText"`
	ButtonLink  string             `bson:"buttonLink"         json:"buttonLink"`
	Badge       string             `bson:"badge"               json:"badge"`
	BgColor     string             `bson:"bgColor"             json:"bgColor"`
	AccentColor string             `bson:"accentColor"         json:"accentColor"`
	Discount    string             `bson:"discount"            json:"discount"`
	Features    []string           `bson:"features"            json:"features"`
	Stats       SliderStats        `bson:"stats"               json:"stats"`
	IsActive    bool               `bson:"isActive,omitempty"  json:"isActive,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}