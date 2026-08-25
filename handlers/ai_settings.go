package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backEnd/services"
	"backEnd/utils"
)

// The admin dashboard's AI section. Both fields are overrides: leaving one
// empty keeps whatever the code already does, which is why the response also
// reports the defaults — the admin should be able to see what an empty field
// resolves to rather than guess.

type aiSettingsDefaults struct {
	SupportChatModel string `json:"supportChatModel"`
	TryOnChatModel   string `json:"tryOnChatModel"`
	TryOnImageModel  string `json:"tryOnImageModel"`
}

type aiSettingsResponse struct {
	ChatModel       string             `json:"chatModel"`
	TryOnImageModel string             `json:"tryOnImageModel"`
	UpdatedAt       *time.Time         `json:"updatedAt,omitempty"`
	Defaults        aiSettingsDefaults `json:"defaults"`
}

func buildAISettingsResponse(settings services.AISettings) aiSettingsResponse {
	response := aiSettingsResponse{
		ChatModel:       settings.ChatModel,
		TryOnImageModel: settings.TryOnImageModel,
		Defaults: aiSettingsDefaults{
			SupportChatModel: services.DefaultSupportChatModel(),
			TryOnChatModel:   services.SellerConfig().Model,
			TryOnImageModel:  defaultTryOnModel,
		},
	}
	if !settings.UpdatedAt.IsZero() {
		updatedAt := settings.UpdatedAt
		response.UpdatedAt = &updatedAt
	}
	return response
}

// GetAISettings handles GET /api/admin/ai/settings
func GetAISettings(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	utils.JSONResponse(w, http.StatusOK, buildAISettingsResponse(services.CurrentAISettings(ctx)))
}

// UpdateAISettings handles PUT /api/admin/ai/settings
func UpdateAISettings(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ChatModel       string `json:"chatModel"`
		TryOnImageModel string `json:"tryOnImageModel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON format: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	saved, err := services.SaveAISettings(ctx, services.AISettings{
		ChatModel:       payload.ChatModel,
		TryOnImageModel: payload.TryOnImageModel,
	})
	if err != nil {
		// A rejected model name is the admin's typo, not a server fault.
		if validationErr := services.ValidateModelName(payload.ChatModel); validationErr != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, validationErr.Error())
			return
		}
		if validationErr := services.ValidateModelName(payload.TryOnImageModel); validationErr != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, validationErr.Error())
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving AI settings: "+err.Error())
		return
	}

	utils.LogAction("info", "Admin updated AI models: chat="+saved.ChatModel+" tryon_image="+saved.TryOnImageModel)
	utils.JSONResponse(w, http.StatusOK, buildAISettingsResponse(saved))
}
