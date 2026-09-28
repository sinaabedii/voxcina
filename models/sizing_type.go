package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SizingMeasurementDef defines a single measurement attribute for a clothing category
type SizingMeasurementDef struct {
	Key       string `bson:"key" json:"key"`
	Label     string `bson:"label" json:"label"`
	BodyGuide string `bson:"body_guide" json:"body_guide"` // Persian guide on how to measure on body
	FitAdvice string `bson:"fit_advice" json:"fit_advice"` // Persian advice on how clothing size relates to body size (ease allowance)
}

// SizingType defines a clothing category's standard measurement definitions and diagrams
type SizingType struct {
	ID              primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	Name            string                 `bson:"name" json:"name"`
	Slug            string                 `bson:"slug" json:"slug"`
	Description     string                 `bson:"description,omitempty" json:"description,omitempty"`
	Measurements    []SizingMeasurementDef `bson:"measurements" json:"measurements"`
	ImagePrompt     string                 `bson:"image_prompt,omitempty" json:"image_prompt,omitempty"`
	ImagePath       string                 `bson:"image_path,omitempty" json:"image_path,omitempty"`
	GeneralFitGuide string                 `bson:"general_fit_guide,omitempty" json:"general_fit_guide,omitempty"`
	IsActive        bool                   `bson:"is_active" json:"is_active"`
	DisplayOrder    int                    `bson:"display_order" json:"display_order"`
	CreatedAt       time.Time              `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time              `bson:"updated_at" json:"updated_at"`
}
