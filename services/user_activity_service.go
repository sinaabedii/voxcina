package services

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// UserActivityService handles user activity tracking operations
type UserActivityService struct {
	collection   *mongo.Collection
	variantViews *mongo.Collection
}

// NewUserActivityService creates a new UserActivityService instance
func NewUserActivityService(database *mongo.Database) *UserActivityService {
	return &UserActivityService{
		collection:   database.Collection("user_activities"),
		variantViews: database.Collection("product_variant_views"),
	}
}

func activityMetadataString(metadata map[string]interface{}, key string) string {
	value, ok := metadata[key]
	if !ok {
		return ""
	}
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}

func (s *UserActivityService) variantViewUpdate(activity models.UserActivity) mongo.WriteModel {
	if activity.ActivityType != models.ActivityProductView || activity.ProductID.IsZero() {
		return nil
	}

	variantID := activityMetadataString(activity.Metadata, "variantId")
	if variantID == "" {
		return nil
	}

	viewedAt := activity.CreatedAt
	if viewedAt.IsZero() {
		viewedAt = time.Now()
	}

	return mongo.NewUpdateOneModel().
		SetFilter(bson.M{
			"product_id": activity.ProductID,
			"variant_id": variantID,
		}).
		SetUpdate(bson.M{
			"$set": bson.M{
				"color":          activityMetadataString(activity.Metadata, "color"),
				"color_name":     activityMetadataString(activity.Metadata, "colorName"),
				"swatch_image":   activityMetadataString(activity.Metadata, "swatchImage"),
				"last_viewed_at": viewedAt,
			},
			"$setOnInsert": bson.M{
				"_id":             primitive.NewObjectID(),
				"product_id":      activity.ProductID,
				"variant_id":      variantID,
				"first_viewed_at": viewedAt,
			},
			"$inc": bson.M{"view_count": int64(1)},
		}).
		SetUpsert(true)
}

func (s *UserActivityService) recordVariantViews(ctx context.Context, activities []models.UserActivity) error {
	if s.variantViews == nil {
		return nil
	}

	updates := make([]mongo.WriteModel, 0, len(activities))
	for _, activity := range activities {
		if update := s.variantViewUpdate(activity); update != nil {
			updates = append(updates, update)
		}
	}
	if len(updates) == 0 {
		return nil
	}

	_, err := s.variantViews.BulkWrite(ctx, updates, options.BulkWrite().SetOrdered(false))
	return err
}

// asInt64 coerces common MongoDB numeric types to int64.
func asInt64(v interface{}) int64 {
	switch val := v.(type) {
	case int64:
		return val
	case int32:
		return int64(val)
	case int:
		return int64(val)
	case float64:
		return int64(val)
	}
	return 0
}

// asInt coerces common MongoDB numeric types to int.
func asInt(v interface{}) int {
	switch val := v.(type) {
	case int64:
		return int(val)
	case int32:
		return int(val)
	case int:
		return val
	case float64:
		return int(val)
	}
	return 0
}

// asFloat64 coerces common MongoDB numeric types to float64.
func asFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case int:
		return float64(val)
	}
	return 0
}

// TrackActivity saves a user activity event to the database
func (s *UserActivityService) TrackActivity(ctx context.Context, activity *models.UserActivity) error {
	if activity.ID.IsZero() {
		activity.ID = primitive.NewObjectID()
	}

	if activity.CreatedAt.IsZero() {
		activity.CreatedAt = time.Now()
	}

	// Set TTL for automatic deletion after 180 days (6 months)
	activity.ExpiresAt = activity.CreatedAt.Add(180 * 24 * time.Hour)

	_, err := s.collection.InsertOne(ctx, activity)
	if err != nil {
		log.Printf("Error tracking activity: %v", err)
		return err
	}
	if err := s.recordVariantViews(ctx, []models.UserActivity{*activity}); err != nil {
		log.Printf("Error updating product variant view counter: %v", err)
	}

	return nil
}

