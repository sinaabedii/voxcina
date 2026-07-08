package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
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

// Shared constants and variables are now in auth_common.go

// Register handles POST /api/users/register
func Register(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Name     string `json:"name"`
		Email    string `json:"email,omitempty"` // Optional
		Password string `json:"password"`
		Phone    string `json:"phone"` // Required - IR phone number (09xxxxxxxxx)
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
	if creds.Name == "" || creds.Password == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Name and Password are required",
		)
		return
	}
	if creds.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Phone is required")
		return
	}

	// Validate IR phone number format (09xxxxxxxxx)
	if !irPhoneRegex.MatchString(creds.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid phone number format. Use IR format: 09xxxxxxxxx")
		return
	}

	// Validate email format if provided (optional)
	if creds.Email != "" && !emailRegex.MatchString(creds.Email) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid email format")
		return
	}

	// Basic password strength check (example)
	if len(creds.Password) < 8 || passwordRegex.MatchString(creds.Password) {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Password must be at least 8 characters long and include uppercase, lowercase, and digit.",
		)
		return
	}

	// Normalize email if provided
	if creds.Email != "" {
		creds.Email = strings.ToLower(creds.Email)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Check if phone already exists ---
	count, err := userCollection.CountDocuments(ctx, bson.M{"phone": creds.Phone})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error checking phone existence: "+err.Error(),
		)
		return
	}
	if count > 0 {
		utils.ErrorResponse(w, http.StatusConflict, "Phone number already registered")
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

	// Generate a refresh token for long-lived sessions
	refreshExpirationTime := time.Now().Add(7 * 24 * time.Hour)
	refreshClaims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExpirationTime)},
	}
	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshTokenObj.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating refresh token: "+err.Error())
		return
	}

	// Return user info, access token, and refresh token
	userResponse := struct {
		models.User
		Token        string `json:"token"`
		RefreshToken string `json:"refreshToken"`
	}{
		User:         user,
		Token:        tokenString,
		RefreshToken: refreshTokenString,
	}
	utils.JSONResponse(w, http.StatusCreated, userResponse)
}

// Claims struct is now defined in auth_common.go

// Login handles POST /api/users/login
func Login(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Phone    string `json:"phone"`
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

	if creds.Phone == "" || creds.Password == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Phone and Password are required")
		return
	}

	// Validate IR phone number format
	if !irPhoneRegex.MatchString(creds.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid phone number format. Use IR format: 09xxxxxxxxx")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"phone": creds.Phone}).Decode(&user); err != nil {
		// Important: Distinguish between "not found" and other errors to avoid user enumeration.
		// For "not found", return a generic invalid credentials error.
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid phone number or password")
		return
	}

	// --- Compare the stored hashed password with the submitted password ---
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(creds.Password)); err != nil {
		// Password does not match
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid phone number or password")
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

	// Generate a refresh token for long-lived sessions
	refreshExpirationTime := time.Now().Add(7 * 24 * time.Hour)
	refreshClaims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExpirationTime)},
	}
	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshTokenObj.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating refresh token: "+err.Error())
		return
	}

	// Update last_login timestamp (fire-and-forget, don't fail the login if this errors)
	now := time.Now()
	userCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"last_login": now}})
	user.LastLogin = &now

	// Return user info, access token, and refresh token
	userResponse := struct {
		models.User
		Token        string `json:"token"`
		RefreshToken string `json:"refreshToken"`
	}{
		User:         user,
		Token:        tokenString,
		RefreshToken: refreshTokenString,
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
		Email *string `json:"email,omitempty"` // Pointer for optional update
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

	if payload.Name == nil && payload.Email == nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"No fields to update. Provide name and/or email.",
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
	if payload.Email != nil {
		updateFields["email"] = *payload.Email
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

// ChangePassword handles PUT /api/users/password
// Requires authentication - UserID should be available in request context
func ChangePassword(w http.ResponseWriter, r *http.Request) {
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
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	if payload.CurrentPassword == "" || payload.NewPassword == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Current password and new password are required",
		)
		return
	}

	if len(payload.NewPassword) < 8 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"New password must be at least 8 characters long",
		)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(payload.CurrentPassword)); err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error hashing password: "+err.Error(),
		)
		return
	}

	updateDoc := bson.M{"$set": bson.M{"password_hash": string(hashedPassword), "updated_at": time.Now()}}
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, updateDoc)
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating password: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

