package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	neturl "net/url"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

const externalServicesCollection = "external_services"

// ============================================================================
// Admin endpoints — external services
// ============================================================================

// AdminListExternalServices handles GET /api/admin/external-services.
//
// Lists every configured service with its masked key identity, webhook
// health and linked-identity count. Secrets never leave the server: the API
// key plaintext exists only in the create/rotate responses.
func AdminListExternalServices(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	cursor, err := db.Database.Collection(externalServicesCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(500),
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch external services")
		return
	}
	var servicesList []models.ExternalService
	if err := cursor.All(ctx, &servicesList); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch external services")
		return
	}

	activeCounts := countActiveIdentitiesGroupedByProvider(ctx)
	items := make([]map[string]interface{}, 0, len(servicesList))
	activeCount := 0
	for i := range servicesList {
		view := externalServiceAdminView(&servicesList[i])
		view["identity_count"] = activeCounts[servicesList[i].Provider]
		items = append(items, view)
		if servicesList[i].Status == models.ExternalServiceStatusActive {
			activeCount++
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"services": items,
		"stats": map[string]int{
			"total":    len(servicesList),
			"active":   activeCount,
			"disabled": len(servicesList) - activeCount,
		},
	})
}

// AdminGetExternalService handles GET /api/admin/external-services/{id}.
func AdminGetExternalService(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var service models.ExternalService
	if err := db.Database.Collection(externalServicesCollection).FindOne(ctx, bson.M{"_id": serviceID}).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}

	view := externalServiceAdminView(&service)
	view["identity_count"] = countActiveIdentitiesByProvider(ctx, service.Provider)
	utils.JSONResponse(w, http.StatusOK, view)
}

// AdminCreateExternalService handles POST /api/admin/external-services.
//
// Generates the API key server-side; the plaintext is returned exactly once
// in this response and only its SHA-256 hash is ever stored.
func AdminCreateExternalService(w http.ResponseWriter, r *http.Request) {
	var payload externalServicePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	key, err := utils.GenerateExternalServiceKey()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to generate API key")
		return
	}

	now := time.Now()
	service := &models.ExternalService{
		ID:        primitive.NewObjectID(),
		Status:    models.ExternalServiceStatusActive,
		Scopes:    []string{models.ExternalServiceScopeIdentityExchange},
		KeyHash:   utils.HashServiceKey(key.Plain),
		KeyPrefix: key.Prefix,
		KeyLast4:  key.Last4,
		APIKey:    key.Plain, // response-only; never persisted
		CreatedAt: now,
		UpdatedAt: now,
	}
	if adminID, _, ok := adminIdentity(ctx, r); ok {
		service.CreatedBy = &adminID
	}
	if errMsg := payload.apply(service); errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	if _, err := db.Database.Collection(externalServicesCollection).InsertOne(ctx, service); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "سرویس دیگری با همین نام وجود دارد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create external service")
		return
	}

	auditExternalService(ctx, r, service.ID, "created", "name="+service.Name+" provider="+service.Provider)
	utils.LogAction("EXTERNAL_SERVICE_CREATED", service.Name)
	response := externalServiceAdminViewWithKey(service)
	if payload.generatedWebhookSecret != "" {
		// The webhook signing secret, shown exactly once (like the API key).
		response["webhook_secret"] = payload.generatedWebhookSecret
	}
	utils.JSONResponse(w, http.StatusCreated, response)
}

// AdminUpdateExternalService handles PUT /api/admin/external-services/{id}.
//
// Patchable fields: name, scopes, phone_methods, webhook, status. Provider is
// IMMUTABLE — it is bound to the issued credential and to every identity the
// service has ever minted.
func AdminUpdateExternalService(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	var payload externalServicePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	collection := db.Database.Collection(externalServicesCollection)
	var service models.ExternalService
	if err := collection.FindOne(ctx, bson.M{"_id": serviceID}).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}

	if payload.Provider != nil && *payload.Provider != service.Provider {
		utils.ErrorResponse(w, http.StatusBadRequest, "پلتفرم سرویس قابل تغییر نیست")
		return
	}
	if errMsg := payload.apply(&service); errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}
	service.UpdatedAt = time.Now()

	if _, err := collection.UpdateOne(ctx, bson.M{"_id": serviceID}, bson.M{"$set": bson.M{
		"name":          service.Name,
		"scopes":        service.Scopes,
		"phone_methods": service.PhoneMethods,
		"status":        service.Status,
		"webhook":       service.Webhook,
		"updated_at":    service.UpdatedAt,
	}}); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "سرویس دیگری با همین نام وجود دارد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update external service")
		return
	}

	auditExternalService(ctx, r, serviceID, "updated", "")
	utils.LogAction("EXTERNAL_SERVICE_UPDATED", service.Name)
	response := externalServiceAdminView(&service)
	if payload.generatedWebhookSecret != "" {
		// A webhook URL was configured for the first time; the freshly
		// generated signing secret is shown exactly once.
		response["webhook_secret"] = payload.generatedWebhookSecret
	}
	utils.JSONResponse(w, http.StatusOK, response)
}

