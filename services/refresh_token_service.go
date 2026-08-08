package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services/authjwt"
)

// RefreshTokenService encapsulates the stateful side of the access/refresh-token
// flow: it persists refresh tokens (hashed), rotates them on use, detects reuse
// of a rotated token, revokes the entire family on detection, and supports
// revocation on logout / deactivation / password change.
//
// The JWT signing/verification itself lives in services/authjwt; this service
// only deals with server-side refresh-token bookkeeping.
type RefreshTokenService struct {
	collection *mongo.Collection
}

// NewRefreshTokenService binds the service to the refresh_tokens collection.
func NewRefreshTokenService(database *mongo.Database) *RefreshTokenService {
	return &RefreshTokenService{
		collection: database.Collection("refresh_tokens"),
	}
}

// EnsureReady creates the required indexes. Safe to call multiple times.
func (s *RefreshTokenService) EnsureReady() error {
	return db.CreateRefreshTokenIndexes()
}

// TokenPair holds the raw JWTs returned to clients.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// IssueNewPair issues a fresh access+refresh token pair for a brand new login
// (not a rotation). A new token family is created so all subsequent rotations
// can be revoked together if reuse is later detected. Callers MUST ensure the
// user is active and pass their current token_version.
func (s *RefreshTokenService) IssueNewPair(
	ctx context.Context,
	userID primitive.ObjectID,
	email, role string,
	tokenVersion int64,
) (TokenPair, error) {
	jti, err := authjwt.NewJTI()
	if err != nil {
		return TokenPair{}, fmt.Errorf("refresh jti: %w", err)
	}
	family, err := randomFamily()
	if err != nil {
		return TokenPair{}, fmt.Errorf("family gen: %w", err)
	}
	return s.persistPair(ctx, userID, email, role, tokenVersion, family, jti)
}