// Logout handles POST /api/users/logout
// For JWT, logout is primarily client-side (deleting the token).
// This endpoint acknowledges the logout request.
func Logout(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Logout successful. Please clear your token on the client-side.",
		},
	)
}

// GetUserAddresses handles GET /api/users/addresses
// Requires authentication
func GetUserAddresses(w http.ResponseWriter, r *http.Request) {
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// --- Fetch the current user to get their addresses ---
	var currentUser models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&currentUser); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Return the user's addresses
	utils.JSONResponse(w, http.StatusOK, currentUser.Addresses)
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

	// --- Basic Validation for Latitude and Longitude ---
	if newAddress.Latitude == 0 && newAddress.Longitude == 0 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Latitude and Longitude are required for an address",
		)
		return
	}

	// --- Basic Validation for Address fields ---
	if (newAddress.Street == "" && newAddress.Address == "") ||
		newAddress.City == "" ||
		newAddress.PostalCode == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"City, PostalCode, and either Street or Address are required for an address",
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

	// --- Basic Validation for Latitude and Longitude ---
	if addressUpdatePayload.Latitude == 0 && addressUpdatePayload.Longitude == 0 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Latitude and Longitude are required for an address update",
		)
		return
	}

	// --- Basic Validation for Address fields in payload ---
	if (addressUpdatePayload.Street == "" && addressUpdatePayload.Address == "") ||
		addressUpdatePayload.City == "" ||
		addressUpdatePayload.PostalCode == "" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"City, PostalCode, and either Street or Address are required for an address update",
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
// Requires admin authentication (handled by AdminAuthMiddleware)
func ListUsers(w http.ResponseWriter, r *http.Request) {
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

	// For admin users list, show all users regardless of active status
	// Admin can filter by status in the frontend if needed
	filter := bson.M{} // Empty filter to get all users

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
	if newRole != RoleCustomer && newRole != RoleAdmin {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid role specified. Must be 'customer' or 'admin'.",
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

// RefreshToken handles POST /api/users/refresh
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

	token, err := jwt.ParseWithClaims(req.RefreshToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtKey, nil
	})

	if err != nil {
		// Check if the error is due to token expiration
		if errors.Is(err, jwt.ErrTokenExpired) {
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeTokenExpired, "Refresh token expired")
			return
		}
		// Handle signature invalid error
		if errors.Is(err, jwt.ErrSignatureInvalid) {
			utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token signature")
			return
		}
		// Handle other errors (malformed token, etc.)
		utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token")
		return
	}

	if !token.Valid {
		utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Refresh token is not valid")
		return
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		utils.AuthErrorResponse(w, http.StatusUnauthorized, utils.ErrCodeInvalidToken, "Invalid refresh token claims")
		return
	}

	// Generate new access token with 24 hour expiration (as per requirements)
	expirationTime := time.Now().Add(24 * time.Hour)
	newClaims := &Claims{
		UserID: claims.UserID,
		Email:  claims.Email,
		Role:   claims.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	accessTokenString, err := accessTokenObj.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating access token")
		return
	}

	// Return consistent response format with accessToken field
	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"accessToken": accessTokenString,
	})
}

// CheckPhone handles POST /api/users/check-phone
func CheckPhone(w http.ResponseWriter, r *http.Request) {
	var req struct { Phone string `json:"phone"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}
	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Phone is required")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")
	count, err := userCollection.CountDocuments(ctx, bson.M{"phone": req.Phone})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error checking phone: "+err.Error())
		return
	}
	if count > 0 {
		utils.JSONResponse(w, http.StatusOK, map[string]bool{"exists": true})
	} else {
		utils.ErrorResponse(w, http.StatusNotFound, "no such user with provided phone")
	}
}

// LoginViaSMS handles POST /api/users/login-sms
func LoginViaSMS(w http.ResponseWriter, r *http.Request) {
	var req struct { Phone string `json:"phone"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}
	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Phone is required")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")
	var user models.User
	if err := userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&user); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "no such user with provided phone")
		return
	}
	// Generate JWT access token
	accessExp := time.Now().Add(24 * time.Hour)
	accessClaims := &Claims{UserID: user.ID, Email: user.Email, Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(accessExp)}}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating access token: "+err.Error())
		return
	}
	// Generate JWT refresh token
	refreshExp := time.Now().Add(7 * 24 * time.Hour)
	refreshClaims := &Claims{UserID: user.ID, Email: user.Email, Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExp)}}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error generating refresh token: "+err.Error())
		return
	}
	// Update last_login timestamp (fire-and-forget)
	now := time.Now()
	userCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"last_login": now}})
	user.LastLogin = &now

	// Return user and tokens
	resp := struct { models.User; Token string `json:"token"`; RefreshToken string `json:"refreshToken"` }{User: user, Token: accessToken, RefreshToken: refreshToken}
	utils.JSONResponse(w, http.StatusOK, resp)
}


