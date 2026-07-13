package handlers

import (
	"context"
	"crypto/rand"
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

var (
	zibalService  *services.ZibalService
	digipayService *services.DigiPayService
	gateways      map[string]services.PaymentGateway
)

func InitZibalService() {
	merchant := os.Getenv("ZIBAL_MERCHANT")
	if merchant == "" {
		merchant = "zibal"
	}
	zibalService = services.NewZibalService(merchant)
	if gateways == nil {
		gateways = make(map[string]services.PaymentGateway)
	}
	gateways[zibalService.Name()] = zibalService
}

func InitDigipayService() {
	digipayService = services.NewDigiPayService()
	if gateways == nil {
		gateways = make(map[string]services.PaymentGateway)
	}
	gateways[digipayService.Name()] = digipayService
}

func getGateway(name string) services.PaymentGateway {
	return gateways[name]
}

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// RequestPaymentPayload is sent by the client to request a payment.
type RequestPaymentPayload struct {
	OrderID     string `json:"orderId"`
	Gateway     string `json:"gateway"`
	Description string `json:"description,omitempty"`
	Mobile      string `json:"mobile,omitempty"`
}

type RequestPaymentResponse struct {
	Result  int    `json:"result"`
	Message string `json:"message"`
	PayURL  string `json:"payUrl,omitempty"`
	Gateway string `json:"gateway,omitempty"`
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

	var payload RequestPaymentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Gateway == "" {
		payload.Gateway = "zibal"
	}

	gateway := getGateway(payload.Gateway)
	if gateway == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("Unknown payment gateway: %s", payload.Gateway))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch user to get phone number if not provided (required for DigiPay)
	mobile := payload.Mobile
	if mobile == "" {
		usersCol := db.Database.Collection("users")
		var user models.User
		err := usersCol.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
		if err == nil && user.Phone != "" {
			mobile = user.Phone
		}
	}

	ordersCol := db.Database.Collection("orders")
	var order models.Order

	orderObjID, err := primitive.ObjectIDFromHex(payload.OrderID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID format")
		return
	}

	err = ordersCol.FindOne(ctx, bson.M{
		"_id":     orderObjID,
		"user_id": userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	// Derive amount from order — never trust client
	amountRials := int64(order.TotalAmount * 10)

	if amountRials < 1000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Amount must be at least 1000 Rials")
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	providerID := generateUUID()

	var callbackURL string
	if gateway.Name() == "digipay" {
		callbackURL = appURL + "/api/payment/digipay-callback"
	} else {
		callbackURL = appURL + "/api/payment/callback"
	}

	now := time.Now()
	attempt := models.PaymentAttempt{
		OrderID:        order.ID,
		UserID:         userID,
		Gateway:        gateway.Name(),
		ProviderID:     providerID,
		ExpectedAmount: amountRials,
		Status:         "pending",
		CreatedAt:      now,
	}

	description := payload.Description
	if description == "" {
		description = fmt.Sprintf("Order %s", order.OrderNumber)
	}

	payReq := &services.PaymentRequest{
		OrderID:     payload.OrderID,
		Amount:      amountRials,
		CallbackURL: callbackURL,
		Description: description,
		Mobile:      mobile,
		ProviderID:  providerID,
	}

	payResp, err := gateway.RequestPayment(ctx, payReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to initiate payment: "+err.Error())
		return
	}

	attempt.GatewayReference = payResp.GatewayRef

	attemptsCol := db.Database.Collection("payment_attempts")
	_, err = attemptsCol.InsertOne(ctx, attempt)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save payment attempt")
		return
	}

	// Update order with gateway and payment status
	ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
		"$set": bson.M{
			"gateway_name":   gateway.Name(),
			"payment_status": "pending",
			"updated_at":     now,
		},
	})

	utils.JSONResponse(w, http.StatusOK, RequestPaymentResponse{
		Result:  100,
		Message: "Payment request created successfully",
		PayURL:  payResp.PayURL,
		Gateway: gateway.Name(),
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// FinalizeVerifiedPayment atomically transitions an order to paid and marks
// the attempt as verified. Returns error on any failure.
// ──────────────────────────────────────────────────────────────────────────────

func FinalizeVerifiedPayment(attemptID primitive.ObjectID, verifiedAmount int64, verifiedRefNum string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	attemptsCol := db.Database.Collection("payment_attempts")
	var attempt models.PaymentAttempt

	err := attemptsCol.FindOne(ctx, bson.M{"_id": attemptID}).Decode(&attempt)
	if err != nil {
		return fmt.Errorf("attempt not found: %w", err)
	}

	// Strict amount verification
	if verifiedAmount != attempt.ExpectedAmount {
		return fmt.Errorf("verified amount %d != expected %d", verifiedAmount, attempt.ExpectedAmount)
	}

	if attempt.Status == "verified" {
		// Already verified — idempotent, check if order is also updated
		ordersCol := db.Database.Collection("orders")
		var order models.Order
		if err := ordersCol.FindOne(ctx, bson.M{"_id": attempt.OrderID}).Decode(&order); err == nil {
			if order.PaymentStatus == "paid" {
				return nil
			}
		}
	}

	now := time.Now()
	ordersCol := db.Database.Collection("orders")

	result, err := ordersCol.UpdateOne(ctx, bson.M{
		"_id":            attempt.OrderID,
		"payment_status": bson.M{"$in": []string{"pending", "failed", "abandoned", "cancelled"}},
	}, bson.M{
		"$set": bson.M{
			"payment_status": "paid",
			"status":         "processing",
			"status_text":    "در حال پردازش",
			"gateway_name":   attempt.Gateway,
			"paid_at":        now,
			"updated_at":     now,
		},
	})

	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("order is not in a payable state or already paid")
	}

	_, err = attemptsCol.UpdateOne(ctx, bson.M{"_id": attempt.ID}, bson.M{
		"$set": bson.M{
			"status":              "verified",
			"gateway_ref_number":  verifiedRefNum,
			"verified_at":         now,
		},
	})

	if err != nil {
		return fmt.Errorf("failed to update attempt: %w", err)
	}

	return nil
}

// ──────────────────────────────────────────────────────────────────────────────
// DigipayPaymentCallback handles browser form POST from DigiPay.
// Never trusts callback data as proof — only verify API is authoritative.
// ──────────────────────────────────────────────────────────────────────────────

func DigipayPaymentCallback(w http.ResponseWriter, r *http.Request) {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=parse_form", http.StatusSeeOther)
		return
	}

	providerID := r.FormValue("providerId")
	gatewayRef := r.FormValue("ticket")
	callbackTypeStr := r.FormValue("type")
	trackingCode := r.FormValue("trackingCode")

	if providerID == "" {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=missing_providerId", http.StatusSeeOther)
		return
	}

	callbackType, _ := strconv.Atoi(callbackTypeStr)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	attemptsCol := db.Database.Collection("payment_attempts")
	var attempt models.PaymentAttempt

	err := attemptsCol.FindOne(ctx, bson.M{
		"gateway":     "digipay",
		"provider_id": providerID,
	}).Decode(&attempt)

	if err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=attempt_not_found", http.StatusSeeOther)
		return
	}

	gateway := getGateway("digipay")
	if gateway == nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=gateway_unavailable", http.StatusSeeOther)
		return
	}

	verifyReq := &services.VerifyRequest{
		GatewayRef:     gatewayRef,
		ExpectedAmount: attempt.ExpectedAmount,
		ProviderID:     providerID,
		CallbackType:   callbackType,
		TrackingCode:   trackingCode,
	}

	verifyResp, err := gateway.VerifyPayment(ctx, verifyReq)
	if err != nil || !verifyResp.Success {
		redirectURL := fmt.Sprintf("%s/checkout/callback?success=0&error=verify_failed&orderId=%s&gateway=digipay",
			appURL, attempt.OrderID.Hex())
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
		return
	}

	if err := FinalizeVerifiedPayment(attempt.ID, verifyResp.Amount, verifyResp.RefNumber); err != nil {
		redirectURL := fmt.Sprintf("%s/checkout/callback?success=0&error=finalize_failed&orderId=%s&gateway=digipay",
			appURL, attempt.OrderID.Hex())
		http.Redirect(w, r, redirectURL, http.StatusSeeOther)
		return
	}

	redirectURL := fmt.Sprintf("%s/checkout/callback?success=1&orderId=%s&gateway=digipay",
		appURL, attempt.OrderID.Hex())
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// ──────────────────────────────────────────────────────────────────────────────
// PaymentCallback handles Zibal GET callback.
// ──────────────────────────────────────────────────────────────────────────────

