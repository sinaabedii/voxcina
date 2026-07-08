package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CouponMessage struct {
	Role    string `bson:"role" json:"role"`
	Content string `bson:"content" json:"content"`
}

type CartItemSnapshot struct {
	ProductID   string  `bson:"product_id" json:"product_id"`
	ProductName string  `bson:"product_name" json:"product_name"`
	Price       float64 `bson:"price" json:"price"`
	Color       string  `bson:"color,omitempty" json:"color,omitempty"`
	ColorName   string  `bson:"color_name,omitempty" json:"color_name,omitempty"`
	Size        string  `bson:"size,omitempty" json:"size,omitempty"`
}

type RequiredProduct struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Color     string             `bson:"color,omitempty" json:"color,omitempty"`
	ColorName string             `bson:"color_name,omitempty" json:"color_name,omitempty"`
	Image     string             `bson:"image,omitempty" json:"image,omitempty"`
}

type NegotiatedCoupon struct {
	ID               primitive.ObjectID   `bson:"_id,omitempty" json:"id,omitempty"`
	Code             string               `bson:"code" json:"code"`
	UserID           primitive.ObjectID   `bson:"user_id" json:"user_id"`
	ProductIDs       []primitive.ObjectID `bson:"product_ids" json:"product_ids"`
	RequiredProducts []RequiredProduct    `bson:"required_products,omitempty" json:"required_products,omitempty"`
	CartSnapshot     []CartItemSnapshot   `bson:"cart_snapshot" json:"cart_snapshot"`
	Type             string               `bson:"type" json:"type"`
	Value            float64              `bson:"value" json:"value"`
	ValidUntil       time.Time            `bson:"valid_until" json:"valid_until"`
	Used             bool                 `bson:"used" json:"used"`
	Conversation     []CouponMessage      `bson:"conversation" json:"conversation"`
	TryonID          string               `bson:"tryon_id,omitempty" json:"tryon_id,omitempty"`
	ChatID           string               `bson:"chat_id,omitempty" json:"chat_id,omitempty"`
	CreatedAt        time.Time            `bson:"created_at" json:"created_at"`
}
