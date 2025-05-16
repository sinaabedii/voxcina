package handlers

import (
	"net/http"

	"backEnd/utils"
)

// GET /api/promotions/home
func GetHomePromotions(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Home promotions"})
}

// GET /api/promotions/{campaignId}
func GetPromotionByID(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(
		w,
		http.StatusOK,
		map[string]string{"message": "Promotion details"},
	)
}
