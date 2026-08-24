package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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

// ============================================================================
// Eligibility engine
// ============================================================================

// Return ineligibility reasons exposed to clients. Values are stable API
// contract; frontend maps them to Persian copy.
const (
	ReturnReasonNotDelivered    = "not_delivered"
	ReturnReasonNotPaid         = "not_paid"
	ReturnReasonWindowExpired   = "window_expired"
	ReturnReasonAlreadyApproved = "already_approved"
	ReturnReasonAlreadyPending  = "already_pending"
)

// resolveDeliveryTime determines when an order was delivered.
//
// Precedence:
//  1. Explicit delivered_at stamp (set by UpdateOrderStatusAdmin since this
//     feature shipped).
//  2. Latest "delivered" entry in the order timeline (covers orders marked
//     delivered before the field existed).
//  3. updated_at fallback while the order is currently delivered (last resort;
//     conservative because updated_at can only be later than real delivery,
//     which shortens rather than extends the window).
//
// Returns nil when no plausible delivery moment exists.
func resolveDeliveryTime(order *models.Order) *time.Time {
	if order.DeliveredAt != nil {
		return order.DeliveredAt
	}
	var latest *time.Time
	for _, entry := range order.Timeline {
		if entry.Status != "delivered" {
			continue
		}
		if latest == nil || entry.Timestamp.After(*latest) {
			t := entry.Timestamp
			latest = &t
		}
	}
	if latest != nil {
		return latest
	}
	if order.Status == "delivered" {
		t := order.UpdatedAt
		return &t
	}
	return nil
}

// returnEligibility is the server-computed verdict returned to clients so they
// never have to trust a device clock for the 7-day boundary.
type returnEligibility struct {
	CanRequest         bool       `json:"can_request"`
	Reason             string     `json:"reason,omitempty"`
	DeliveredAt        *time.Time `json:"delivered_at,omitempty"`
	WindowEndsAt       *time.Time `json:"window_ends_at,omitempty"`
	JalaliWindowEndsAt string     `json:"jalali_window_ends_at,omitempty"`
	ExistingRequestID  string     `json:"existing_request_id,omitempty"`
}

// evaluateReturnEligibility applies every creation precondition against the
// order and its existing requests. Checks run cheapest-first and stop at the
// first blocking reason. The clock is injected so the inclusive-window
// boundary is deterministic and unit-testable.
func evaluateReturnEligibility(
	order *models.Order,
	existing *models.ReturnRequest,
	now time.Time,
) returnEligibility {
	// Only delivered orders qualify — exclusively, per product rules.
	if order.Status != "delivered" {
		return blocked(returnEligibility{}, ReturnReasonNotDelivered)
	}
	if order.PaymentStatus != "paid" {
		el := blocked(returnEligibility{}, ReturnReasonNotPaid)
		return el
	}

	deliveredAt := resolveDeliveryTime(order)
	if deliveredAt == nil {
		return blocked(returnEligibility{}, ReturnReasonNotDelivered)
	}

	windowEnds := deliveredAt.Add(models.ReturnWindowDuration)
	el := returnEligibility{
		DeliveredAt:        deliveredAt,
		WindowEndsAt:       &windowEnds,
		JalaliWindowEndsAt: utils.ToJalaliDateString(windowEnds),
	}

	// Inclusive boundary: exactly at the deadline is still allowed.
	if now.After(windowEnds) {
		el.CanRequest = false
		el.Reason = ReturnReasonWindowExpired
		return el
	}

	if existing != nil {
		switch existing.Status {
		case models.ReturnStatusApproved:
			el.ExistingRequestID = existing.ID.Hex()
			el.CanRequest = false
			el.Reason = ReturnReasonAlreadyApproved
			return el
		case models.ReturnStatusPending:
			el.ExistingRequestID = existing.ID.Hex()
			el.CanRequest = false
			el.Reason = ReturnReasonAlreadyPending
			return el
			// rejected/cancelled requests free the order for re-submission.
		}
	}

	el.CanRequest = true
	return el
}

func blocked(el returnEligibility, reason string) returnEligibility {
	el.CanRequest = false
	el.Reason = reason
	return el
}

