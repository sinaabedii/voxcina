package handlers

import (
	"context"
	"net/http"
	"time"

	"backEnd/db"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// DashboardStatsHandler returns aggregated statistics for the admin dashboard
func DashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbStats := make(map[string]interface{})
	dbStats["totalProducts"], _ = db.Database.Collection("products").CountDocuments(ctx, bson.M{"is_active": true})
	dbStats["totalUsers"], _ = db.Database.Collection("users").CountDocuments(ctx, bson.M{"is_active": true})
	dbStats["totalOrders"], _ = db.Database.Collection("orders").CountDocuments(ctx, bson.M{"is_active": true})
	dbStats["pendingOrders"], _ = db.Database.Collection("orders").CountDocuments(ctx, bson.M{"is_active": true, "status": "pending"})
	dbStats["totalCategories"], _ = db.Database.Collection("categories").CountDocuments(ctx, bson.M{})
	dbStats["totalBrands"], _ = db.Database.Collection("brands").CountDocuments(ctx, bson.M{})
	now := time.Now()
	dbStats["activeDiscounts"], _ = db.Database.Collection("discounts").CountDocuments(ctx, bson.M{
		"valid_from": bson.M{"$lte": now},
		"valid_to": bson.M{"$gte": now},
	})

	// Pending reviews: if you have a status field, use it; otherwise, count all
	pendingReviews, err := db.Database.Collection("reviews").CountDocuments(ctx, bson.M{"status": "pending"})
	if err != nil {
		pendingReviews, _ = db.Database.Collection("reviews").CountDocuments(ctx, bson.M{})
	}
	dbStats["pendingReviews"] = pendingReviews

	// Total sales: sum total_amount of all active orders
	ordersColl := db.Database.Collection("orders")
	totalSalesAgg := []bson.M{
		{"$match": bson.M{"is_active": true}},
		{"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$total_amount"}}},
	}
	var salesResult []bson.M
	cursor, err := ordersColl.Aggregate(ctx, totalSalesAgg)
	if err == nil {
		err = cursor.All(ctx, &salesResult)
	}
	totalSales := 0.0
	if err == nil && len(salesResult) > 0 {
		if v, ok := salesResult[0]["total"].(float64); ok {
			totalSales = v
		}
	}
	dbStats["totalSales"] = totalSales

	utils.JSONResponse(w, http.StatusOK, dbStats)
} 