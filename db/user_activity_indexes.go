package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateUserActivityIndexes creates optimized indexes for user_activities collection
func CreateUserActivityIndexes() error {
	collection := Database.Collection("user_activities")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// ===== USER_ACTIVITIES COLLECTION INDEXES =====

	// 1. User activity history lookup (most common query)
	userActivityIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("user_activity_history").
			SetBackground(true),
	}

	// 2. Session tracking
	sessionIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "session_id", Value: 1},
			{Key: "created_at", Value: 1},
		},
		Options: options.Index().
			SetName("session_tracking").
			SetBackground(true),
	}

	// 3. Activity type analytics
	activityTypeIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "activity_type", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("activity_type_analytics").
			SetBackground(true),
	}

	// 4. Product view tracking
	productViewIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "product_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("product_view_tracking").
			SetBackground(true),
	}

	// 5. Recently viewed products (user + product + time)
	recentlyViewedIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "activity_type", Value: 1},
			{Key: "product_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("recently_viewed_products").
			SetBackground(true),
	}

	// 6. Category analytics
	categoryIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "category_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("category_analytics").
			SetBackground(true),
	}

	// 7. Search query tracking
	searchIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_query", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("search_tracking").
			SetBackground(true),
	}

	// 8. Order tracking
	orderIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "order_id", Value: 1},
		},
		Options: options.Index().
			SetName("order_tracking").
			SetSparse(true).
			SetBackground(true),
	}

	// 9. Device analytics
	deviceIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "device_type", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("device_analytics").
			SetBackground(true),
	}

	// 10. User + Session compound index (for session analytics)
	userSessionIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "session_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("user_session_analytics").
			SetBackground(true),
	}

	// 11. Time-based analytics (date range queries)
	timeRangeIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("time_range_analytics").
			SetBackground(true),
	}

	// 12. TTL Index - Automatically delete activities older than 180 days
	ttlIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "expires_at", Value: 1},
		},
		Options: options.Index().
			SetName("activity_ttl").
			SetExpireAfterSeconds(0). // Documents expire when expires_at is reached
			SetBackground(true),
	}

	// 13. Conversion funnel analysis (activity type + session)
	funnelIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "session_id", Value: 1},
			{Key: "activity_type", Value: 1},
			{Key: "created_at", Value: 1},
		},
		Options: options.Index().
			SetName("conversion_funnel").
			SetBackground(true),
	}

	// 14. Page performance tracking
	pagePathIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "page_path", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("page_performance").
			SetBackground(true),
	}

	// Collect all indexes
	indexes := []mongo.IndexModel{
		userActivityIndex,
		sessionIndex,
		activityTypeIndex,
		productViewIndex,
		recentlyViewedIndex,
		categoryIndex,
		searchIndex,
		orderIndex,
		deviceIndex,
		userSessionIndex,
		timeRangeIndex,
		ttlIndex,
		funnelIndex,
		pagePathIndex,
	}

	// Create all indexes
	log.Println("Creating user_activities collection indexes...")
	indexNames, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Error creating user_activities indexes: %v", err)
		return err
	}

	log.Printf("Successfully created %d indexes for user_activities collection: %v", len(indexNames), indexNames)
	return nil
}
