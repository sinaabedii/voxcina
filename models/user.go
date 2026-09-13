package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/utils"
)

// Address represents a shipping or billing address for a user
type Address struct {
	// Frontend Persian-specific fields
	Title        string  `bson:"title,omitempty"         json:"title,omitempty"`
	FirstName    string  `bson:"first_name,omitempty"    json:"first_name,omitempty"`
	LastName     string  `bson:"last_name,omitempty"     json:"last_name,omitempty"`
	PhoneNumber  string  `bson:"phone_number,omitempty"  json:"phone_number,omitempty"`
	Province     string  `bson:"province,omitempty"      json:"province,omitempty"`
	ProvinceCode int     `bson:"province_code,omitempty" json:"province_code,omitempty"`
	Address      string  `bson:"address,omitempty"       json:"address,omitempty"`
	PostalCode   string  `bson:"postal_code"             json:"postal_code"`
	Latitude     float64 `bson:"latitude,omitempty"      json:"latitude,omitempty"`
	Longitude    float64 `bson:"longitude,omitempty"     json:"longitude,omitempty"`

	// Original backend fields (kept for compatibility)
	Street    string `bson:"street,omitempty"    json:"street,omitempty"`
	City      string `bson:"city"                json:"city"`
	CityCode  int    `bson:"city_code,omitempty" json:"city_code,omitempty"`
	State     string `bson:"state,omitempty"     json:"state,omitempty"`
	Country   string `bson:"country,omitempty"   json:"country,omitempty"`
	IsDefault bool   `bson:"is_default"          json:"is_default"`
}

// AddressDigitFields are the BSON names of the address fields NormalizeDigits
// rewrites. The one-time backfill (-migrate-address-digits) walks this list, so
// adding a user-typed numeric field here means adding it to NormalizeDigits too.
var AddressDigitFields = []string{"postal_code", "phone_number", "address", "street"}

// NormalizeDigits rewrites the user-typed fields of an address so numbers are
// stored as ASCII digits. Persian (U+06F0-U+06F9) and Arabic-Indic
// (U+0660-U+0669) digits arrive from IME keyboards, while every consumer of
// these fields assumes ASCII: postal-code validation (^\d{10}$), search, and
// the shipping integrations. A Persian-digit postal code is unmatchable and
// unparseable, so the invariant is enforced here rather than trusted from each
// client.
//
// Name-like fields (title, city, province, first/last name) are deliberately
// left alone: digits inside them are display text, not values.
//
// Address is embedded in users.addresses and copied into
// orders.shipping_address, so normalizing here covers both.
func (a *Address) NormalizeDigits() {
	if a == nil {
		return
	}
	a.PostalCode = utils.NormalizePersianDigits(a.PostalCode)
	a.PhoneNumber = utils.NormalizePersianDigits(a.PhoneNumber)
	a.Address = utils.NormalizePersianDigits(a.Address)
	a.Street = utils.NormalizePersianDigits(a.Street)
}

// Account lifecycle of a user document.
//
//	registered — a phone-verified site account (the historic default; legacy
//	            documents with an absent account_type behave as registered)
//	external   — a shadow account created for a channel identity (bot chat);
//	            has no phone and no password until one is bound/set
//	merged     — a shadow whose data was folded into a registered account;
//	            tombstone: is_active=false, merged_into points at the survivor
const (
	AccountTypeRegistered = "registered"
	AccountTypeExternal   = "external"
	AccountTypeMerged     = "merged"
)

// Methods that verified users.phone. Exactly one is recorded per phone; the
// Telegram contact share and the SMS OTP path are alternatives, never stacked.
const (
	PhoneVerifiedMethodContact = "telegram_contact"
	PhoneVerifiedMethodSMSOTP  = "sms_otp"
)

// MergeState tracks an in-flight shadow merge so a concurrent merge attempt
// loses the race instead of corrupting half-moved data.
const (
	MergeStateIdle       = "idle"
	MergeStateInProgress = "in_progress"
	MergeStateDone       = "done"
)

