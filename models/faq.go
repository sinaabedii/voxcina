package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Faq struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Question  string             `bson:"question" json:"question"`
	Answer    string             `bson:"answer" json:"answer"`
	Category  string             `bson:"category,omitempty" json:"category,omitempty"`
	IsActive  bool               `bson:"is_active" json:"is_active"`
	Order     int                `bson:"order" json:"order"`
	CreatedAt time.Time          `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}