// AppActivityRequest represents the request body for recording mobile app activity
type AppActivityRequest struct {
	Platform   string `json:"platform"`    // "android" or "ios"
	AppVersion string `json:"app_version"` // e.g., "1.2.3"
}

// AppActivityResponse represents the response for recording mobile app activity
type AppActivityResponse struct {
	Message     string    `json:"message"`
	LastAppOpen time.Time `json:"last_app_open"`
}

// RecordAppActivity handles POST /api/users/app-activity
// Records mobile app activity for authenticated users
// Requires authentication - UserID should be available in request context
func RecordAppActivity(w http.ResponseWriter, r *http.Request) {
	// --- Get UserID from context (set by AuthMiddleware) ---
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid userID format in context")
		return
	}

	var req AppActivityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate platform - normalize to lowercase and validate
	platform := strings.ToLower(req.Platform)
	if platform != "android" && platform != "ios" {
		platform = "unknown"
	}

	now := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	userCollection := db.Database.Collection("users")

	// Update user document with mobile app tracking fields
	update := bson.M{
		"$set": bson.M{
			"has_mobile_app": true,
			"last_app_open":  now,
			"app_platform":   platform,
			"app_version":    req.AppVersion,
			"updated_at":     now,
		},
	}

	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error recording app activity")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, AppActivityResponse{
		Message:     "App activity recorded successfully",
		LastAppOpen: now,
	})
}


// --- User Targeting Statistics API Handlers ---

// UserTargetingStats represents statistics for user targeting
type UserTargetingStats struct {
	TotalUsers        int64 `json:"total_users"`
	MobileAppUsers    int64 `json:"mobile_app_users"`
	NonMobileAppUsers int64 `json:"non_mobile_app_users"`
	UsersWithOrders   int64 `json:"users_with_orders"`
	FirstTimeBuyers   int64 `json:"first_time_buyers"`
	InactiveUsers     int64 `json:"inactive_users"`
	NewUsers          int64 `json:"new_users"`
}

// GetUserTargetingStats handles GET /api/admin/users/stats
// Returns user statistics for targeting purposes
// Requires admin authentication
func GetUserTargetingStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	orderCollection := db.Database.Collection("orders")

	var stats UserTargetingStats

	// Total users (active only)
	totalUsers, err := userCollection.CountDocuments(ctx, bson.M{"is_active": true})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting total users: "+err.Error())
		return
	}
	stats.TotalUsers = totalUsers

	// Mobile app users
	mobileAppUsers, err := userCollection.CountDocuments(ctx, bson.M{
		"is_active":      true,
		"has_mobile_app": true,
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting mobile app users: "+err.Error())
		return
	}
	stats.MobileAppUsers = mobileAppUsers
	stats.NonMobileAppUsers = totalUsers - mobileAppUsers

	// Users with orders - use aggregation to get distinct user IDs from orders
	usersWithOrdersPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"is_active": true}}},
		{{Key: "$group", Value: bson.M{"_id": "$user_id"}}},
		{{Key: "$count", Value: "count"}},
	}
	cursor, err := orderCollection.Aggregate(ctx, usersWithOrdersPipeline)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting users with orders: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var usersWithOrdersResult []struct {
		Count int64 `bson:"count"`
	}
	if err := cursor.All(ctx, &usersWithOrdersResult); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding users with orders: "+err.Error())
		return
	}
	if len(usersWithOrdersResult) > 0 {
		stats.UsersWithOrders = usersWithOrdersResult[0].Count
	}

	// First time buyers (users with exactly 0 orders)
	// This is total users minus users with orders
	stats.FirstTimeBuyers = totalUsers - stats.UsersWithOrders

	// Inactive users (haven't logged in for 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	inactiveUsers, err := userCollection.CountDocuments(ctx, bson.M{
		"is_active": true,
		"$or": []bson.M{
			{"updated_at": bson.M{"$lt": thirtyDaysAgo}},
			{"updated_at": bson.M{"$exists": false}},
		},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting inactive users: "+err.Error())
		return
	}
	stats.InactiveUsers = inactiveUsers

	// New users (registered in last 30 days)
	newUsers, err := userCollection.CountDocuments(ctx, bson.M{
		"is_active":  true,
		"created_at": bson.M{"$gte": thirtyDaysAgo},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting new users: "+err.Error())
		return
	}
	stats.NewUsers = newUsers

	utils.JSONResponse(w, http.StatusOK, stats)
}

