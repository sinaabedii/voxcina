package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

var jwtKey = []byte(
	"my_secret_key",
) // TODO: Use a strong, configurable secret key from env variables

const (
	RoleCustomer = "customer"
	RoleAdmin    = "admin"
	RoleSeller   = "seller"
)

// Password validation regex: at least 8 characters, one uppercase, one lowercase, one digit, one special character
var passwordRegex = regexp.MustCompile(`^(.{0,7}|[^0-9]*|[^A-Z]*|[^a-z]*|[a-zA-Z0-9]*)$`)

// Email validation regex
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// Register handles POST /api/users/register
func Register(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Phone    string `json:"phone,omitempty"` // Optional
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// --- Input Validation ---
	if creds.Name == "" || creds.Email == "" || creds.Password == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Name, Email, and Password are required",
		)
		return
	}

	if !emailRegex.MatchString(creds.Email) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid email format")
		return
	}

	// Basic password strength check (example)
	if len(creds.Password) < 8 || passwordRegex.MatchString(creds.Password) {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Password must be at least 8 characters long and include uppercase, lowercase, digit, and special character.",
		)
		return
	}

	creds.Email = strings.ToLower(creds.Email) // Normalize email

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Check if email already exists ---
	count, err := userCollection.CountDocuments(ctx, bson.M{"email": creds.Email})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error checking email existence: "+err.Error(),
		)
		return
	}
	if count > 0 {
		utils.ErrorResponse(w, http.StatusConflict, "Email already registered")
		return
	}

	// --- Hash the password ---
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(creds.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error hashing password: "+err.Error(),
		)
		return
	}

	user := models.User{
		ID:           primitive.NewObjectID(),
		Name:         creds.Name,
		Email:        creds.Email,
		PasswordHash: string(hashedPassword),
		Phone:        creds.Phone,
		Addresses:    []models.Address{}, // Initialize with empty slice
		Role:         RoleCustomer,       // Default role
		IsActive:     true,               // Default to active
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = userCollection.InsertOne(ctx, user)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error creating user: "+err.Error(),
		)
		return
	}

	// --- Generate JWT token for immediate login ---
	expirationTime := time.Now().Add(24 * time.Hour) // Token valid for 24 hours
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		// Log error, but user registration was successful.
		// Client might need to log in separately.
		// For simplicity, we'll return success without token if this fails.
		// A better approach might be to ensure token generation is robust.
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"User created, but error generating token: "+err.Error(),
		)
		return
	}

	// Return user info (excluding password) and token
	userResponse := struct {
		models.User
		Token string `json:"token"`
	}{
		User:  user, // User struct already omits PasswordHash via json:"-"
		Token: tokenString,
	}
	// Manually ensure PasswordHash is not part of the response structure if User struct didn't handle it
	// For `userResponse.User.PasswordHash = ""` if needed, but `json:"-"` should suffice.

	utils.JSONResponse(w, http.StatusCreated, userResponse)
}

// Claims struct for JWT
type Claims struct {
	UserID primitive.ObjectID `json:"user_id"`
	Email  string             `json:"email"`
	Role   string             `json:"role"`
	jwt.RegisteredClaims
}

// Login handles POST /api/users/login
func Login(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	if creds.Email == "" || creds.Password == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Email and Password are required")
		return
	}

	normalizedEmail := strings.ToLower(creds.Email)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"email": normalizedEmail}).Decode(&user); err != nil {
		// Important: Distinguish between "not found" and other errors to avoid user enumeration.
		// For "not found", return a generic invalid credentials error.
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// --- Compare the stored hashed password with the submitted password ---
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(creds.Password)); err != nil {
		// Password does not match
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// --- Generate JWT token ---
	expirationTime := time.Now().Add(24 * time.Hour) // Token valid for 24 hours
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email, // Use email from DB (which is normalized)
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error generating token: "+err.Error(),
		)
		return
	}

	// Return user info (excluding password) and token
	userResponse := struct {
		models.User
		Token string `json:"token"`
	}{
		User:  user,
		Token: tokenString,
	}

	utils.JSONResponse(w, http.StatusOK, userResponse)
}