// AdminDeleteExternalService handles DELETE /api/admin/external-services/{id}.
//
// Hard delete. Linked identities keep their existing sessions, but the
// service can never authenticate again (and any in-grace old key dies with
// the document).
func AdminDeleteExternalService(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var service models.ExternalService
	if err := db.Database.Collection(externalServicesCollection).FindOne(ctx, bson.M{"_id": serviceID}).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}

	result, err := db.Database.Collection(externalServicesCollection).DeleteOne(ctx, bson.M{"_id": serviceID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete external service")
		return
	}
	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
		return
	}

	auditExternalService(ctx, r, serviceID, "deleted", "name="+service.Name)
	utils.LogAction("EXTERNAL_SERVICE_DELETED", service.Name)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "External service deleted"})
}

// AdminRotateExternalServiceKey handles
// POST /api/admin/external-services/{id}/rotate-key.
//
// Issues a fresh key and keeps the previous one valid for the grace window
// (models.ExternalServiceKeyGracePeriod) so a bot deploy never races its own
// credential update. The new plaintext is returned exactly once.
func AdminRotateExternalServiceKey(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	key, err := utils.GenerateExternalServiceKey()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to generate API key")
		return
	}

	collection := db.Database.Collection(externalServicesCollection)
	var service models.ExternalService
	if err := collection.FindOne(ctx, bson.M{"_id": serviceID}).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}

	now := time.Now()
	grace := now.Add(models.ExternalServiceKeyGracePeriod)
	if _, err := collection.UpdateOne(ctx, bson.M{"_id": serviceID}, bson.M{"$set": bson.M{
		"key_hash":                utils.HashServiceKey(key.Plain),
		"key_prefix":              key.Prefix,
		"key_last4":               key.Last4,
		"previous_key_hash":       service.KeyHash, // the old key keeps working until grace expires
		"previous_key_expires_at": grace,
		"updated_at":              now,
	}}); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to rotate API key")
		return
	}

	auditExternalService(ctx, r, serviceID, "key_rotated", "new_prefix="+key.Prefix+" grace=24h")
	utils.LogAction("EXTERNAL_SERVICE_KEY_ROTATED", service.Name)

	response := externalServiceAdminView(&service)
	response["key_prefix"] = key.Prefix
	response["key_last4"] = key.Last4
	response["api_key"] = key.Plain
	response["previous_key_expires_at"] = grace
	utils.JSONResponse(w, http.StatusOK, response)
}

// AdminTestExternalServiceWebhook handles
// POST /api/admin/external-services/{id}/webhooks/test.
//
// Enqueues a webhook.test event; the dispatcher signs and delivers it exactly
// like any production event, so the test exercises the real delivery path.
func AdminTestExternalServiceWebhook(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var service models.ExternalService
	if err := db.Database.Collection(externalServicesCollection).FindOne(ctx, bson.M{"_id": serviceID}).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}
	if service.Webhook == nil || service.Webhook.URL == "" {
		externalServiceError(w, http.StatusBadRequest, "WEBHOOK_NOT_CONFIGURED", "این سرویس وب‌هوک ندارد", nil)
		return
	}

	eventID, err := services.EnqueueOutboundEvent(ctx, db.Database, models.OutboundEventWebhookTest, serviceID, nil, map[string]interface{}{
		"source":  "admin_test",
		"sent_at": time.Now(),
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to queue webhook test")
		return
	}

	utils.JSONResponse(w, http.StatusAccepted, map[string]interface{}{
		"queued":   true,
		"event_id": eventID.Hex(),
	})
}

