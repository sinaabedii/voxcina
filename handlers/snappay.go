package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

var snappPayService *services.SnappPayService
var snappPayReconcileStop chan struct{}

func InitSnappPayService() {
	snappPayService = services.NewSnappPayService()
	if gateways == nil {
		gateways = make(map[string]services.PaymentGateway)
	}
	if snappPayService.Configured() {
		gateways[snappPayService.Name()] = snappPayService
		return
	}
	// Keep the service out of the gateway selector until all credentials exist.
	// This makes an incomplete deployment fail closed instead of redirecting to
	// a provider with missing authentication.
	delete(gateways, snappPayService.Name())
}

// StartSnappPayStatusReconciler periodically checks transactions that did not
// finish cleanly in the browser callback. Snapppay explicitly requires status
// reconciliation for timeout/unknown responses.
func StartSnappPayStatusReconciler() func() {
	if snappPayService == nil || !snappPayService.Configured() {
		return func() {}
	}
	snappPayReconcileStop = make(chan struct{})
	go func(stop <-chan struct{}) {
		reconcileSnappPayStatuses()
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				reconcileSnappPayStatuses()
			case <-stop:
				return
			}
		}
	}(snappPayReconcileStop)
	return func() {
		if snappPayReconcileStop != nil {
			close(snappPayReconcileStop)
			snappPayReconcileStop = nil
		}
	}
}

func snappPayErrorCode(err error) int {
	var providerErr *services.SnappPayAPIError
	if errors.As(err, &providerErr) {
		return providerErr.Code
	}
	return 0
}

func waitForSnappPayRetry(ctx context.Context) error {
	timer := time.NewTimer(2 * time.Second)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func snappPaySettleWithRetry(ctx context.Context, paymentToken string) (*services.LifecycleResponse, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		response, err := snappPayService.SettlePayment(ctx, paymentToken)
		if err == nil {
			return response, nil
		}
		lastErr = err
		if snappPayErrorCode(err) != 1053 && snappPayErrorCode(err) != 1000 {
			break
		}
		if err := waitForSnappPayRetry(ctx); err != nil {
			return nil, err
		}
	}
	return nil, lastErr
}

func snappPayCancelWithRecovery(ctx context.Context, paymentToken string) (*services.LifecycleResponse, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		response, err := snappPayService.CancelPayment(ctx, paymentToken)
		if err == nil {
			return response, nil
		}
		lastErr = err
		status, statusErr := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: paymentToken})
		if statusErr == nil {
			if status.Status == "CANCEL" {
				return &services.LifecycleResponse{TransactionID: status.RefNumber}, nil
			}
			if status.Status != "SETTLE" && snappPayErrorCode(err) != 1053 && snappPayErrorCode(err) != 1000 {
				break
			}
		}
		if snappPayErrorCode(err) != 1053 && snappPayErrorCode(err) != 1000 {
			break
		}
		if err := waitForSnappPayRetry(ctx); err != nil {
			return nil, err
		}
	}
	return nil, lastErr
}

func snappPayRevertWithRecovery(ctx context.Context, paymentToken string) error {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if _, err := snappPayService.RevertPayment(ctx, paymentToken); err == nil {
			return nil
		} else {
			lastErr = err
		}
		status, statusErr := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: paymentToken})
		if statusErr == nil {
			switch status.Status {
			case "REVERT", "CANCEL":
				return nil
			case "SETTLE":
				_, cancelErr := snappPayCancelWithRecovery(ctx, paymentToken)
				return cancelErr
			}
		}
		if snappPayErrorCode(lastErr) != 1053 && snappPayErrorCode(lastErr) != 1000 {
			break
		}
		if err := waitForSnappPayRetry(ctx); err != nil {
			return err
		}
	}
	return lastErr
}