// GetProfile handles GET /api/users/profile
// Requires authentication - UserID should be available in request context
func GetProfile(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"User not authenticated or userID not found in context",
		)
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments { // Import "go.mongodb.org/mongo-driver/mongo"
			utils.ErrorResponse(w, http.StatusNotFound, "User profile not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching user profile: "+err.Error())
		}
		return
	}

	// New response structure
	response := make(map[string]interface{})
	response["user_data"] = user // Keep all other user data

	if len(user.Addresses) == 0 {
		response["has_addresses"] = false
		response["addresses_data"] = []models.Address{} // Ensure empty array
		response["message"] = "شما هنوز هیچ آدرسی ثبت نکرده‌اید."
		response["link_text"] = "افزودن آدرس جدید"
		// Depending on your frontend routing for adding an address, 
		// you might want a link_url or rely on a button triggering a modal.
		// For now, I'll omit link_url as the page has an "Add New Address" button.
	} else {
		response["has_addresses"] = true
		response["addresses_data"] = user.Addresses
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// UpdateProfile handles PUT /api/users/profile
// Requires authentication - UserID should be available in request context
func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"User not authenticated or userID not found in context",
		)
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	var payload struct {
		Name  *string `json:"name,omitempty"`  // Pointer to distinguish between empty string and not provided
		Phone *string `json:"phone,omitempty"` // Pointer for optional update
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// --- Basic Validation ---
	if payload.Name != nil && *payload.Name == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Name cannot be empty if provided for update",
		)
		return
	}

	if payload.Name == nil && payload.Phone == nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"No fields to update. Provide name and/or phone.",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Prepare update document for $set operation ---
	updateFields := bson.M{}
	if payload.Name != nil {
		updateFields["name"] = *payload.Name
	}
	if payload.Phone != nil {
		updateFields["phone"] = *payload.Phone // Allow setting phone to empty string if desired by client
	}

	if len(updateFields) == 0 { // Should be caught by earlier check, but as safeguard
		// If somehow we reach here, just return current profile without DB write
		var currentUser models.User
		if errDB := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&currentUser); errDB != nil {
			utils.ErrorResponse(
				w,
				http.StatusNotFound,
				"User not found",
			) // Or internal error
			return
		}
		utils.JSONResponse(w, http.StatusOK, currentUser)
		return
	}

	updateFields["updated_at"] = time.Now()
	updateDoc := bson.M{"$set": updateFields}

	// --- Perform the update ---
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, updateDoc)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating user profile: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "User profile not found for update")
		return
	}
	// result.ModifiedCount can be 0 if the provided data is the same as existing, which is fine.

	// --- Fetch and return the updated user profile ---
	var updatedUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated user profile: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedUser)
}

// Logout handles POST /api/users/logout
// For JWT, logout is primarily client-side (deleting the token).
// This endpoint can be used to clear any server-side session cookies if used (not typical for pure JWT in headers)
// or to add the token to a blacklist if implemented.
func Logout(w http.ResponseWriter, r *http.Request) {
	// If using httpOnly cookies for JWT (less common for SPAs, more for web apps):
	// http.SetCookie(w, &http.Cookie{
	// 	Name:     "token",
	// 	Value:    "",
	// 	Expires:  time.Now().Add(-time.Hour), // Set to past to expire immediately
	// 	HttpOnly: true,
	// 	Path:     "/",
	// 	// Secure: true, // In production
	// 	// SameSite: http.SameSiteLaxMode, // Or StrictMode
	// })

	// If a token blacklist is implemented, this is where you would:
	// 1. Extract the token from the Authorization header.
	// 2. Add the token ID (e.g., JTI claim) or the full token to the blacklist (e.g., in Redis) until its original expiry.

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Logout successful. Please clear your token on the client-side.",
		},
	)
}

// AddUserAddress handles POST /api/users/addresses
// Requires authentication
func AddUserAddress(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	var newAddress models.Address
	if err := json.NewDecoder(r.Body).Decode(&newAddress); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid address payload: "+err.Error(),
		)
		return
	}

	// --- Basic Validation for Address fields ---
	if newAddress.Street == "" || newAddress.City == "" || newAddress.PostalCode == "" ||
		newAddress.Country == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Street, City, PostalCode, and Country are required for an address",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Fetch the current user to get their existing addresses ---
	var currentUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&currentUser); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// If the new address is marked as default, unset any existing default address
	if newAddress.IsDefault {
		for i := range currentUser.Addresses {
			if currentUser.Addresses[i].IsDefault {
				currentUser.Addresses[i].IsDefault = false
			}
		}
	}
	// Ensure at least one address is default if this is the first address
	if len(currentUser.Addresses) == 0 && !newAddress.IsDefault {
		newAddress.IsDefault = true
	}

	// --- Update user document with the new address ---
	// We can use $push to add the new address and $set to update the entire addresses array if defaults were changed.
	// A more targeted update might be better if only one IsDefault flag changed in a large array.
	// For simplicity here, we'll just reconstruct and set the Addresses array if IsDefault logic was triggered.

	finalAddresses := append(currentUser.Addresses, newAddress)

	update := bson.M{
		"$set": bson.M{
			"addresses":  finalAddresses,
			"updated_at": time.Now(),
		},
	}

	_, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error adding address: "+err.Error(),
		)
		return
	}

	// Fetch the updated user to return the new state of addresses
	var updatedUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser); err != nil {
		// This is unlikely if the update succeeded but handle defensively
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated user profile after adding address: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedUser.Addresses)
}