func PaymentCallback(w http.ResponseWriter, r *http.Request) {
	trackIDStr := r.URL.Query().Get("trackId")
	orderIDStr := r.URL.Query().Get("orderId")

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	if trackIDStr == "" {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=missing_trackId&gateway=zibal", http.StatusFound)
		return
	}

	trackID, err := strconv.ParseInt(trackIDStr, 10, 64)
	if err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=invalid_trackId&gateway=zibal", http.StatusFound)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ordersCol := db.Database.Collection("orders")
	var order models.Order

	filter := bson.M{"zibal_track_id": trackID}
	if orderIDStr != "" {
		if objID, err := primitive.ObjectIDFromHex(orderIDStr); err == nil {
			filter = bson.M{"_id": objID, "zibal_track_id": trackID}
		}
	}

	if err = ordersCol.FindOne(ctx, filter).Decode(&order); err != nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=order_not_found&gateway=zibal", http.StatusFound)
		return
	}

	if order.PaymentStatus == "paid" {
		redirectURL := fmt.Sprintf("%s/checkout/callback?success=1&trackId=%s&orderId=%s&status=paid&gateway=zibal",
			appURL, trackIDStr, order.ID.Hex())
		http.Redirect(w, r, redirectURL, http.StatusFound)
		return
	}

	gateway := getGateway("zibal")
	if gateway == nil {
		http.Redirect(w, r, appURL+"/checkout/callback?success=0&error=gateway_unavailable&gateway=zibal", http.StatusFound)
		return
	}

	verifyReq := &services.VerifyRequest{
		GatewayRef:     trackIDStr,
		ExpectedAmount: int64(order.TotalAmount * 10),
	}

	verifyResp, err := gateway.VerifyPayment(ctx, verifyReq)

	now := time.Now()
	var paymentStatus, orderStatus, statusText, successParam string

	if err == nil && verifyResp.Success && verifyResp.Amount == int64(order.TotalAmount*10) {
		paymentStatus = "paid"
		orderStatus = "processing"
		statusText = "در حال پردازش"
		successParam = "1"

		ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID, "payment_status": bson.M{"$ne": "paid"}}, bson.M{
			"$set": bson.M{
				"payment_status":   paymentStatus,
				"status":           orderStatus,
				"status_text":      statusText,
				"zibal_ref_number": verifyResp.RefNumber,
				"paid_at":          now,
				"updated_at":       now,
			},
		})
	} else if err == nil && !verifyResp.Success {
		paymentStatus = "abandoned"
		orderStatus = "pending"
		statusText = "در انتظار پرداخت"
		successParam = "0"

		ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": paymentStatus,
				"status":         orderStatus,
				"status_text":    statusText,
				"updated_at":     now,
			},
		})
	} else {
		paymentStatus = "failed"
		orderStatus = "pending"
		statusText = "پرداخت ناموفق"
		successParam = "0"

		ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
			"$set": bson.M{
				"payment_status": paymentStatus,
				"status":         orderStatus,
				"status_text":    statusText,
				"updated_at":     now,
			},
		})
	}

	redirectURL := fmt.Sprintf("%s/checkout/callback?success=%s&trackId=%s&orderId=%s&status=%s&gateway=zibal",
		appURL, successParam, trackIDStr, order.ID.Hex(), paymentStatus)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// ──────────────────────────────────────────────────────────────────────────────