// AdminListExternalServiceIdentities handles
// GET /api/admin/external-services/{id}/identities.
//
// ?status=active|revoked filters; the provider comes from the service
// document, never from the query.
func AdminListExternalServiceIdentities(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var service models.ExternalService
	if err := db.Database.Collection(externalServicesCollection).FindOne(ctx,
		bson.M{"_id": serviceID}, options.FindOne().SetProjection(bson.M{"provider": 1}),
	).Decode(&service); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "External service not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load external service")
		return
	}

	filter := bson.M{"provider": service.Provider}
	switch r.URL.Query().Get("status") {
	case "active":
		filter["status"] = models.ExternalIdentityStatusActive
	case "revoked":
		filter["status"] = models.ExternalIdentityStatusRevoked
	}

	cursor, err := db.Database.Collection("external_identities").Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "linked_at", Value: -1}}).SetLimit(200),
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch identities")
		return
	}
	var identities []models.ExternalIdentity
	if err := cursor.All(ctx, &identities); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch identities")
		return
	}

	items := make([]map[string]interface{}, 0, len(identities))
	for i := range identities {
		items = append(items, map[string]interface{}{
			"id":           identities[i].ID.Hex(),
			"external_id":  identities[i].ExternalID,
			"user_id":      identities[i].UserID.Hex(),
			"profile":      identities[i].ProfileSnapshot,
			"status":       identities[i].Status,
			"linked_via":   identities[i].LinkedVia,
			"linked_at":    identities[i].LinkedAt,
			"last_seen_at": identities[i].LastSeenAt,
		})
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"identities": items, "total": len(identities)})
}

