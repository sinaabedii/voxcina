// Package authjwt provides the shared JWT primitives used by the access/refresh
// token system. It lives under the services tree to break the import cycle that
// would otherwise occur between handlers and the refresh-token service:
//
//	handlers -> services.RefreshTokenService -> handlers (cycle)
//
// Moving the JWT claims/signing primitives here lets both packages depend on
// authjwt without any cycle, while the refresh-token state machine
// (services.RefreshTokenService) and the HTTP layer (handlers) remain cleanly
// separated.
//
// All access/refresh tokens are HMAC-SHA256 signed with a single key
// configured via InitJWT(). Tokens carry a `token_type` claim that distinguishes
// access from refresh tokens, and a `token_version` claim mirroring the user's
// current document so revocation (logout / deactivation / password change) takes
// effect on the very next protected request.
package authjwt

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- User roles (shared with handlers) ------------------------------------

const (
	RoleCustomer = "customer"
	RoleAdmin    = "admin"
)

// --- JWT signing key (env-driven, fail-fast) -------------------------------

var (
	jwtKey   []byte
	jwtKeyMu sync.RWMutex
)

// ErrJWTKeyNotInitialized is returned when the JWT signing key has not been
// configured via InitJWT before an attempt to issue/verify tokens.
var ErrJWTKeyNotInitialized = errors.New("JWT signing key not initialized: call authjwt.InitJWT() at startup")

// ErrInvalidToken is returned when parsing completes without a valid token.
var ErrInvalidToken = errors.New("invalid JWT")

// sensitiveDefaults lists secret values which must never be silently accepted
// as the production signing key.
var sensitiveDefaults = map[string]struct{}{
	"":                {},
	"my_secret_key":   {},
	"137888":          {},
	"secret":          {},
	"changeme":        {},
	"your-secret-key": {},
}

// InitJWT configures the HMAC signing key used across the application. It MUST
// be called once at startup (from main.go) with the value read from the
// JWT_SECRET environment variable. It fails fast (returns an error) if the
// supplied secret is empty or matches a known insecure default, so a
// misconfigured deployment refuses to start rather than shipping with a
// guessable secret.
func InitJWT(secret string) error {
	if _, ok := sensitiveDefaults[secret]; ok {
		return fmt.Errorf("insecure JWT secret rejected (set JWT_SECRET to a strong random value)")
	}
	if len(secret) < 32 {
		return fmt.Errorf("JWT secret too short: require at least 32 characters")
	}

	jwtKeyMu.Lock()
	defer jwtKeyMu.Unlock()
	if len(jwtKey) > 0 {
		if subtle.ConstantTimeCompare(jwtKey, []byte(secret)) != 1 {
			return fmt.Errorf("JWT signing key already initialized with a different value")
		}
		return nil
	}
	jwtKey = []byte(secret)
	return nil
}

// Key returns the signing key or an error if it was never configured.
func Key() ([]byte, error) {
	jwtKeyMu.RLock()
	defer jwtKeyMu.RUnlock()
	if len(jwtKey) == 0 {
		return nil, ErrJWTKeyNotInitialized
	}
	return append([]byte(nil), jwtKey...), nil
}

// MustKey returns the signing key. Panics if InitJWT was not called. Kept for
// backward compatibility with middlewares that already validated the key at
// startup.
func MustKey() []byte {
	key, err := Key()
	if err != nil {
		panic("authjwt.MustKey() called before authjwt.InitJWT()")
	}
	return key
}

// --- Token type & lifetime constants ---------------------------------------

const (
	// TokenTypeAccess and TokenTypeRefresh are embedded in the `token_type` JWT
	// claim to prevent refresh tokens from being accepted as access tokens (and
	// vice versa). Both share the same HMAC signing key but are validated against
	// different expected types.
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"

	// AccessTokenTTL is the requested seven-day access-token lifetime.
	AccessTokenTTL = 7 * 24 * time.Hour

	// RefreshTokenTTL is one month (30 days). Each refresh rotates the token so
	// reuse of a rotated token revokes the family.
	RefreshTokenTTL = 30 * 24 * time.Hour

	// ProactiveRefreshThreshold is how close to access-token expiry (in
	// seconds) the frontend should proactively refresh. Documentation only; the
	// backend uses the JWT `exp` claim as the source of truth.
	ProactiveRefreshThreshold = 5 * 60
)

// Claims is the JWT payload shared by both token kinds. The TokenType field
// distinguishes access vs refresh tokens, and TokenVersion mirrors the user's
// current token_version so revocation takes effect as soon as the middleware
// next reads the user document.
type Claims struct {
	UserID       primitive.ObjectID `json:"user_id"`
	Email        string             `json:"email"`
	Role         string             `json:"role"`
	TokenType    string             `json:"token_type"`
	TokenVersion int64              `json:"token_version"`
	jwt.RegisteredClaims
}

// NewJTI returns a fresh random JWT ID (128 bits) used to identify individual
// refresh tokens server-side for rotation/reuse-detection.
func NewJTI() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// SignAccessToken constructs and signs a short-lived access token for the given
// user, role and token version. Must be called after InitJWT.
func SignAccessToken(userID primitive.ObjectID, email, role string, version int64) (string, error) {
	key, err := Key()
	if err != nil {
		return "", err
	}
	now := time.Now()
	claims := &Claims{
		UserID:       userID,
		Email:        email,
		Role:         role,
		TokenType:    TokenTypeAccess,
		TokenVersion: version,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

// SignRefreshToken constructs and signs a long-lived refresh token. The JTI is
// stored (hashed) server-side so the token can be rotated and re-use detected.
func SignRefreshToken(userID primitive.ObjectID, email, role string, version int64, jti string) (string, error) {
	key, err := Key()
	if err != nil {
		return "", err
	}
	now := time.Now()
	claims := &Claims{
		UserID:       userID,
		Email:        email,
		Role:         role,
		TokenType:    TokenTypeRefresh,
		TokenVersion: version,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

// ParseToken parses and validates signature/expiry of a JWT, returning the
// typed claims. It does NOT enforce the token_type claim — callers must check
// claims.TokenType themselves (e.g., reject non-access tokens in AuthMiddleware).
func ParseToken(tokenString string) (*Claims, error) {
	key, err := Key()
	if err != nil {
		return nil, err
	}
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method == nil || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, jwt.ErrSignatureInvalid
		}
		return key, nil
	})
	if err != nil {
		return nil, err
	}
	if parsed == nil || !parsed.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// ConstantTimeSecretCompare performs a constant-time comparison of two string
// secrets to avoid timing-based secret extraction. Returns false on length
// mismatch as well as content mismatch.
func ConstantTimeSecretCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
