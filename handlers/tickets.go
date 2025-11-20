package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// CreateTicket handles POST /api/tickets
// Creates a new support ticket for the authenticated user
func CreateTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid user context")
		return
	}

	var payload struct {
		Subject  string `json:"subject"`
		Category string `json:"category"`
		Priority string `json:"priority"`
		Message  string `json:"message"`
		OrderID  string `json:"order_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Subject == "" || payload.Message == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Subject and message are required")
		return
	}

	category := payload.Category
	if category == "" {
		category = "general"
	}

	priority := payload.Priority
	if priority == "" {
		priority = "medium"
	}

	var orderIDPtr *primitive.ObjectID
	if payload.OrderID != "" {
		if oid, err := primitive.ObjectIDFromHex(payload.OrderID); err == nil {
			orderIDPtr = &oid
		}
	}

	now := time.Now()
	ticketNumber := getNextTicketNumber()

	initialMessage := models.TicketMessage{
		ID:        primitive.NewObjectID(),
		Sender:    "user",
		Body:      payload.Message,
		CreatedAt: now,
	}

	ticket := models.Ticket{
		ID:           primitive.NewObjectID(),
		TicketNumber: fmt.Sprintf("TCK-%05d", ticketNumber),
		UserID:       userID,
		Subject:      payload.Subject,
		Category:     category,
		Priority:     priority,
		Status:       "open",
		OrderID:      orderIDPtr,
		Messages:     []models.TicketMessage{initialMessage},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")
	if _, err := collection.InsertOne(ctx, ticket); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create ticket")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, ticket)
}

// GetUserTickets handles GET /api/tickets
// Returns tickets for the authenticated user with optional status filter
func GetUserTickets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid user context")
		return
	}

	status := r.URL.Query().Get("status")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}
	skip := (page - 1) * limit

	filter := bson.M{"user_id": userID}
	if status != "" && status != "all" {
		filter["status"] = status
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")
	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "updated_at", Value: -1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch tickets")
		return
	}
	defer cursor.Close(ctx)

	var tickets []models.Ticket
	if err := cursor.All(ctx, &tickets); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decode tickets")
		return
	}

	totalCount, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to count tickets")
		return
	}

	response := map[string]interface{}{
		"tickets": tickets,
		"pagination": map[string]interface{}{
			"currentPage": page,
			"totalPages":  (totalCount + int64(limit) - 1) / int64(limit),
			"totalTickets": totalCount,
			"pageSize":    limit,
		},
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// GetTicketByID handles GET /api/tickets/{ticketId}
// Returns a single ticket if the user owns it or is admin
func GetTicketByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	vars := mux.Vars(r)
	ticketIDStr, ok := vars["ticketId"]
	if !ok || ticketIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Ticket ID is required")
		return
	}

	ticketID, err := primitive.ObjectIDFromHex(ticketIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	userIDCtx := r.Context().Value("userID")
	roleCtx := r.Context().Value("role")

	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid user context")
		return
	}

	role, _ := roleCtx.(string)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")

	filter := bson.M{"_id": ticketID}
	if role != "admin" {
		filter["user_id"] = userID
	}

	var ticket models.Ticket
	if err := collection.FindOne(ctx, filter).Decode(&ticket); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Ticket not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch ticket")
		return
	}

	utils.JSONResponse(w, http.StatusOK, ticket)
}

// AddTicketMessage handles POST /api/tickets/{ticketId}/messages
// Adds a message to a ticket (user or support)
func AddTicketMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	vars := mux.Vars(r)
	ticketIDStr, ok := vars["ticketId"]
	if !ok || ticketIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Ticket ID is required")
		return
	}

	ticketID, err := primitive.ObjectIDFromHex(ticketIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	userIDCtx := r.Context().Value("userID")
	roleCtx := r.Context().Value("role")

	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User authentication required")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid user context")
		return
	}

	role, _ := roleCtx.(string)

	var payload struct {
		Body string `json:"body"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Body == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Message body is required")
		return
	}

	sender := "user"
	if role == "admin" {
		sender = "support"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")

	filter := bson.M{"_id": ticketID}
	if role != "admin" {
		filter["user_id"] = userID
	}

	message := models.TicketMessage{
		ID:        primitive.NewObjectID(),
		Sender:    sender,
		Body:      payload.Body,
		CreatedAt: time.Now(),
	}

	statusUpdate := "answered"
	if sender == "user" {
		statusUpdate = "open"
	}

	update := bson.M{
		"$push": bson.M{"messages": message},
		"$set": bson.M{
			"updated_at": time.Now(),
			"status":     statusUpdate,
		},
	}

	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to add message")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Ticket not found or access denied")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Message added to ticket",
	})
}

