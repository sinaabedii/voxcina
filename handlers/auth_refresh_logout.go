package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// refreshTokenService is the stateful refresh-token store. It is initialized by
// InitRefreshTokenService from main.go, exactly like chatService etc. Auth
// handlers and middlewares read it through GetRefreshTokenService().
var refreshTokCfgsvc *services.RefreshTokenService

// InitRefreshTokenService wires in the refresh-token service and creates the
// required MongoDB indexes (jti unique, family, TTL). Called from main.go
// after db.Connect.
func InitRefreshTokenService(database *mongo.Database) {
	refreshTokCfgsvc = services.NewRefreshTokenService(database)
	if err := refreshTokCfgsvc.EnsureReady(); err != nil {
		log.Printf("Warning: Could not ensure refresh_tokens indexes: %v", err)
	}
}

// GetRefreshTokenService returns the package-level refresh-token service. It
// must not be called before InitRefreshTokenService.
func GetRefreshTokenService() *services.RefreshTokenService {
	if refreshTokCfgsvc == nil {
		panic("handlers.GetRefreshTokenService() called before InitRefreshTokenService()")
	}
	return refreshTokCfgsvc
}

// TokenPairResult is the small struct returned by the helpers and consumed by
// the individual login/register/refresh handlers when serializing JSON
// responses. Exposed (not unexported) so handlers in the same package can read
// both fields.
type TokenPairResult struct {
	AccessToken  string `json:"token"`
	RefreshToken string `json:"refreshToken"`
}

// issueTokenPairForUser is used by Login/Register/Signup/LoginViaSMS to issue a
// brand-new access/refresh token pair for an authenticated user. It uses the
// latest user role / token_version from the DB so revocations immediately take
// effect on the next refresh, and persists a hashed refresh-token record (so the
// refresh handler can later rotate/revoke it). Returns an error if the user is
// inactive or the JWT signing key has not been configured.
func issueTokenPairForUser(ctx context.Context, user *models.User) (*TokenPairResult, error) {
	if !user.IsActive {
		return nil, services.ErrUserInactive
	}
	pair, err := GetRefreshTokenService().IssueNewPair(
		ctx, user.ID, user.Email, user.Role, user.TokenVersion,
	)
	if err != nil {
		return nil, err
	}
	return &TokenPairResult{AccessToken: pair.AccessToken, RefreshToken: pair.RefreshToken}, nil
}

// RefreshToken handles POST /api/users/refresh.
//
// It accepts a refresh-token JWT in the request body, rotates it (invalidating
// the old one), re-validates the user against the database, and returns a NEW
// access token AND a NEW refresh token (rotation). Attempting to reuse an
// already-rotated token is treated as token theft and causes the entire token
// family to be revoked — see services.RefreshTokenService.Rotate for details.
//
// Response (200):
//
//	{"accessToken": "<new access>", "refreshToken": "<new refresh>"}
//
// The legacy response shape used only "accessToken"; the new shape also returns
// "refreshToken" (rotation). The frontend was updated to store the rotated
// refresh token immediately so the old one can no longer be replayed.
func RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.AuthErrorResponse(w, http.StatusBadRequest, utils.ErrCodeInvalidFormat, "Invalid refresh request")
		return
	}
	if req.RefreshToken == "" {
		utils.AuthErrorResponse(w, http.StatusBadRequest, utils.ErrCodeInvalidFormat, "Refresh token is required")
		return
	}

	svc := GetRefreshTokenService()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pair, _, err := svc.Rotate(ctx, req.RefreshToken)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrTokenReuse), errors.Is(err, services.ErrTokenRevoked):
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Token reuse detected; session revoked")
		case errors.Is(err, services.ErrTokenExpired):
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeTokenExpired, "Refresh token expired")
		case errors.Is(err, services.ErrTokenNotFound), errors.Is(err, services.ErrNonRefreshToken):
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token")
		case errors.Is(err, services.ErrUserInactive):
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "User account deactivated")
		default:
			if errors.Is(err, jwt.ErrTokenExpired) {
				utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeTokenExpired, "Refresh token expired")
				return
			}
			if errors.Is(err, jwt.ErrSignatureInvalid) {
				utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token signature")
				return
			}
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token")
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"accessToken":  pair.AccessToken,
		"refreshToken": pair.RefreshToken,
	})
}

// Logout handles POST /api/users/logout (authenticated).
//
// In the stateless access-token world we cannot retroactively invalidate an
// access token (it is valid until its short `exp`). Instead we:
//   - revoke the refresh token presented in the request body, and
//   - increment the user's token_version so the access token becomes invalid
//     as soon as AuthMiddleware reads the user document next (typically within
//     the same minute).
//
// The client MUST also clear its local token storage, as before. Request body
// shape (refreshToken optional but recommended):
//
//	{"refreshToken": "<refresh jwt>"}
func Logout(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	svc := GetRefreshTokenService()

	// Increment token_version so the short-lived access token is also rejected
	// once the middleware re-reads the user document.
	if err := svc.RevokeAllForUser(ctx, userID, true); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error completing logout")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Logout successful.",
	})
}
