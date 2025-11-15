package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var chatService *services.ChatService

// InitChatService initializes the chat service
func InitChatService(db *mongo.Database) {
	chatService = services.NewChatService(db)
	
	// Create indexes
	ctx := context.Background()
	if err := chatService.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create chat indexes: %v", err)
	}
}

// SaveChatMessage handles POST /api/chat/save
// Saves a chat message to the database
func SaveChatMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		ChatID    string              `json:"chat_id" validate:"required"`
		Message   models.ChatMessage  `json:"message" validate:"required"`
		UserID    string              `json:"user_id,omitempty"`
		SessionID string              `json:"session_id,omitempty"`
		Metadata  *models.ChatMetadata `json:"metadata,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ChatID == "" || req.Message.Text == "" || req.Message.Sender == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id, message text, and sender are required")
		return
	}

	ctx := context.Background()

	// Try to get existing chat
	existingChat, err := chatService.GetChatByChatID(ctx, req.ChatID)

	if err != nil {
		// Chat doesn't exist, create new one
		newChat := &models.Chat{
			ChatID:    req.ChatID,
			SessionID: req.SessionID,
			Messages:  []models.ChatMessage{req.Message},
			Status:    "active",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Set user ID if authenticated
		if req.UserID != "" {
			userID, err := primitive.ObjectIDFromHex(req.UserID)
			if err == nil {
				newChat.UserID = userID
			}
		}

		// Set metadata from request
		if req.Metadata != nil {
			newChat.Metadata = *req.Metadata
		}

		// Generate title and update metadata
		newChat.GenerateChatTitle()
		newChat.UpdateMetadata()

		// Create chat
		if err := chatService.CreateChat(ctx, newChat); err != nil {
			log.Printf("Error creating chat: %v", err)
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create chat")
			return
		}

		utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
			"success": true,
			"chat_id": newChat.ChatID,
			"id":      newChat.ID.Hex(),
			"message": "Chat created and message saved",
		})
		return
	}

	// Chat exists, add message
	if err := chatService.AddMessage(ctx, req.ChatID, req.Message); err != nil {
		log.Printf("Error adding message: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save message")
		return
	}

	// Update metadata
	if err := chatService.UpdateChatMetadata(ctx, req.ChatID); err != nil {
		log.Printf("Warning: Failed to update metadata: %v", err)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat_id": req.ChatID,
		"id":      existingChat.ID.Hex(),
		"message": "Message saved successfully",
	})
}

// GetChatHistory handles GET /api/chat/history/{chatId}
// Retrieves full chat history
func GetChatHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get chatId from URL path
	chatID := r.URL.Path[len("/api/chat/history/"):]
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Chat ID is required")
		return
	}

	ctx := context.Background()

	chat, err := chatService.GetChatByChatID(ctx, chatID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Chat not found")
		return
	}

	// Optional: Check authorization
	// userID := r.Header.Get("X-User-ID")
	// if userID != "" && chat.UserID.Hex() != userID {
	//     utils.ErrorResponse(w, http.StatusForbidden, "Access denied")
	//     return
	// }

	utils.JSONResponse(w, http.StatusOK, chat)
}

// ListUserChats handles GET /api/chat/sessions
// Lists all chat sessions for a user
func ListUserChats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get user ID from query or header
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = r.Header.Get("X-User-ID")
	}

	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Pagination
	page := utils.GetIntFromQuery(r, "page", 1)
	limit := utils.GetIntFromQuery(r, "limit", 20)

	ctx := context.Background()

	sessions, total, err := chatService.ListUserChats(ctx, objectID, page, limit)
	if err != nil {
		log.Printf("Error listing chats: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to list chats")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"sessions": sessions,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"pages":    (total + int64(limit) - 1) / int64(limit),
	})
}

// SearchChats handles POST /api/chat/search
// Advanced chat search with filters
func SearchChats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req models.ChatSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Default pagination
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	ctx := context.Background()

	sessions, total, err := chatService.SearchChats(ctx, req)
	if err != nil {
		log.Printf("Error searching chats: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to search chats")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"sessions": sessions,
		"total":    total,
		"page":     req.Page,
		"limit":    req.Limit,
		"pages":    (total + int64(req.Limit) - 1) / int64(req.Limit),
	})
}

// DeleteChat handles DELETE /api/chat/{chatId}
// Soft deletes a chat
func DeleteChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get chatId from URL path
	chatID := r.URL.Path[len("/api/chat/"):]
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Chat ID is required")
		return
	}

	ctx := context.Background()

	if err := chatService.DeleteChat(ctx, chatID); err != nil {
		log.Printf("Error deleting chat: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete chat")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Chat deleted successfully",
	})
}

// ArchiveChat handles PUT /api/chat/{chatId}/archive
// Archives a chat
func ArchiveChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	chatID := r.URL.Path[len("/api/chat/"):]
	chatID = chatID[:len(chatID)-len("/archive")]

	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Chat ID is required")
		return
	}

	ctx := context.Background()

	if err := chatService.UpdateChatStatus(ctx, chatID, "archived"); err != nil {
		log.Printf("Error archiving chat: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to archive chat")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Chat archived successfully",
	})
}

// TrackProductClick handles POST /api/chat/{chatId}/click
// Tracks product click from chat recommendations
func TrackProductClick(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	chatID := r.URL.Path[len("/api/chat/"):]
	chatID = chatID[:len(chatID)-len("/click")]

	var req struct {
		ProductID string `json:"product_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ProductID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Product ID is required")
		return
	}

	ctx := context.Background()

	if err := chatService.TrackProductClick(ctx, chatID, req.ProductID); err != nil {
		log.Printf("Error tracking product click: %v", err)
		// Don't fail the request, just log
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// TrackConversion handles POST /api/chat/{chatId}/conversion
// Marks that a purchase was made from this chat
func TrackConversion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	chatID := r.URL.Path[len("/api/chat/"):]
	chatID = chatID[:len(chatID)-len("/conversion")]

	ctx := context.Background()

	if err := chatService.TrackConversion(ctx, chatID); err != nil {
		log.Printf("Error tracking conversion: %v", err)
		// Don't fail the request
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

// GetChatAnalytics handles GET /api/chat/analytics
// Returns analytics for a time period
func GetChatAnalytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse date range
	fromDateStr := r.URL.Query().Get("from")
	toDateStr := r.URL.Query().Get("to")

	var fromDate, toDate time.Time
	var err error

	if fromDateStr != "" {
		fromDate, err = time.Parse("2006-01-02", fromDateStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid from date format (use YYYY-MM-DD)")
			return
		}
	} else {
		// Default to last 30 days
		fromDate = time.Now().AddDate(0, 0, -30)
	}

	if toDateStr != "" {
		toDate, err = time.Parse("2006-01-02", toDateStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid to date format (use YYYY-MM-DD)")
			return
		}
	} else {
		toDate = time.Now()
	}

	ctx := context.Background()

	analytics, err := chatService.GetAnalytics(ctx, fromDate, toDate)
	if err != nil {
		log.Printf("Error getting analytics: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to get analytics")
		return
	}

	utils.JSONResponse(w, http.StatusOK, analytics)
}

// ExportChats handles POST /api/admin/chat/export
// Exports chat data in various formats
func ExportChats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req models.ChatExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Format == "" {
		req.Format = "json"
	}

	// TODO: Implement export logic based on format
	// For now, return a simple response

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Export feature coming soon",
		"format":  req.Format,
	})
}

// LinkChatToUser handles POST /api/chat/link-to-user
// Links an anonymous chat to a user account (called after login)
func LinkChatToUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		ChatID string `json:"chat_id" validate:"required"`
		UserID string `json:"user_id" validate:"required"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ChatID == "" || req.UserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id and user_id are required")
		return
	}

	ctx := context.Background()

	// Convert user_id to ObjectID
	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID format")
		return
	}

	// Update the chat to link it to the user
	if err := chatService.LinkChatToUser(ctx, req.ChatID, userID); err != nil {
		log.Printf("Error linking chat to user: %v", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to link chat to user")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Chat linked to user successfully",
	})
}
