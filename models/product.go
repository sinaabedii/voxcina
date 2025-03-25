package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name       string             `bson:"name" json:"name"`
	Price      float64            `bson:"price" json:"price"`
	CategoryID string             `bson:"categoryId" json:"categoryId"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}
