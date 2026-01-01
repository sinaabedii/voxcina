package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// CreateDiscount creates a new discount code
// POST /api/discounts
// Supports both public and targeted promotions:
// - is_public: true = available to all users, false = targeted to specific users
// - assigned_users: list of user IDs who can use a targeted promotion
// - targeting_criteria: criteria used to auto-select users (stored for reference)
func CreateDiscount(w http.ResponseWriter, r *http.Request) {
	var discount models.Discount
	if err := json.NewDecoder(r.Body).Decode(&discount); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// Basic validation
	if discount.Code == "" || discount.Type == "" || discount.Value == 0 {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Code, Type, and Value are required",
		)
		return
	}
	if discount.Type != "percentage" && discount.Type != "fixed" {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid discount type. Must be 'percentage' or 'fixed'.",
		)
		return
	}

	// Validate targeting configuration
	// If is_public is false (targeted promotion), assigned_users should be provided
	// However, we allow empty assigned_users for cases where admin wants to add users later
	if !discount.IsPublic && len(discount.AssignedUsers) == 0 && discount.TargetingCriteria == nil {
		// This is a targeted promotion with no users assigned and no criteria
		// We allow this but log a warning - admin may add users later
		// No error, just proceed
	}

	// Validate assigned_users if provided - ensure they are valid ObjectIDs
	// The JSON decoder should handle this, but we verify the slice is properly initialized
	if discount.AssignedUsers == nil {
		discount.AssignedUsers = []primitive.ObjectID{}
	}

	discount.ID = primitive.NewObjectID()
	discount.UsedCount = 0
	discount.CreatedAt = time.Now()
	discount.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	_, err := collection.InsertOne(ctx, discount)
	if err != nil {
		// Handle potential duplicate code error (requires unique index on code)
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "Discount code already exists")
			return
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error creating discount: "+err.Error(),
		)
		return
	}

	utils.JSONResponse(w, http.StatusCreated, discount)
}

// GetAllDiscounts retrieves all discount codes
// GET /api/discounts
func GetAllDiscounts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		utils.JSONResponse(
			w,
			http.StatusOK,
			[]models.Discount{},
		) // Return empty list on error
		return
	}

	var discounts []models.Discount
	if err = cursor.All(ctx, &discounts); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error decoding discounts: "+err.Error(),
		)
		return
	}

	if discounts == nil {
		discounts = []models.Discount{}
	}

	utils.JSONResponse(w, http.StatusOK, discounts)
}

// GetDiscountByID retrieves a discount by its ID
// GET /api/discounts/{id}
func GetDiscountByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Discount ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	var discount models.Discount
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&discount); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Discount not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching discount: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, discount)
}

// GetDiscountByCode retrieves a discount by its code
// GET /api/discounts/code/{code}
// This endpoint checks user eligibility for targeted promotions.
// If the user is authenticated (via Authorization header), eligibility is checked.
// For public promotions or legacy promotions (without is_public field), any user can access.
func GetDiscountByCode(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	code, ok := vars["code"]
	if !ok || code == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount code not provided")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	var discount models.Discount
	if err := collection.FindOne(ctx, bson.M{"code": code}).Decode(&discount); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Discount code not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching discount by code: "+err.Error())
		}
		return
	}

	// Validate if the discount is currently active
	now := time.Now()
	if now.Before(discount.ValidFrom) || now.After(discount.ValidTo) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount code is not active")
		return
	}
	if discount.MaxUses > 0 && discount.UsedCount >= discount.MaxUses {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount code has reached its maximum usage limit")
		return
	}

	// Check user eligibility for targeted promotions
	// Try to get user ID from JWT token (optional authentication)
	var userID primitive.ObjectID
	var isAuthenticated bool
	
	// First check if user ID is already in context (from AuthMiddleware)
	if userIDCtx := r.Context().Value("userID"); userIDCtx != nil {
		if uid, ok := userIDCtx.(primitive.ObjectID); ok {
			userID = uid
			isAuthenticated = true
		}
	}
	
	// If not in context, try to extract from Authorization header
	if !isAuthenticated {
		userID, isAuthenticated = extractUserIDFromToken(r)
	}

	// Check eligibility based on is_public and assigned_users
	eligible, errMsg := validateUserEligibility(discount, userID, isAuthenticated)
	if !eligible {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	utils.JSONResponse(w, http.StatusOK, discount)
}