// fetchLatestReturnRequest returns the most recent request for an order, or
// nil when none exists.
func fetchLatestReturnRequest(ctx context.Context, orderID primitive.ObjectID) (*models.ReturnRequest, error) {
	collection := db.Database.Collection("return_requests")
	var req models.ReturnRequest
	err := collection.FindOne(
		ctx,
		bson.M{"order_id": orderID},
		optionsFindOneLatest(),
	).Decode(&req)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &req, nil
}

// ============================================================================
// User endpoints
// ============================================================================

// GetReturnRequestStatus handles GET /api/orders/{orderId}/return-request
// Returns the order's current return request plus server-computed eligibility.
func GetReturnRequestStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	orderID, err := orderIDFromPath(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	order, err := fetchOwnedOrder(ctx, orderID, userID)
	if err != nil {
		writeOrderFetchError(w, err)
		return
	}

	existing, err := fetchLatestReturnRequest(ctx, order.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching return request: "+err.Error())
		return
	}

	response := struct {
		Request     *models.ReturnRequest `json:"request"`
		Eligibility returnEligibility     `json:"eligibility"`
	}{existing, evaluateReturnEligibility(order, existing, time.Now())}
	utils.JSONResponse(w, http.StatusOK, response)
}

// CreateReturnRequest handles POST /api/orders/{orderId}/return-request
// Body: {"items": [{"product_id": "...", "quantity": 1, "variant_id": "..."}], "reason": "..."}
func CreateReturnRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	orderID, err := orderIDFromPath(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	var payload struct {
		Items []struct {
			ProductID string `json:"product_id"`
			VariantID string `json:"variant_id,omitempty"`
			Quantity  int    `json:"quantity"`
		} `json:"items"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if len(payload.Items) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "حداقل یک محصول برای درخواست مرجوعی الزامی است")
		return
	}
	if len(payload.Reason) > models.ReturnReasonMaxLength {
		utils.ErrorResponse(w, http.StatusBadRequest, fmt.Sprintf("دلیل درخواست حداکثر می‌تواند %d کاراکتر باشد", models.ReturnReasonMaxLength))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	order, err := fetchOwnedOrder(ctx, orderID, userID)
	if err != nil {
		writeOrderFetchError(w, err)
		return
	}

	existing, err := fetchLatestReturnRequest(ctx, order.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching return request: "+err.Error())
		return
	}
	if el := evaluateReturnEligibility(order, existing, time.Now()); !el.CanRequest {
		utils.ErrorResponse(w, http.StatusConflict, returnBlockMessage(el.Reason))
		return
	}

	items, err := buildReturnItems(order, payload.Items)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	deliveredAt := resolveDeliveryTime(order)
	now := time.Now()
	request := models.ReturnRequest{
		ID:           primitive.NewObjectID(),
		OrderID:      order.ID,
		OrderNumber:  order.OrderNumber,
		UserID:       userID,
		Items:        items,
		Reason:       payload.Reason,
		Status:       models.ReturnStatusPending,
		DeliveredAt:  *deliveredAt,
		WindowEndsAt: deliveredAt.Add(models.ReturnWindowDuration),
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	_, err = db.Database.Collection("return_requests").InsertOne(ctx, request)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, returnBlockMessage(ReturnReasonAlreadyPending))
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating return request: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, request)
}

// CancelReturnRequest handles DELETE /api/orders/{orderId}/return-request
// Cancels the caller's own pending request; terminal states cannot change.
func CancelReturnRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	orderID, err := orderIDFromPath(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Order ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	now := time.Now()
	result, err := db.Database.Collection("return_requests").UpdateOne(
		ctx,
		bson.M{
			"order_id": orderID,
			"user_id":  userID,
			"status":   models.ReturnStatusPending,
		},
		bson.M{"$set": bson.M{
			"status":     models.ReturnStatusCancelled,
			"updated_at": now,
		}},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error cancelling return request: "+err.Error())
		return
	}
	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "درخواست مرجوعی فعالی برای این سفارش یافت نشد")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "درخواست مرجوعی لغو شد",
	})
}

// ============================================================================
// Admin endpoints
// ============================================================================

// ListUserReturnRequests handles GET /api/users/return-requests
// Lists the authenticated user's return requests across all their orders.
// Response shape is identical to the admin endpoint so clients share parsing.
// The badge pattern (?status=pending&limit=1) reads pagination.total_count.
func ListUserReturnRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Scope is forced from the JWT context; callers cannot widen it.
	filter := bson.M{"user_id": userID}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = status
	}

	page, limit := paginationParams(r, 20, 100)
	skip := int64((page - 1) * limit)
	limit64 := int64(limit)

	collection := db.Database.Collection("return_requests")
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting return requests: "+err.Error())
		return
	}

	cursor, err := collection.Find(ctx, filter, optionsList(skip, limit64))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching return requests: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	requests := []models.ReturnRequest{}
	if err := cursor.All(ctx, &requests); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding return requests: "+err.Error())
		return
	}

	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + limit64 - 1) / limit64
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"return_requests": requests,
		"pagination": map[string]interface{}{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"page_size":    limit,
		},
	})
}

// AdminListReturnRequests handles GET /api/admin/return-requests
// Query params: status, order_id, page, limit.
func AdminListReturnRequests(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	filter := bson.M{}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = status
	}
	if orderIDStr := r.URL.Query().Get("order_id"); orderIDStr != "" {
		orderID, err := primitive.ObjectIDFromHex(orderIDStr)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order_id format")
			return
		}
		filter["order_id"] = orderID
	}

	page, limit := paginationParams(r, 20, 100)
	skip := int64((page - 1) * limit)
	limit64 := int64(limit)

	collection := db.Database.Collection("return_requests")
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error counting return requests: "+err.Error())
		return
	}

	opts := optionsList(skip, limit64)
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching return requests: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	requests := []models.ReturnRequest{}
	if err := cursor.All(ctx, &requests); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding return requests: "+err.Error())
		return
	}

	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + int64(limit) - 1) / int64(limit)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"return_requests": requests,
		"pagination": map[string]interface{}{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"page_size":    limit,
		},
	})
}

// AdminDecideReturnRequest handles PUT /api/admin/return-requests/{requestId}
// Body: {"action": "approve"|"reject", "note": "..."}
//
// The pending-status filter inside UpdateOne makes decisions atomic and keeps
// terminal states immutable: two racing approvals resolve to one winner, and
// deciding an already-decided request conflicts instead of overwriting.
func AdminDecideReturnRequest(w http.ResponseWriter, r *http.Request) {
	// A context is created early so adminIdentity can resolve the display name.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	adminID, adminName, ok := adminIdentity(ctx, r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	vars := mux.Vars(r)
	requestIDStr, ok := vars["requestId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Request ID not provided in path")
		return
	}
	requestID, err := primitive.ObjectIDFromHex(requestIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Request ID format")
		return
	}

	var payload struct {
		Action string `json:"action"`
		Note   string `json:"note,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	var newStatus string
	switch payload.Action {
	case "approve":
		newStatus = models.ReturnStatusApproved
	case "reject":
		newStatus = models.ReturnStatusRejected
	default:
		utils.ErrorResponse(w, http.StatusBadRequest, "action باید 'approve' یا 'reject' باشد")
		return
	}

	now := time.Now()
	result, err := db.Database.Collection("return_requests").UpdateOne(
		ctx,
		bson.M{"_id": requestID, "status": models.ReturnStatusPending},
		bson.M{"$set": bson.M{
			"status":     newStatus,
			"admin_id":   adminID,
			"admin_name": adminName,
			"admin_note": payload.Note,
			"decided_at": now,
			"updated_at": now,
		}},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating return request: "+err.Error())
		return
	}
	if result.MatchedCount == 0 {
		var existing models.ReturnRequest
		err := db.Database.Collection("return_requests").FindOne(ctx, bson.M{"_id": requestID}).Decode(&existing)
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "درخواست مرجوعی یافت نشد")
			return
		}
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching return request: "+err.Error())
			return
		}
		utils.ErrorResponse(w, http.StatusConflict, "این درخواست قبلا بررسی شده است")
		return
	}

	// Best-effort audit trail on the order timeline; failure does not fail the decision.
	pushReturnTimelineEntry(ctx, requestID, newStatus, adminID, adminName, payload.Note)

	var updated models.ReturnRequest
	if err := db.Database.Collection("return_requests").FindOne(ctx, bson.M{"_id": requestID}).Decode(&updated); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated return request: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, updated)
}

