package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Notification types. The set is closed on the backend; an app that predates a
// new value renders it under NotificationType.UNKNOWN with the server's title
// and body, so adding a type is always safe. Never REMOVE a value: old apps
// still route on it.
const (
	NotificationTypeOrderPlaced      = "order_placed"
	NotificationTypeOrderStatus      = "order_status_changed"
	NotificationTypePaymentSucceeded = "payment_succeeded"
	NotificationTypePaymentFailed    = "payment_failed"
	NotificationTypeReturnDecided    = "return_decided"
	NotificationTypeTicketReplied    = "ticket_replied"
	NotificationTypeTryonReply       = "tryon_reply"
	NotificationTypeVoucherGranted   = "voucher_granted"
	NotificationTypeVoucherExpiring  = "voucher_expiring"
	NotificationTypeCouponOffer      = "coupon_offer"
	NotificationTypeCartReminder     = "cart_reminder"
	NotificationTypePriceDrop        = "price_drop"
	NotificationTypeBackInStock      = "back_in_stock"
	NotificationTypePromotion        = "promotion"
	NotificationTypeAnnouncement     = "announcement"
)

// NotificationAudienceKinds — how a notification's recipients were chosen.
// These are the values the ADMIN dashboard composes on (audience_kind); they
// are not all wire-legal on the app side. See NotificationAudienceForApp.
const (
	NotificationAudienceUser     = "user"     // one specific user
	NotificationAudienceSegment  = "segment"  // resolved from an audience rule
	NotificationAudienceAll      = "all"      // broadcast to every active user
	NotificationAudienceWishlist = "wishlist" // product-side trigger, §4
)

// The app's NotificationAudience enum is CLOSED to three wire values
// (domain/model/NotificationModels.kt): broadcast, segment, user. Anything
// else it reads as USER.
const (
	NotificationAudienceWireBroadcast = "broadcast"
	NotificationAudienceWireSegment   = "segment"
	NotificationAudienceWireUser      = "user"
)

// NotificationAudienceForApp maps an internal audience kind onto the app's
// three-value vocabulary, which is what an inbox row's `audience` field must
// carry.
//
// "all" is the one that matters: the app has no such value, so it falls back to
// USER, and every shop-wide campaign renders as if it were a personal message
// about the reader's own order (NotificationCard.kt branches on exactly this).
// "wishlist" is a rule-resolved slice of users, which is what SEGMENT means.
func NotificationAudienceForApp(kind string) string {
	switch kind {
	case NotificationAudienceAll:
		return NotificationAudienceWireBroadcast
	case NotificationAudienceSegment, NotificationAudienceWishlist:
		return NotificationAudienceWireSegment
	case NotificationAudienceWireBroadcast:
		return NotificationAudienceWireBroadcast
	default:
		return NotificationAudienceWireUser
	}
}

// The §5 deep-link vocabulary. The wire carries target_type + target_id +
// target_extra — never a route or a URL. The app resolves the name through a
// closed `when` (push/NotificationDeepLink.kt); anything unrecognised becomes
// inert rather than a guess, which is what keeps a forged payload from
// steering the app to an arbitrary screen (Android intent redirection).
const (
	NotificationTargetHome          = "home"
	NotificationTargetReturns       = "returns"
	NotificationTargetTickets       = "tickets"
	NotificationTargetVouchers      = "vouchers"
	NotificationTargetCollection    = "collection"
	NotificationTargetTryon         = "tryon"
	NotificationTargetNotifications = "notifications"
	NotificationTargetOrders        = "orders"
	NotificationTargetOrderDetail   = "order_detail"
	NotificationTargetTicketDetail  = "ticket_detail"
	NotificationTargetCart          = "cart"
	NotificationTargetProductDetail = "product_detail"
	NotificationTargetProducts      = "products"
)

// TargetTypeNeedsID — target kinds whose target_id carries an ObjectID.
func TargetTypeNeedsID(targetType string) bool {
	switch targetType {
	case NotificationTargetOrderDetail,
		NotificationTargetTicketDetail,
		NotificationTargetProductDetail:
		return true
	}
	return false
}