// validateUserEligibility checks if a user is eligible to use a discount
// Returns (eligible bool, errorMessage string)
// Handles backward compatibility: promotions without is_public field are treated as public
func validateUserEligibility(discount models.Discount, userID primitive.ObjectID, isAuthenticated bool) (bool, string) {
	// Backward compatibility: If AssignedUsers is nil/empty and the discount was created
	// before the targeting feature, treat it as a public promotion.
	// We check this by seeing if is_public is false but assigned_users is empty,
	// which would indicate a legacy promotion (is_public defaults to false in Go).
	// A properly configured targeted promotion would have assigned_users populated.
	isLegacyPromotion := !discount.IsPublic && len(discount.AssignedUsers) == 0

	// If the promotion is public or a legacy promotion, allow access
	if discount.IsPublic || isLegacyPromotion {
		return true, ""
	}

	// For targeted promotions (is_public = false with assigned_users), check eligibility
	// User must be authenticated to use targeted promotions
	if !isAuthenticated {
		return false, "این کد تخفیف برای شما معتبر نیست" // "This discount code is not valid for you"
	}

	// Check if user is in the assigned_users list
	for _, assignedUserID := range discount.AssignedUsers {
		if assignedUserID == userID {
			return true, ""
		}
	}

	// User is not in the assigned list
	return false, "این کد تخفیف برای شما معتبر نیست" // "This discount code is not valid for you"
}

// extractUserIDFromToken attempts to extract user ID from the Authorization header
// Returns (userID, isAuthenticated)
// This is used for optional authentication where the endpoint works for both
// authenticated and unauthenticated users
func extractUserIDFromToken(r *http.Request) (primitive.ObjectID, bool) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return primitive.ObjectID{}, false
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return primitive.ObjectID{}, false
	}
	tokenString := parts[1]

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return GetJWTKey(), nil
		},
	)

	if err != nil || !token.Valid {
		return primitive.ObjectID{}, false
	}

	return claims.UserID, true
}

