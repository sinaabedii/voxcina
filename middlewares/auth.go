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
		// channel carries the optional sales-channel attribution claim
		// ("telegram", ...) stamped by the external-service exchange; it is
		// empty for every ordinary session. Checkout stamps it into
		// order.placed_via.
		reqCtx := context.WithValue(r.Context(), "userID", claims.UserID)
		reqCtx = context.WithValue(reqCtx, "role", user.Role)
		reqCtx = context.WithValue(reqCtx, "channel", claims.Channel)

		next.ServeHTTP(w, r.WithContext(reqCtx))
	})
}

// roleGate admits only the listed roles, answering 403 with `message` for
// anyone else. It reads the role from the context value AuthMiddleware set from
// the LIVE user document, so a demotion takes effect on the next request rather
// than when the token expires.
//
// It assumes AuthMiddleware already ran; requireRoles is what guarantees that.
func roleGate(next http.Handler, message string, allowed ...string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		for _, want := range allowed {
			if role == want {
				next.ServeHTTP(w, r)
				return
			}
		}

		utils.AuthErrorResponse(
			w,
			http.StatusForbidden,
			utils.ErrCodeInsufficientRole,
			message,
		)
	})
}

// requireRoles authenticates the request and then applies roleGate.
func requireRoles(message string, allowed ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return AuthMiddleware(roleGate(next, message, allowed...))
	}
}

// AdminAuthMiddleware checks for admin role (wraps AuthMiddleware)
func AdminAuthMiddleware(next http.Handler) http.Handler {
	return requireRoles("Admin access required", handlers.RoleAdmin)(next)
}

// StaffAuthMiddleware guards the subset of /api/admin that the restricted
// "staff" back-office role may use: the catalog and content sections
// (products, categories, brands, blogs, tickets). Admins are admitted too —
// staff is a strict subset of what an admin can do, never a separate silo.
//
// It is deliberately opt-in: a route reaches staff only by being registered on
// the staff subrouter, so every admin route added later stays admin-only until
// someone moves it on purpose.
func StaffAuthMiddleware(next http.Handler) http.Handler {
	return requireRoles("Staff or admin access required", handlers.RoleAdmin, handlers.RoleStaff)(next)
}

// SellerAuthMiddleware guards the seller panel at /api/seller.
//
// Sellers only — deliberately NOT admins. Every endpoint behind it is scoped to
// the caller's own id, so admitting an admin would just show them their own
// empty partner panel; admins read a seller's figures through
// /api/admin/sellers/{id}, which is built from the same code path.
func SellerAuthMiddleware(next http.Handler) http.Handler {
	return requireRoles("Seller access required", handlers.RoleSeller)(next)
}
