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
	trackIDStr := r.URL.Query().Get("trackId")
	orderIDStr := r.URL.Query().Get("orderId")

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	if trackIDStr == "" {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=missing_trackId", http.StatusFound)
		return
	}

	trackID, err := strconv.ParseInt(trackIDStr, 10, 64)
	if err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=invalid_trackId", http.StatusFound)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("orders")
	var order models.Order

	filter := bson.M{"zibal_track_id": trackID}
	if orderIDStr != "" {
		if objID, err := primitive.ObjectIDFromHex(orderIDStr); err == nil {
			filter = bson.M{"_id": objID, "zibal_track_id": trackID}
		}
	}

	if err = collection.FindOne(ctx, filter).Decode(&order); err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=order_not_found", http.StatusFound)
		return
	}

	// Best practice: Always verify with Zibal API instead of trusting URL params
	zibalResp, err := zibalService.VerifyPayment(ctx, trackID)
	
	now := time.Now()
	var paymentStatus, orderStatus, statusText, successParam string
	
	if err == nil && zibalResp.Result == 100 && services.IsPaymentSuccessful(zibalResp.Status) {
		// Payment verified as successful
		paymentStatus = "paid"
		orderStatus = "processing"
		statusText = "در حال پردازش"
		successParam = "1"
		
		collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status":   paymentStatus,
				"status":           orderStatus,
				"status_text":      statusText,
				"zibal_ref_number": zibalResp.RefNumber,
				"paid_at":          now,
				"updated_at":       now,
			},
		})
	} else if err == nil && zibalResp.Result == 100 && services.IsPaymentPending(zibalResp.Status) {
		// User pressed back - payment not completed
		paymentStatus = "abandoned"
		orderStatus = "pending"
		statusText = "در انتظار پرداخت"
		successParam = "0"
		
		collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": paymentStatus,
				"status":         orderStatus,
				"status_text":    statusText,
				"updated_at":     now,
			},
		})
	} else {
		// Payment failed or cancelled
		paymentStatus = "failed"
		orderStatus = "pending" // Keep pending to allow retry
		statusText = "پرداخت ناموفق"
		successParam = "0"
		
		if err == nil && zibalResp.Result == 100 && services.IsPaymentCancelledByUser(zibalResp.Status) {
			paymentStatus = "cancelled"
			statusText = "لغو شده توسط کاربر"
		}
		
		collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": paymentStatus,
				"status":         orderStatus,
				"status_text":    statusText,
				"updated_at":     now,
			},
		})
	}

	redirectURL := fmt.Sprintf("%s/checkout/callback?success=%s&trackId=%s&orderId=%s&status=%s",
		appURL, successParam, trackIDStr, order.ID.Hex(), paymentStatus)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

type VerifyPaymentPayload struct {
	TrackID int64 `json:"trackId"`
}

type VerifyPaymentResponse struct {
	Result        int        `json:"result"`
	Message       string     `json:"message"`
	Status        int        `json:"status"`
	Amount        int64      `json:"amount"`
	RefNumber     string     `json:"refNumber,omitempty"`
	CardNumber    string     `json:"cardNumber,omitempty"`
	PaidAt        *time.Time `json:"paidAt,omitempty"`
	Description   string     `json:"description,omitempty"`
	OrderID       string     `json:"orderId,omitempty"`
	PaymentStatus string     `json:"paymentStatus"`
	StatusText    string     `json:"statusText"`
	CanRetry      bool       `json:"canRetry"`      // True if user can retry payment
	OrderNumber   string     `json:"orderNumber,omitempty"` // Order number for display
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
	canRetry := false

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
	} else if services.IsPaymentPending(zibalResp.Status) {
		// Payment was abandoned (user pressed back)
		paymentStatus = "abandoned"
		statusText = "پرداخت ناتمام - می‌توانید دوباره تلاش کنید"
		canRetry = true
	} else if services.IsPaymentCancelledByUser(zibalResp.Status) {
		// User explicitly cancelled
		paymentStatus = "cancelled"
		canRetry = true
	} else {
		// Other failures - can retry
		canRetry = true
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
		OrderID:       order.ID.Hex(),
		PaymentStatus: paymentStatus,
		StatusText:    statusText,
		CanRetry:      canRetry,
		OrderNumber:   order.OrderNumber,
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


// RetryPaymentPayload represents the request body for retrying payment
type RetryPaymentPayload struct {
	OrderID string `json:"orderId"`
}

// RetryPayment allows user to retry payment for a pending/failed order
func RetryPayment(w http.ResponseWriter, r *http.Request) {
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

	var payload RetryPaymentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
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

	// Find order that belongs to user and is not paid
	err = collection.FindOne(ctx, bson.M{
		"_id":            orderObjID,
		"user_id":        userID,
		"payment_status": bson.M{"$in": []string{"pending", "failed", "abandoned", "cancelled"}},
		"status":         bson.M{"$ne": "expired"},
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "سفارش قابل پرداخت یافت نشد")
		return
	}

	// Check if order is not expired (30 minutes)
	if time.Since(order.CreatedAt) > 30*time.Minute {
		// Mark as expired
		collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": "expired",
				"status":         "cancelled",
				"status_text":    "منقضی شده - پرداخت نشده",
				"updated_at":     time.Now(),
			},
		})
		utils.ErrorResponse(w, http.StatusBadRequest, "مهلت پرداخت این سفارش به پایان رسیده است. لطفاً سفارش جدید ثبت کنید")
		return
	}

	// Create new payment request
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	callbackURL := appURL + "/api/payment/callback"

	zibalReq := &services.ZibalPaymentRequest{
		Amount:      int64(order.TotalAmount),
		CallbackURL: callbackURL,
		Description: fmt.Sprintf("Order %s - تلاش مجدد پرداخت", order.OrderNumber),
		OrderID:     payload.OrderID,
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

	// Update order with new track ID
	trackID := zibalResp.TrackID
	now := time.Now()
	_, err = collection.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
		"$set": bson.M{
			"zibal_track_id": trackID,
			"payment_status": "pending",
			"updated_at":     now,
		},
	})

	if err != nil {
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
