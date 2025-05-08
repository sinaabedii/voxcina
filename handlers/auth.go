package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// Register handles user registration by inserting a new user document into MongoDB.
// It now also generates and returns a JWT token upon successful registration.
func Register(w http.ResponseWriter, r *http.Request) {
	// Define a struct to capture registration data
	var registrationData struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&registrationData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if registrationData.Email == "" || registrationData.Password == "" || registrationData.Name == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Name, Email, and Password are required",
		)
		return
	}

	// Create user object
	user := models.User{
		ID:           primitive.NewObjectID(),
		Name:         registrationData.Name,
		Email:        registrationData.Email,
		PasswordHash: registrationData.Password, // Temporary: Replace with proper hashing in production
		Role:         "user",                    // Default role
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		Addresses:    []models.Address{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if user already exists
	collection := db.Database.Collection("users")
	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"email": user.Email}).Decode(&existingUser)
	if err == nil {
		utils.ErrorResponse(w, http.StatusConflict, "Email already registered")
		return
	} else if err.Error() != "mongo: no documents in result" {
		log.Println("Error checking existing user:", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error checking user existence")
		return
	}

	// Insert the new user
	_, err = collection.InsertOne(ctx, user)
	if err != nil {
		log.Println("InsertOne error:", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error inserting user")
		return
	}

	// Generate JWT token
	claims := jwt.MapClaims{
		"email":   user.Email,
		"user_id": user.ID.Hex(),
		"role":    user.Role,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "137888" // Use a strong, environment-variable-based secret in production!
		log.Println("Warning: Using default JWT secret. Set JWT_SECRET environment variable.")
	}

	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Println("Error signing token after registration:", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating token after registration")
		return
	}

	// Clear sensitive data before sending response
	user.PasswordHash = ""
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"token": signedToken,
		"user":  user,
	})
}

// Login authenticates the user and returns a JWT token.
// NOTE: In production, you should use a secure password hashing mechanism.
func Login(w http.ResponseWriter, r *http.Request) {
	// Define a struct to capture login credentials.
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	// Decode the request body.
	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	log.Printf("Attempting login for email: %s", credentials.Email)

	// Lookup the user by email.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	var user models.User
	err := collection.FindOne(ctx, bson.M{"email": credentials.Email}).Decode(&user)
	if err != nil {
		log.Printf("Error finding user %s: %v", credentials.Email, err)
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	log.Printf("User found: ID %s", user.ID.Hex())

	// Compare passwords (plain text for demo purposes; hash in production)
	log.Printf(
		"Comparing passwords - Request: '%s', DB: '%s'",
		credentials.Password,
		user.PasswordHash,
	)
	if user.PasswordHash != credentials.Password {
		log.Printf("Password mismatch for user %s (ID: %s)", user.Email, user.ID.Hex())
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	log.Printf(
		"Password match successful for user %s (ID: %s)",
		user.Email,
		user.ID.Hex(),
	)

	// Create JWT claims. You can add additional claims as needed.
	claims := jwt.MapClaims{
		"email":   user.Email,
		"user_id": user.ID.Hex(),
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	// Create a new token with claims.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Get the JWT secret from the environment or use a default.
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "137888"
	}

	// Sign the token using the secret.
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Println("Error signing token:", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	// Return the signed JWT token and user details (excluding password).
	user.PasswordHash = "" // Clear password before sending response
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "User logged in", // Keep message for clarity, or remove if frontend doesn't need it
		"token":   signedToken,
		"user":    user, // Include the user object
	})
}

// Logout is a no-op in a stateless JWT system.
// The client should simply discard the token on logout.
// If you need server-side token invalidation, consider a token blacklist.
func Logout(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "User logged out"})
}

// GetProfile retrieves a user profile from the database.
// The user ID is expected as a query parameter (e.g., /api/users/profile?id=<userId>)
func GetProfile(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
		return
	}
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, user)
}

// UpdateProfile updates a user's profile in the database.
// The user ID is expected as a query parameter (e.g., /api/users/profile?id=<userId>)
func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var updateData struct {
		Name      string           `json:"name,omitempty"`
		Phone     string           `json:"phone,omitempty"`
		Addresses []models.Address `json:"addresses,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	update := bson.M{
		"$set": bson.M{
			"name":       updateData.Name,
			"phone":      updateData.Phone,
			"addresses":  updateData.Addresses,
			"updated_at": time.Now(),
		},
	}

	result, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		update,
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating profile")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Profile updated successfully"})
}
