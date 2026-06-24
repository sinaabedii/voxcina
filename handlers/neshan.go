package handlers

import (
	"net/http"
	"strconv"

	"backEnd/services"
	"backEnd/utils"
)

func NeshanReverseGeocode(w http.ResponseWriter, r *http.Request) {
	latStr := r.URL.Query().Get("lat")
	lngStr := r.URL.Query().Get("lng")

	if latStr == "" || lngStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "lat and lng query parameters are required")
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid lat value")
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "invalid lng value")
		return
	}

	result, err := services.ReverseGeocode(lat, lng)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

func NeshanSearchAddress(w http.ResponseWriter, r *http.Request) {
	term := r.URL.Query().Get("term")
	latStr := r.URL.Query().Get("lat")
	lngStr := r.URL.Query().Get("lng")

	if term == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "term query parameter is required")
		return
	}

	var lat, lng float64
	var err error

	if latStr != "" {
		lat, err = strconv.ParseFloat(latStr, 64)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "invalid lat value")
			return
		}
	}
	if lngStr != "" {
		lng, err = strconv.ParseFloat(lngStr, 64)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "invalid lng value")
			return
		}
	}

	items, err := services.SearchAddress(term, lat, lng)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"items": items})
}