// UpdateUserAddress handles PUT /api/users/addresses/{addressIndex}
// Requires authentication
func UpdateUserAddress(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	// --- Get addressIndex from path ---
	vars := mux.Vars(r)
	addressIndexStr, pathOk := vars["addressIndex"]
	if !pathOk {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Address index not provided in path",
		)
		return
	}
	addressIndex, err := strconv.Atoi(addressIndexStr)
	if err != nil || addressIndex < 0 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid address index format or value",
		)
		return
	}

	var addressUpdatePayload models.Address // Expect a full address object for update
	if err := json.NewDecoder(r.Body).Decode(&addressUpdatePayload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid address update payload: "+err.Error(),
		)
		return
	}

	// --- Basic Validation for Address fields in payload ---
	if addressUpdatePayload.Street == "" || addressUpdatePayload.City == "" ||
		addressUpdatePayload.PostalCode == "" || addressUpdatePayload.Country == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Street, City, PostalCode, and Country are required for an address update",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Fetch the current user ---
	var currentUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&currentUser); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// --- Validate addressIndex ---
	if addressIndex >= len(currentUser.Addresses) {
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Address not found at the specified index",
		)
		return
	}

	// --- Handle IsDefault logic ---
	// If the updated address is being set to default, unset any other default address.
	if addressUpdatePayload.IsDefault {
		for i := range currentUser.Addresses {
			if i != addressIndex && currentUser.Addresses[i].IsDefault {
				currentUser.Addresses[i].IsDefault = false
			}
		}
	} else {
		// If the updated address is being UNSET from default, check if it was the ONLY default address.
		// If so, and there are other addresses, make the first other address default.
		// Or, if it was the only address, it must remain default.
		isThisTheOnlyDefault := true
		if currentUser.Addresses[addressIndex].IsDefault { // Only proceed if it was default
			for i := range currentUser.Addresses {
				if i != addressIndex && currentUser.Addresses[i].IsDefault {
					isThisTheOnlyDefault = false
					break
				}
			}
			if isThisTheOnlyDefault && len(currentUser.Addresses) > 1 {
				// Cannot unset the only default address if multiple addresses exist without making another one default.
				// The client should explicitly set another as default first, or update this one to non-default AND another to default.
				// For simplicity, we can enforce that at least one address must be default.
				// This means if they try to unset the only default, we must make another default or prevent it.
				// Let's make the first one (0-indexed) default if it's not the one being updated.
				if addressIndex != 0 {
					currentUser.Addresses[0].IsDefault = true
				} else if len(currentUser.Addresses) > 1 { // if addressIndex is 0 and there's another one
					currentUser.Addresses[1].IsDefault = true
				}
				// If it's the only address, it remains default (covered by payload.IsDefault being false)
			} else if isThisTheOnlyDefault && len(currentUser.Addresses) == 1 {
				addressUpdatePayload.IsDefault = true // Force it back to default if it's the only one
			}
		}
	}

	// After all IsDefault adjustments, apply the payload to the specific address
	currentUser.Addresses[addressIndex] = addressUpdatePayload

	// Final check: ensure at least one default address exists if there are any addresses
	hasDefault := false
	if len(currentUser.Addresses) > 0 {
		for _, addr := range currentUser.Addresses {
			if addr.IsDefault {
				hasDefault = true
				break
			}
		}
		if !hasDefault {
			currentUser.Addresses[0].IsDefault = true // Make the first one default
		}
	}

	// --- Update the user document ---
	update := bson.M{
		"$set": bson.M{
			"addresses":  currentUser.Addresses, // Set the modified addresses array
			"updated_at": time.Now(),
		},
	}

	_, err = userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating address: "+err.Error(),
		)
		return
	}

	var updatedUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated user profile after updating address: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, updatedUser.Addresses)
}