// pushReturnTimelineEntry appends a note-only audit entry to the order a
// return request belongs to, so admins see the decision in the order history.
func pushReturnTimelineEntry(ctx context.Context, requestID primitive.ObjectID, status string, adminID primitive.ObjectID, adminName, note string) {
	var req models.ReturnRequest
	if err := db.Database.Collection("return_requests").FindOne(ctx, bson.M{"_id": requestID}).Decode(&req); err != nil {
		return
	}
	verb := "تایید"
	if status == models.ReturnStatusRejected {
		verb = "رد"
	}
	entryNote := fmt.Sprintf("درخواست مرجوعی %s شد", verb)
	if note != "" {
		entryNote += " — " + note
	}
	update := bson.M{
		"$push": bson.M{"timeline": models.OrderTimelineEntry{
			// The order's own lifecycle is untouched by a return decision; it
			// stays "delivered". Recording the return-request status here would
			// corrupt the order timeline with statuses the order never had.
			Status:    "delivered",
			Timestamp: time.Now(),
			Note:      entryNote,
			AdminID:   adminID,
			AdminName: adminName,
		}},
	}
	_, _ = db.Database.Collection("orders").UpdateOne(ctx, bson.M{"_id": req.OrderID}, update)
}

// ============================================================================
// Shared helpers
// ============================================================================

