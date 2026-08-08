package middlewares

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/handlers"
	"backEnd/utils"
)

// AuthMiddleware checks for a valid JWT and sets user info in context
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			utils.AuthErrorResponse(
				w,
				http.StatusUnauthorized,
				utils.ErrCodeMissingHeader,
				"Authorization header required",
			)
			return
		}

		parts := strings.Fields(authHeader)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			utils.AuthErrorResponse(
				w,
				http.StatusUnauthorized,
				utils.ErrCodeInvalidFormat,
				"Invalid token format",
			)
			return
		}
		tokenString := parts[1]

		claims, err := handlers.ParseToken(tokenString)

		if err != nil {
			// Check if the error is due to token expiration
			if errors.Is(err, jwt.ErrTokenExpired) {
				utils.AuthErrorResponse(
					w,
					http.StatusUnauthorized,
					utils.ErrCodeTokenExpired,
					"Token expired",
				)
				return
			}
			// Handle signature invalid error
			if errors.Is(err, jwt.ErrSignatureInvalid) {
				utils.AuthErrorResponse(
					w,
					http.StatusUnauthorized,
					utils.ErrCodeInvalidToken,
					"Invalid token signature",
				)
				return
			}
			// Handle other errors (malformed token, etc.)
			utils.AuthErrorResponse(
				w,
				http.StatusUnauthorized,
				utils.ErrCodeInvalidToken,
				"Invalid token",
			)
			return
		}

		if claims.TokenType != handlers.TokenTypeAccess || claims.UserID.IsZero() {
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid access token")
			return
		}

		// JWTs remain stateless for normal validation, but the user record is
		// checked here so deactivation, role changes, logout, and password
		// changes take effect immediately. This also prevents a stale admin role
		// in a previously issued token from granting admin access.
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		var user struct {
			IsActive     bool   `bson:"is_active"`
			TokenVersion int64  `bson:"token_version"`
			Role         string `bson:"role"`
		}
		if db.Database == nil {
			utils.AuthErrorResponse(w, http.StatusInternalServerError, utils.ErrCodeInvalidToken, "Authentication service unavailable")
			return
		}
		if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": claims.UserID}).Decode(&user); err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid access token")
				return
			}
			utils.AuthErrorResponse(w, http.StatusInternalServerError, utils.ErrCodeInvalidToken, "Authentication service unavailable")
			return
		}
		if !user.IsActive || user.TokenVersion != claims.TokenVersion {
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Session revoked")
			return
		}

		// Token is valid. Set user ID and the current role from MongoDB.
		reqCtx := context.WithValue(r.Context(), "userID", claims.UserID)
		reqCtx = context.WithValue(reqCtx, "role", user.Role)

		next.ServeHTTP(w, r.WithContext(reqCtx))
	})
}

// AdminAuthMiddleware checks for admin role (wraps AuthMiddleware)
func AdminAuthMiddleware(next http.Handler) http.Handler {
	return AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// AuthMiddleware should have already run and set the context values if token was valid.
		roleCtx := r.Context().Value("role")
		if roleCtx == nil {
			utils.AuthErrorResponse(
				w,
				http.StatusInternalServerError,
				utils.ErrCodeInvalidToken,
				"Role not found in context; authentication middleware may have failed.",
			)
			return
		}

		role, ok := roleCtx.(string)
		if !ok {
			utils.AuthErrorResponse(
				w,
				http.StatusInternalServerError,
				utils.ErrCodeInvalidToken,
				"Role in context is of incorrect type",
			)
			return
		}

		if role != handlers.RoleAdmin {
			utils.AuthErrorResponse(
				w,
				http.StatusForbidden,
				utils.ErrCodeInsufficientRole,
				"Admin access required",
			)
			return
		}

		next.ServeHTTP(w, r)
	}))
}
