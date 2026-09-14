package services

import (
	"strings"
	"testing"

	"backEnd/models"
)

// TestFCMErrorReasonPrefersDetailErrorCode pins the bounced-token path.
//
// FCM v1 reports the generic gRPC status in error.status and the actual FCM
// error code in details[].errorCode. An uninstalled app answers 404 /
// NOT_FOUND / UNREGISTERED: reading only error.status yields "NOT_FOUND",
// which IsPermanent does not recognise, so the device row would never be
// deleted and every push to that phone would burn the full retry budget.
func TestFCMErrorReasonPrefersDetailErrorCode(t *testing.T) {
	cases := []struct {
		name       string
		body       string
		httpStatus int
		want       string
		permanent  bool
	}{
		{
			name:       "uninstalled app",
			httpStatus: 404,
			body: `{"error":{"code":404,"message":"Requested entity was not found.",
			        "status":"NOT_FOUND","details":[
			        {"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError",
			         "errorCode":"UNREGISTERED"}]}}`,
			want:      "UNREGISTERED",
			permanent: true,
		},
		{
			name:       "token minted by another sender",
			httpStatus: 403,
			body: `{"error":{"code":403,"status":"PERMISSION_DENIED","details":[
			        {"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError",
			         "errorCode":"SENDER_ID_MISMATCH"}]}}`,
			want:      "SENDER_ID_MISMATCH",
			permanent: true,
		},
		{
			name:       "fcm overloaded, must retry",
			httpStatus: 503,
			body: `{"error":{"code":503,"status":"UNAVAILABLE","details":[
			        {"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError",
			         "errorCode":"UNAVAILABLE"}]}}`,
			want:      "UNAVAILABLE",
			permanent: false,
		},
		{
			name:       "no details, status is the fallback",
			httpStatus: 400,
			body:       `{"error":{"code":400,"status":"INVALID_ARGUMENT"}}`,
			want:       "INVALID_ARGUMENT",
			permanent:  true,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := fcmErrorReason([]byte(tc.body), tc.httpStatus)
			if got != tc.want {
				t.Fatalf("reason = %q, want %q", got, tc.want)
			}
			err := &FCMSendError{HTTPStatus: tc.httpStatus, Reason: got}
			if err.IsPermanent() != tc.permanent {
				t.Fatalf("IsPermanent() = %v, want %v (a wrong verdict here either "+
					"keeps a dead token forever or deletes a live device)",
					err.IsPermanent(), tc.permanent)
			}
		})
	}
}

// TestActiveUserFilterIsNotShared pins the segment-isolation fix.
//
// BuildSegmentFilter assigns "$and" into the base filter. When that base was a
// shared package-level bson.M, the assignment mutated it in place: the next
// campaign inherited the previous campaign's audience rules, and two
// resolutions running at once (admin preview + fan-out worker) raced on a map
// write, which crashes the process.
func TestActiveUserFilterIsNotShared(t *testing.T) {
	first := activeUserFilter()
	first["$and"] = []interface{}{"a rule from one campaign"}

	second := activeUserFilter()
	if _, leaked := second["$and"]; leaked {
		t.Fatal("activeUserFilter leaked $and into a later call: one campaign's " +
			"audience rule would silently narrow the next campaign's")
	}
	if len(second) != 1 {
		t.Fatalf("fresh filter has %d keys, want 1 (is_active only)", len(second))
	}
}

// TestNotificationAudienceForApp pins the wire vocabulary.
//
// The app's NotificationAudience enum is closed to broadcast/segment/user and
// reads anything else as USER, so an inbox row carrying "all" would make every
// shop-wide campaign render as a personal message about the reader's order.
func TestNotificationAudienceForApp(t *testing.T) {
	cases := map[string]string{
		models.NotificationAudienceAll:      "broadcast",
		models.NotificationAudienceSegment:  "segment",
		models.NotificationAudienceWishlist: "segment",
		models.NotificationAudienceUser:     "user",
		"":                                  "user",
		"something-newer-than-this-build":   "user",
	}
	for in, want := range cases {
		if got := models.NotificationAudienceForApp(in); got != want {
			t.Errorf("NotificationAudienceForApp(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestRenderNotificationCopyFillsPlaceholders pins the copy the event
// emitters produce. Every emitter previously passed no data, so the shipped
// Persian read "سفارش  اکنون در وضعیت  است." with both slots empty.
func TestRenderNotificationCopyFillsPlaceholders(t *testing.T) {
	tpl := builtinNotificationCopy[models.NotificationTypeOrderStatus].Body
	got := RenderNotificationCopy(tpl, map[string]string{
		"order_number": "DGS-10001",
		"status":       "ارسال شده",
	})
	if got == tpl {
		t.Fatal("template was not rendered at all")
	}
	for _, want := range []string{"DGS-10001", "ارسال شده"} {
		if !strings.Contains(got, want) {
			t.Errorf("rendered copy %q is missing %q", got, want)
		}
	}
	if strings.Contains(got, "{{") {
		t.Errorf("rendered copy still carries a placeholder: %q", got)
	}
}
