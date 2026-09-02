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

// refreshTokenPurgeGrace is how long a revoked row stays in the collection
// before the TTL index sweeps it. Android refresh tokens never reach their
// natural (far-future) expiry, and the index on expires_at is the collection's
// only sweeper — so every revocation path re-stamps expires_at to
// now+grace and the dead row cleans itself up. Rotate rejects revoked rows
// on the flag long before the stamp matters; the grace window keeps the row
// readable for diagnostics briefly after the session dies.
const refreshTokenPurgeGrace = 7 * 24 * time.Hour

// normalizeClient maps any platform value to the stored form: exactly
// "android" for the mobile app, "web" for everything else (including an
// absent header, and legacy rows whose stored client is "").
func normalizeClient(client string) string {
	if client == authjwt.ClientAndroid {
		return authjwt.ClientAndroid
	}
	return authjwt.ClientWeb
}

// IssueNewPair issues a fresh access+refresh token pair for a brand new login
// (not a rotation). A new token family is created so all subsequent rotations
// can be revoked together if reuse is later detected. Callers MUST ensure the
// user is active and pass their current token_version. `client` is the
// X-Client-Platform value captured at login; it fixes the pair's lifetime and
// rotation policy ("android" = permanent, non-rotating; anything else = web).
func (s *RefreshTokenService) IssueNewPair(
	ctx context.Context,
	userID primitive.ObjectID,
	email, role string,
	tokenVersion int64,
	client string,
) (TokenPair, error) {
	jti, err := authjwt.NewJTI()
	if err != nil {
		return TokenPair{}, fmt.Errorf("refresh jti: %w", err)
	}
	family, err := randomFamily()
	if err != nil {
		return TokenPair{}, fmt.Errorf("family gen: %w", err)
	}
	return s.persistPair(ctx, userID, email, role, tokenVersion, family, jti, client)
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
//  4. Android policy (stored on the record, not read from headers): the
//     session does not rotate. A fresh ACCESS token is signed and the SAME
//     refresh token is returned, so a lost or duplicated refresh response is
//     indistinguishable from a normal one — no reuse detection can fire, and
//     no rotated ancestor rows accumulate. The token stays valid until the
//     user signs out (family revoke) or the account is revoked.
//  5. Web policy: atomically mark the old token as rotated (so a later replay
//     triggers reuse detection) and insert a NEW refresh-token record in the
//     same family. The child carries the parent's stored client forward.
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

	// Android sessions are permanent and do not rotate: re-sign only the
	// access token and hand the presented refresh token straight back. The
	// response shape is identical to a web refresh, so the client is none the
	// wiser — and every race/lost-response failure mode of rotation is gone.
	if record.Client == authjwt.ClientAndroid {
		accessToken, err := authjwt.SignAccessToken(user.ID, user.Email, user.Role, user.TokenVersion)
		if err != nil {
			return TokenPair{}, nil, err
		}
		return TokenPair{AccessToken: accessToken, RefreshToken: rawRefreshToken}, &user, nil
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
	childClient := normalizeClient(record.Client)
	childExpiry := authjwt.RefreshExpiryFor(now, childClient)
	refreshToken, err := authjwt.SignRefreshToken(user.ID, user.Email, user.Role, user.TokenVersion, newJTI, childExpiry)
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
	// stays revocable as a unit if the new token is later reused. The child
	// inherits the parent's stored client — never the rotation request's
	// header — so a permanent session cannot be downgraded a month later.
	newRecord := models.RefreshTokenRecord{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		Family:    record.Family,
		TokenHash: models.HashRefreshToken(refreshToken),
		JTI:       newJTI,
		Client:    childClient,
		IssuedAt:  now,
		ExpiresAt: childExpiry,
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
// login family. `client` fixes the pair's lifetime and rotation policy; it is
// stored so later rotations carry it forward independent of any header.
func (s *RefreshTokenService) persistPair(
	ctx context.Context,
	userID primitive.ObjectID,
	email, role string,
	tokenVersion int64,
	family, jti string,
	client string,
) (TokenPair, error) {
	now := time.Now()
	client = normalizeClient(client)
	expiresAt := authjwt.RefreshExpiryFor(now, client)
	accessToken, err := authjwt.SignAccessToken(userID, email, role, tokenVersion)
	if err != nil {
		return TokenPair{}, err
	}
	refreshToken, err := authjwt.SignRefreshToken(userID, email, role, tokenVersion, jti, expiresAt)
	if err != nil {
		return TokenPair{}, err
	}
	record := models.RefreshTokenRecord{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Family:    family,
		TokenHash: models.HashRefreshToken(refreshToken),
		JTI:       jti,
		Client:    client,
		IssuedAt:  now,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}
	if _, err := s.collection.InsertOne(ctx, record); err != nil {
		return TokenPair{}, fmt.Errorf("persist refresh token: %w", err)
	}
	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

// RevokeByJTI marks a single refresh token revoked (e.g., on logout). Idempotent.
// The re-stamped expires_at lets the TTL index collect the row (see
// refreshTokenPurgeGrace) even when its natural expiry was far-future.
func (s *RefreshTokenService) RevokeByJTI(ctx context.Context, userID primitive.ObjectID, jti string) error {
	if jti == "" {
		return nil
	}
	now := time.Now()
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"jti": jti, "user_id": userID},
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now, "expires_at": now.Add(refreshTokenPurgeGrace)}},
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
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now, "expires_at": now.Add(refreshTokenPurgeGrace)}},
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
		bson.M{"$set": bson.M{"revoked": true, "revoked_at": now, "expires_at": now.Add(refreshTokenPurgeGrace)}},
	)
	return err
}

// RevokeSessionByRefreshToken revokes one device session: the family of the
// presented refresh token, and only when that token genuinely belongs to
// userID. Unlike RevokeAllForUser it never touches the user's other families
// and never increments token_version, so signing the phone out leaves the
// web storefront (and every other device) logged in.
//
// A token that is unparsable, is not a refresh token, or names a different
// user all answer ErrTokenNotFound — the caller must not learn whether the
// credential exists at all.
func (s *RefreshTokenService) RevokeSessionByRefreshToken(ctx context.Context, userID primitive.ObjectID, rawRefreshToken string) error {
	claims, err := authjwt.ParseToken(rawRefreshToken)
	if err != nil {
		return ErrTokenNotFound
	}
	if claims.TokenType != authjwt.TokenTypeRefresh || claims.ID == "" {
		return ErrTokenNotFound
	}
	if claims.UserID != userID {
		// A well-formed refresh token from someone else's session.
		return ErrTokenNotFound
	}

	var record models.RefreshTokenRecord
	if err := s.collection.FindOne(ctx, bson.M{
		"jti":     claims.ID,
		"user_id": userID,
	}).Decode(&record); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrTokenNotFound
		}
		return fmt.Errorf("refresh token lookup: %w", err)
	}

	return s.revokeFamily(ctx, record.Family, userID, time.Now())
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