func snappPayUpdateWithRecovery(ctx context.Context, request *services.UpdatePaymentRequest) (*services.LifecycleResponse, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		response, err := snappPayService.UpdatePayment(ctx, request)
		if err == nil {
			return response, nil
		}
		lastErr = err
		status, statusErr := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: request.PaymentToken})
		if statusErr == nil && status.Status == "VERIFY" {
			if _, settleErr := snappPaySettleWithRetry(ctx, request.PaymentToken); settleErr == nil {
				status, statusErr = snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: request.PaymentToken})
			}
		}
		if statusErr == nil && (status.Status == "CANCEL" || status.Status == "REVERT") {
			break
		}
		if snappPayErrorCode(err) != 1053 && snappPayErrorCode(err) != 1000 && (statusErr != nil || status.Status != "SETTLE") {
			break
		}
		if err := waitForSnappPayRetry(ctx); err != nil {
			return nil, err
		}
	}
	return nil, lastErr
}

func reconcileSnappPayStatuses() {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	cursor, err := db.Database.Collection("payment_attempts").Find(ctx, bson.M{
		"gateway":           "snappay",
		"gateway_reference": bson.M{"$exists": true, "$ne": ""},
		"status":            bson.M{"$in": []string{"pending", "verifying", "verified", "verify_pending", "settle_pending", "settled_pending_local", "revert_pending"}},
	}, options.Find().SetLimit(100).SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return
	}
	defer cursor.Close(ctx)
	var attempts []models.PaymentAttempt
	if err := cursor.All(ctx, &attempts); err != nil {
		return
	}
	for _, attempt := range attempts {
		if ctx.Err() != nil {
			return
		}
		if attempt.Status == "revert_pending" {
			if err := snappPayRevertWithRecovery(ctx, attempt.GatewayReference); err == nil {
				_ = updateSnappPayAttempt(ctx, attempt.ID, "failed", bson.M{"provider_status": "REVERT"})
				setSnappPayOrderFailed(ctx, attempt.OrderID)
			}
			continue
		}
		status, statusErr := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
		if statusErr != nil {
			continue
		}
		switch status.Status {
		case "PENDING":
			if attempt.Status != "pending" {
				_, _ = snappPayStatusAndFinalize(ctx, attempt)
			}
		case "VERIFY":
			if _, err := snappPaySettleWithRetry(ctx, attempt.GatewayReference); err == nil {
				status, statusErr = snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
			}
			if statusErr == nil && status.Status == "SETTLE" {
				_ = snappPayFinalizeSettled(ctx, attempt, status.Amount, status.RefNumber)
			}
		case "SETTLE":
			_ = snappPayFinalizeSettled(ctx, attempt, status.Amount, status.RefNumber)
		case "REVERT", "CANCEL":
			_ = updateSnappPayAttempt(ctx, attempt.ID, strings.ToLower(status.Status), bson.M{"provider_status": status.Status})
			setSnappPayOrderFailed(ctx, attempt.OrderID)
		}
	}
}

func snappPayTransactionID() string {
	// Snapppay accepts IDs longer than ten characters when they contain a
	// letter. The timestamp plus digest suffix is unique per payment attempt.
	now := strconv.FormatInt(time.Now().UnixNano(), 36)
	digest := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", now, time.Now().UnixNano())))
	return "SP" + now + fmt.Sprintf("%x", digest[:3])
}

func stableProviderID(id primitive.ObjectID) int64 {
	digest := sha256.Sum256(id[:])
	value := int64(binary.BigEndian.Uint64(digest[:8]) & math.MaxInt64)
	if value == 0 {
		return 1
	}
	return value
}

func snappPayCommissionType() int {
	value, err := strconv.Atoi(os.Getenv("SNAPPAY_COMMISSION_TYPE"))
	if err != nil || value <= 0 {
		return 100
	}
	return value
}

func snappPayMoney(value float64) int64 {
	return int64(math.Round(value * 10))
}

func normalizeIranMobile(value string) string {
	value = strings.TrimSpace(value)
	var builder strings.Builder
	for _, r := range value {
		switch r {
		case '۰', '٠':
			builder.WriteByte('0')
		case '۱', '١':
			builder.WriteByte('1')
		case '۲', '٢':
			builder.WriteByte('2')
		case '۳', '٣':
			builder.WriteByte('3')
		case '۴', '٤':
			builder.WriteByte('4')
		case '۵', '٥':
			builder.WriteByte('5')
		case '۶', '٦':
			builder.WriteByte('6')
		case '۷', '٧':
			builder.WriteByte('7')
		case '۸', '٨':
			builder.WriteByte('8')
		case '۹', '٩':
			builder.WriteByte('9')
		case '+':
			builder.WriteByte('+')
		case ' ', '-', '(', ')':
		default:
			builder.WriteRune(r)
		}
	}
	normalized := builder.String()
	switch {
	case strings.HasPrefix(normalized, "09"):
		return "+98" + normalized[1:]
	case strings.HasPrefix(normalized, "9") && len(normalized) == 10:
		return "+98" + normalized
	case strings.HasPrefix(normalized, "0098"):
		return "+" + normalized[2:]
	default:
		return normalized
	}
}

