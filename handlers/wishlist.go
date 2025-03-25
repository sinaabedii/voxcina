package handlers

import (
	"net/http"

	"backEnd/utils"
)

// GET /api/wishlist
func GetWishlist(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "User wishlist"})
}

// POST /api/wishlist
func AddToWishlist(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusCreated, map[string]string{"message": "Item added to wishlist"})
}

// DELETE /api/wishlist/{itemId}
func RemoveFromWishlist(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item removed from wishlist"})
}
