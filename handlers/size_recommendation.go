package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// RecommendProductSize handles the public, stateless hybrid size engine. The
// request body is never logged or persisted; in particular, errors intentionally
// contain only field names and not submitted measurement values.
func RecommendProductSize(w http.ResponseWriter, r *http.Request) {
	productID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	var request models.SizeRecommendationRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	if err := decoder.Decode(&request); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}

	if db.Database == nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database is not initialized")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	var product models.Product
	err = db.Database.Collection("products").FindOne(ctx, bson.M{"_id": productID, "is_active": true}, options.FindOne().SetProjection(productPublicProjection)).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Unable to load product")
		}
		return
	}

	// Keep stock semantics identical to the public product detail endpoint.
	for i := range product.ColorVariants {
		for j := range product.ColorVariants[i].Sizes {
			if product.ColorVariants[i].Sizes[j].Quantity > 0 {
				product.InStock = true
			}
		}
	}
	var sizingType *models.SizingType
	if product.SizingTypeID != nil && !product.SizingTypeID.IsZero() {
		var loaded models.SizingType
		if err := db.Database.Collection("sizing_types").FindOne(ctx, bson.M{"_id": product.SizingTypeID, "is_active": true}).Decode(&loaded); err == nil {
			sizingType = &loaded
		}
	}
	response, err := services.RecommendSize(product, request, sizingType)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}