func validSnappPayMobile(value string) bool {
	if len(value) != 13 || !strings.HasPrefix(value, "+989") {
		return false
	}
	for _, digit := range value[3:] {
		if digit < '0' || digit > '9' {
			return false
		}
	}
	return true
}

func buildSnappPayCart(ctx context.Context, order models.Order) ([]services.PaymentCart, int64, error) {
	if len(order.Items) == 0 {
		return nil, 0, fmt.Errorf("order has no items")
	}

	items := make([]services.PaymentCartItem, 0, len(order.Items))
	var itemTotal int64
	for _, item := range order.Items {
		if item.Quantity <= 0 || item.PriceAtPurchase < 0 {
			return nil, 0, fmt.Errorf("invalid order item quantity or price")
		}
		category := os.Getenv("SNAPPAY_DEFAULT_CATEGORY")
		if category == "" {
			category = "apparel"
		}
		amount := snappPayMoney(item.PriceAtPurchase)
		if amount <= 0 {
			return nil, 0, fmt.Errorf("order item price must be positive")
		}
		itemTotal += amount * int64(item.Quantity)
		items = append(items, services.PaymentCartItem{
			Amount:         amount,
			Category:       category,
			Count:          item.Quantity,
			ID:             stableProviderID(item.ProductID),
			Name:           item.ProductName,
			CommissionType: snappPayCommissionType(),
		})
	}

	shipping := snappPayMoney(order.ShippingCost)
	tax := snappPayMoney(order.TaxAmount)
	cartTotal := itemTotal + shipping + tax
	amount := snappPayMoney(order.TotalAmount)
	discount := snappPayMoney(order.DiscountAmount)
	if discount < 0 || discount > itemTotal {
		return nil, 0, fmt.Errorf("invalid order discount")
	}
	if cartTotal-discount != amount {
		return nil, 0, fmt.Errorf("order total does not match Snapppay cart formula")
	}

	return []services.PaymentCart{{
		CartID:           stableProviderID(order.ID),
		Items:            items,
		ShipmentIncluded: false,
		TaxIncluded:      false,
		ShippingAmount:   shipping,
		TaxAmount:        tax,
		TotalAmount:      cartTotal,
	}}, amount, nil
}

func buildSnappPayPaymentRequest(ctx context.Context, order models.Order, callbackURL, mobile, transactionID string) (*services.PaymentRequest, error) {
	normalizedMobile := normalizeIranMobile(mobile)
	if !validSnappPayMobile(normalizedMobile) {
		return nil, fmt.Errorf("شماره همراه برای اسنپ‌پی باید با فرمت +989xxxxxxxxx باشد")
	}
	cartList, amount, err := buildSnappPayCart(ctx, order)
	if err != nil {
		return nil, err
	}
	return &services.PaymentRequest{
		OrderID:              order.ID.Hex(),
		Amount:               amount,
		CallbackURL:          callbackURL,
		Description:          "سفارش " + order.OrderNumber,
		Mobile:               normalizedMobile,
		ProviderID:           transactionID,
		TransactionID:        transactionID,
		CartList:             cartList,
		DiscountAmount:       snappPayMoney(order.DiscountAmount),
		ExternalSourceAmount: 0,
	}, nil
}

func snappPayCallbackURL() (string, error) {
	callbackURL := os.Getenv("SNAPPAY_CALLBACK_URL")
	if callbackURL == "" {
		appURL := strings.TrimRight(os.Getenv("APP_URL"), "/")
		if appURL == "" {
			return "", fmt.Errorf("SNAPPAY_CALLBACK_URL or APP_URL must be configured")
		}
		callbackURL = appURL + "/api/payment/snappay-callback"
	}
	parsed, err := url.Parse(callbackURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", fmt.Errorf("SNAPPAY_CALLBACK_URL must be an HTTPS public URL")
	}
	return callbackURL, nil
}

