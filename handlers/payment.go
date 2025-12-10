package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

var zibalService *services.ZibalService

func InitZibalService() {
	merchant := os.Getenv("ZIBAL_MERCHANT")
	if merchant == "" {
		merchant = "zibal"
	}
	zibalService = services.NewZibalService(merchant)
}

type PaymentRequestPayload struct {
	OrderID     string `json:"orderId"`
	Amount      int64  `json:"amount"`
	Description string `json:"description,omitempty"`
	Mobile      string `json:"mobile,omitempty"`
}

type PaymentRequestResponse struct {
	Result  int    `json:"result"`
	Message string `json:"message"`
	TrackID int64  `json:"trackId,omitempty"`
	PayURL  string `json:"payUrl,omitempty"`
}

func RequestPayment(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID in context")
		return
	}

	var payload PaymentRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Amount < 1000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Amount must be at least 1000 Rials")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")
	var order models.Order

	orderObjID, err := primitive.ObjectIDFromHex(payload.OrderID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID format")
		return
	}

	err = collection.FindOne(ctx, bson.M{
		"_id":     orderObjID,
		"user_id": userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	callbackURL := appURL + "/api/payment/callback"

	zibalReq := &services.ZibalPaymentRequest{
		Amount:      payload.Amount,
		CallbackURL: callbackURL,
		Description: fmt.Sprintf("Order %s - %s", order.OrderNumber, payload.Description),
		OrderID:     payload.OrderID,
		Mobile:      payload.Mobile,
	}

	zibalResp, err := zibalService.RequestPayment(ctx, zibalReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to initiate payment: "+err.Error())
		return
	}

	if zibalResp.Result != 100 {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("Zibal error: %s", zibalResp.Message))
		return
	}

	trackID := zibalResp.TrackID
	now := time.Now()
	updateResult, err := collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
		"$set": bson.M{
			"zibal_track_id": trackID,
			"payment_status": "pending",
			"updated_at":     now,
		},
	})

	if err != nil || updateResult.ModifiedCount == 0 {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update order with track ID")
		return
	}

	payURL := zibalService.GetPaymentURL(trackID)

	utils.JSONResponse(w, http.StatusOK, PaymentRequestResponse{
		Result:  100,
		Message: "Payment request created successfully",
		TrackID: trackID,
		PayURL:  payURL,
	})
}

type PaymentCallbackPayload struct {
	Success int    `json:"success"`
	TrackID int64  `json:"trackId"`
	OrderID string `json:"orderId"`
	Status  int    `json:"status"`
}

type PaymentCallbackResponse struct {
	Result  int    `json:"result"`
	Message string `json:"message"`
}

func PaymentCallback(w http.ResponseWriter, r *http.Request) {
	success := r.URL.Query().Get("success")
	trackIDStr := r.URL.Query().Get("trackId")
	orderIDStr := r.URL.Query().Get("orderId")

	if trackIDStr == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "trackId is required")
		return
	}

	trackID, err := strconv.ParseInt(trackIDStr, 10, 64)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid trackId format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")
	var order models.Order

	filter := bson.M{"zibal_track_id": trackID}
	if orderIDStr != "" {
		objID, err := primitive.ObjectIDFromHex(orderIDStr)
		if err == nil {
			filter = bson.M{
				"_id":             objID,
				"zibal_track_id": trackID,
			}
		}
	}

	err = collection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	if success == "1" {
		now := time.Now()
		_, err := collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": "paid",
				"status":         "processing",
				"status_text":    "در حال پردازش",
				"paid_at":        now,
				"updated_at":     now,
			},
		})

		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update order status")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(PaymentCallbackResponse{
			Result:  100,
			Message: "Payment callback processed successfully",
		})
		return
	}

	now := time.Now()
	_, err = collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
		"$set": bson.M{
			"payment_status": "failed",
			"status":         "cancelled",
			"status_text":    "لغو شده",
			"updated_at":     now,
		},
	})

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update order status")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(PaymentCallbackResponse{
		Result:  100,
		Message: "Payment callback processed",
	})
}

type VerifyPaymentPayload struct {
	TrackID int64 `json:"trackId"`
}