// AdminListTickets handles GET /api/admin/tickets
// Lists tickets for admins with optional filters
func AdminListTickets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	roleCtx := r.Context().Value("role")
	if roleCtx == nil || roleCtx.(string) != "admin" {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Admin access required")
		return
	}

	status := r.URL.Query().Get("status")
	priority := r.URL.Query().Get("priority")
	search := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	skip := (page - 1) * limit

	filter := bson.M{}
	if status != "" && status != "all" {
		filter["status"] = status
	}
	if priority != "" && priority != "all" {
		filter["priority"] = priority
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"ticket_number": bson.M{"$regex": search, "$options": "i"}},
			{"subject": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")
	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch tickets")
		return
	}
	defer cursor.Close(ctx)

	var tickets []models.Ticket
	if err := cursor.All(ctx, &tickets); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decode tickets")
		return
	}

	totalCount, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to count tickets")
		return
	}

	response := map[string]interface{}{
		"tickets": tickets,
		"pagination": map[string]interface{}{
			"currentPage": page,
			"totalPages":  (totalCount + int64(limit) - 1) / int64(limit),
			"totalTickets": totalCount,
			"pageSize":    limit,
		},
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// AdminUpdateTicketStatus handles PUT /api/admin/tickets/{ticketId}/status
// Updates the status and optionally priority of a ticket
func AdminUpdateTicketStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	roleCtx := r.Context().Value("role")
	if roleCtx == nil || roleCtx.(string) != "admin" {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	ticketIDStr, ok := vars["ticketId"]
	if !ok || ticketIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Ticket ID is required")
		return
	}

	ticketID, err := primitive.ObjectIDFromHex(ticketIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	var payload struct {
		Status   string `json:"status"`
		Priority string `json:"priority,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updateFields := bson.M{
		"status":     payload.Status,
		"updated_at": time.Now(),
	}
	if payload.Priority != "" {
		updateFields["priority"] = payload.Priority
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("tickets")
	update := bson.M{"$set": updateFields}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": ticketID}, update)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update ticket")
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Ticket not found")
		return
	}

	var updatedTicket models.Ticket
	if err := collection.FindOne(ctx, bson.M{"_id": ticketID}).Decode(&updatedTicket); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch updated ticket")
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedTicket)
}

// getNextTicketNumber generates a sequential ticket number using the counters collection
func getNextTicketNumber() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("counters")

	var result struct {
		ID  string `bson:"_id"`
		Seq int    `bson:"seq"`
	}

	err := collection.FindOne(ctx, bson.M{"_id": "ticketNumber"}).Decode(&result)
	if err != nil {
		// Initialize counter if it doesn't exist
		_, insertErr := collection.InsertOne(ctx, bson.M{"_id": "ticketNumber", "seq": 1001})
		if insertErr != nil {
			return 1001
		}
		return 1001
	}

	newSeq := result.Seq + 1
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": "ticketNumber"},
		bson.M{"$set": bson.M{"seq": newSeq}},
	)
	if err != nil {
		return result.Seq
	}

	return newSeq
}