func validateSnappPayEligibility(ctx context.Context, amount int64) error {
	eligibility, err := snappPayService.CheckEligibility(ctx, amount, nil)
	if err != nil {
		return err
	}
	if !eligibility.Eligible {
		return fmt.Errorf("اسنپ‌پی این مبلغ را تایید نکرد")
	}
	return nil
}

type snappPayEligibilityQuery struct {
	Amount int64 `json:"amount"`
}

func SnappPayEligibility(w http.ResponseWriter, r *http.Request) {
	if snappPayService == nil || !snappPayService.Configured() {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "درگاه اسنپ‌پی هنوز پیکربندی نشده است")
		return
	}
	amount, err := strconv.ParseInt(r.URL.Query().Get("amount"), 10, 64)
	if err != nil || amount <= 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "مبلغ نامعتبر است")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	response, err := snappPayService.CheckEligibility(ctx, amount, nil)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadGateway, "خطا در بررسی اعتبار اسنپ‌پی: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

func snappPayRedirect(w http.ResponseWriter, r *http.Request, values url.Values) {
	appURL := strings.TrimRight(os.Getenv("APP_URL"), "/")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}
	http.Redirect(w, r, appURL+"/checkout/callback?"+values.Encode(), http.StatusSeeOther)
}

func updateSnappPayAttempt(ctx context.Context, attemptID primitive.ObjectID, status string, data bson.M) error {
	set := bson.M{"status": status, "updated_at": time.Now()}
	if data != nil {
		set["gateway_data"] = data
	}
	_, err := db.Database.Collection("payment_attempts").UpdateOne(ctx, bson.M{"_id": attemptID}, bson.M{"$set": set})
	return err
}

func setSnappPayOrderFailed(ctx context.Context, orderID primitive.ObjectID) {
	_, _ = db.Database.Collection("orders").UpdateOne(ctx, bson.M{"_id": orderID, "payment_status": bson.M{"$ne": "paid"}}, bson.M{
		"$set": bson.M{
			"payment_status": "failed",
			"status":         "pending",
			"status_text":    "پرداخت ناموفق",
			"updated_at":     time.Now(),
		},
	})
}

func snappPayFinalizeSettled(ctx context.Context, attempt models.PaymentAttempt, providerAmount int64, transactionID string) error {
	if providerAmount != attempt.ExpectedAmount {
		return fmt.Errorf("مبلغ پرداخت اسنپ‌پی با مبلغ سفارش برابر نیست")
	}
	if err := FinalizeVerifiedPayment(attempt.ID, providerAmount, transactionID); err != nil {
		return err
	}
	_, err := db.Database.Collection("orders").UpdateOne(ctx, bson.M{"_id": attempt.OrderID}, bson.M{"$set": bson.M{
		"gateway_transaction_id": transactionID,
		"gateway_reference":      attempt.GatewayReference,
		"gateway_name":           "snappay",
		"updated_at":             time.Now(),
	}})
	if err != nil {
		return err
	}
	return updateSnappPayAttempt(ctx, attempt.ID, "settled", bson.M{"provider_status": "SETTLE", "transaction_id": transactionID})
}

func snappPayStatusAndFinalize(ctx context.Context, attempt models.PaymentAttempt) (bool, error) {
	return snappPayStatusAndFinalizeRetry(ctx, attempt, true)
}

