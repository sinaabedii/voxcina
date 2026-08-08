package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type adminAIUser struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
	Role     string `json:"role"`
	IsActive bool   `json:"is_active"`
}

type adminAIChatSummary struct {
	ID            string       `json:"id"`
	ChatID        string       `json:"chat_id"`
	UserID        string       `json:"user_id"`
	User          *adminAIUser `json:"user,omitempty"`
	Title         string       `json:"title"`
	MessageCount  int          `json:"message_count"`
	UserMessages  int          `json:"user_messages"`
	AgentMessages int          `json:"agent_messages"`
	TryonCount    int          `json:"tryon_count"`
	TryonMessages int          `json:"tryon_messages"`
	LastMessage   string       `json:"last_message,omitempty"`
	LastMessageAt time.Time    `json:"last_message_at,omitempty"`
	Status        string       `json:"status"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
}

func adminAIUserFromModel(user *models.User) *adminAIUser {
	if user == nil {
		return nil
	}
	return &adminAIUser{
		ID:       user.ID.Hex(),
		Name:     user.Name,
		Email:    user.Email,
		Phone:    user.Phone,
		Role:     user.Role,
		IsActive: user.IsActive,
	}
}

func getAdminAIUsers(ctx context.Context, userIDs []primitive.ObjectID) (map[primitive.ObjectID]*adminAIUser, error) {
	users := make(map[primitive.ObjectID]*adminAIUser, len(userIDs))
	if len(userIDs) == 0 {
		return users, nil
	}

	collection := db.Database.Collection("users")
	cur, err := collection.Find(ctx, bson.M{"_id": bson.M{"$in": userIDs}}, nil)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	for cur.Next(ctx) {
		var user models.User
		if err := cur.Decode(&user); err != nil {
			return nil, err
		}
		users[user.ID] = adminAIUserFromModel(&user)
	}
	if err := cur.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

// ListAdminTryonChats returns lightweight summaries for the AI chat admin page.
func ListAdminTryonChats(w http.ResponseWriter, r *http.Request) {
	if tryonChatService == nil || db.Database == nil {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "سرویس گفتگو در دسترس نیست")
		return
	}

	page := utils.GetIntFromQuery(r, "page", 1)
	limit := utils.GetIntFromQuery(r, "limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sessions, total, err := tryonChatService.ListAdminSessions(ctx, page, limit, search, status)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت گفتگوهای هوش مصنوعی")
		return
	}

	userIDs := make([]primitive.ObjectID, 0, len(sessions))
	for _, session := range sessions {
		userIDs = append(userIDs, session.UserID)
	}
	users, err := getAdminAIUsers(ctx, userIDs)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت اطلاعات کاربران")
		return
	}

	items := make([]adminAIChatSummary, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, adminAIChatSummary{
			ID:            session.ID.Hex(),
			ChatID:        session.ChatID,
			UserID:        session.UserID.Hex(),
			User:          users[session.UserID],
			Title:         session.Title,
			MessageCount:  session.MessageCount,
			UserMessages:  session.UserMessages,
			AgentMessages: session.AgentMessages,
			TryonCount:    session.TryonCount,
			TryonMessages: session.TryonMessages,
			LastMessage:   session.LastMessage,
			LastMessageAt: session.LastMessageAt,
			Status:        session.Status,
			CreatedAt:     session.CreatedAt,
			UpdatedAt:     session.UpdatedAt,
		})
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chats":   items,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"pages":   (total + int64(limit) - 1) / int64(limit),
	})
}

// GetAdminTryonChat returns one full transcript and all persisted try-on results.
func GetAdminTryonChat(w http.ResponseWriter, r *http.Request) {
	if tryonChatService == nil || virtualTryonService == nil || db.Database == nil {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "سرویس گفتگو در دسترس نیست")
		return
	}

	chatID := strings.TrimSpace(mux.Vars(r)["chatId"])
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه گفتگو الزامی است")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	chat, err := tryonChatService.GetByChatID(ctx, chatID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت گفتگو")
		return
	}
	if chat == nil {
		utils.ErrorResponse(w, http.StatusNotFound, "گفتگو پیدا نشد")
		return
	}

	tryonIDs := append([]string{}, chat.TryonIDs...)
	seenTryonIDs := make(map[string]struct{}, len(tryonIDs))
	for _, tryonID := range tryonIDs {
		seenTryonIDs[tryonID] = struct{}{}
	}
	for _, message := range chat.Messages {
		if message.TryonData == nil || message.TryonData.TryonID == "" {
			continue
		}
		if _, exists := seenTryonIDs[message.TryonData.TryonID]; !exists {
			tryonIDs = append(tryonIDs, message.TryonData.TryonID)
			seenTryonIDs[message.TryonData.TryonID] = struct{}{}
		}
	}

	tryons, err := virtualTryonService.ListByTryonIDs(ctx, tryonIDs)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت نتایج پرو مجازی")
		return
	}

	var userSummary *adminAIUser
	var user models.User
	userErr := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": chat.UserID}).Decode(&user)
	if userErr != nil && userErr != mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت اطلاعات کاربر")
		return
	}
	if userErr == nil {
		userSummary = adminAIUserFromModel(&user)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat":    chat,
		"user":    userSummary,
		"tryons":  tryons,
	})
}