// Rotate exchanges a presented refresh token for a new access+refresh pair.
//
// Behavior:
//  1. Parse + verify signature/expiry of the presented token (fails closed).
//  2. Look up the persisted refresh-token record by JTI.
//     - If not found or revoked → theft/invalid → reject.
//     - If rotated (already exchanged) → REUSE DETECTED: revoke the entire
//     family (both known active logins of that user compromised) and reject.
//  3. Re-derive role/is_active/token_version from the database (do NOT trust
//     the claims). Inactive users cannot refresh.
//  4. Atomically mark the old token as rotated (so a later replay triggers
//     reuse detection) and insert a NEW refresh-token record in the same family.
//  5. Sign and return the new token pair.
//
// Returns ErrTokenReuse if reuse was detected (the family is now revoked).
// Returns ErrUserInactive if the user was deactivated since issuing the token.
// Returns ErrTokenRevoked / ErrTokenNotFound for other invalid presentations.
func (s *RefreshTokenService) Rotate(
	ctx context.Context,
	rawRefreshToken string,
) (TokenPair, *models.User, error) {
	// 1. Verify the JWT itself.
	claims, err := authjwt.ParseToken(rawRefreshToken)
	if err != nil {
		return TokenPair{}, nil, fmt.Errorf("refresh token parse: %w", err)
	}
	if claims.TokenType != authjwt.TokenTypeRefresh {
		return TokenPair{}, nil, ErrNonRefreshToken
	}
	if claims.ID == "" {
		return TokenPair{}, nil, ErrTokenNotFound
	}
	now := time.Now()
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(now) {
		return TokenPair{}, nil, ErrTokenExpired
	}

	// 2. Look up the persisted record.
	var record models.RefreshTokenRecord
	if err := s.collection.FindOne(ctx, bson.M{
		"jti":     claims.ID,
		"user_id": claims.UserID,
		"revoked": bson.M{"$ne": true},
	}).Decode(&record); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return TokenPair{}, nil, ErrTokenNotFound
		}
		return TokenPair{}, nil, fmt.Errorf("refresh token lookup: %w", err)
	}
	if subtle.ConstantTimeCompare(
		[]byte(record.TokenHash),
		[]byte(models.HashRefreshToken(rawRefreshToken)),
	) != 1 {
		return TokenPair{}, nil, ErrTokenNotFound
	}

	// 3. Reuse detection: presenting a token that has already been exchanged.
	if record.Rotated {
		// Theft assumption: the legitimate client used the rotated copy while
		// an attacker is replaying the old one. Burn the whole family.
		_ = s.revokeFamily(ctx, record.Family, record.UserID, now)
		return TokenPair{}, nil, ErrTokenReuse
	}
	if now.After(record.ExpiresAt) {
		return TokenPair{}, nil, ErrTokenExpired
	}

	// 4. Re-fetch the user from the DB — never trust the token's role/version.
	users := db.Database.Collection("users")
	var user models.User
	if err := users.FindOne(ctx, bson.M{"_id": claims.UserID}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return TokenPair{}, nil, ErrUserInactive
		}
		return TokenPair{}, nil, fmt.Errorf("user fetch: %w", err)
	}
	if !user.IsActive {
		_ = s.revokeFamily(ctx, record.Family, user.ID, now)
		return TokenPair{}, nil, ErrUserInactive
	}
	// token_version mismatch → old tokens from before a recent revocation.
	// Also burn the family so an attacker holding pre-revocation tokens cannot
	// keep refreshing.
	if user.TokenVersion != claims.TokenVersion {
		_ = s.revokeFamily(ctx, record.Family, user.ID, now)
		return TokenPair{}, nil, ErrTokenRevoked
	}

	// 5. Issue a fresh pair, marking the old one as rotated atomically.
	newJTI, err := authjwt.NewJTI()
	if err != nil {
		return TokenPair{}, nil, fmt.Errorf("new jti: %w", err)
	}
	accessToken, err := authjwt.SignAccessToken(user.ID, user.Email, user.Role, user.TokenVersion)
	if err != nil {
		return TokenPair{}, nil, err
	}
	refreshToken, err := authjwt.SignRefreshToken(user.ID, user.Email, user.Role, user.TokenVersion, newJTI)
	if err != nil {
		return TokenPair{}, nil, err
	}

	// Mark the old token rotated so any later presentation triggers reuse.
	result, err := s.collection.UpdateOne(ctx,
		bson.M{"jti": record.JTI, "user_id": record.UserID, "rotated": false, "revoked": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{
			"rotated":    true,
			"rotated_at": now,
		},
		})
	if err != nil {
		return TokenPair{}, nil, fmt.Errorf("rotate old: %w", err)
	}
	if result.ModifiedCount != 1 {
		// Another request won the rotation race. Treat this presentation as
		// reuse and revoke the family rather than issuing a second child.
		_ = s.revokeFamily(ctx, record.Family, record.UserID, now)
		return TokenPair{}, nil, ErrTokenReuse
	}

	// Insert the new refresh-token record in the SAME family so the family
	// stays revocable as a unit if the new token is later reused.
	newRecord := models.RefreshTokenRecord{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		Family:    record.Family,
		TokenHash: models.HashRefreshToken(refreshToken),
		JTI:       newJTI,
		IssuedAt:  now,
		ExpiresAt: now.Add(authjwt.RefreshTokenTTL),
		CreatedAt: now,
	}
	if _, err := s.collection.InsertOne(ctx, newRecord); err != nil {
		// Rolling back the rotated flag is best-effort and not strictly required:
		// the token still exists and is now marked rotated, so a replay will
		// trigger reuse detection and burn the family. Fail loudly instead.
		return TokenPair{}, nil, fmt.Errorf("insert rotated record: %w", err)
	}
	// A concurrent replay can revoke the family between the old-token update
	// and the child insert. Check the parent after inserting and revoke the
	// child too if that race occurred; otherwise a child inserted after family
	// revocation could remain usable.
	var parentState struct {
		Revoked bool `bson:"revoked"`
	}
	if err := s.collection.FindOne(ctx, bson.M{"jti": record.JTI}, options.FindOne().SetProjection(bson.M{"revoked": 1})).Decode(&parentState); err == nil && parentState.Revoked {
		_, _ = s.collection.UpdateOne(ctx,
			bson.M{"jti": newJTI},
			bson.M{"$set": bson.M{"revoked": true, "revoked_at": time.Now()}},
		)
		return TokenPair{}, nil, ErrTokenReuse
	}

	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, &user, nil
}

