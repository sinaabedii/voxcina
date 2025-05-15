package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/utils"
)

// AnalyticsEvent represents an analytics event
type AnalyticsEvent struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	EventName string             `bson:"eventName"     json:"eventName"`
	Timestamp time.Time          `bson:"timestamp"     json:"timestamp"`
}

// POST /api/analytics/track
func TrackAnalytics(w http.ResponseWriter, r *http.Request) {
	var event AnalyticsEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid analytics payload")
		return
	}
	event.ID = primitive.NewObjectID()
	event.Timestamp = time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	collection := db.Database.Collection("analytics")
	_, err := collection.InsertOne(ctx, event)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error tracking analytics")
		return
	}
	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Analytics event tracked"},
	)
}
