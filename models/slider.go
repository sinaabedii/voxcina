package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Content positions for a slide's text column.
const (
	ContentPositionRight  = "right"
	ContentPositionLeft   = "left"
	ContentPositionCenter = "center"
)

// Overlay strengths applied over a slide's background image.
const (
	OverlayStrengthNone  = "none"
	OverlayStrengthLight = "light"
	OverlayStrengthDark  = "dark"
)

// IsValidContentPosition reports whether p is a supported content position.
func IsValidContentPosition(p string) bool {
	switch p {
	case ContentPositionRight, ContentPositionLeft, ContentPositionCenter:
		return true
	}
	return false
}

// IsValidOverlayStrength reports whether s is a supported overlay strength.
func IsValidOverlayStrength(s string) bool {
	switch s {
	case OverlayStrengthNone, OverlayStrengthLight, OverlayStrengthDark:
		return true
	}
	return false
}

// SliderStats represents statistics for a slide.
type SliderStats struct {
	Items   string `bson:"items"   json:"items"`
	Brands  string `bson:"brands"  json:"brands"`
	Reviews string `bson:"reviews" json:"reviews"`
}

// Slider represents a slide in the homepage slider.
//
// Slides are entirely admin-authored — there is no code-level fallback list, so
// an empty collection legitimately means "render no slider section".
type Slider struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Title       string             `bson:"title"               json:"title"`
	Subtitle    string             `bson:"subtitle"            json:"subtitle"`
	Description string             `bson:"description"         json:"description"`
	Image       string             `bson:"image"               json:"image"`
	ButtonText  string             `bson:"buttonText"          json:"buttonText"`
	ButtonLink  string             `bson:"buttonLink"          json:"buttonLink"`
	Badge       string             `bson:"badge"               json:"badge"`
	BgColor     string             `bson:"bgColor"             json:"bgColor"`
	AccentColor string             `bson:"accentColor"         json:"accentColor"`
	Discount    string             `bson:"discount"            json:"discount"`
	Features    []string           `bson:"features"            json:"features"`
	Stats       SliderStats        `bson:"stats"               json:"stats"`

	// Order drives display sequence, ascending. Ties fall back to CreatedAt so
	// the public ordering stays stable when several slides share an order.
	Order int `bson:"order" json:"order"`

	// ContentPosition and OverlayStrength let slides vary beyond one fixed
	// look. Empty values are tolerated on read and rendered with the client's
	// defaults, so slides authored before these fields existed still display.
	ContentPosition string `bson:"contentPosition,omitempty" json:"contentPosition,omitempty"`
	OverlayStrength string `bson:"overlayStrength,omitempty" json:"overlayStrength,omitempty"`

	// StartAt/EndAt optionally bound when a slide is publicly visible. Nil means
	// unbounded on that side; both are ignored unless IsActive is also true.
	StartAt *time.Time `bson:"startAt,omitempty" json:"startAt,omitempty"`
	EndAt   *time.Time `bson:"endAt,omitempty"   json:"endAt,omitempty"`

	// No omitempty: this is the publish switch, and omitempty would drop the
	// field whenever it is false, making "unpublish" silently not persist.
	IsActive bool `bson:"isActive" json:"isActive"`

	CreatedAt time.Time `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt time.Time `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}
