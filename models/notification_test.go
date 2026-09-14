package models

import (
	"testing"
)

// TestTargetVocabularyCoversSpec pins the §5 deep-link vocabulary: every
// target the app resolves must pass ValidNotificationTargetType, and unknown
// ones must be rejected (the backend silently clears an unknown target rather
// than shipping an inert-but-confusing payload).
func TestTargetVocabularyCoversSpec(t *testing.T) {
	valid := []string{
		"home", "returns", "tickets", "vouchers", "collection", "tryon",
		"notifications", "orders", "order_detail", "ticket_detail", "cart",
		"product_detail", "products",
	}
	for _, targetType := range valid {
		if !ValidNotificationTargetType(targetType) {
			t.Errorf("valid target %q rejected", targetType)
		}
	}
	for _, targetType := range []string{"", "route:/orders", "https://voxcina.com", "orders/123", "PRODUCT_DETAIL"} {
		if ValidNotificationTargetType(targetType) {
			t.Errorf("invalid target %q accepted", targetType)
		}
	}
}

// TestTargetTypeNeedsID — detail targets need an ObjectID; list targets do not.
func TestTargetTypeNeedsID(t *testing.T) {
	for _, targetType := range []string{"order_detail", "ticket_detail", "product_detail"} {
		if !TargetTypeNeedsID(targetType) {
			t.Errorf("%q should require a target id", targetType)
		}
	}
	for _, targetType := range []string{"home", "orders", "cart", "vouchers"} {
		if TargetTypeNeedsID(targetType) {
			t.Errorf("%q should not require a target id", targetType)
		}
	}
}

// TestNotificationTypeSetClosed — the emit-able set is closed; an unknown
// type must be rejected before it can reach a row.
func TestNotificationTypeSetClosed(t *testing.T) {
	for _, notificationType := range []string{
		"order_placed", "order_status_changed", "payment_succeeded",
		"payment_failed", "return_decided", "ticket_replied", "tryon_reply",
		"voucher_granted", "voucher_expiring", "coupon_offer", "cart_reminder",
		"price_drop", "back_in_stock", "promotion", "announcement",
	} {
		if !ValidNotificationType(notificationType) {
			t.Errorf("type %q should be valid", notificationType)
		}
	}
	for _, notificationType := range []string{"", "order", "order_placed_v2"} {
		if ValidNotificationType(notificationType) {
			t.Errorf("type %q should be invalid", notificationType)
		}
	}
}

func TestDefaultPreferencesAllOn(t *testing.T) {
	prefs := DefaultNotificationPreferences()
	if !prefs.Orders || !prefs.Payments || !prefs.Support || !prefs.Offers || !prefs.Announcements {
		t.Fatalf("transactional defaults must be opt-out (all true)")
	}
}
