package middlewares

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

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

		parts := strings.Split(authHeader, " ")
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

		claims := &handlers.Claims{}

		// Use the shared JWT key from handlers package
		jwtKey := handlers.GetJWTKey()

		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (interface{}, error) {
				// Validate the alg is what you expect:
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return jwtKey, nil
			},
		)

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

		if !token.Valid {
			utils.AuthErrorResponse(
				w,
				http.StatusUnauthorized,
				utils.ErrCodeInvalidToken,
				"Token is not valid",
			)
			return
		}

		// Token is valid. Set userID and role in context.
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "role", claims.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
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

