package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// External service providers — the platforms whose bots/servers act as
// confidential clients of this backend. The set is closed: a service's
// provider is chosen once at creation and validated everywhere a service acts.
const (
	ExternalServiceProviderTelegram  = "telegram"
	ExternalServiceProviderBale      = "bale"
	ExternalServiceProviderInstagram = "instagram"
)

// Scopes grant a service access to endpoint groups. The exchange scope covers
// identity resolution/token issuance; bind_phone covers every phone-binding
// route (contact share and SMS OTP).
const (
	ExternalServiceScopeIdentityExchange  = "identity:exchange"
	ExternalServiceScopeIdentityBindPhone = "identity:bind_phone"
)

// Phone verification methods a service may use. telegram_contact is only
// meaningful for providers that deliver a verified contact primitive
// (Telegram/Bale); sms_otp is always allowed. The two are alternatives for
// verifying one phone — never stacked.
const (
	ExternalServicePhoneMethodContact = "telegram_contact"
	ExternalServicePhoneMethodOTP     = "sms_otp"
)

// Lifecycle states of a service record.
const (
	ExternalServiceStatusActive   = "active"
	ExternalServiceStatusDisabled = "disabled"
)

// ExternalServiceKeyGracePeriod keeps a rotated-out key valid this long so a
// bot deploy never races its own credential update.
const ExternalServiceKeyGracePeriod = 24 * time.Hour

// ExternalServiceWebhookFailureThreshold is how many consecutive delivery
// failures disable a webhook automatically.
const ExternalServiceWebhookFailureThreshold = 10

// Webhook subscriptions of a service. The signing secret is stored encrypted
// at rest (utils.EncryptWebhookSecret) and never serialized.
type ExternalServiceWebhook struct {
	URL    string   `bson:"url,omitempty"    json:"url,omitempty"`
	Secret string   `bson:"secret,omitempty" json:"-"`
	Events []string `bson:"events,omitempty" json:"events,omitempty"`
	Active bool     `bson:"active"           json:"active"`
}

// ExternalService is a trusted, server-to-server client (e.g. the Telegram bot
// backend). It authenticates with an X-API-Key whose SHA-256 hash is the only
// persisted form of the credential; plaintext exists solely in the create and
// rotate responses.
type ExternalService struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name     string             `bson:"name"          json:"name"`
	Provider string             `bson:"provider"      json:"provider"`
	Status   string             `bson:"status"        json:"status"`
	Scopes   []string           `bson:"scopes"        json:"scopes"`
	// PhoneMethods lists the verification methods the service is allowed to
	// drive. sms_otp is implied for every service; a provider without a
	// contact primitive simply never receives a contact-bind call.
	PhoneMethods []string `bson:"phone_methods,omitempty" json:"phone_methods,omitempty"`

	// Key material. KeyHash is the lookup key; a rotated-out key keeps working
	// through PreviousKeyHash until PreviousKeyExpiresAt.
	KeyHash              string     `bson:"key_hash"                       json:"-"`
	KeyPrefix            string     `bson:"key_prefix"                     json:"key_prefix"`
	KeyLast4             string     `bson:"key_last4"                      json:"key_last4"`
	PreviousKeyHash      string     `bson:"previous_key_hash,omitempty"    json:"-"`
	PreviousKeyExpiresAt *time.Time `bson:"previous_key_expires_at,omitempty" json:"previous_key_expires_at,omitempty"`

	Webhook *ExternalServiceWebhook `bson:"webhook,omitempty" json:"webhook,omitempty"`

	// Consecutive failed webhook deliveries; reset on any success. Crossing
	// ExternalServiceWebhookFailureThreshold flips webhook.active off.
	WebhookFailureCount int `bson:"webhook_failure_count,omitempty" json:"webhook_failure_count,omitempty"`

	CreatedBy  *primitive.ObjectID `bson:"created_by,omitempty"   json:"created_by,omitempty"`
	CreatedAt  time.Time           `bson:"created_at"             json:"created_at"`
	UpdatedAt  time.Time           `bson:"updated_at"             json:"updated_at"`
	LastUsedAt *time.Time          `bson:"last_used_at,omitempty" json:"last_used_at,omitempty"`

	// APIKey is the plaintext key. It is populated only on create/rotate
	// responses and is never stored (bson:"-").
	APIKey string `bson:"-" json:"api_key,omitempty"`
}

// ValidExternalServiceProvider reports whether p is a known provider.
func ValidExternalServiceProvider(p string) bool {
	switch p {
	case ExternalServiceProviderTelegram,
		ExternalServiceProviderBale,
		ExternalServiceProviderInstagram:
		return true
	}
	return false
}

// ValidExternalServiceScope reports whether s is a grantable scope.
func ValidExternalServiceScope(s string) bool {
	switch s {
	case ExternalServiceScopeIdentityExchange,
		ExternalServiceScopeIdentityBindPhone:
		return true
	}
	return false
}

// ValidExternalServicePhoneMethod reports whether m is a known bind method.
func ValidExternalServicePhoneMethod(m string) bool {
	switch m {
	case ExternalServicePhoneMethodContact,
		ExternalServicePhoneMethodOTP:
		return true
	}
	return false
}

// GrantsScope reports whether the service holds the given scope.
func (s *ExternalService) GrantsScope(scope string) bool {
	for _, granted := range s.Scopes {
		if granted == scope {
			return true
		}
	}
	return false
}

// AllowsPhoneMethod reports whether the service may use the given phone bind
// method. sms_otp is always permitted; telegram_contact requires the method
// listed in phone_methods.
func (s *ExternalService) AllowsPhoneMethod(method string) bool {
	if method == ExternalServicePhoneMethodOTP {
		return true
	}
	for _, m := range s.PhoneMethods {
		if m == method {
			return true
		}
	}
	return false
}
