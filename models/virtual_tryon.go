package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	TryonStatusProcessing = "processing"
	TryonStatusDone       = "done"
	TryonStatusError      = "error"
)

// VirtualTryon represents a single virtual try-on generation.
// One document per garment tried on by the user.
type VirtualTryon struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TryonID string            `bson:"tryon_id" json:"tryon_id"`
	UserID primitive.ObjectID `bson:"user_id" json:"user_id"`

	Status string `bson:"status" json:"status"`
	TaskID string `bson:"task_id,omitempty" json:"task_id,omitempty"`

	// Person photo (persisted to uploads/tryon/persons/)
	PersonImageURL  string `bson:"person_image_url" json:"person_image_url"`
	PersonImageHash string `bson:"person_image_hash,omitempty" json:"person_image_hash,omitempty"`

	// Garment inputs
	GarmentImageURL    string `bson:"garment_image_url" json:"garment_image_url"`
	GarmentProductID   primitive.ObjectID `bson:"garment_product_id,omitempty" json:"garment_product_id,omitempty"`
	GarmentProductName string             `bson:"garment_product_name,omitempty" json:"garment_product_name,omitempty"`
	GarmentColor       string             `bson:"garment_color,omitempty" json:"garment_color,omitempty"`
	GarmentSize        string             `bson:"garment_size,omitempty" json:"garment_size,omitempty"`
	GarmentType        string             `bson:"garment_type" json:"garment_type"`

	// AI output
	ResultImageURL string `bson:"result_image_url,omitempty" json:"result_image_url,omitempty"`

	// Provenance
	PromptText string `bson:"prompt_text,omitempty" json:"prompt_text,omitempty"`
	ModelUsed  string `bson:"model_used,omitempty" json:"model_used,omitempty"`

	// Error + timing
	Error       string `bson:"error,omitempty" json:"error,omitempty"`
	DurationMs  int64  `bson:"duration_ms,omitempty" json:"duration_ms,omitempty"`

	CreatedAt   time.Time `bson:"created_at" json:"created_at"`
	CompletedAt *time.Time `bson:"completed_at,omitempty" json:"completed_at,omitempty"`
}