func snappPayStatusAndFinalizeRetry(ctx context.Context, attempt models.PaymentAttempt, retryVerify bool) (bool, error) {
	status, err := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
	if err != nil {
		return false, err
	}
	if status.Status == "PENDING" && retryVerify {
		verifyResponse, verifyErr := snappPayService.VerifyPayment(ctx, &services.VerifyRequest{GatewayRef: attempt.GatewayReference, ExpectedAmount: attempt.ExpectedAmount})
		if verifyErr != nil || verifyResponse == nil || !verifyResponse.Success {
			reason := "پاسخ نامعتبر"
			if verifyErr != nil {
				reason = verifyErr.Error()
			}
			return false, fmt.Errorf("اسنپ‌پی پس از وضعیت PENDING دوباره تایید نشد: %s", reason)
		}
		_ = updateSnappPayAttempt(ctx, attempt.ID, "verified", bson.M{"verify_transaction_id": verifyResponse.RefNumber, "retry_after_pending": true})
		attempt.Status = "verified"
		return snappPayStatusAndFinalizeRetry(ctx, attempt, false)
	}
	if status.Status == "VERIFY" {
		if _, err := snappPaySettleWithRetry(ctx, attempt.GatewayReference); err != nil {
			return false, err
		}
		status, err = snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
		if err != nil {
			return false, err
		}
	}
	if status.Status == "SETTLE" {
		return true, snappPayFinalizeSettled(ctx, attempt, status.Amount, status.RefNumber)
	}
	return false, fmt.Errorf("اسنپ‌پی وضعیت تراکنش را SETTLE نکرد: %s", status.Status)
}

// SnappPayCallback handles the provider's POST form callback. Callback state
// is never treated as payment proof; verify, settle, status, and amount are.
func SnappPayCallback(w http.ResponseWriter, r *http.Request) {
	values := url.Values{"gateway": {"snappay"}, "success": {"0"}}
	if err := r.ParseForm(); err != nil {
		values.Set("error", "parse_form")
		snappPayRedirect(w, r, values)
		return
	}
	transactionID := strings.TrimSpace(r.FormValue("transactionId"))
	state := strings.ToUpper(strings.TrimSpace(r.FormValue("state")))
	values.Set("transactionId", transactionID)
	if transactionID == "" {
		values.Set("error", "missing_transaction_id")
		snappPayRedirect(w, r, values)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	var attempt models.PaymentAttempt
	err := db.Database.Collection("payment_attempts").FindOne(ctx, bson.M{"gateway": "snappay", "provider_id": transactionID}).Decode(&attempt)
	if err != nil {
		values.Set("error", "attempt_not_found")
		snappPayRedirect(w, r, values)
		return
	}
	values.Set("orderId", attempt.OrderID.Hex())

	var order models.Order
	if err := db.Database.Collection("orders").FindOne(ctx, bson.M{"_id": attempt.OrderID}).Decode(&order); err != nil {
		values.Set("error", "order_not_found")
		snappPayRedirect(w, r, values)
		return
	}
	if order.PaymentStatus == "paid" {
		values.Set("success", "1")
		values.Set("status", "paid")
		snappPayRedirect(w, r, values)
		return
	}

	if state != "OK" {
		if snappPayService != nil && attempt.GatewayReference != "" {
			if err := func() error {
				revertCtx, revertCancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer revertCancel()
				return snappPayRevertWithRecovery(revertCtx, attempt.GatewayReference)
			}(); err != nil {
				_ = updateSnappPayAttempt(ctx, attempt.ID, "revert_pending", bson.M{"callback_state": state, "revert_error": err.Error()})
				values.Set("error", "revert_unknown")
				snappPayRedirect(w, r, values)
				return
			}
		}
		_ = updateSnappPayAttempt(ctx, attempt.ID, "failed", bson.M{"callback_state": state})
		setSnappPayOrderFailed(ctx, attempt.OrderID)
		values.Set("status", "failed")
		snappPayRedirect(w, r, values)
		return
	}

	// Verify is a one-shot provider transition. A duplicate callback waits for
	// the existing transition and reconciles through status instead of calling
	// verify a second time.
	if attempt.Status == "verifying" || attempt.Status == "verified" {
		if settled, statusErr := snappPayStatusAndFinalize(ctx, attempt); statusErr == nil && settled {
			values.Set("success", "1")
			values.Set("status", "paid")
		} else {
			values.Set("error", "verify_pending")
		}
		snappPayRedirect(w, r, values)
		return
	}
	locked, err := db.Database.Collection("payment_attempts").UpdateOne(ctx, bson.M{"_id": attempt.ID, "status": "pending"}, bson.M{"$set": bson.M{"status": "verifying", "updated_at": time.Now()}})
	if err != nil || locked.ModifiedCount == 0 {
		values.Set("error", "verify_in_progress")
		snappPayRedirect(w, r, values)
		return
	}

	verifyResponse, verifyErr := snappPayService.VerifyPayment(ctx, &services.VerifyRequest{GatewayRef: attempt.GatewayReference, ExpectedAmount: attempt.ExpectedAmount})
	if verifyErr != nil || verifyResponse == nil || !verifyResponse.Success {
		if settled, statusErr := snappPayStatusAndFinalize(ctx, attempt); statusErr == nil && settled {
			values.Set("success", "1")
			values.Set("status", "paid")
		} else {
			_ = updateSnappPayAttempt(ctx, attempt.ID, "verify_pending", bson.M{"callback_state": state, "verify_error": errorString(verifyErr)})
			values.Set("error", "verify_unknown")
		}
		snappPayRedirect(w, r, values)
		return
	}
	_ = updateSnappPayAttempt(ctx, attempt.ID, "verified", bson.M{"verify_transaction_id": verifyResponse.RefNumber})
	attempt.Status = "verified"

	settleResponse, settleErr := snappPaySettleWithRetry(ctx, attempt.GatewayReference)
	if settleErr != nil || settleResponse == nil {
		if settled, statusErr := snappPayStatusAndFinalize(ctx, attempt); statusErr == nil && settled {
			values.Set("success", "1")
			values.Set("status", "paid")
		} else {
			_ = updateSnappPayAttempt(ctx, attempt.ID, "settle_pending", bson.M{"verify_transaction_id": verifyResponse.RefNumber, "settle_error": errorString(settleErr)})
			values.Set("error", "settle_unknown")
		}
		snappPayRedirect(w, r, values)
		return
	}

	if settled, finalizeErr := snappPayStatusAndFinalize(ctx, attempt); finalizeErr != nil || !settled {
		_ = updateSnappPayAttempt(ctx, attempt.ID, "settled_pending_local", bson.M{"settle_transaction_id": settleResponse.TransactionID, "finalize_error": errorString(finalizeErr)})
		values.Set("error", "finalize_pending")
		snappPayRedirect(w, r, values)
		return
	}
	values.Set("success", "1")
	values.Set("status", "paid")
	snappPayRedirect(w, r, values)
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func findLatestSnappPayAttempt(ctx context.Context, orderID primitive.ObjectID) (models.PaymentAttempt, error) {
	var attempt models.PaymentAttempt
	err := db.Database.Collection("payment_attempts").FindOne(ctx, bson.M{
		"gateway":  "snappay",
		"order_id": orderID,
		"status":   bson.M{"$in": []string{"settled", "settled_pending_local", "verified", "updated", "cancel_pending", "update_pending"}},
	}, options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})).Decode(&attempt)
	return attempt, err
}