// TrackBatch saves multiple activity events in one operation
func (s *UserActivityService) TrackBatch(ctx context.Context, activities []models.UserActivity) error {
	if len(activities) == 0 {
		return nil
	}

	documents := make([]interface{}, len(activities))
	now := time.Now()
	expiresAt := now.Add(180 * 24 * time.Hour)

	for i := range activities {
		if activities[i].ID.IsZero() {
			activities[i].ID = primitive.NewObjectID()
		}
		if activities[i].CreatedAt.IsZero() {
			activities[i].CreatedAt = now
		}
		activities[i].ExpiresAt = expiresAt
		documents[i] = activities[i]
	}

	_, err := s.collection.InsertMany(ctx, documents)
	if err != nil {
		log.Printf("Error tracking batch activities: %v", err)
		return err
	}
	if err := s.recordVariantViews(ctx, activities); err != nil {
		log.Printf("Error updating product variant view counters: %v", err)
	}

	return nil
}

// GetUserActivities retrieves activities for a specific user with filtering
func (s *UserActivityService) GetUserActivities(ctx context.Context, filter models.ActivityFilter) ([]models.UserActivity, error) {
	query := bson.M{}

	if !filter.UserID.IsZero() {
		query["user_id"] = filter.UserID
	}

	if filter.SessionID != "" {
		query["session_id"] = filter.SessionID
	}

	if len(filter.ActivityTypes) > 0 {
		query["activity_type"] = bson.M{"$in": filter.ActivityTypes}
	}

	if !filter.ProductID.IsZero() {
		query["product_id"] = filter.ProductID
	}

	if !filter.CategoryID.IsZero() {
		query["category_id"] = filter.CategoryID
	}

	if !filter.FromDate.IsZero() || !filter.ToDate.IsZero() {
		dateQuery := bson.M{}
		if !filter.FromDate.IsZero() {
			dateQuery["$gte"] = filter.FromDate
		}
		if !filter.ToDate.IsZero() {
			dateQuery["$lte"] = filter.ToDate
		}
		query["created_at"] = dateQuery
	}

	if filter.DeviceType != "" {
		query["device_type"] = filter.DeviceType
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(filter.Limit)).
		SetSkip(int64(filter.Skip))

	if filter.Limit == 0 {
		opts.SetLimit(100) // Default limit
	}

	cursor, err := s.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.UserActivity
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}