// DeleteUserAddress handles DELETE /api/users/addresses/{addressIndex}
// Requires authentication
func DeleteUserAddress(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid userID format in context",
		)
		return
	}

	// --- Get addressIndex from path ---
	vars := mux.Vars(r)
	addressIndexStr, pathOk := vars["addressIndex"]
	if !pathOk {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Address index not provided in path",
		)
		return
	}
	addressIndex, err := strconv.Atoi(addressIndexStr)
	if err != nil || addressIndex < 0 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid address index format or value",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Fetch the current user ---
	var currentUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&currentUser); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// --- Validate addressIndex ---
	if addressIndex >= len(currentUser.Addresses) {
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"Address not found at the specified index",
		)
		return
	}

	// --- Remove the address ---
	addressToDelete := currentUser.Addresses[addressIndex]
	// Slice trick to remove element at index: a = append(a[:i], a[i+1:]...)
	currentUser.Addresses = append(
		currentUser.Addresses[:addressIndex],
		currentUser.Addresses[addressIndex+1:]...)

	// --- Handle IsDefault logic after removal ---
	wasDefaultDeleted := addressToDelete.IsDefault
	newAddressesCount := len(currentUser.Addresses)

	if wasDefaultDeleted && newAddressesCount > 0 {
		// If the deleted address was default and there are remaining addresses,
		// make the first remaining address the new default.
		currentUser.Addresses[0].IsDefault = true
	} else if newAddressesCount == 0 {
		// No addresses left, nothing to be default.
	} else {
		// If a non-default was deleted, or if the default was deleted but it was the only one (now list is empty),
		// we still need to ensure one is default if addresses remain.
		// This also covers the case where the list previously had a default, and it wasn't the one deleted.
		hasDefault := false
		for _, addr := range currentUser.Addresses {
			if addr.IsDefault {
				hasDefault = true
				break
			}
		}
		if !hasDefault && newAddressesCount > 0 {
			currentUser.Addresses[0].IsDefault = true
		}
	}

	// --- Update the user document ---
	update := bson.M{
		"$set": bson.M{
			"addresses":  currentUser.Addresses, // Set the modified addresses array
			"updated_at": time.Now(),
		},
	}

	_, err = userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deleting address: "+err.Error(),
		)
		return
	}

	// Return the updated list of addresses, or a success message
	// For consistency, let's return the updated list of addresses.
	var updatedUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated user profile after deleting address: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, updatedUser.Addresses)
}

// --- Admin User Management Handlers ---

// ListUsers handles GET /api/admin/users
// Requires admin authentication
func ListUsers(w http.ResponseWriter, r *http.Request) {
	// Admin authentication should be handled by middleware.
	// We can double-check the role from context if needed, but middleware is primary.
	/*
		userRoleCtx := r.Context().Value("role") // Assuming role is set by AuthMiddleware
		if userRoleCtx == nil {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Role not found in context")
			return
		}
		userRole, ok := userRoleCtx.(string)
		if !ok || userRole != RoleAdmin {
			utils.ErrorResponse(w, http.StatusForbidden, "Admin access required")
			return
		}
	*/

	// Pagination parameters (optional, but good for production)
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")

	page, err := strconv.ParseInt(pageQuery, 10, 64)
	if err != nil || page < 1 {
		page = 1 // Default to page 1
	}

	limit, err := strconv.ParseInt(limitQuery, 10, 64)
	if err != nil || limit < 1 {
		limit = 10 // Default to 10 items per page
	}
	skip := (page - 1) * limit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by newest first

	// Default to fetching only active users
	filter := bson.M{"is_active": true}

	// TODO: Add query param handling for more sophisticated filtering e.g. status=all, status=inactive

	cursor, err := userCollection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching users: "+err.Error(),
		)
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding users: "+err.Error(),
		)
		return
	}

	if users == nil {
		users = []models.User{} // Return empty slice instead of null
	}

	// Get total count for pagination metadata, matching the filter
	totalUsers, err := userCollection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching user count: "+err.Error(),
		)
		return
	}

	paginationResponse := struct {
		Data       []models.User `json:"data"`
		Total      int64         `json:"total"`
		Page       int64         `json:"page"`
		Limit      int64         `json:"limit"`
		TotalPages int64         `json:"total_pages"`
	}{
		Data:       users,
		Total:      totalUsers,
		Page:       page,
		Limit:      limit,
		TotalPages: (totalUsers + limit - 1) / limit, // Ceiling division
	}

	utils.JSONResponse(w, http.StatusOK, paginationResponse)
}

// GetUserByID handles GET /api/admin/users/{userId}
// Requires admin authentication
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	// Admin auth check (as in ListUsers, primarily middleware's job)

	vars := mux.Vars(r)
	userIDStr, ok := vars["userId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided in path")
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid User ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching user: "+err.Error())
		}
		return
	}

	// PasswordHash is already excluded by `json:"-"` in models.User
	utils.JSONResponse(w, http.StatusOK, user)
}

