package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Lifecycle states of a channel identity.
const (
	ExternalIdentityStatusActive  = "active"
	ExternalIdentityStatusRevoked = "revoked"
)

// How an identity got attached to its user. auto = created together with a
// brand-new shadow user at first contact; contact/otp = phone binding moved it
// onto (or merged it into) a registered account; code_link = the shopper typed
// a link code; admin = manual admin action.
const (
	ExternalIdentityLinkedViaAuto     = "auto"
	ExternalIdentityLinkedViaContact  = "contact"
	ExternalIdentityLinkedViaOTP      = "otp"
	ExternalIdentityLinkedViaCodeLink = "code_link"
	ExternalIdentityLinkedViaAdmin    = "admin"
)

// ExternalIdentity links one platform account (e.g. a Telegram user id) to the
// principal user document. (provider, external_id) is unique forever, so a
// channel account can never be attached to two users.
type ExternalIdentity struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"    json:"id,omitempty"`
	Provider   string             `bson:"provider"         json:"provider"`
	ExternalID string             `bson:"external_id"      json:"external_id"`
	UserID     primitive.ObjectID `bson:"user_id"          json:"user_id"`

	// ProfileSnapshot is whatever the service last sent: usernames, names,
	// language code, etc. Indexed lookups never use it.
	ProfileSnapshot bson.M `bson:"profile_snapshot,omitempty" json:"profile_snapshot,omitempty"`

	// BotIDs records which bot(s) of the provider saw this account (one
	// provider may run more than one bot).
	BotIDs []string `bson:"bot_ids,omitempty" json:"bot_ids,omitempty"`

	Status     string     `bson:"status"      json:"status"`
	LinkedVia  string     `bson:"linked_via"  json:"linked_via"`
	LinkedAt   time.Time  `bson:"linked_at"   json:"linked_at"`
	LastSeenAt *time.Time `bson:"last_seen_at,omitempty" json:"last_seen_at,omitempty"`
	UnlinkedAt *time.Time `bson:"unlinked_at,omitempty" json:"unlinked_at,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// LinkCodeTTL is how long a single-use account-link code stays valid.
const LinkCodeTTL = 15 * time.Minute

// LinkCode is a short-lived, single-use token a shopper generates from the
// site profile and hands to a bot ("link_<code>") to attach their channel
// identity to an existing registered account.
type LinkCode struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"   json:"id,omitempty"`
	Code      string             `bson:"code"            json:"code"`
	UserID    primitive.ObjectID `bson:"user_id"         json:"user_id"`
	ExpiresAt time.Time          `bson:"expires_at"      json:"expires_at"`
	// ConsumedAt is nil until the code is burned; the burn is a single atomic
	// FindOneAndUpdate, so a code can never be used twice.
	ConsumedAt *time.Time `bson:"consumed_at,omitempty" json:"consumed_at,omitempty"`
	CreatedAt  time.Time  `bson:"created_at"            json:"created_at"`
}