type snappPayConfirmPayload struct {
	Confirm bool `json:"confirm"`
}

func requireSnappPayConfirmation(w http.ResponseWriter, r *http.Request) bool {
	var payload snappPayConfirmPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || !payload.Confirm {
		utils.ErrorResponse(w, http.StatusBadRequest, "تاییدیه صریح برای عملیات برگشت اسنپ‌پی الزامی است")
		return false
	}
	return true
}

// AdminCancelSnappPay cancels a settled Snapppay transaction only after an
// explicit confirmation from the administrator.
func AdminCancelSnappPay(w http.ResponseWriter, r *http.Request) {
	if !requireSnappPayConfirmation(w, r) {
		return
	}
	orderID, err := primitive.ObjectIDFromHex(mux.Vars(r)["orderId"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه سفارش نامعتبر است")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	orders := db.Database.Collection("orders")
	var order models.Order
	if err := orders.FindOne(ctx, bson.M{"_id": orderID}).Decode(&order); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "سفارش یافت نشد")
		return
	}
	if order.GatewayName != "snappay" || order.PaymentStatus != "paid" {
		utils.ErrorResponse(w, http.StatusBadRequest, "این سفارش تراکنش قابل لغو اسنپ‌پی ندارد")
		return
	}
	attempt, err := findLatestSnappPayAttempt(ctx, orderID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusConflict, "تلاش پرداخت اسنپ‌پی یافت نشد")
		return
	}
	status, err := snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadGateway, "وضعیت تراکنش اسنپ‌پی قابل دریافت نیست: "+err.Error())
		return
	}
	if status.Status == "VERIFY" {
		if _, err := snappPaySettleWithRetry(ctx, attempt.GatewayReference); err != nil {
			utils.ErrorResponse(w, http.StatusBadGateway, "تسویه اسنپ‌پی پیش از لغو انجام نشد: "+err.Error())
			return
		}
		status, err = snappPayService.InquiryPayment(ctx, &services.InquiryRequest{GatewayRef: attempt.GatewayReference})
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadGateway, "وضعیت تسویه اسنپ‌پی قابل دریافت نیست")
			return
		}
	}
	if status.Status != "SETTLE" && status.Status != "CANCEL" {
		utils.ErrorResponse(w, http.StatusConflict, "تراکنش اسنپ‌پی در وضعیت قابل لغو نیست: "+status.Status)
		return
	}
	if status.Status == "SETTLE" {
		if _, err := snappPayCancelWithRecovery(ctx, attempt.GatewayReference); err != nil {
			_ = updateSnappPayAttempt(ctx, attempt.ID, "cancel_pending", bson.M{"provider_status": status.Status, "cancel_error": err.Error()})
			utils.ErrorResponse(w, http.StatusBadGateway, "لغو تراکنش اسنپ‌پی انجام نشد: "+err.Error())
			return
		}
	}

	if order.Status != "cancelled" {
		if err := restoreInventory(ctx, order.Items); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "بازگردانی موجودی انجام نشد: "+err.Error())
			return
		}
	}
	now := time.Now()
	_, err = orders.UpdateOne(ctx, bson.M{"_id": order.ID, "status": bson.M{"$ne": "cancelled"}}, bson.M{
		"$set": bson.M{"status": "cancelled", "status_text": "لغو شده", "payment_status": "refunded", "updated_at": now},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "ثبت لغو سفارش انجام نشد")
		return
	}
	_ = updateSnappPayAttempt(ctx, attempt.ID, "cancelled", bson.M{"provider_status": "CANCEL", "cancelled_at": now})
	var updated models.Order
	_ = orders.FindOne(ctx, bson.M{"_id": order.ID}).Decode(&updated)
	response, err := newOrderAPIResponse(ctx, updated)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

