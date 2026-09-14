package services

import (
	"strings"
	"testing"

	"backEnd/models"
)

func TestRenderNotificationCopy(t *testing.T) {
	out := RenderNotificationCopy(
		"سفارش {{order_number}} در وضعیت {{status}} است",
		map[string]string{"order_number": "DGS-00123", "status": "ارسال شده"},
	)
	if !strings.Contains(out, "DGS-00123") || !strings.Contains(out, "ارسال شده") {
		t.Fatalf("placeholders not rendered: %q", out)
	}
	if strings.Contains(out, "{{") {
		t.Fatalf("unrendered placeholder remains: %q", out)
	}
}

func TestRenderNotificationCopyUnknownPlaceholderTrims(t *testing.T) {
	out := RenderNotificationCopy("hello {{unknown_field}} world", map[string]string{})
	if out != "hello  world" {
		t.Fatalf("unknown placeholder not trimmed: %q", out)
	}
}

// TestPreferenceKeyOfCoversEveryType — every closed-set notification type must
// map onto one of the app's five Android channels, or a muted channel would
// leak notifications through the default arm.
func TestPreferenceKeyOfCoversEveryType(t *testing.T) {
	all := []string{
		models.NotificationTypeOrderPlaced,
		models.NotificationTypeOrderStatus,
		models.NotificationTypePaymentSucceeded,
		models.NotificationTypePaymentFailed,
		models.NotificationTypeReturnDecided,
		models.NotificationTypeTicketReplied,
		models.NotificationTypeTryonReply,
		models.NotificationTypeVoucherGranted,
		models.NotificationTypeVoucherExpiring,
		models.NotificationTypeCouponOffer,
		models.NotificationTypeCartReminder,
		models.NotificationTypePriceDrop,
		models.NotificationTypeBackInStock,
		models.NotificationTypePromotion,
		models.NotificationTypeAnnouncement,
	}
	valid := map[string]bool{
		models.NotificationPrefOrders:        true,
		models.NotificationPrefPayments:      true,
		models.NotificationPrefSupport:       true,
		models.NotificationPrefOffers:        true,
		models.NotificationPrefAnnouncements: true,
	}
	for _, notificationType := range all {
		if !valid[models.NotificationPreferenceKeyOf(notificationType)] {
			t.Errorf("type %s maps onto no valid preference kind", notificationType)
		}
	}
}

// allNotificationTypes mirrors the closed set in models; duplicated here so
// the template fallback test cannot be skipped by an edit elsewhere.
var allNotificationTypes = []string{
	models.NotificationTypeOrderPlaced,
	models.NotificationTypeOrderStatus,
	models.NotificationTypePaymentSucceeded,
	models.NotificationTypePaymentFailed,
	models.NotificationTypeReturnDecided,
	models.NotificationTypeTicketReplied,
	models.NotificationTypeTryonReply,
	models.NotificationTypeVoucherGranted,
	models.NotificationTypeVoucherExpiring,
	models.NotificationTypeCouponOffer,
	models.NotificationTypeCartReminder,
	models.NotificationTypePriceDrop,
	models.NotificationTypeBackInStock,
	models.NotificationTypePromotion,
	models.NotificationTypeAnnouncement,
}

func TestBuiltinCopyCoversEveryType(t *testing.T) {
	// promotion and announcement are campaign-only types: their copy is
	// always admin-authored, so an empty template is their correct state.
	campaignOnly := map[string]bool{
		models.NotificationTypePromotion:    true,
		models.NotificationTypeAnnouncement: true,
	}
	for _, notificationType := range allNotificationTypes {
		copied, _ := ResolveNotificationCopy(nil, nil, notificationType, nil)
		if campaignOnly[notificationType] {
			continue
		}
		if copied.Title == "" || copied.Body == "" {
			t.Errorf("type %s has empty built-in copy", notificationType)
		}
		if strings.Contains(copied.Title, "{{") || strings.Contains(copied.Body, "{{") {
			t.Errorf("type %s built-in copy has unrendered placeholders", notificationType)
		}
	}
}

func TestFileNotificationTemplatesParse(t *testing.T) {
	tpl := fileNotificationTemplates()
	if tpl == nil {
		t.Skip("config/notification_templates.json not present in this environment")
	}
	for _, notificationType := range allNotificationTypes {
		if _, ok := tpl[notificationType]; !ok {
			t.Errorf("config file is missing an entry for %s", notificationType)
		}
	}
}