// UpdateUserRole handles PUT /api/admin/users/{userId}/role
// Requires admin authentication
func UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	// Admin auth check

	vars := mux.Vars(r)
	userIDStr, ok := vars["userId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID not provided in path")
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid User ID format")
		return
	}

	var payload struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// --- Validate Role ---
	newRole := strings.ToLower(payload.Role)
	if newRole != RoleCustomer && newRole != RoleAdmin && newRole != RoleSeller {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid role specified. Must be 'customer' or 'admin' or seller.",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Check if user exists ---
	// Optional: Could combine with update using FindOneAndUpdate, but separating for clarity.
	var existingUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&existingUser); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching user: "+err.Error())
		}
		return
	}

	// Prevent admin from accidentally demoting the last admin or self-demotion if it's the only admin
	// This logic might need to be more sophisticated based on requirements.
	if existingUser.Role == RoleAdmin && newRole == RoleCustomer {
		// Check if this is the only admin user
		adminCount, countErr := userCollection.CountDocuments(
			ctx,
			bson.M{"role": RoleAdmin},
		)
		if countErr != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error checking admin count: "+countErr.Error(),
			)
			return
		}
		if adminCount <= 1 {
			// Potentially check if the current admin performing the action is this user.
			// For simplicity, prevent demoting the last admin.
			utils.ErrorResponse(
				w,
				http.StatusForbidden,
				"Cannot demote the last admin user.",
			)
			return
		}
	}

	updateFields := bson.M{
		"role":       newRole,
		"updated_at": time.Now(),
	}
	updateDoc := bson.M{"$set": updateFields}

	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, updateDoc)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating user role: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		// Should have been caught by FindOne earlier, but as a safeguard.
		utils.ErrorResponse(w, http.StatusNotFound, "User not found for role update")
		return
	}

	// Fetch and return the updated user
	var updatedUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&updatedUser); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated user: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedUser)
}

// DeleteUser handles DELETE /api/admin/users/{userId} (Soft Delete)
// Requires admin authentication
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	// Admin auth check
	vars := mux.Vars(r)
	userIDStrToDeactivate, ok := vars["userId"]
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"User ID to deactivate not provided in path",
		)
		return
	}
	userIDToDeactivate, err := primitive.ObjectIDFromHex(userIDStrToDeactivate)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid User ID format for deactivation",
		)
		return
	}

	// Get current admin's ID from context to prevent self-deactivation if last admin
	currentAdminIDCtx := r.Context().
		Value("userID")
		// Assuming userID of the admin performing action
	if currentAdminIDCtx == nil {
		utils.ErrorResponse(
			w,
			http.StatusUnauthorized,
			"Admin user ID not found in context",
		)
		return
	}
	currentAdminID, ok := currentAdminIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Invalid admin userID format in context",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Fetch the user to be deactivated ---
	var userToDeactivate models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userIDToDeactivate}).Decode(&userToDeactivate); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "User to deactivate not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching user to deactivate: "+err.Error())
		}
		return
	}

	if !userToDeactivate.IsActive {
		utils.JSONResponse(
			w,
			http.StatusOK,
			map[string]string{"message": "User is already inactive"},
		)
		return
	}

	// --- Safety check: Prevent deactivating the last active admin, especially if it's self-deactivation ---
	if userToDeactivate.Role == RoleAdmin {
		filter := bson.M{"role": RoleAdmin, "is_active": true}
		activeAdminCount, countErr := userCollection.CountDocuments(ctx, filter)
		if countErr != nil {
			utils.ErrorResponse(
				w,
				http.StatusInternalServerError,
				"Error checking active admin count: "+countErr.Error(),
			)
			return
		}
		if activeAdminCount <= 1 && userToDeactivate.ID == currentAdminID {
			utils.ErrorResponse(
				w,
				http.StatusForbidden,
				"Cannot deactivate yourself as the last active admin user.",
			)
			return
		} else if activeAdminCount <= 1 {
			utils.ErrorResponse(w, http.StatusForbidden, "Cannot deactivate the last active admin user.")
			return
		}
	}

	// --- Perform soft delete ---
	updateFields := bson.M{
		"is_active":  false,
		"updated_at": time.Now(),
	}
	updateDoc := bson.M{"$set": updateFields}

	result, err := userCollection.UpdateOne(
		ctx,
		bson.M{"_id": userIDToDeactivate},
		updateDoc,
	)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deactivating user: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		// Should be caught by FindOne, but as a safeguard
		utils.ErrorResponse(
			w,
			http.StatusNotFound,
			"User not found for deactivation (race condition?)",
		)
		return
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "User deactivated successfully"},
	)
}