type VerifyPaymentResponse struct {
	Result        int       `json:"result"`
	Message       string    `json:"message"`
	Status        int       `json:"status"`
	Amount        int64     `json:"amount"`
	RefNumber     string    `json:"refNumber,omitempty"`
	CardNumber    string    `json:"cardNumber,omitempty"`
	PaidAt        *time.Time `json:"paidAt,omitempty"`
	Description   string    `json:"description,omitempty"`
	OrderID       string    `json:"orderId,omitempty"`
	PaymentStatus string    `json:"paymentStatus"`
	StatusText    string    `json:"statusText"`
}

func VerifyPayment(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID in context")
		return
	}

	var payload VerifyPaymentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	zibalResp, err := zibalService.VerifyPayment(ctx, payload.TrackID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to verify payment: "+err.Error())
		return
	}

	if zibalResp.Result != 100 {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("Zibal error: %s", zibalResp.Message))
		return
	}

	collection := db.Database.Collection("orders")
	var order models.Order

	err = collection.FindOne(ctx, bson.M{
		"zibal_track_id": payload.TrackID,
		"user_id":        userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	paymentStatus := "failed"
	statusText := services.GetPaymentStatusText(zibalResp.Status)

	if services.IsPaymentSuccessful(zibalResp.Status) {
		paymentStatus = "paid"
		now := time.Now()
		_, err := collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status":   paymentStatus,
				"zibal_ref_number": zibalResp.RefNumber,
				"status":           "processing",
				"status_text":      "در حال پردازش",
				"paid_at":          now,
				"updated_at":       now,
			},
		})

		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update order")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, VerifyPaymentResponse{
		Result:        zibalResp.Result,
		Message:       zibalResp.Message,
		Status:        zibalResp.Status,
		Amount:        zibalResp.Amount,
		RefNumber:     zibalResp.RefNumber,
		CardNumber:    zibalResp.CardNumber,
		PaidAt:        &zibalResp.PaidAt,
		Description:   zibalResp.Description,
		OrderID:       zibalResp.OrderID,
		PaymentStatus: paymentStatus,
		StatusText:    statusText,
	})
}

type InquiryPaymentPayload struct {
	TrackID int64 `json:"trackId"`
}

type InquiryPaymentResponse struct {
	Result        int       `json:"result"`
	Message       string    `json:"message"`
	Status        int       `json:"status"`
	Amount        int64     `json:"amount"`
	RefNumber     string    `json:"refNumber,omitempty"`
	CardNumber    string    `json:"cardNumber,omitempty"`
	CreatedAt     *time.Time `json:"createdAt,omitempty"`
	PaidAt        *time.Time `json:"paidAt,omitempty"`
	VerifiedAt    *time.Time `json:"verifiedAt,omitempty"`
	Description   string    `json:"description,omitempty"`
	OrderID       string    `json:"orderId,omitempty"`
	PaymentStatus string    `json:"paymentStatus"`
	StatusText    string    `json:"statusText"`
}

func InquiryPayment(w http.ResponseWriter, r *http.Request) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Invalid user ID in context")
		return
	}

	var payload InquiryPaymentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	zibalResp, err := zibalService.InquiryPayment(ctx, payload.TrackID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to inquiry payment: "+err.Error())
		return
	}

	if zibalResp.Result != 100 {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("Zibal error: %s", zibalResp.Message))
		return
	}

	collection := db.Database.Collection("orders")
	var order models.Order

	err = collection.FindOne(ctx, bson.M{
		"zibal_track_id": payload.TrackID,
		"user_id":        userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	paymentStatus := "failed"
	statusText := services.GetPaymentStatusText(zibalResp.Status)

	if services.IsPaymentSuccessful(zibalResp.Status) {
		paymentStatus = "paid"
	}

	utils.JSONResponse(w, http.StatusOK, InquiryPaymentResponse{
		Result:        zibalResp.Result,
		Message:       zibalResp.Message,
		Status:        zibalResp.Status,
		Amount:        zibalResp.Amount,
		RefNumber:     zibalResp.RefNumber,
		CardNumber:    zibalResp.CardNumber,
		CreatedAt:     &zibalResp.CreatedAt,
		PaidAt:        &zibalResp.PaidAt,
		VerifiedAt:    &zibalResp.VerifiedAt,
		Description:   zibalResp.Description,
		OrderID:       zibalResp.OrderID,
		PaymentStatus: paymentStatus,
		StatusText:    statusText,
	})
}