// ValidNotificationTargetType reports whether t is in the §5 vocabulary.
func ValidNotificationTargetType(t string) bool {
	switch t {
	case NotificationTargetHome,
		NotificationTargetReturns,
		NotificationTargetTickets,
		NotificationTargetVouchers,
		NotificationTargetCollection,
		NotificationTargetTryon,
		NotificationTargetNotifications,
		NotificationTargetOrders,
		NotificationTargetOrderDetail,
		NotificationTargetTicketDetail,
		NotificationTargetCart,
		NotificationTargetProductDetail,
		NotificationTargetProducts:
		return true
	}
	return false
}

// ValidNotificationType reports whether t is an emit-able notification type.
func ValidNotificationType(t string) bool {
	switch t {
	case NotificationTypeOrderPlaced,
		NotificationTypeOrderStatus,
		NotificationTypePaymentSucceeded,
		NotificationTypePaymentFailed,
		NotificationTypeReturnDecided,
		NotificationTypeTicketReplied,
		NotificationTypeTryonReply,
		NotificationTypeVoucherGranted,
		NotificationTypeVoucherExpiring,
		NotificationTypeCouponOffer,
		NotificationTypeCartReminder,
		NotificationTypePriceDrop,
		NotificationTypeBackInStock,
		NotificationTypePromotion,
		NotificationTypeAnnouncement:
		return true
	}
	return false
}

// The five preference kinds, mirroring the app's Android channels
// (NotificationChannelKind in domain/model/NotificationModels.kt) one-for-one.
const (
	NotificationPrefOrders        = "orders"
	NotificationPrefPayments      = "payments"
	NotificationPrefSupport       = "support"
	NotificationPrefOffers        = "offers"
	NotificationPrefAnnouncements = "announcements"
)

// NotificationPreferenceKeyOf maps a notification type onto the preference
// kind that governs it. Consulted BEFORE enqueuing: a muted category must not
// produce an inbox row or a push. Unknown types default to announcements.
func NotificationPreferenceKeyOf(notificationType string) string {
	switch notificationType {
	case NotificationTypeOrderPlaced,
		NotificationTypeOrderStatus,
		NotificationTypeReturnDecided:
		return NotificationPrefOrders
	case NotificationTypePaymentSucceeded,
		NotificationTypePaymentFailed:
		return NotificationPrefPayments
	case NotificationTypeTicketReplied,
		NotificationTypeTryonReply:
		return NotificationPrefSupport
	case NotificationTypeVoucherGranted,
		NotificationTypeVoucherExpiring,
		NotificationTypeCouponOffer,
		NotificationTypeCartReminder,
		NotificationTypePriceDrop,
		NotificationTypeBackInStock:
		return NotificationPrefOffers
	default:
		return NotificationPrefAnnouncements
	}
}

// NotificationRetention is how long an inbox row lives before the TTL index
// sweeps it. Fanning a campaign out writes one row per user per send; without
// retention this collection becomes the largest in the database.
const NotificationRetention = 90 * 24 * time.Hour

