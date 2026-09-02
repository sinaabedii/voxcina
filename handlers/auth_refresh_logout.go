package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
	"backEnd/services"
	"backEnd/services/authjwt"
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

// clientPlatformFromRequest reads X-Client-Platform (sent unconditionally by
// the Android app; absent on the web storefront) and normalizes it to the
// stored form. Everything that is not an explicit "android" — including the
// web, curl, and future unknown clients — gets today's web policy.
func clientPlatformFromRequest(r *http.Request) string {
	if strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Client-Platform")), authjwt.ClientAndroid) {
		return authjwt.ClientAndroid
	}
	return authjwt.ClientWeb
}

// issueTokenPairForUser is used by Login/Register/Signup/LoginViaSMS to issue a
// brand-new access/refresh token pair for an authenticated user. It uses the
// latest user role / token_version from the DB so revocations immediately take
// effect on the next refresh, and persists a hashed refresh-token record (so the
// refresh handler can later rotate/revoke it). `client` (from
// clientPlatformFromRequest) is stored on the record and fixes the session's
// lifetime + rotation policy for its whole life. Returns an error if the user
// is inactive or the JWT signing key has not been configured.
func issueTokenPairForUser(ctx context.Context, user *models.User, client string) (*TokenPairResult, error) {
	if !user.IsActive {
		return nil, services.ErrUserInactive
	}
	pair, err := GetRefreshTokenService().IssueNewPair(
		ctx, user.ID, user.Email, user.Role, user.TokenVersion, client,
	)
	if err != nil {
		return nil, err
	}
	return &TokenPairResult{AccessToken: pair.AccessToken, RefreshToken: pair.RefreshToken}, nil
}

// RefreshToken handles POST /api/users/refresh.
//
// It accepts a refresh-token JWT in the request body, re-validates the user
// against the database, and rotates the pair — invalidating the old token and
// rejecting reuse of a rotated one as token theft (family revocation).
//
// The one exception is the Android platform, whose sessions never rotate:
// the response carries a new access token and the SAME refresh token, per the
// policy stored on the token's record. The response shape is identical either
// way, so no client can observe the difference.
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
// The endpoint is device-scoped for the Android app and account-wide for the
// web storefront, selected by the X-Client-Platform header that the app sends
// on every request:
//
//   - android: revoke ONLY the family of the refresh token presented in the
//     body, and do NOT increment token_version. The session being signed out
//     is the one presenting the bearer token, and the app discards it
//     immediately; bumping the version is precisely what would reach the
//     user's other devices. A request with no (or unparsable/empty) refresh
//     token still answers 200 — the client has already cleared itself and
//     there is nothing useful to report.
//   - web / no header: today's behavior byte-for-byte — revoke every refresh
//     token for the user AND increment token_version, so other browser
//     sessions die on their next request.
//
// Either way the client MUST also clear its local token storage.
//
// Request body shape (refreshToken required only for android):
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

	if clientPlatformFromRequest(r) == authjwt.ClientAndroid {
		// Best-effort body read: the app always sends the token, but a
		// missing one is a signed-out device, not a failed logout.
		var req struct {
			RefreshToken string `json:"refreshToken"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if strings.TrimSpace(req.RefreshToken) != "" {
			if err := svc.RevokeSessionByRefreshToken(ctx, userID, req.RefreshToken); err != nil {
				if errors.Is(err, services.ErrTokenNotFound) {
					utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid refresh token")
					return
				}
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error completing logout")
				return
			}
		}
		utils.JSONResponse(w, http.StatusOK, map[string]string{
			"message": "Logout successful.",
		})
		return
	}

	// Web/legacy path, unchanged: full account revocation + token_version
	// bump so outstanding access tokens die when the middleware next reads
	// the user document.
	if err := svc.RevokeAllForUser(ctx, userID, true); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error completing logout")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Logout successful.",
	})
}
