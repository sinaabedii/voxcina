package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// findProductBlockByOrder locates a "product" block within a post by its
// Order field. Blocks aren't reliably keyed by ID (the writer never sets one),
// so Order — always unique and set — is the identifier used across these
// endpoints.
func findProductBlockByOrder(post *models.BlogPost, order int) (int, error) {
	for i, b := range post.Blocks {
		if b.Type == models.BlockTypeProduct && b.Order == order {
			return i, nil
		}
	}
	return -1, errors.New("product block not found at that order")
}

func applyMatchedProduct(block *models.BlogBlock, match services.MatchedProduct) {
	block.ProductID = match.ProductID
	block.ProductName = match.Name
	block.ProductImage = match.Image
	block.ProductColorHex = match.ColorHex
	block.ProductColorName = match.ColorName
	block.ProductPrice = match.Price
	block.ProductOriginalPrice = match.OriginalPrice
}

// SearchProductsForBlock searches the catalog for candidate products matching
// a free-text query, for the admin's manual-search UI.
// GET /api/admin/blog-posts/{id}/product-blocks/search?q=...
func SearchProductsForBlock(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Query parameter 'q' is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	agent, err := services.NewProductMatchAgent(db.Database)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to initialize product search: "+err.Error())
		return
	}

	candidates, err := agent.FindCandidates(ctx, query, 8)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Product search failed: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"candidates": candidates})
}

// AutoMatchProductBlock runs AI-assisted matching for a single product block,
// using its writer-authored productDescription as the search query, and
// applies the top in-stock candidate directly to the block.
// POST /api/admin/blog-posts/{id}/product-blocks/{order}/auto-match
func AutoMatchProductBlock(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}
	order, err := strconv.Atoi(vars["order"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid block order")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	post, err := repo.FindPostByID(ctx, postID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		return
	}

	blockIdx, err := findProductBlockByOrder(post, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}
	description := post.Blocks[blockIdx].ProductDescription
	if description == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product block has no description to match against")
		return
	}

	agent, err := services.NewProductMatchAgent(db.Database)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to initialize product matching: "+err.Error())
		return
	}

	match, err := agent.AutoMatch(ctx, description)
	if err != nil {
		if errors.Is(err, services.ErrNoProductMatch) {
			utils.ErrorResponse(w, http.StatusNotFound, "No in-stock product matched this description — try a manual search instead")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Auto-match failed: "+err.Error())
		return
	}

	applyMatchedProduct(&post.Blocks[blockIdx], *match)

	if err := repo.UpdatePost(ctx, postID, bson.M{"blocks": post.Blocks, "updated_at": time.Now()}); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save resolved product: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"block": post.Blocks[blockIdx]})
}

// SelectProductForBlock lets an admin manually assign a specific product+color
// to a product block, re-validating that the chosen color actually has
// inventory before saving.
// PATCH /api/admin/blog-posts/{id}/product-blocks/{order}
func SelectProductForBlock(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}
	order, err := strconv.Atoi(vars["order"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid block order")
		return
	}

	var payload struct {
		ProductID string `json:"productId"`
		ColorHex  string `json:"colorHex"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	productObjID, err := primitive.ObjectIDFromHex(payload.ProductID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid product ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	post, err := repo.FindPostByID(ctx, postID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		return
	}

	blockIdx, err := findProductBlockByOrder(post, order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	var product models.Product
	if err := db.Database.Collection("products").FindOne(ctx, bson.M{"_id": productObjID, "is_active": true}).Decode(&product); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Product not found")
		return
	}

	variant, _, err := services.ResolveColorVariant(&product, payload.ColorHex)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	applyMatchedProduct(&post.Blocks[blockIdx], services.MatchedProduct{
		ProductID:     product.ID.Hex(),
		Name:          product.Name,
		Image:         firstNonEmptyImage(product, *variant),
		ColorHex:      variant.Color,
		ColorName:     variant.ColorName,
		Price:         product.Price,
		OriginalPrice: product.OriginalPrice,
	})

	if err := repo.UpdatePost(ctx, postID, bson.M{"blocks": post.Blocks, "updated_at": time.Now()}); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save selected product: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"block": post.Blocks[blockIdx]})
}

func firstNonEmptyImage(product models.Product, variant models.ColorVariant) string {
	if len(variant.Images) > 0 {
		return variant.Images[0]
	}
	if len(product.MainImages) > 0 {
		return product.MainImages[0]
	}
	return ""
}