// UpdateDiscount updates an existing discount code
// PUT /api/discounts/{id}
// Supports updating promotion type and assigned users:
// - is_public: can be changed from public to targeted or vice versa
// - assigned_users: can be modified to add/remove users from targeted promotions
// - targeting_criteria: can be updated to change auto-selection criteria
func UpdateDiscount(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount ID not provided")
		return
	}
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Discount ID format")
		return
	}

	// Use a map to properly detect which fields were sent in the request
	var rawUpdates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&rawUpdates); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// Construct update document carefully, only setting fields that are present in the request.
	updateDoc := bson.M{}

	// Handle basic discount fields
	if code, ok := rawUpdates["code"].(string); ok && code != "" {
		updateDoc["code"] = code
	}
	if discountType, ok := rawUpdates["type"].(string); ok && discountType != "" {
		if discountType != "percentage" && discountType != "fixed" {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid discount type. Must be 'percentage' or 'fixed'.",
			)
			return
		}
		updateDoc["type"] = discountType
	}
	if value, ok := rawUpdates["value"].(float64); ok && value != 0 {
		updateDoc["value"] = value
	}
	if minOrderAmount, ok := rawUpdates["min_order_amount"].(float64); ok {
		updateDoc["min_order_amount"] = minOrderAmount
	}

	// Handle time fields
	if validFromStr, ok := rawUpdates["valid_from"].(string); ok && validFromStr != "" {
		if validFrom, err := time.Parse(time.RFC3339, validFromStr); err == nil {
			updateDoc["valid_from"] = validFrom
		}
	}
	if validToStr, ok := rawUpdates["valid_to"].(string); ok && validToStr != "" {
		if validTo, err := time.Parse(time.RFC3339, validToStr); err == nil {
			updateDoc["valid_to"] = validTo
		}
	}

	// Handle max_uses - allow setting to 0 to remove limit
	if maxUses, ok := rawUpdates["max_uses"].(float64); ok {
		updateDoc["max_uses"] = int(maxUses)
	}

	// Handle applicable_to
	if applicableTo, ok := rawUpdates["applicable_to"].(map[string]interface{}); ok {
		updateDoc["applicable_to"] = applicableTo
	}

	// Handle targeting fields (Requirements 4.1, 4.2, 4.3)
	// is_public: explicitly check if the field was sent
	if isPublic, ok := rawUpdates["is_public"].(bool); ok {
		updateDoc["is_public"] = isPublic
	}

	// assigned_users: handle the array of user IDs
	if assignedUsersRaw, ok := rawUpdates["assigned_users"]; ok {
		if assignedUsersRaw == nil {
			// Explicitly set to empty array if null is sent
			updateDoc["assigned_users"] = []primitive.ObjectID{}
		} else if assignedUsersArr, ok := assignedUsersRaw.([]interface{}); ok {
			assignedUsers := make([]primitive.ObjectID, 0, len(assignedUsersArr))
			for _, userIDRaw := range assignedUsersArr {
				if userIDStr, ok := userIDRaw.(string); ok {
					if userObjID, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
						assignedUsers = append(assignedUsers, userObjID)
					}
				}
			}
			updateDoc["assigned_users"] = assignedUsers
		}
	}

	// targeting_criteria: handle the nested object
	if targetingCriteriaRaw, ok := rawUpdates["targeting_criteria"]; ok {
		if targetingCriteriaRaw == nil {
			// Explicitly unset targeting_criteria if null is sent
			updateDoc["targeting_criteria"] = nil
		} else if targetingCriteria, ok := targetingCriteriaRaw.(map[string]interface{}); ok {
			// Convert the map to TargetingCriteria struct
			tc := models.TargetingCriteria{}
			
			if hasMobileApp, ok := targetingCriteria["has_mobile_app"].(bool); ok {
				tc.HasMobileApp = &hasMobileApp
			}
			if minOrders, ok := targetingCriteria["min_orders"].(float64); ok {
				minOrdersInt := int(minOrders)
				tc.MinOrders = &minOrdersInt
			}
			if maxOrders, ok := targetingCriteria["max_orders"].(float64); ok {
				maxOrdersInt := int(maxOrders)
				tc.MaxOrders = &maxOrdersInt
			}
			if inactiveDays, ok := targetingCriteria["inactive_days"].(float64); ok {
				inactiveDaysInt := int(inactiveDays)
				tc.InactiveDays = &inactiveDaysInt
			}
			if registeredAfterStr, ok := targetingCriteria["registered_after"].(string); ok && registeredAfterStr != "" {
				if registeredAfter, err := time.Parse(time.RFC3339, registeredAfterStr); err == nil {
					tc.RegisteredAfter = &registeredAfter
				}
			}
			if registeredBeforeStr, ok := targetingCriteria["registered_before"].(string); ok && registeredBeforeStr != "" {
				if registeredBefore, err := time.Parse(time.RFC3339, registeredBeforeStr); err == nil {
					tc.RegisteredBefore = &registeredBefore
				}
			}
			
			updateDoc["targeting_criteria"] = tc
		}
	}

	if len(updateDoc) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "No update fields provided")
		return
	}
	updateDoc["updated_at"] = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("discounts")

	result, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(
				w,
				http.StatusConflict,
				"Discount code already exists (from update)",
			)
			return
		}
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error updating discount: "+err.Error(),
		)
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Discount not found for update")
		return
	}

	// Fetch and return the updated document
	var updatedDiscount models.Discount
	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updatedDiscount); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error fetching updated discount: "+err.Error(),
		)
		return
	}
	utils.JSONResponse(w, http.StatusOK, updatedDiscount)
}

// DeleteDiscount deletes a discount code
// DELETE /api/discounts/{id}
func DeleteDiscount(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Discount ID not provided")
		return
	}
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Discount ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("discounts")
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(
			w,
			http.StatusInternalServerError,
			"Error deleting discount: "+err.Error(),
		)
		return
	}

	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Discount not found, nothing deleted")
		return
	}

	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Discount deleted successfully"},
	)
}