// User represents a registered user
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"       json:"id,omitempty"`
	Name         string             `bson:"name"                json:"name"`
	FirstName    string             `bson:"first_name,omitempty"  json:"first_name,omitempty"`
	LastName     string             `bson:"last_name,omitempty"   json:"last_name,omitempty"`
	Email        string             `bson:"email,omitempty"     json:"email,omitempty"` // Optional
	PasswordHash string             `bson:"password_hash,omitempty" json:"-"`           // Don't include in JSON responses
	// Phone is the identity phone. It is WRITE-ONCE: the only code path that
	// ever sets it runs on a document where the field is empty (a shadow being
	// promoted, or a legacy registered user that never had one). There is no
	// change-phone endpoint; shoppers provide differing numbers as the
	// per-address delivery phone instead. omitempty is what lets a phone-less
	// shadow coexist with the partial unique index (missing field ≠ empty).
	Phone     string    `bson:"phone,omitempty" json:"phone,omitempty"` // IR phone number (09xxxxxxxxx), unique among non-empty
	Addresses []Address `bson:"addresses,omitempty" json:"addresses,omitempty"`
	Role      string    `bson:"role"                json:"role"`      // Values: "customer", "admin"
	IsActive  bool      `bson:"is_active"           json:"is_active"` // Soft delete flag
	CreatedAt time.Time `bson:"created_at"          json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"          json:"updated_at"`
	Reviews   []Review  `bson:"-"               json:"reviews,omitempty"` // Populated programmatically, not stored in MongoDB

	// Account identity fields (external-service integration). Empty values
	// keep legacy documents behaving exactly as registered accounts.
	AccountType   string `bson:"account_type,omitempty"       json:"account_type,omitempty"`
	SignupChannel string `bson:"signup_channel,omitempty"  json:"signup_channel,omitempty"` // provider the account was created through

	// Phone verification provenance.
	PhoneVerifiedMethod    string              `bson:"phone_verified_method,omitempty"    json:"phone_verified_method,omitempty"`
	PhoneVerifiedAt        *time.Time          `bson:"phone_verified_at,omitempty"        json:"phone_verified_at,omitempty"`
	PhoneVerifiedByService *primitive.ObjectID `bson:"phone_verified_by_service,omitempty" json:"-"`

	// Merge tombstone (account_type == merged only).
	MergedInto *primitive.ObjectID `bson:"merged_into,omitempty" json:"-"`
	MergeState string              `bson:"merge_state,omitempty" json:"-"`

	// Mobile app tracking fields
	HasMobileApp bool       `bson:"has_mobile_app"          json:"has_mobile_app"`          // Indicates if user has used mobile app
	LastAppOpen  *time.Time `bson:"last_app_open,omitempty" json:"last_app_open,omitempty"` // Timestamp of last app activity
	AppPlatform  string     `bson:"app_platform,omitempty"  json:"app_platform,omitempty"`  // "android" or "ios"
	AppVersion   string     `bson:"app_version,omitempty"   json:"app_version,omitempty"`   // Version of the mobile app (e.g., "1.2.3")

	// Auth tracking
	LastLogin *time.Time `bson:"last_login,omitempty" json:"last_login,omitempty"` // Timestamp of last successful login

	// Personal info
	Birthday *time.Time `bson:"birthday,omitempty" json:"birthday,omitempty"` // User's date of birth (Gregorian, converted from Jalali)

	// TokenVersion is a monotonically increasing counter that is embedded in
	// JWT access/refresh tokens when they are issued. Any revocation action
	// (logout, deactivation, password change) increments this value; the
	// AuthMiddleware rejects tokens whose embedded version no longer matches
	// the user's current document, taking effect on the very next request.
	// Defaults to 0 (omitted from JSON) so existing documents without the
	// field behave as the zero value.
	TokenVersion int64 `bson:"token_version,omitempty" json:"-"` // not exposed to clients
}

// EffectiveAccountType returns the account's lifecycle state, treating the
// absent field of every pre-existing document as "registered".
func (u *User) EffectiveAccountType() string {
	if u.AccountType == "" {
		return AccountTypeRegistered
	}
	return u.AccountType
}

// IsExternal reports whether the account is a channel shadow (no independent
// login of its own — a phone and/or password must be bound before the
// web/OTP login paths can serve it).
func (u *User) IsExternal() bool {
	return u.EffectiveAccountType() == AccountTypeExternal
}

// IsMerged reports whether the account is a merge tombstone.
func (u *User) IsMerged() bool {
	return u.EffectiveAccountType() == AccountTypeMerged
}

// HasPhone reports whether an identity phone is bound.
func (u *User) HasPhone() bool {
	return u.Phone != ""
}

// HasPassword reports whether a password has been set (external users start
// without one and may set their first password without the current-password
// check).
func (u *User) HasPassword() bool {
	return u.PasswordHash != ""
}
