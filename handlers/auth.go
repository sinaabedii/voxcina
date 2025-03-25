package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"github.com/golang-jwt/jwt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Register handles user registration by inserting a new user document into MongoDB.
// NOTE: In production, make sure to hash the password before storing it.
func Register(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// In production, hash the password before saving!
	user.ID = primitive.NewObjectID()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	_, err := collection.InsertOne(ctx, user)
	if err != nil {
		log.Println("InsertOne error:", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error inserting user")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]string{
		"message": "User registered",
		"user_id": user.ID.Hex(),
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

	// Lookup the user by email.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	var user models.User
	err := collection.FindOne(ctx, bson.M{"email": credentials.Email}).Decode(&user)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Compare passwords (plain text for demo purposes; hash in production)
	if user.Password != credentials.Password {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

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

	// Return the signed JWT token.
	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "User logged in",
		"token":   signedToken,
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

	var updateData models.User
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("users")
	update := bson.M{"$set": bson.M{
		"name":         updateData.Name,
		"email":        updateData.Email,
		"password":     updateData.Password,
		"phone_number": updateData.PhoneNumber,
	}}
	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating user")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "User profile updated"})
}
