package services

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	// OrderExpirationMinutes is the time after which pending orders are auto-cancelled
	OrderExpirationMinutes = 30
)

// OrderCleanupService handles automatic cleanup of abandoned orders
type OrderCleanupService struct {
	db       *mongo.Database
	stopChan chan struct{}
}

// NewOrderCleanupService creates a new order cleanup service
func NewOrderCleanupService(db *mongo.Database) *OrderCleanupService {
	return &OrderCleanupService{
		db:       db,
		stopChan: make(chan struct{}),
	}
}

// Start begins the cleanup scheduler
func (s *OrderCleanupService) Start() {
	go s.runScheduler()
	log.Println("Order cleanup service started (runs every 5 minutes)")
}

// Stop stops the cleanup scheduler
func (s *OrderCleanupService) Stop() {
	close(s.stopChan)
}

func (s *OrderCleanupService) runScheduler() {
	// Run immediately on start
	s.cleanupExpiredOrders()

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.cleanupExpiredOrders()
		case <-s.stopChan:
			log.Println("Order cleanup service stopped")
			return
		}
	}
}

func (s *OrderCleanupService) cleanupExpiredOrders() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := s.db.Collection("orders")
	expirationTime := time.Now().Add(-time.Duration(OrderExpirationMinutes) * time.Minute)

	// Find and update expired pending orders
	filter := bson.M{
		"payment_status": "pending",
		"status":         "pending",
		"created_at":     bson.M{"$lt": expirationTime},
	}

	update := bson.M{
		"$set": bson.M{
			"payment_status": "expired",
			"status":         "cancelled",
			"status_text":    "منقضی شده - پرداخت نشده",
			"updated_at":     time.Now(),
		},
	}

	result, err := collection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Printf("Error cleaning up expired orders: %v", err)
		return
	}

	if result.ModifiedCount > 0 {
		log.Printf("Cleaned up %d expired pending orders", result.ModifiedCount)
	}
}