// UserFilterRequest represents the request body for filtering users
type UserFilterRequest struct {
	HasMobileApp     *bool      `json:"has_mobile_app,omitempty"`
	MinOrders        *int       `json:"min_orders,omitempty"`
	MaxOrders        *int       `json:"max_orders,omitempty"`
	InactiveDays     *int       `json:"inactive_days,omitempty"`
	RegisteredAfter  *time.Time `json:"registered_after,omitempty"`
	RegisteredBefore *time.Time `json:"registered_before,omitempty"`
}

// FilterUsers handles POST /api/admin/users/filter
// Returns users matching the specified targeting criteria
// Requires admin authentication
func FilterUsers(w http.ResponseWriter, r *http.Request) {
	var req UserFilterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Pagination parameters
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")

	page, err := strconv.ParseInt(pageQuery, 10, 64)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.ParseInt(limitQuery, 10, 64)
	if err != nil || limit < 1 {
		limit = 50 // Default to 50 items per page for filtering
	}
	skip := (page - 1) * limit

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	orderCollection := db.Database.Collection("orders")

	// Build the base filter
	filter := bson.M{"is_active": true}

	// Filter by mobile app status
	if req.HasMobileApp != nil {
		filter["has_mobile_app"] = *req.HasMobileApp
	}

	// Filter by registration date range
	if req.RegisteredAfter != nil {
		filter["created_at"] = bson.M{"$gte": *req.RegisteredAfter}
	}
	if req.RegisteredBefore != nil {
		if existingCreatedAt, ok := filter["created_at"].(bson.M); ok {
			existingCreatedAt["$lte"] = *req.RegisteredBefore
		} else {
			filter["created_at"] = bson.M{"$lte": *req.RegisteredBefore}
		}
	}

	// Filter by inactive days
	if req.InactiveDays != nil && *req.InactiveDays > 0 {
		inactiveDate := time.Now().AddDate(0, 0, -*req.InactiveDays)
		filter["$or"] = []bson.M{
			{"updated_at": bson.M{"$lt": inactiveDate}},
			{"updated_at": bson.M{"$exists": false}},
		}
	}

	// If we need to filter by order count, we need to use aggregation
	if req.MinOrders != nil || req.MaxOrders != nil {
		users, total, err := filterUsersByOrderCount(ctx, userCollection, orderCollection, filter, req.MinOrders, req.MaxOrders, skip, limit)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error filtering users: "+err.Error())
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
			Total:      total,
			Page:       page,
			Limit:      limit,
			TotalPages: (total + limit - 1) / limit,
		}

		utils.JSONResponse(w, http.StatusOK, paginationResponse)
		return
	}

	// Simple filter without order count
	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := userCollection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching users: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding users: "+err.Error())
		return
	}

	if users == nil {
		users = []models.User{}
	}

	// Get total count
	totalUsers, err := userCollection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting users: "+err.Error())
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
		TotalPages: (totalUsers + limit - 1) / limit,
	}

	utils.JSONResponse(w, http.StatusOK, paginationResponse)
}

