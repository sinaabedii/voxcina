package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// HeroImage represents a hero section image for the homepage.
// Supports separate images for desktop and mobile devices with customizable gradient overlays.
type HeroImage struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Image        string             `bson:"image"               json:"image"`
	DeviceType   string             `bson:"deviceType"          json:"deviceType"` // "desktop" or "mobile"
	IsActive     bool               `bson:"isActive"            json:"isActive"`
	Gradient     string             `bson:"gradient"            json:"gradient"`
	NoGradient   bool               `bson:"noGradient"          json:"noGradient"`
	DisplayOrder int                `bson:"displayOrder"        json:"displayOrder"`
	// Content holds the admin-authored hero content (text elements, placement,
	// colors) as an opaque document. The frontend owns its shape; the backend
	// only stores and returns it verbatim. Absent on hero images saved before
	// content authoring existed.
	Content interface{} `bson:"content,omitempty"   json:"content,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt    time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// ValidDeviceTypes contains the allowed device type values.
var ValidDeviceTypes = []string{"desktop", "mobile"}

// IsValidDeviceType checks if the given device type is valid.
func IsValidDeviceType(deviceType string) bool {
	for _, valid := range ValidDeviceTypes {
		if deviceType == valid {
			return true
		}
	}
	return false
}
