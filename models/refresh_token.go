package models

import (
	"time"

	"crypto/sha256"
	"encoding/hex"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RefreshTokenRecord is the persisted (stateful) counterpart of a refresh JWT.
//
// The JWT itself is the credential presented by the client, but we keep a
// server-side record keyed by its JTI so we can:
//   - rotate refresh tokens (invalidate the old one on each refresh),
//   - detect reuse of an already-rotated token and revoke the whole family,
//   - revoke on logout / deactivation / password change.
//
// We store only a SHA-256 hash of the JWT (never the raw token) so that a
// database read never yields a usable credential. The `Family` field groups all
// refresh tokens issued from a single login chain so reuse detection can kill
// the entire family at once. `Rotated`/`RotatedAt` mark a token that has been
// exchanged for a new one; presenting a rotated token MUST trigger family
// revocation (token theft assumption).
type RefreshTokenRecord struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"      json:"-"`
	UserID    primitive.ObjectID `bson:"user_id"            json:"-"`
	Family    string             `bson:"family"             json:"-"` // SHA-256 hex; ties rotation chain together
	TokenHash string             `bson:"token_hash"         json:"-"` // SHA-256 hex of the raw JWT
	JTI       string             `bson:"jti"                json:"-"` // JWT ID claim; also used for fast lookup
	IssuedAt  time.Time          `bson:"issued_at"          json:"-"`
	ExpiresAt time.Time          `bson:"expires_at"         json:"-"`
	Rotated   bool               `bson:"rotated"            json:"-"` // true once exchanged for a new refresh token
	RotatedAt *time.Time         `bson:"rotated_at,omitempty" json:"-"`
	Revoked   bool               `bson:"revoked"            json:"-"` // true if invalidated (logout/deactivate)
	RevokedAt *time.Time         `bson:"revoked_at,omitempty" json:"-"`
	CreatedAt time.Time          `bson:"created_at"         json:"-"`
}

// HashRefreshToken returns a hex-encoded SHA-256 digest of a raw refresh JWT.
// We persist only the hash so that a DB leak cannot be replayed.
func HashRefreshToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}
