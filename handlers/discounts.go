package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

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

	utils.JSONResponse(w, http.StatusOK, discount)
}

// UpdateDiscount updates an existing discount code
// PUT /api/discounts/{id}
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

	var updates models.Discount // Use models.Discount to get all possible fields
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		utils.ErrorResponse(
			w,
			http.StatusBadRequest,
			"Invalid request payload: "+err.Error(),
		)
		return
	}

	// Construct update document carefully, only setting fields that are present in the request.
	// Avoid zero-value overwrites for optional fields unless explicitly intended.
	updateDoc := bson.M{}
	if updates.Code != "" {
		updateDoc["code"] = updates.Code
	}
	if updates.Type != "" {
		if updates.Type != "percentage" && updates.Type != "fixed" {
			utils.ErrorResponse(
				w,
				http.StatusBadRequest,
				"Invalid discount type. Must be 'percentage' or 'fixed'.",
			)
			return
		}
		updateDoc["type"] = updates.Type
	}
	if updates.Value != 0 { // Be careful with float zero values if 0 is a valid value for something
		updateDoc["value"] = updates.Value
	}
	// For time.Time, check !updates.ValidFrom.IsZero()
	if !updates.ValidFrom.IsZero() {
		updateDoc["valid_from"] = updates.ValidFrom
	}
	if !updates.ValidTo.IsZero() {
		updateDoc["valid_to"] = updates.ValidTo
	}
	if updates.MinOrderAmount != 0 {
		updateDoc["min_order_amount"] = updates.MinOrderAmount
	}
	// MaxUses could be set to 0 to remove limit, handle appropriately
	if r.Body != http.NoBody { // Check if MaxUses was part of the request, not just zero valued
		// This check is tricky for nested structs / optional int fields if they are not pointers.
		// A more robust way is to use map[string]interface{} for the JSON body and check field existence.
		// For now, assume if it's in updates (non-zero for int), it's intended.
		if productIDs := updates.ApplicableTo.ProductIDs; len(productIDs) > 0 {
			updateDoc["applicable_to"] = updates.ApplicableTo
		} else if categoryIDs := updates.ApplicableTo.CategoryIDs; len(categoryIDs) > 0 {
			updateDoc["applicable_to"] = updates.ApplicableTo
		}

		if updates.MaxUses != 0 { // If MaxUses is being explicitly set (even to 0 if that means 'no limit')
			updateDoc["max_uses"] = updates.MaxUses
		}
		// UsedCount is typically not updated by user directly
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