// authUserID extracts the authenticated user's ObjectID from context.
func authUserID(r *http.Request) (primitive.ObjectID, bool) {
	userIDCtx := r.Context().Value("userID")
	if userIDCtx == nil {
		return primitive.NilObjectID, false
	}
	userID, ok := userIDCtx.(primitive.ObjectID)
	if !ok || userID == primitive.NilObjectID {
		return primitive.NilObjectID, false
	}
	return userID, true
}

// adminIdentity extracts the admin's ObjectID from middleware context and
// resolves a display name. AuthMiddleware sets "userID" and "role" but no
// name, so the display name is looked up from the users collection on a
// best-effort basis: first+last name, falling back to phone number.
func adminIdentity(ctx context.Context, r *http.Request) (primitive.ObjectID, string, bool) {
	userID, ok := authUserID(r)
	if !ok {
		return primitive.NilObjectID, "", false
	}
	var user struct {
		FirstName   string `bson:"first_name,omitempty"`
		LastName    string `bson:"last_name,omitempty"`
		PhoneNumber string `bson:"phone_number,omitempty"`
	}
	adminName := ""
	if err := db.Database.Collection("users").FindOne(
		ctx, bson.M{"_id": userID},
		optionsProjectionAdminName(),
	).Decode(&user); err == nil {
		adminName = strings.TrimSpace(user.FirstName + " " + user.LastName)
		if adminName == "" {
			adminName = user.PhoneNumber
		}
	}
	return userID, adminName, true
}

// orderIDFromPath parses the mux {orderId} variable.
func orderIDFromPath(r *http.Request) (primitive.ObjectID, error) {
	vars := mux.Vars(r)
	orderIDStr, ok := vars["orderId"]
	if !ok {
		return primitive.NilObjectID, errors.New("order id missing")
	}
	return primitive.ObjectIDFromHex(orderIDStr)
}

// fetchOwnedOrder loads an active order that must belong to the given user.
// Ownership is enforced here, never left to the caller.
func fetchOwnedOrder(ctx context.Context, orderID, userID primitive.ObjectID) (*models.Order, error) {
	var order models.Order
	err := db.Database.Collection("orders").FindOne(
		ctx,
		bson.M{"_id": orderID, "user_id": userID, "is_active": true},
	).Decode(&order)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errOrderNotFound
	}
	if err != nil {
		return nil, err
	}
	return &order, nil
}

var errOrderNotFound = errors.New("order not found")

func writeOrderFetchError(w http.ResponseWriter, err error) {
	if errors.Is(err, errOrderNotFound) {
		utils.ErrorResponse(w, http.StatusNotFound, "سفارش یافت نشد")
		return
	}
	utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
}