// Notification is one inbox row per recipient. A broadcast is fanned out into
// one row per user, never stored once and joined — that is what makes
// is_read, per-user deletion and the unread count a single indexed query.
type Notification struct {
	ID       primitive.ObjectID `bson:"_id,omitempty"   json:"id,omitempty"`
	UserID   primitive.ObjectID `bson:"user_id"         json:"-"`
	Type     string             `bson:"type"            json:"type"`
	Audience string             `bson:"audience"        json:"audience"`

	Title string `bson:"title"           json:"title"`
	Body  string `bson:"body"            json:"body"`
	Image string `bson:"image,omitempty" json:"image,omitempty"`

	// Deep link: a destination NAME and its arguments. Never a route.
	TargetType  string `bson:"target_type,omitempty"  json:"target_type,omitempty"`
	TargetID    string `bson:"target_id,omitempty"    json:"target_id,omitempty"`
	TargetExtra string `bson:"target_extra,omitempty" json:"target_extra,omitempty"`

	IsRead bool       `bson:"is_read"           json:"is_read"`
	ReadAt *time.Time `bson:"read_at,omitempty" json:"-"`

	// Set on rows created by a campaign, so one send can be reported on.
	CampaignID *primitive.ObjectID `bson:"campaign_id,omitempty" json:"-"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	// TTL index target ({expires_at: 1} with expireAfterSeconds: 0).
	ExpiresAt time.Time `bson:"expires_at" json:"-"`
}

// PushProvider is how an install can be reached.
const (
	PushProviderFCM  = "fcm"
	PushProviderNone = "none"
)

// UserDevice is one install's push registration. install_id — the stable
// per-install UUID the app sends — is the upsert key, NOT the token: FCM
// rotates tokens, and keying on the token accumulates a dead row per rotation
// until the user receives everything several times.
type UserDevice struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	UserID       primitive.ObjectID `bson:"user_id"`
	InstallID    string             `bson:"install_id"`
	Token        string             `bson:"token,omitempty"`
	Platform     string             `bson:"platform"`
	PushProvider string             `bson:"push_provider"`
	AppVersion   string             `bson:"app_version,omitempty"`
	Locale       string             `bson:"locale,omitempty"`
	// Cleared on sign-out; a row with no user is not pushed to.
	LastSeenAt time.Time `bson:"last_seen_at"`
	CreatedAt  time.Time `bson:"created_at"`
	UpdatedAt  time.Time `bson:"updated_at"`
}

// NotificationPreferences is the five-channel opt-out state. Defaults are
// TRUE — transactional notifications are opt-out, not opt-in.
type NotificationPreferences struct {
	UserID        primitive.ObjectID `bson:"user_id" json:"-"`
	Orders        bool               `bson:"orders"        json:"orders"`
	Payments      bool               `bson:"payments"      json:"payments"`
	Support       bool               `bson:"support"       json:"support"`
	Offers        bool               `bson:"offers"        json:"offers"`
	Announcements bool               `bson:"announcements" json:"announcements"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"-"`
}

// DefaultNotificationPreferences returns the all-on state.
func DefaultNotificationPreferences() NotificationPreferences {
	return NotificationPreferences{
		Orders:        true,
		Payments:      true,
		Support:       true,
		Offers:        true,
		Announcements: true,
	}
}

// Campaign lifecycle: composed → queued (send now or at SendAt) → sending →
// sent / failed.
const (
	NotificationCampaignStatusDraft    = "draft"
	NotificationCampaignStatusQueued   = "queued"
	NotificationCampaignStatusSending  = "sending"
	NotificationCampaignStatusSent     = "sent"
	NotificationCampaignStatusFailed   = "failed"
	NotificationCampaignStatusCanceled = "canceled"
)

// PushOutboxMaxAttempts is how many FCM delivery tries a push gets before it
// is marked failed for good.
const PushOutboxMaxAttempts = 8

// PushOutbox lifecycle.
const (
	PushOutboxStatusPending   = "pending"
	PushOutboxStatusDelivered = "delivered"
	PushOutboxStatusFailed    = "failed"
)

// PushOutbox is one queued push delivery: an outbox row written AFTER the
// inbox row (never before — the app marks the row read by id when tapped, and
// a push naming a row that does not exist yet produces a 404 on that write),
// then delivered to every device the user currently has. Devices are resolved
// at delivery time so tokens rotated between enqueue and send still work.
type PushOutbox struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	NotificationID primitive.ObjectID `bson:"notification_id"`
	UserID         primitive.ObjectID `bson:"user_id"`

	Status        string     `bson:"status"`
	Attempts      int        `bson:"attempts"`
	NextAttemptAt time.Time  `bson:"next_attempt_at"`
	DeliveredAt   *time.Time `bson:"delivered_at,omitempty"`
	LastError     string     `bson:"last_error,omitempty"`
	CreatedAt     time.Time  `bson:"created_at"`
	UpdatedAt     time.Time  `bson:"updated_at"`
	// TTL index target — mirrors the inbox row it optimises, so a hold backlog
	// (e.g. FCM never configured) self-sweeps instead of growing forever.
	ExpiresAt time.Time `bson:"expires_at"`
}

// Segment rule fields — the audience-rule vocabulary the dashboard composes.
// Resolved to user ids at send time (§4). Field names are the wire format the
// admin dashboard sends.
const (
	SegmentFieldBoughtWithinDays   = "bought_within_days"
	SegmentFieldNeverBought        = "never_bought"
	SegmentFieldHasAbandonedCart   = "has_abandoned_cart"
	SegmentFieldOwnsUnusedVoucher  = "owns_unused_voucher"
	SegmentFieldFavouritedProduct  = "favourited_product"
	SegmentFieldCity               = "city"
	SegmentFieldProvince           = "province"
	SegmentFieldLastOpenWithinDays = "last_open_within_days"
)

// ValidSegmentField reports whether f is a supported audience-rule field.
func ValidSegmentField(f string) bool {
	switch f {
	case SegmentFieldBoughtWithinDays,
		SegmentFieldNeverBought,
		SegmentFieldHasAbandonedCart,
		SegmentFieldOwnsUnusedVoucher,
		SegmentFieldFavouritedProduct,
		SegmentFieldCity,
		SegmentFieldProvince,
		SegmentFieldLastOpenWithinDays:
		return true
	}
	return false
}

// NotificationCampaign holds what an admin composed — audience rule, copy,
// target, schedule — plus the counters the dashboard reports off.
type NotificationCampaign struct {
	ID   primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Type string             `bson:"type"          json:"type"`

	AudienceKind string                 `bson:"audience_kind" json:"audience_kind"`
	AudienceUser *primitive.ObjectID    `bson:"audience_user,omitempty" json:"audience_user,omitempty"`
	Segment      map[string]interface{} `bson:"segment,omitempty" json:"segment,omitempty"`

	Title string `bson:"title"           json:"title"`
	Body  string `bson:"body"            json:"body"`
	Image string `bson:"image,omitempty" json:"image,omitempty"`

	TargetType  string `bson:"target_type,omitempty"  json:"target_type,omitempty"`
	TargetID    string `bson:"target_id,omitempty"    json:"target_id,omitempty"`
	TargetExtra string `bson:"target_extra,omitempty" json:"target_extra,omitempty"`

	// SendAt is when a scheduled campaign becomes due; zero = send now.
	SendAt *time.Time `bson:"send_at,omitempty" json:"send_at,omitempty"`

	// CreatedBy is the admin user id (an audit id, never a display name).
	CreatedBy primitive.ObjectID `bson:"created_by,omitempty" json:"created_by,omitempty"`

	Status    string     `bson:"status"              json:"status"`
	FannedOut int        `bson:"fanned_out"          json:"fanned_out"` // inbox rows written
	Pushed    int        `bson:"pushed"              json:"pushed"`     // push outbox rows written
	Delivered int        `bson:"delivered"           json:"delivered"`  // pushes confirmed by FCM
	Read      int        `bson:"read"                json:"read"`       // rows read
	Error     string     `bson:"error,omitempty"     json:"error,omitempty"`
	SentAt    *time.Time `bson:"sent_at,omitempty"   json:"sent_at,omitempty"`
	CreatedAt time.Time  `bson:"created_at"          json:"created_at"`
	UpdatedAt time.Time  `bson:"updated_at"          json:"updated_at"`
}

// NotificationTemplate is an admin-editable copy template for the event-driven
// notifications, stored in notification_templates. Rendering is Go's
// text/template over a small data map; a missing template falls back to the
// built-in copy in config/notification_templates.json / the code default.
type NotificationTemplate struct {
	ID   primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Type string             `bson:"type"          json:"type"`
	// Enabled=false mutes the event-driven notification entirely.
	Enabled   bool      `bson:"enabled" json:"enabled"`
	Title     string    `bson:"title"   json:"title"`
	Body      string    `bson:"body"    json:"body"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