// AdminGetExternalServiceAudit handles
// GET /api/admin/external-services/{id}/audit — key rotations and config
// changes, newest first.
func AdminGetExternalServiceAudit(w http.ResponseWriter, r *http.Request) {
	serviceID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid service id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	cursor, err := db.Database.Collection("external_service_audit").Find(ctx,
		bson.M{"service_id": serviceID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(200),
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch audit log")
		return
	}
	var entries []bson.M
	if err := cursor.All(ctx, &entries); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch audit log")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"audit": entries, "total": len(entries)})
}

// ============================================================================
// Shared helpers
// ============================================================================

// externalServicePayload is the admin create/update body. Provider is a
// pointer so an update can reject a provider change; the update handler
// enforces immutability before apply() runs.
type externalServicePayload struct {
	Name         *string                 `json:"name"`
	Provider     *string                 `json:"provider"`
	Status       *string                 `json:"status"`
	Scopes       *[]string               `json:"scopes"`
	PhoneMethods *[]string               `json:"phone_methods"`
	Webhook      *externalWebhookPayload `json:"webhook"`

	// generatedWebhookSecret holds the PLAINTEXT signing secret when this
	// request generated a new one. Only the create/update responses carry it
	// (shown exactly once); the stored copy is encrypted at rest.
	generatedWebhookSecret string
}

type externalWebhookPayload struct {
	URL    *string   `json:"url"`
	Events *[]string `json:"events"`
	Active *bool     `json:"active"`
}

// apply patches the payload onto a service and validates the closed sets.
// Returns a Persian error message for the admin form, or "" when valid.
func (p *externalServicePayload) apply(service *models.ExternalService) string {
	if p.Name != nil {
		name := strings.TrimSpace(*p.Name)
		if name == "" || len(name) > 120 {
			return "نام سرویس الزامی است (حداکثر ۱۲۰ کاراکتر)"
		}
		service.Name = name
	}
	if p.Provider != nil {
		provider := strings.TrimSpace(*p.Provider)
		if !models.ValidExternalServiceProvider(provider) {
			return "پلتفرم نامعتبر است (telegram | bale | instagram)"
		}
		if service.Provider == "" {
			service.Provider = provider
		}
	}
	if service.Provider == "" {
		return "پلتفرم الزامی است"
	}
	if p.Status != nil {
		status := strings.TrimSpace(*p.Status)
		if status != models.ExternalServiceStatusActive && status != models.ExternalServiceStatusDisabled {
			return "وضعیت نامعتبر است (active | disabled)"
		}
		service.Status = status
	}
	if service.Status == "" {
		service.Status = models.ExternalServiceStatusActive
	}
	if p.Scopes != nil {
		scopes := make([]string, 0, len(*p.Scopes))
		seen := make(map[string]struct{}, len(*p.Scopes))
		for _, s := range *p.Scopes {
			s = strings.TrimSpace(s)
			if !models.ValidExternalServiceScope(s) {
				return "دسترسی نامعتبر است: " + s
			}
			if _, dup := seen[s]; dup {
				continue
			}
			seen[s] = struct{}{}
			scopes = append(scopes, s)
		}
		if len(scopes) == 0 {
			return "حداقل یک دسترسی (scope) الزامی است"
		}
		service.Scopes = scopes
	}
	if p.PhoneMethods != nil {
		methods := make([]string, 0, len(*p.PhoneMethods))
		seen := make(map[string]struct{}, len(*p.PhoneMethods))
		for _, m := range *p.PhoneMethods {
			m = strings.TrimSpace(m)
			if !models.ValidExternalServicePhoneMethod(m) {
				return "روش تأیید شماره نامعتبر است: " + m
			}
			if _, dup := seen[m]; dup {
				continue
			}
			seen[m] = struct{}{}
			methods = append(methods, m)
		}
		service.PhoneMethods = methods
	}
	if p.Webhook != nil {
		return p.applyWebhook(service)
	}
	return ""
}

// applyWebhook patches the webhook block. A newly configured (or replaced)
// URL without a stored signing secret gets a fresh secret, generated
// server-side and stored encrypted at rest.
func (p *externalServicePayload) applyWebhook(service *models.ExternalService) string {
	if service.Webhook == nil {
		service.Webhook = &models.ExternalServiceWebhook{Active: true}
	}
	if p.Webhook.URL != nil {
		url := strings.TrimSpace(*p.Webhook.URL)
		if url != "" && !strings.HasPrefix(url, "https://") {
			return "آدرس وب‌هوک باید با https:// شروع شود"
		}
		if url != "" {
			if errMsg := validateWebhookEndpoint(url); errMsg != "" {
				return errMsg
			}
		}
		urlChanged := url != service.Webhook.URL
		service.Webhook.URL = url
		if url != "" && urlChanged && service.Webhook.Secret == "" {
			if errMsg := rotateWebhookSecret(service, p); errMsg != "" {
				return errMsg
			}
		}
	}
	if p.Webhook.Events != nil {
		events := make([]string, 0, len(*p.Webhook.Events))
		seen := make(map[string]struct{}, len(*p.Webhook.Events))
		for _, e := range *p.Webhook.Events {
			e = strings.TrimSpace(e)
			if !models.ValidOutboundEventType(e) {
				return "رویداد نامعتبر است: " + e
			}
			if _, dup := seen[e]; dup {
				continue
			}
			seen[e] = struct{}{}
			events = append(events, e)
		}
		service.Webhook.Events = events
	}
	if p.Webhook.Active != nil {
		service.Webhook.Active = *p.Webhook.Active
	}
	return ""
}

// rotateWebhookSecret generates a new webhook signing secret, stores the
// encrypted copy on the service and the plaintext on the payload so the
// response can hand it to the admin exactly once.
func rotateWebhookSecret(service *models.ExternalService, payload *externalServicePayload) string {
	secret, err := utils.GenerateWebhookSecret()
	if err != nil {
		return "خطا در تولید رمز وب‌هوک"
	}
	encrypted, err := utils.EncryptWebhookSecret(secret)
	if err != nil {
		return "خطا در رمزنگاری رمز وب‌هوک"
	}
	service.Webhook.Secret = encrypted
	payload.generatedWebhookSecret = secret
	return ""
}

// validateWebhookEndpoint rejects webhook targets that point at loopback,
// private, link-local or unspecified addresses — the dispatcher follows the
// stored URL verbatim, so an internal target would let a misconfigured (or
// malicious) admin setting probe the internal network.
//
// IP literals are always enforced. For hostnames, resolution is best-effort:
// this VPS has no direct internet and may be unable to resolve public DNS at
// save time, so a failed lookup is allowed through (documented gap; the
// guard's purpose is catching the obvious internal targets, admin-only).
func validateWebhookEndpoint(rawURL string) string {
	parsed, err := neturl.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return "آدرس وب‌هوک نامعتبر است"
	}
	host := parsed.Hostname()
	if strings.EqualFold(host, "localhost") {
		return "آدرس وب‌هوک نمی‌تواند به آدرس داخلی اشاره کند"
	}
	var ips []net.IP
	if ip := net.ParseIP(host); ip != nil {
		ips = []net.IP{ip}
	} else {
		resolved, lookupErr := net.LookupIP(host)
		if lookupErr != nil || len(resolved) == 0 {
			return "" // best-effort: no DNS here, don't block the admin
		}
		ips = resolved
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return "آدرس وب‌هوک نمی‌تواند به آدرس داخلی اشاره کند"
		}
	}
	return ""
}

