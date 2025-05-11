package middlewares

import (
	"context"
	"net/http"
	"strings"

	"backEnd/handlers" // Changed from backEnd/handlers
	"backEnd/utils"    // Changed from backEnd/utils
	"github.com/golang-jwt/jwt/v5"
	// "go.mongodb.org/mongo-driver/bson/primitive" // Not directly used in this version of middleware if Claims.UserID is already primitive.ObjectID
)

// AuthMiddleware checks for a valid JWT and sets user info in context
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Authorization header format must be Bearer {token}")
			return
		}
		tokenString := parts[1]

		claims := &handlers.Claims{} // Uses Claims struct from handlers package

		// IMPORTANT: Ensure jwtKey is consistent with the key used in token generation (e.g., in handlers/users.go)
		// TODO: Centralize this JWT key, perhaps via environment variable or a config package.
		var jwtKey = []byte("my_secret_key") 

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid // Or a more specific error
			}
			return jwtKey, nil
		})

		if err != nil {
			if err == jwt.ErrSignatureInvalid {
				utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid token signature")
				return
			}
			// Handle other errors like expired token, malformed token, etc.
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid token: "+err.Error())
			return
		}

		if !token.Valid {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Token is not valid")
			return
		}

		// Token is valid. Ensure UserID in claims is primitive.ObjectID and Role is string.
		// The handlers.Claims struct should already define UserID as primitive.ObjectID.
		ctx := context.WithValue(r.Context(), "userID", claims.UserID) 
		ctx = context.WithValue(ctx, "role", claims.Role)
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminAuthMiddleware checks for admin role (wraps AuthMiddleware)
func AdminAuthMiddleware(next http.Handler) http.Handler {
	return AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// AuthMiddleware should have already run and set the context values if token was valid.
		// We retrieve the role set by AuthMiddleware.
		roleCtx := r.Context().Value("role")
		if roleCtx == nil {
			// This case implies AuthMiddleware failed to set the role, possibly due to an earlier error response.
			// Or, if AuthMiddleware allows requests to pass through under some conditions without setting role (not typical).
			utils.ErrorResponse(w, http.StatusInternalServerError, "Role not found in context; authentication middleware may have failed.")
			return
		}

		role, ok := roleCtx.(string)
		if !ok {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Role in context is of incorrect type")
			return
		}

		if role != handlers.RoleAdmin { // Using RoleAdmin constant from handlers package
			utils.ErrorResponse(w, http.StatusForbidden, "Admin access required")
			return
		}
		
		next.ServeHTTP(w, r)
	}))
} 