// VerifyPayment
// ──────────────────────────────────────────────────────────────────────────────

type VerifyPaymentPayload struct {
	TrackID     int64  `json:"trackId"`
	Gateway     string `json:"gateway,omitempty"`
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
	CanRetry      bool       `json:"canRetry"`
	OrderNumber   string     `json:"orderNumber,omitempty"`
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

	if payload.Gateway == "" {
		payload.Gateway = "zibal"
	}

	gateway := getGateway(payload.Gateway)
	if gateway == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown gateway")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ordersCol := db.Database.Collection("orders")
	var order models.Order

	err := ordersCol.FindOne(ctx, bson.M{
		"zibal_track_id": payload.TrackID,
		"user_id":        userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	if order.PaymentStatus == "paid" {
		utils.JSONResponse(w, http.StatusOK, VerifyPaymentResponse{
			Result:        100,
			Message:       "پرداخت قبلاً تایید شده است",
			Status:        1,
			Amount:        int64(order.TotalAmount * 10),
			OrderID:       order.ID.Hex(),
			PaymentStatus: "paid",
			StatusText:    "پرداخت شده - تاییدشده",
			CanRetry:      false,
			OrderNumber:   order.OrderNumber,
		})
		return
	}

	verifyReq := &services.VerifyRequest{
		GatewayRef:     fmt.Sprintf("%d", payload.TrackID),
		ExpectedAmount: int64(order.TotalAmount * 10),
	}

	verifyResp, err := gateway.VerifyPayment(ctx, verifyReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to verify payment: "+err.Error())
		return
	}

	paymentStatus := "failed"
	statusText := "پرداخت ناموفق"
	canRetry := false

	if verifyResp.Success && verifyResp.Amount == int64(order.TotalAmount*10) {
		paymentStatus = "paid"
		statusText = "پرداخت شده - تاییدشده"
		canRetry = false

		now := time.Now()
		_, err := ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID, "payment_status": bson.M{"$ne": "paid"}}, bson.M{
			"$set": bson.M{
				"payment_status":   paymentStatus,
				"zibal_ref_number": verifyResp.RefNumber,
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
	} else if !verifyResp.Success {
		paymentStatus = "abandoned"
		statusText = "پرداخت ناتمام - میتوانید دوباره تلاش کنید"
		canRetry = true
	} else {
		canRetry = true
	}

	utils.JSONResponse(w, http.StatusOK, VerifyPaymentResponse{
		Result:        100,
		Message:       "Verification complete",
		Status:        1,
		Amount:        verifyResp.Amount,
		RefNumber:     verifyResp.RefNumber,
		OrderID:       order.ID.Hex(),
		PaymentStatus: paymentStatus,
		StatusText:    statusText,
		CanRetry:      canRetry,
		OrderNumber:   order.OrderNumber,
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// InquiryPayment
// ──────────────────────────────────────────────────────────────────────────────

type InquiryPaymentPayload struct {
	TrackID int64  `json:"trackId"`
	Gateway string `json:"gateway,omitempty"`
}

type InquiryPaymentResponse struct {
	Result        int        `json:"result"`
	Message       string     `json:"message"`
	Status        int        `json:"status"`
	Amount        int64      `json:"amount"`
	RefNumber     string     `json:"refNumber,omitempty"`
	CardNumber    string     `json:"cardNumber,omitempty"`
	CreatedAt     *time.Time `json:"createdAt,omitempty"`
	PaidAt        *time.Time `json:"paidAt,omitempty"`
	VerifiedAt    *time.Time `json:"verifiedAt,omitempty"`
	Description   string     `json:"description,omitempty"`
	OrderID       string     `json:"orderId,omitempty"`
	PaymentStatus string     `json:"paymentStatus"`
	StatusText    string     `json:"statusText"`
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

	if payload.Gateway == "" {
		payload.Gateway = "zibal"
	}

	gateway := getGateway(payload.Gateway)
	if gateway == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown gateway")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	inquiryReq := &services.InquiryRequest{
		GatewayRef: fmt.Sprintf("%d", payload.TrackID),
	}

	inquiryResp, err := gateway.InquiryPayment(ctx, inquiryReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to inquiry payment: "+err.Error())
		return
	}

	ordersCol := db.Database.Collection("orders")
	var order models.Order

	err = ordersCol.FindOne(ctx, bson.M{
		"zibal_track_id": payload.TrackID,
		"user_id":        userID,
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	paymentStatus := "failed"
	statusText := inquiryResp.Status

	if inquiryResp.Success {
		paymentStatus = "paid"
	}

	utils.JSONResponse(w, http.StatusOK, InquiryPaymentResponse{
		Result:        100,
		Message:       "Inquiry complete",
		Status:        1,
		Amount:        inquiryResp.Amount,
		RefNumber:     inquiryResp.RefNumber,
		CreatedAt:     inquiryResp.CreatedAt,
		PaidAt:        inquiryResp.PaidAt,
		OrderID:       order.ID.Hex(),
		PaymentStatus: paymentStatus,
		StatusText:    statusText,
	})
}

// ──────────────────────────────────────────────────────────────────────────────
// RetryPayment
// ──────────────────────────────────────────────────────────────────────────────

type RetryPaymentPayload struct {
	OrderID string `json:"orderId"`
	Gateway string `json:"gateway,omitempty"`
}

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

	ordersCol := db.Database.Collection("orders")
	var order models.Order

	orderObjID, err := primitive.ObjectIDFromHex(payload.OrderID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID format")
		return
	}

	err = ordersCol.FindOne(ctx, bson.M{
		"_id":            orderObjID,
		"user_id":        userID,
		"payment_status": bson.M{"$in": []string{"pending", "failed", "abandoned", "cancelled"}},
		"status":         bson.M{"$ne": "expired"},
	}).Decode(&order)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "سفارش قابل پرداخت یافت نشد")
		return
	}

	// Determine gateway: use provided gateway, or order's stored gateway, or default to zibal
	if payload.Gateway == "" {
		if order.GatewayName != "" {
			payload.Gateway = order.GatewayName
		} else {
			payload.Gateway = "zibal"
		}
	}

	gateway := getGateway(payload.Gateway)
	if gateway == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Unknown gateway")
		return
	}

	// Fetch user to get phone number (required for DigiPay)
	usersCol := db.Database.Collection("users")
	var user models.User
	err = usersCol.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch user information")
		return
	}

	if time.Since(order.CreatedAt) > 30*time.Minute {
		ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
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

	amountRials := int64(order.TotalAmount * 10)
	providerID := generateUUID()

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	var callbackURL string
	if gateway.Name() == "digipay" {
		callbackURL = appURL + "/api/payment/digipay-callback"
	} else {
		callbackURL = appURL + "/api/payment/callback"
	}

	now := time.Now()
	attempt := models.PaymentAttempt{
		OrderID:        order.ID,
		UserID:         userID,
		Gateway:        gateway.Name(),
		ProviderID:     providerID,
		ExpectedAmount: amountRials,
		Status:         "pending",
		CreatedAt:      now,
	}

	payReq := &services.PaymentRequest{
		OrderID:     payload.OrderID,
		Amount:      amountRials,
		CallbackURL: callbackURL,
		Description: fmt.Sprintf("Order %s - تلاش مجدد پرداخت", order.OrderNumber),
		ProviderID:  providerID,
		Mobile:      user.Phone,
	}

	payResp, err := gateway.RequestPayment(ctx, payReq)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to initiate payment: "+err.Error())
		return
	}

	attempt.GatewayReference = payResp.GatewayRef

	attemptsCol := db.Database.Collection("payment_attempts")
	_, err = attemptsCol.InsertOne(ctx, attempt)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save payment attempt")
		return
	}

	ordersCol.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{
		"$set": bson.M{
			"gateway_name":   gateway.Name(),
			"payment_status": "pending",
			"updated_at":     now,
		},
	})

	utils.JSONResponse(w, http.StatusOK, RequestPaymentResponse{
		Result:  100,
		Message: "Payment request created successfully",
		PayURL:  payResp.PayURL,
		Gateway: gateway.Name(),
	})
}
