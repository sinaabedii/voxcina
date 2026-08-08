package handlers

import (
	"regexp"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/services/authjwt"
)

// RoleAdmin / RoleCustomer are role-string constants shared across the
// codebase. Defined here (and re-exported from authjwt for the middleware that
// already imported them via the handlers package) so existing handler code can
// keep referencing handlers.RoleAdmin etc.
const (
	RoleCustomer = authjwt.RoleCustomer
	RoleAdmin    = authjwt.RoleAdmin
)

// Email validation regex (optional)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// IR phone number validation regex: 09xxxxxxxxx (11 digits starting with 09)
var irPhoneRegex = regexp.MustCompile(`^09[0-9]{9}$`)

// Claims is the JWT claim type. It is an alias of authjwt.Claims so that
// existing handler code (and middlewares) can keep using handlers.Claims /
// handlers.GetJWTKey without churn, while the JWT primitives themselves live in
// the authjwt package (breaking the handlers <-> services import cycle).
type Claims = authjwt.Claims

// GetJWTKey returns the configured JWT signing key. Panics if InitJWT was not
// called at startup. Prefer authjwt.Key/InitJWT in new code.
func GetJWTKey() []byte {
	return authjwt.MustKey()
}

// InitJWT configures the JWT signing key from the JWT_SECRET environment
// variable. Must be called exactly once at startup from main.go before any
// token is signed or verified. Returns an error if the secret is missing or
// matches a known insecure default.
func InitJWT(secret string) error {
	return authjwt.InitJWT(secret)
}

// Convenience re-exports for the token_kind / TTL constants so handler and
// middleware code that already referenced handlers.TokenTypeAccess etc. keeps
// compiling without rewriting every call site.
const (
	TokenTypeAccess           = authjwt.TokenTypeAccess
	TokenTypeRefresh          = authjwt.TokenTypeRefresh
	AccessTokenTTL            = authjwt.AccessTokenTTL
	RefreshTokenTTL           = authjwt.RefreshTokenTTL
	ProactiveRefreshThreshold = authjwt.ProactiveRefreshThreshold
)

// ParseToken is a thin wrapper around authjwt.ParseToken so handlers/middlewares
// keep the `handlers.ParseToken` call style without import-cycle issues.
func ParseToken(tokenString string) (*Claims, error) {
	return authjwt.ParseToken(tokenString)
}

// SignAccessToken is a thin wrapper around authjwt.SignAccessToken.
func SignAccessToken(userID primitive.ObjectID, email, role string, version int64) (string, error) {
	return authjwt.SignAccessToken(userID, email, role, version)
}

// SignRefreshToken is a thin wrapper around authjwt.SignRefreshToken.
func SignRefreshToken(userID primitive.ObjectID, email, role string, version int64, jti string) (string, error) {
	return authjwt.SignRefreshToken(userID, email, role, version, jti)
}

// NewJTI is a thin wrapper around authjwt.NewJTI.
func NewJTI() (string, error) {
	return authjwt.NewJTI()
}