// persistPair signs the JWTs and persists the refresh-token record for a new
// login family.
func (s *RefreshTokenService) persistPair(
	ctx context.Context,
	userID primitive.ObjectID,
	email, role string,
	tokenVersion int64,
	family, jti string,
) (TokenPair, error) {
	now := time.Now()
	accessToken, err := authjwt.SignAccessToken(userID, email, role, tokenVersion)
	if err != nil {
		return TokenPair{}, err
	}
	refreshToken, err := authjwt.SignRefreshToken(userID, email, role, tokenVersion, jti)
	if err != nil {
		return TokenPair{}, err
	}
	record := models.RefreshTokenRecord{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Family:    family,
		TokenHash: models.HashRefreshToken(refreshToken),
		JTI:       jti,
		IssuedAt:  now,
		ExpiresAt: now.Add(authjwt.RefreshTokenTTL),
		CreatedAt: now,
	}
	if _, err := s.collection.InsertOne(ctx, record); err != nil {
		return TokenPair{}, fmt.Errorf("persist refresh token: %w", err)
	}
	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

// RevokeByJTI marks a single refresh token revoked (e.g., on logout). Idempotent.
func (s *RefreshTokenService) RevokeByJTI(ctx context.Context, userID primitive.ObjectID, jti string) error {
	if jti == "" {
		return nil
	}
	now := time.Now()
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"jti": jti, "user_id": userID},
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now}},
	)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	return err
}

// RevokeAllForUser revokes every active refresh token for a user (deactivation,
// forced logout, password change). Optionally increments the user's
// token_version so outstanding ACCESS tokens are also invalidated as soon as
// the middleware reads the user document next.
func (s *RefreshTokenService) RevokeAllForUser(ctx context.Context, userID primitive.ObjectID, incrementVersion bool) error {
	now := time.Now()
	if _, err := s.collection.UpdateMany(
		ctx,
		bson.M{"user_id": userID, "revoked": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now}},
	); err != nil {
		return err
	}
	if !incrementVersion {
		return nil
	}
	_, err := db.Database.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$inc": bson.M{"token_version": 1}, "$set": bson.M{"updated_at": now}},
	)
	return err
}

// revokeFamily burns every non-revoked refresh token sharing the same family.
func (s *RefreshTokenService) revokeFamily(ctx context.Context, family string, userID primitive.ObjectID, now time.Time) error {
	_, err := s.collection.UpdateMany(
		ctx,
		bson.M{"family": family, "user_id": userID, "revoked": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now}},
	)
	return err
}

// randomFamily returns a fresh 128-bit family id (hex string) used to tie a
// rotation chain together so reuse detection can revoke them all at once.
func randomFamily() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// --- sentinel errors -------------------------------------------------------

var (
	ErrTokenNotFound   = errors.New("refresh token not found")
	ErrTokenExpired    = errors.New("refresh token expired")
	ErrTokenRevoked    = errors.New("refresh token revoked")
	ErrTokenReuse      = errors.New("refresh token reuse detected")
	ErrUserInactive    = errors.New("user inactive")
	ErrNonRefreshToken = errors.New("presented token is not a refresh token")
)

// ExistAny returns true if there is at least one non-revoked refresh token for
// the given user. Useful for diagnostics only.
func (s *RefreshTokenService) ExistAny(ctx context.Context, userID primitive.ObjectID) (bool, error) {
	count, err := s.collection.CountDocuments(ctx, bson.M{
		"user_id":    userID,
		"revoked":    bson.M{"$ne": true},
		"expires_at": bson.M{"$gt": time.Now()},
	}, options.Count())
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
