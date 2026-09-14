package services

import (
	"encoding/json"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

// The three invariants that break the app silently if violated, pinned here.

// TestDataOnlyMessage forbids a "notification" block in the FCM payload: a
// message carrying one is drawn by Play Services itself while the app is
// backgrounded, so onMessageReceived never fires and the tap cannot be routed.
func TestDataOnlyMessage(t *testing.T) {
	body, err := buildFCMMessageBody("token-1", map[string]string{
		"notification_id": "65f0a1b2c3d4e5f6a7b8c9d0",
		"type":            "order_status_changed",
		"title":           "سفارش شما ارسال شد",
		"body":            "سفارش ۱۴۰۴-۱۲۳ تحویل پست شد",
		"target_type":     "order_detail",
		"target_id":       "65f0a1b2c3d4e5f6a7b8c9d0",
		"target_extra":    "",
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var doc map[string]interface{}
	if err := json.Unmarshal(body, &doc); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	msg, ok := doc["message"].(map[string]interface{})
	if !ok {
		t.Fatalf("payload has no message block: %s", body)
	}
	if _, present := msg["notification"]; present {
		t.Fatalf("payload carries a notification block: %s", body)
	}
	if msg["token"] != "token-1" {
		t.Fatalf("token lost: %s", body)
	}
	data, ok := msg["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("payload has no data block: %s", body)
	}
	if data["notification_id"] != "65f0a1b2c3d4e5f6a7b8c9d0" {
		t.Fatalf("notification_id lost: %s", body)
	}
	if data["target_type"] != "order_detail" {
		t.Fatalf("target_type lost: %s", body)
	}
	android, ok := msg["android"].(map[string]interface{})
	if !ok || android["priority"] != "high" {
		t.Fatalf("android.priority=high missing: %s", body)
	}
}

// TestPushDataNeverCarriesARoute pins the deep-link contract: the wire carries
// target_type/target_id/target_extra — never a route or a URL.
func TestPushDataNeverCarriesARoute(t *testing.T) {
	for _, n := range []*models.Notification{
		{
			Type:       "order_status_changed",
			Title:      "سفارش شما ارسال شد",
			TargetType: "order_detail",
			TargetID:   "65f0a1b2c3d4e5f6a7b8c9d0",
		},
		{Type: "voucher_expiring", Title: "کد تخفیف", TargetType: "vouchers"},
		{Type: "tryon_reply", Title: "اتاق پرو", TargetType: "tryon"},
	} {
		id := primitive.NewObjectID()
		n.ID = id
		data := buildPushData(n)
		if data["notification_id"] != id.Hex() {
			t.Fatalf("notification_id mismatch: %q", data["notification_id"])
		}
		for key, value := range data {
			if strings.HasPrefix(value, "/") || strings.Contains(value, "://") {
				t.Errorf("data[%q]=%q looks like a route or URL", key, value)
			}
		}
		if _, hasRoute := data["route"]; hasRoute {
			t.Fatalf("payload carries a route key")
		}
		if _, hasURL := data["url"]; hasURL {
			t.Fatalf("payload carries a url key")
		}
	}
}

// TestNotificationIDRidesEveryPush — the app marks the row read by the id in
// the payload; without it every tap 404s.
func TestNotificationIDRidesEveryPush(t *testing.T) {
	id := primitive.NewObjectID()
	data := buildPushData(&models.Notification{ID: id, Type: "promotion", Title: "t", Body: "b"})
	if data["notification_id"] != id.Hex() {
		t.Fatalf("notification_id missing from push data")
	}
}
