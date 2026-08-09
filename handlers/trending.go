package handlers

import (
	"context"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// GetTrendingProductVariants returns the ten most visited active product
// variants. Counters are hydrated against the current product catalog so
// deleted products and stale variant IDs never reach the storefront.
func GetTrendingProductVariants(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	viewCollection := db.Database.Collection("product_variant_views")
	cursor, err := viewCollection.Find(
		ctx,
		bson.M{"view_count": bson.M{"$gt": int64(0)}},
		options.Find().SetSort(bson.D{
			{Key: "view_count", Value: -1},
			{Key: "last_viewed_at", Value: -1},
			{Key: "variant_id", Value: 1},
		}),
	)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": []models.ColorVariantListItem{}})
		return
	}
	defer cursor.Close(ctx)

	var counters []models.ProductVariantView
	if err := cursor.All(ctx, &counters); err != nil || len(counters) == 0 {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": []models.ColorVariantListItem{}})
		return
	}

	productIDs := make([]interface{}, 0, len(counters))
	seenProductIDs := make(map[string]struct{}, len(counters))
	for _, counter := range counters {
		key := counter.ProductID.Hex()
		if _, exists := seenProductIDs[key]; exists {
			continue
		}
		seenProductIDs[key] = struct{}{}
		productIDs = append(productIDs, counter.ProductID)
	}

	productCursor, err := db.Database.Collection("products").Find(ctx, bson.M{
		"_id":       bson.M{"$in": productIDs},
		"is_active": true,
	})
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": []models.ColorVariantListItem{}})
		return
	}
	defer productCursor.Close(ctx)

	var products []models.Product
	if err := productCursor.All(ctx, &products); err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": []models.ColorVariantListItem{}})
		return
	}

	productsByID := make(map[string]models.Product, len(products))
	for _, product := range products {
		productsByID[product.ID.Hex()] = product
	}

	items := make([]models.ColorVariantListItem, 0, 10)
	for _, counter := range counters {
		product, exists := productsByID[counter.ProductID.Hex()]
		if !exists {
			continue
		}

		var variant models.ColorVariant
		found := false
		for _, candidate := range product.ColorVariants {
			if candidate.VariantID == counter.VariantID {
				variant = candidate
				found = true
				break
			}
		}
		if !found {
			continue
		}

		totalInventory := 0
		for i := range variant.Sizes {
			variant.Sizes[i].Size = utils.NormalizePersianDigits(variant.Sizes[i].Size)
			totalInventory += variant.Sizes[i].Quantity
		}

		categoryIDs := make([]string, len(product.CategoryIDs))
		for i, categoryID := range product.CategoryIDs {
			categoryIDs[i] = categoryID.Hex()
		}

		items = append(items, models.ColorVariantListItem{
			ProductID:      product.ID.Hex(),
			ColorVariant:   variant,
			Name:           product.Name,
			Description:    product.Description,
			Price:          product.Price,
			OriginalPrice:  product.OriginalPrice,
			Brand:          product.Brand,
			BrandID:        product.BrandID.Hex(),
			CategoryIDs:    categoryIDs,
			Collection:     product.Collection,
			IsFlashSale:    product.IsFlashSale,
			AverageRating:  product.AverageRating,
			ReviewCount:    product.ReviewCount,
			CreatedAt:      product.CreatedAt,
			TotalInventory: totalInventory,
			InStock:        totalInventory > 0,
			ViewCount:      counter.ViewCount,
			Rank:           len(items) + 1,
		})

		if len(items) == 10 {
			break
		}
	}

	if items == nil {
		items = []models.ColorVariantListItem{}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": items})
}