// externalServiceAdminView projects a service for admin listings: metadata
// and webhook health, never secrets.
func externalServiceAdminView(service *models.ExternalService) map[string]interface{} {
	view := map[string]interface{}{
		"id":            service.ID.Hex(),
		"name":          service.Name,
		"provider":      service.Provider,
		"status":        service.Status,
		"scopes":        service.Scopes,
		"phone_methods": service.PhoneMethods,
		"key_prefix":    service.KeyPrefix,
		"key_last4":     service.KeyLast4,
		"created_at":    service.CreatedAt,
		"updated_at":    service.UpdatedAt,
		"last_used_at":  service.LastUsedAt,
		"webhook":       nil,
	}
	if service.PreviousKeyExpiresAt != nil {
		view["previous_key_expires_at"] = *service.PreviousKeyExpiresAt
	}
	if service.Webhook != nil {
		view["webhook"] = map[string]interface{}{
			"url":        service.Webhook.URL,
			"events":     service.Webhook.Events,
			"active":     service.Webhook.Active,
			"has_secret": service.Webhook.Secret != "",
		}
		view["webhook_failure_count"] = service.WebhookFailureCount
	}
	if service.CreatedBy != nil {
		view["created_by"] = service.CreatedBy.Hex()
	}
	return view
}

// externalServiceAdminViewWithKey is the create response: the view plus the
// plaintext API key (shown exactly once).
func externalServiceAdminViewWithKey(service *models.ExternalService) map[string]interface{} {
	view := externalServiceAdminView(service)
	view["api_key"] = service.APIKey
	return view
}

// countActiveIdentitiesByProvider counts active identities for one provider.
func countActiveIdentitiesByProvider(ctx context.Context, provider string) int64 {
	count, err := db.Database.Collection("external_identities").CountDocuments(ctx, bson.M{
		"provider": provider,
		"status":   models.ExternalIdentityStatusActive,
	})
	if err != nil {
		return 0
	}
	return count
}

// countActiveIdentitiesGroupedByProvider counts active identities per
// provider across the whole directory.
func countActiveIdentitiesGroupedByProvider(ctx context.Context) map[string]int64 {
	groups, err := db.Database.Collection("external_identities").Aggregate(ctx, []bson.M{
		{"$match": bson.M{"status": models.ExternalIdentityStatusActive}},
		{"$group": bson.M{"_id": "$provider", "count": bson.M{"$sum": 1}}},
	})
	if err != nil {
		return map[string]int64{}
	}
	defer groups.Close(ctx)
	result := map[string]int64{}
	for groups.Next(ctx) {
		var row struct {
			ID    string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if err := groups.Decode(&row); err == nil && row.ID != "" {
			result[row.ID] = row.Count
		}
	}
	return result
}

// auditExternalService appends a best-effort audit row (never fails a write).
func auditExternalService(ctx context.Context, r *http.Request, serviceID primitive.ObjectID, action, detail string) {
	entry := bson.M{
		"service_id": serviceID,
		"action":     action,
		"detail":     detail,
		"created_at": time.Now(),
	}
	if r != nil {
		if adminID, adminName, ok := adminIdentity(ctx, r); ok {
			entry["admin_id"] = adminID
			entry["admin_name"] = adminName
		}
	}
	if _, err := db.Database.Collection("external_service_audit").InsertOne(ctx, entry); err != nil {
		utils.LogAction("EXTERNAL_SERVICE_AUDIT_FAILED", action+" "+serviceID.Hex())
	}
}