// buildReturnItems resolves requested (product_id[, variant_id], quantity)
// tuples against the immutable order snapshot. It rejects unknown products,
// ambiguous references and quantities beyond what was purchased.
func buildReturnItems(order *models.Order, requested []struct {
	ProductID string `json:"product_id"`
	VariantID string `json:"variant_id,omitempty"`
	Quantity  int    `json:"quantity"`
}) ([]models.ReturnRequestItem, error) {
	seen := make(map[string]bool, len(requested))
	items := make([]models.ReturnRequestItem, 0, len(requested))

	for _, ri := range requested {
		productID, err := primitive.ObjectIDFromHex(ri.ProductID)
		if err != nil {
			return nil, errors.New("شناسه محصول نامعتبر است")
		}
		key := ri.ProductID + "|" + ri.VariantID
		if seen[key] {
			return nil, errors.New("هر محصول فقط یک بار می‌تواند در درخواست ذکر شود")
		}
		seen[key] = true
		if ri.Quantity < 1 {
			return nil, errors.New("تعداد مرجوعی باید حداقل ۱ باشد")
		}

		// Candidates: all order lines for this product; narrow by variant when given.
		candidates := make([]int, 0, 1)
		for idx := range order.Items {
			item := &order.Items[idx]
			if item.ProductID != productID {
				continue
			}
			if ri.VariantID != "" && item.Variant.VariantID != ri.VariantID {
				continue
			}
			candidates = append(candidates, idx)
		}
		if len(candidates) == 0 {
			return nil, errors.New("محصول انتخابی در این سفارش یافت نشد")
		}
		if len(candidates) > 1 && ri.VariantID == "" {
			return nil, errors.New("این محصول با چند سایز/رنگ سفارش داده شده؛ لطفا یکی را مشخص کنید")
		}

		item := &order.Items[candidates[0]]
		if ri.Quantity > item.Quantity {
			return nil, fmt.Errorf(
				"تعداد مرجوعی %s نمی‌تواند بیشتر از تعداد خریداری‌شده (%d) باشد",
				item.ProductName, item.Quantity,
			)
		}

		items = append(items, models.ReturnRequestItem{
			ProductID:       item.ProductID,
			ProductName:     item.ProductName,
			ProductImage:    item.ProductImage,
			Variant:         item.Variant,
			Quantity:        ri.Quantity,
			PriceAtPurchase: item.PriceAtPurchase,
		})
	}
	return items, nil
}

// returnBlockMessage converts a machine reason code into user-facing Persian copy.
func returnBlockMessage(reason string) string {
	switch reason {
	case ReturnReasonNotDelivered:
		return "فقط سفارش‌های تحویل‌شده امکان ثبت درخواست مرجوعی دارند"
	case ReturnReasonNotPaid:
		return "سفارش‌های پرداخت‌نشده امکان مرجوعی ندارند"
	case ReturnReasonWindowExpired:
		return "مهلت ۷ روزه مرجوعی این سفارش به پایان رسیده است"
	case ReturnReasonAlreadyApproved:
		return "درخواست مرجوعی این سفارش قبلا تایید شده است"
	case ReturnReasonAlreadyPending:
		return "شما یک درخواست مرجوعی در انتظار بررسی برای این سفارش دارید"
	default:
		return "ثبت درخواست مرجوعی امکان‌پذیر نیست"
	}
}

func optionsFindOneLatest() *options.FindOneOptions {
	return &options.FindOneOptions{Sort: bson.D{{Key: "created_at", Value: -1}}}
}

func optionsProjectionAdminName() *options.FindOneOptions {
	return &options.FindOneOptions{
		Projection: bson.D{
			{Key: "first_name", Value: 1},
			{Key: "last_name", Value: 1},
			{Key: "phone_number", Value: 1},
		},
	}
}

func optionsList(skip, limit int64) *options.FindOptions {
	return &options.FindOptions{
		Sort:  bson.D{{Key: "created_at", Value: -1}},
		Skip:  &skip,
		Limit: &limit,
	}
}

// paginationParams reads page/limit with defaults and clamps.
func paginationParams(r *http.Request, defaultLimit, maxLimit int) (page int, limit int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ = strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return page, limit
}