// filterUsersByOrderCount filters users by their order count using aggregation
func filterUsersByOrderCount(ctx context.Context, userCollection, orderCollection *mongo.Collection, baseFilter bson.M, minOrders, maxOrders *int, skip, limit int64) ([]models.User, int64, error) {
	// First, get order counts per user
	orderCountPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"is_active": true}}},
		{{Key: "$group", Value: bson.M{
			"_id":         "$user_id",
			"order_count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := orderCollection.Aggregate(ctx, orderCountPipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	// Build a map of user_id -> order_count
	orderCounts := make(map[primitive.ObjectID]int)
	for cursor.Next(ctx) {
		var result struct {
			ID         primitive.ObjectID `bson:"_id"`
			OrderCount int                `bson:"order_count"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		orderCounts[result.ID] = result.OrderCount
	}

	// Get all users matching the base filter
	userCursor, err := userCollection.Find(ctx, baseFilter)
	if err != nil {
		return nil, 0, err
	}
	defer userCursor.Close(ctx)

	var allUsers []models.User
	if err = userCursor.All(ctx, &allUsers); err != nil {
		return nil, 0, err
	}

	// Filter users by order count
	var filteredUsers []models.User
	for _, user := range allUsers {
		orderCount := orderCounts[user.ID] // Will be 0 if not found

		// Check min orders
		if minOrders != nil && orderCount < *minOrders {
			continue
		}

		// Check max orders
		if maxOrders != nil && orderCount > *maxOrders {
			continue
		}

		filteredUsers = append(filteredUsers, user)
	}

	total := int64(len(filteredUsers))

	// Apply pagination
	start := int(skip)
	end := int(skip + limit)
	if start > len(filteredUsers) {
		return []models.User{}, total, nil
	}
	if end > len(filteredUsers) {
		end = len(filteredUsers)
	}

	return filteredUsers[start:end], total, nil
}

// GetFilteredUserCount handles POST /api/admin/users/filter/count
// Returns the count of users matching the specified targeting criteria
// Requires admin authentication
func GetFilteredUserCount(w http.ResponseWriter, r *http.Request) {
	var req UserFilterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	orderCollection := db.Database.Collection("orders")

	// Build the base filter
	filter := bson.M{"is_active": true}

	// Filter by mobile app status
	if req.HasMobileApp != nil {
		filter["has_mobile_app"] = *req.HasMobileApp
	}

	// Filter by registration date range
	if req.RegisteredAfter != nil {
		filter["created_at"] = bson.M{"$gte": *req.RegisteredAfter}
	}
	if req.RegisteredBefore != nil {
		if existingCreatedAt, ok := filter["created_at"].(bson.M); ok {
			existingCreatedAt["$lte"] = *req.RegisteredBefore
		} else {
			filter["created_at"] = bson.M{"$lte": *req.RegisteredBefore}
		}
	}

	// Filter by inactive days
	if req.InactiveDays != nil && *req.InactiveDays > 0 {
		inactiveDate := time.Now().AddDate(0, 0, -*req.InactiveDays)
		filter["$or"] = []bson.M{
			{"updated_at": bson.M{"$lt": inactiveDate}},
			{"updated_at": bson.M{"$exists": false}},
		}
	}

	// If we need to filter by order count, we need to count differently
	if req.MinOrders != nil || req.MaxOrders != nil {
		count, err := countUsersByOrderCount(ctx, userCollection, orderCollection, filter, req.MinOrders, req.MaxOrders)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting users: "+err.Error())
			return
		}

		utils.JSONResponse(w, http.StatusOK, map[string]int64{
			"count": count,
		})
		return
	}

	// Simple count without order count filter
	count, err := userCollection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting users: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]int64{
		"count": count,
	})
}

// countUsersByOrderCount counts users matching the filter and order count criteria
func countUsersByOrderCount(ctx context.Context, userCollection, orderCollection *mongo.Collection, baseFilter bson.M, minOrders, maxOrders *int) (int64, error) {
	// Get order counts per user
	orderCountPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"is_active": true}}},
		{{Key: "$group", Value: bson.M{
			"_id":         "$user_id",
			"order_count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := orderCollection.Aggregate(ctx, orderCountPipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	// Build a map of user_id -> order_count
	orderCounts := make(map[primitive.ObjectID]int)
	for cursor.Next(ctx) {
		var result struct {
			ID         primitive.ObjectID `bson:"_id"`
			OrderCount int                `bson:"order_count"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}
		orderCounts[result.ID] = result.OrderCount
	}

	// Get all users matching the base filter
	userCursor, err := userCollection.Find(ctx, baseFilter)
	if err != nil {
		return 0, err
	}
	defer userCursor.Close(ctx)

	var count int64
	for userCursor.Next(ctx) {
		var user models.User
		if err := userCursor.Decode(&user); err != nil {
			continue
		}

		orderCount := orderCounts[user.ID] // Will be 0 if not found

		// Check min orders
		if minOrders != nil && orderCount < *minOrders {
			continue
		}

		// Check max orders
		if maxOrders != nil && orderCount > *maxOrders {
			continue
		}

		count++
	}

	return count, nil
}