// GetAllActivities retrieves a paginated list of activity events for admin
// views. Unlike GetUserActivities it does not force a user scope and returns
// the total matching document count so the caller can build pagination.
func (s *UserActivityService) GetAllActivities(ctx context.Context, filter models.ActivityFilter) ([]models.UserActivity, int64, error) {
	query := bson.M{}

	if !filter.UserID.IsZero() {
		query["user_id"] = filter.UserID
	}

	if filter.SessionID != "" {
		query["session_id"] = filter.SessionID
	}

	if len(filter.ActivityTypes) > 0 {
		query["activity_type"] = bson.M{"$in": filter.ActivityTypes}
	}

	if !filter.ProductID.IsZero() {
		query["product_id"] = filter.ProductID
	}

	if !filter.CategoryID.IsZero() {
		query["category_id"] = filter.CategoryID
	}

	if !filter.FromDate.IsZero() || !filter.ToDate.IsZero() {
		dateQuery := bson.M{}
		if !filter.FromDate.IsZero() {
			dateQuery["$gte"] = filter.FromDate
		}
		if !filter.ToDate.IsZero() {
			dateQuery["$lte"] = filter.ToDate
		}
		query["created_at"] = dateQuery
	}

	if filter.DeviceType != "" {
		query["device_type"] = filter.DeviceType
	}

	total, err := s.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	if filter.Limit == 0 {
		filter.Limit = 20
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(filter.Limit)).
		SetSkip(int64(filter.Skip))

	cursor, err := s.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var activities []models.UserActivity
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetRecentlyViewedProducts retrieves recently viewed products for a user
func (s *UserActivityService) GetRecentlyViewedProducts(ctx context.Context, userID primitive.ObjectID, limit int) ([]models.RecentlyViewedProduct, error) {
	if limit == 0 {
		limit = 10
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"user_id":       userID,
			"activity_type": models.ActivityProductView,
			"product_id":    bson.M{"$ne": primitive.NilObjectID},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "created_at", Value: -1}}}},
		{{Key: "$limit", Value: limit}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "products",
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: "$product"}},
		{{Key: "$project", Value: bson.M{
			"productId":    "$product_id",
			"productName":  "$product.name",
			"productImage": bson.M{"$arrayElemAt": []interface{}{"$product.images", 0}},
			"price":        "$product.price",
			"viewedAt":     "$created_at",
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.RecentlyViewedProduct
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}

	return products, nil
}

// GetUserActivitySummary generates a summary of user activities
func (s *UserActivityService) GetUserActivitySummary(ctx context.Context, userID primitive.ObjectID, fromDate, toDate time.Time) (*models.UserActivitySummary, error) {
	matchStage := bson.M{
		"user_id": userID,
	}

	if !fromDate.IsZero() || !toDate.IsZero() {
		dateQuery := bson.M{}
		if !fromDate.IsZero() {
			dateQuery["$gte"] = fromDate
		}
		if !toDate.IsZero() {
			dateQuery["$lte"] = toDate
		}
		matchStage["created_at"] = dateQuery
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchStage}},
		{{Key: "$facet", Value: bson.M{
			"totalActivities": bson.A{
				bson.M{"$count": "count"},
			},
			"activityCounts": bson.A{
				bson.M{"$group": bson.M{
					"_id":   "$activity_type",
					"count": bson.M{"$sum": 1},
				}},
			},
			"orderStats": bson.A{
				bson.M{"$match": bson.M{"activity_type": models.ActivityOrderPlaced}},
				bson.M{"$group": bson.M{
					"_id":        nil,
					"totalSpent": bson.M{"$sum": "$order_value"},
					"count":      bson.M{"$sum": 1},
				}},
			},
			"lastActivity": bson.A{
				bson.M{"$sort": bson.D{{Key: "created_at", Value: -1}}},
				bson.M{"$limit": 1},
				bson.M{"$project": bson.M{"created_at": 1}},
			},
			"deviceBreakdown": bson.A{
				bson.M{"$group": bson.M{
					"_id":   "$device_type",
					"count": bson.M{"$sum": 1},
				}},
			},
			"topProducts": bson.A{
				bson.M{"$match": bson.M{
					"activity_type": models.ActivityProductView,
					"product_id":    bson.M{"$ne": primitive.NilObjectID},
				}},
				bson.M{"$group": bson.M{
					"_id":         "$product_id",
					"productName": bson.M{"$first": "$product_name"},
					"count":       bson.M{"$sum": 1},
				}},
				bson.M{"$sort": bson.D{{Key: "count", Value: -1}}},
				bson.M{"$limit": 5},
			},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return &models.UserActivitySummary{UserID: userID}, nil
	}

	result := results[0]
	summary := &models.UserActivitySummary{
		UserID:          userID,
		DeviceBreakdown: make(map[string]int),
	}

	// Parse total activities
	if totalActivities, ok := result["totalActivities"].(primitive.A); ok && len(totalActivities) > 0 {
		if countDoc, ok := totalActivities[0].(bson.M); ok {
			summary.TotalActivities = asInt64(countDoc["count"])
		}
	}

	// Parse activity counts
	if activityCounts, ok := result["activityCounts"].(primitive.A); ok {
		for _, item := range activityCounts {
			if activityDoc, ok := item.(bson.M); ok {
				activityType, _ := activityDoc["_id"].(string)
				count := asInt64(activityDoc["count"])

				switch activityType {
				case models.ActivityPageView:
					summary.PageViews = count
				case models.ActivityProductView:
					summary.ProductViews = count
				case models.ActivityAddToCart:
					summary.CartAdditions = count
				case models.ActivitySearch:
					summary.Searches = count
				case models.ActivityOrderPlaced:
					summary.Orders = count
				}
			}
		}
	}

	// Parse order stats
	if orderStats, ok := result["orderStats"].(primitive.A); ok && len(orderStats) > 0 {
		if statsDoc, ok := orderStats[0].(bson.M); ok {
			summary.TotalSpent = asFloat64(statsDoc["totalSpent"])
		}
	}

	// Parse last activity
	if lastActivity, ok := result["lastActivity"].(primitive.A); ok && len(lastActivity) > 0 {
		if activityDoc, ok := lastActivity[0].(bson.M); ok {
			if createdAt, ok := activityDoc["created_at"].(primitive.DateTime); ok {
				summary.LastActivity = createdAt.Time()
			}
		}
	}

	// Parse device breakdown
	if deviceBreakdown, ok := result["deviceBreakdown"].(primitive.A); ok {
		for _, item := range deviceBreakdown {
			if deviceDoc, ok := item.(bson.M); ok {
				deviceType, _ := deviceDoc["_id"].(string)
				count := asInt(deviceDoc["count"])
				if deviceType != "" {
					summary.DeviceBreakdown[deviceType] = count
				}
			}
		}
	}

	// Parse top products
	if topProducts, ok := result["topProducts"].(primitive.A); ok {
		for _, item := range topProducts {
			if productDoc, ok := item.(bson.M); ok {
				productID, _ := productDoc["_id"].(primitive.ObjectID)
				productName, _ := productDoc["productName"].(string)
				count := asInt(productDoc["count"])

				summary.MostViewedProducts = append(summary.MostViewedProducts, models.ProductViewCount{
					ProductID:   productID,
					ProductName: productName,
					ViewCount:   count,
				})
			}
		}
	}

	return summary, nil
}

// GetConversionFunnel calculates the conversion funnel metrics
func (s *UserActivityService) GetConversionFunnel(ctx context.Context, fromDate, toDate time.Time) (*models.ConversionFunnel, error) {
	matchStage := bson.M{}

	if !fromDate.IsZero() || !toDate.IsZero() {
		dateQuery := bson.M{}
		if !fromDate.IsZero() {
			dateQuery["$gte"] = fromDate
		}
		if !toDate.IsZero() {
			dateQuery["$lte"] = toDate
		}
		matchStage["created_at"] = dateQuery
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchStage}},
		{{Key: "$group", Value: bson.M{
			"_id":        "$session_id",
			"activities": bson.M{"$addToSet": "$activity_type"},
		}}},
		{{Key: "$project", Value: bson.M{
			"hasPageView":    bson.M{"$in": []interface{}{models.ActivityPageView, "$activities"}},
			"hasProductView": bson.M{"$in": []interface{}{models.ActivityProductView, "$activities"}},
			"hasCartAdd":     bson.M{"$in": []interface{}{models.ActivityAddToCart, "$activities"}},
			"hasCheckout":    bson.M{"$in": []interface{}{models.ActivityCheckoutStarted, "$activities"}},
			"hasPurchase":    bson.M{"$in": []interface{}{models.ActivityOrderPlaced, "$activities"}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":              nil,
			"totalVisitors":    bson.M{"$sum": bson.M{"$cond": []interface{}{"$hasPageView", 1, 0}}},
			"productViewers":   bson.M{"$sum": bson.M{"$cond": []interface{}{"$hasProductView", 1, 0}}},
			"cartAdders":       bson.M{"$sum": bson.M{"$cond": []interface{}{"$hasCartAdd", 1, 0}}},
			"checkoutStarters": bson.M{"$sum": bson.M{"$cond": []interface{}{"$hasCheckout", 1, 0}}},
			"purchasers":       bson.M{"$sum": bson.M{"$cond": []interface{}{"$hasPurchase", 1, 0}}},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return &models.ConversionFunnel{}, nil
	}

	result := results[0]
	funnel := &models.ConversionFunnel{}

	funnel.TotalVisitors = asInt64(result["totalVisitors"])
	funnel.ProductViewers = asInt64(result["productViewers"])
	funnel.CartAdders = asInt64(result["cartAdders"])
	funnel.CheckoutStarters = asInt64(result["checkoutStarters"])
	funnel.Purchasers = asInt64(result["purchasers"])

	// Calculate conversion rates
	if funnel.TotalVisitors > 0 {
		funnel.VisitorToProductRate = float64(funnel.ProductViewers) / float64(funnel.TotalVisitors) * 100
		funnel.OverallConversionRate = float64(funnel.Purchasers) / float64(funnel.TotalVisitors) * 100
	}
	if funnel.ProductViewers > 0 {
		funnel.ProductToCartRate = float64(funnel.CartAdders) / float64(funnel.ProductViewers) * 100
	}
	if funnel.CartAdders > 0 {
		funnel.CartToCheckoutRate = float64(funnel.CheckoutStarters) / float64(funnel.CartAdders) * 100
	}
	if funnel.CheckoutStarters > 0 {
		funnel.CheckoutToPurchaseRate = float64(funnel.Purchasers) / float64(funnel.CheckoutStarters) * 100
	}

	return funnel, nil
}

// GetSessionAnalytics retrieves session-level analytics
func (s *UserActivityService) GetSessionAnalytics(ctx context.Context, sessionID string) (*models.SessionAnalytics, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"session_id": sessionID}}},
		{{Key: "$group", Value: bson.M{
			"_id":       "$session_id",
			"user_id":   bson.M{"$first": "$user_id"},
			"startTime": bson.M{"$min": "$created_at"},
			"endTime":   bson.M{"$max": "$created_at"},
			"activities": bson.M{"$push": bson.M{
				"type":      "$activity_type",
				"page_path": "$page_path",
				"timestamp": "$created_at",
			}},
			"pageViews":    bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$activity_type", models.ActivityPageView}}, 1, 0}}},
			"productViews": bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$activity_type", models.ActivityProductView}}, 1, 0}}},
			"cartAdds":     bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$activity_type", models.ActivityAddToCart}}, 1, 0}}},
			"converted":    bson.M{"$max": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$activity_type", models.ActivityOrderPlaced}}, true, false}}},
			"deviceType":   bson.M{"$first": "$device_type"},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, nil
	}

	result := results[0]
	analytics := &models.SessionAnalytics{
		SessionID: sessionID,
	}

	if userID, ok := result["user_id"].(primitive.ObjectID); ok {
		analytics.UserID = userID
	}
	if startTime, ok := result["startTime"].(primitive.DateTime); ok {
		analytics.StartTime = startTime.Time()
	}
	if endTime, ok := result["endTime"].(primitive.DateTime); ok {
		analytics.EndTime = endTime.Time()
		analytics.Duration = int(analytics.EndTime.Sub(analytics.StartTime).Seconds())
	}
	analytics.PageViews = asInt(result["pageViews"])
	analytics.ProductViews = asInt(result["productViews"])
	analytics.AddToCartCount = asInt(result["cartAdds"])
	if converted, ok := result["converted"].(bool); ok {
		analytics.Converted = converted
	}
	if deviceType, ok := result["deviceType"].(string); ok {
		analytics.DeviceType = deviceType
	}

	// Extract entry and exit pages
	if activities, ok := result["activities"].(primitive.A); ok && len(activities) > 0 {
		if firstActivity, ok := activities[0].(bson.M); ok {
			if pagePath, ok := firstActivity["page_path"].(string); ok {
				analytics.EntryPage = pagePath
			}
		}
		if lastActivity, ok := activities[len(activities)-1].(bson.M); ok {
			if pagePath, ok := lastActivity["page_path"].(string); ok {
				analytics.ExitPage = pagePath
			}
		}
	}

	return analytics, nil
}

// CleanupOldActivities manually removes activities older than specified days (if needed)
func (s *UserActivityService) CleanupOldActivities(ctx context.Context, daysOld int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)

	result, err := s.collection.DeleteMany(ctx, bson.M{
		"created_at": bson.M{"$lt": cutoffDate},
	})

	if err != nil {
		return 0, err
	}

	log.Printf("Cleaned up %d old activity records", result.DeletedCount)
	return result.DeletedCount, nil
}