type snappPayUpdateItem struct {
	ProductID string `json:"product_id"`
	Size      string `json:"size"`
	Color     string `json:"color"`
	ColorName string `json:"color_name"`
	Quantity  int    `json:"quantity"`
}

type snappPayUpdatePayload struct {
	Confirm bool                 `json:"confirm"`
	Items   []snappPayUpdateItem `json:"items"`
}

func sameOrderVariant(left, right models.OrderVariant) bool {
	return left.Size == right.Size && (left.Color == right.Color || left.ColorName == right.ColorName)
}

func reducedOrderItems(oldItems, newItems []models.OrderItem) []models.OrderItem {
	removed := make([]models.OrderItem, 0)
	for _, oldItem := range oldItems {
		remaining := 0
		for _, newItem := range newItems {
			if oldItem.ProductID == newItem.ProductID && sameOrderVariant(oldItem.Variant, newItem.Variant) {
				remaining = newItem.Quantity
				break
			}
		}
		if oldItem.Quantity > remaining {
			item := oldItem
			item.Quantity = oldItem.Quantity - remaining
			removed = append(removed, item)
		}
	}
	return removed
}

// AdminUpdateSnappPay updates a settled order after an item quantity/removal
// decision. It deliberately requires confirmation because the provider
// operation is irreversible and can be repeated on the same order.
func AdminUpdateSnappPay(w http.ResponseWriter, r *http.Request) {
	var payload snappPayUpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || !payload.Confirm {
		utils.ErrorResponse(w, http.StatusBadRequest, "تاییدیه صریح برای بروزرسانی اسنپ‌پی الزامی است")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(mux.Vars(r)["orderId"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه سفارش نامعتبر است")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	orders := db.Database.Collection("orders")
	var order models.Order
	if err := orders.FindOne(ctx, bson.M{"_id": orderID}).Decode(&order); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "سفارش یافت نشد")
		return
	}
	if order.GatewayName != "snappay" || order.PaymentStatus != "paid" {
		utils.ErrorResponse(w, http.StatusBadRequest, "این سفارش تراکنش قابل بروزرسانی اسنپ‌پی ندارد")
		return
	}
	if order.DiscountCode != "" {
		utils.ErrorResponse(w, http.StatusConflict, "سفارش دارای کد تخفیف اسنپ‌پی قابل بروزرسانی نیست و باید لغو شود")
		return
	}
	attempt, err := findLatestSnappPayAttempt(ctx, orderID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusConflict, "تلاش پرداخت اسنپ‌پی یافت نشد")
		return
	}
	if len(payload.Items) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "حداقل یک قلم باید در سفارش باقی بماند")
		return
	}

	newItems := make([]models.OrderItem, 0, len(payload.Items))
	for _, requested := range payload.Items {
		productID, parseErr := primitive.ObjectIDFromHex(requested.ProductID)
		if parseErr != nil || requested.Quantity <= 0 {
			utils.ErrorResponse(w, http.StatusBadRequest, "اقلام بروزرسانی نامعتبر هستند")
			return
		}
		found := false
		for _, oldItem := range order.Items {
			if oldItem.ProductID != productID || oldItem.Variant.Size != requested.Size ||
				(oldItem.Variant.Color != requested.Color && oldItem.Variant.ColorName != requested.ColorName) {
				continue
			}
			if requested.Quantity > oldItem.Quantity {
				utils.ErrorResponse(w, http.StatusBadRequest, "تعداد جدید نمی‌تواند بیشتر از تعداد پرداخت‌شده باشد")
				return
			}
			newItem := oldItem
			newItem.Quantity = requested.Quantity
			newItems = append(newItems, newItem)
			found = true
			break
		}
		if !found {
			utils.ErrorResponse(w, http.StatusBadRequest, "قلم بروزرسانی در سفارش اصلی یافت نشد")
			return
		}
	}

	updatedOrder := order
	updatedOrder.Items = newItems
	updatedOrder.TotalAmount = 0
	for _, item := range newItems {
		updatedOrder.TotalAmount += item.PriceAtPurchase * float64(item.Quantity)
	}
	updatedOrder.TotalAmount += updatedOrder.ShippingCost + updatedOrder.TaxAmount - updatedOrder.DiscountAmount
	if updatedOrder.TotalAmount <= 0 || updatedOrder.TotalAmount > order.TotalAmount {
		utils.ErrorResponse(w, http.StatusBadRequest, "مبلغ بروزرسانی باید کمتر یا مساوی مبلغ قبلی و مثبت باشد")
		return
	}
	cartList, amount, err := buildSnappPayCart(ctx, updatedOrder)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := snappPayUpdateWithRecovery(ctx, &services.UpdatePaymentRequest{
		PaymentToken: attempt.GatewayReference, Amount: amount, CartList: cartList,
		DiscountAmount: snappPayMoney(updatedOrder.DiscountAmount),
	}); err != nil {
		_ = updateSnappPayAttempt(ctx, attempt.ID, "update_pending", bson.M{"update_error": err.Error()})
		utils.ErrorResponse(w, http.StatusBadGateway, "بروزرسانی تراکنش اسنپ‌پی انجام نشد: "+err.Error())
		return
	}
	removed := reducedOrderItems(order.Items, newItems)
	if err := restoreInventory(ctx, removed); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "بازگردانی موجودی اقلام حذف‌شده انجام نشد: "+err.Error())
		return
	}
	now := time.Now()
	_, err = orders.UpdateOne(ctx, bson.M{"_id": order.ID}, bson.M{"$set": bson.M{
		"items": newItems, "total_amount": updatedOrder.TotalAmount, "updated_at": now,
	}, "$push": bson.M{"timeline": models.OrderTimelineEntry{Status: order.Status, Timestamp: now, Note: "بروزرسانی بازگشت بخشی از سفارش در اسنپ‌پی"}}})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "ثبت بروزرسانی سفارش انجام نشد")
		return
	}
	_ = updateSnappPayAttempt(ctx, attempt.ID, "updated", bson.M{"provider_status": "SETTLE", "last_update_at": now})
	var updated models.Order
	_ = orders.FindOne(ctx, bson.M{"_id": order.ID}).Decode(&updated)
	response, err := newOrderAPIResponse(ctx, updated)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, response)
}
