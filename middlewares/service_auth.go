package middlewares

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

// Context keys set by ServiceAuthMiddleware. handlers reads them with
// r.Context().Value(...) — the same string-key style AuthMiddleware uses for
// userID/role — because middlewares imports handlers (for the token helpers)
// and the reverse import would cycle. The CtxExternalService VALUE must stay
// exactly "externalService" (pinned by a test).
const (
	// CtxExternalService holds the authenticated *models.ExternalService.
	CtxExternalService = "externalService"
)

// serviceAuthRequestLimit is the per-service fixed-window request cap.
const serviceAuthRequestLimit = 300

// serviceAuthRequestWindow is that cap's window.
const serviceAuthRequestWindow = time.Minute

// serviceInvalidKeyLimit throttles requests that presented an unknown key:
// they all share one small bucket, so a flood of fabricated vxk_-formatted
// keys can neither bypass the per-service limiter nor hammer the key lookup.
const serviceInvalidKeyLimit = 60

// serviceInvalidKeyBucket is the shared limiter key for unknown keys.
const serviceInvalidKeyBucket = "_invalid_"

// maxServiceRequestBuckets bounds the counter map defensively; when it is
// exceeded, expired windows are swept before a new bucket is created.
const maxServiceRequestBuckets = 4096

// serviceAuthLastUsedThrottle coalesces last_used_at writes: at most one DB
// write per service per this interval.
const serviceAuthLastUsedThrottle = time.Minute

// serviceRequestCounter is a minimal fixed-window rate limiter keyed by the
// API key hash. Buckets only ever exist for REAL service keys (the lookup
// happens before the charge) plus one shared bucket for invalid keys, so the
// map stays bounded by the number of services; a defensive sweep caps it in
// pathological cases.
type serviceRequestCounter struct {
	mu       sync.Mutex
	counts   map[string]*serviceRequestBucket
	lastUsed map[string]time.Time
}

type serviceRequestBucket struct {
	count int
	start time.Time
}

var serviceRequests = &serviceRequestCounter{
	counts:   make(map[string]*serviceRequestBucket),
	lastUsed: make(map[string]time.Time),
}

// allow reports whether one more request for keyHash fits the window under
// the given per-key cap.
func (c *serviceRequestCounter) allow(keyHash string, limit int) bool {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.counts) >= maxServiceRequestBuckets {
		for k, b := range c.counts {
			if now.Sub(b.start) >= serviceAuthRequestWindow {
				delete(c.counts, k)
			}
		}
	}
	b, ok := c.counts[keyHash]
	if !ok || now.Sub(b.start) >= serviceAuthRequestWindow {
		b = &serviceRequestBucket{count: 0, start: now}
		c.counts[keyHash] = b
	}
	b.count++
	return b.count <= limit
}

// allowInvalid charges the shared bucket for requests that presented an
// unknown key. A small cap keeps key-brute-force attempts metered without
// ever touching a real service's own budget.
func (c *serviceRequestCounter) allowInvalid() bool {
	return c.allow(serviceInvalidKeyBucket, serviceInvalidKeyLimit)
}

// shouldTouchLastUsed reports whether a last_used_at DB write is due.
func (c *serviceRequestCounter) shouldTouchLastUsed(keyHash string) bool {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if last, ok := c.lastUsed[keyHash]; ok && now.Sub(last) < serviceAuthLastUsedThrottle {
		return false
	}
	c.lastUsed[keyHash] = now
	return true
}

// ServiceAuthError codes returned in the "code" field of the JSON error body.
const (
	ServiceErrCodeMissingKey        = "MISSING_API_KEY"
	ServiceErrCodeInvalidKey        = "INVALID_API_KEY"
	ServiceErrCodeDisabled          = "SERVICE_DISABLED"
	ServiceErrCodeInsufficientScope = "INSUFFICIENT_SCOPE"
	ServiceErrCodeRateLimited       = "RATE_LIMITED"
	ServiceErrCodeUninitialized     = "SERVICE_UNAVAILABLE"
)

func serviceAuthError(w http.ResponseWriter, status int, code, message string) {
	utils.JSONResponse(w, status, map[string]string{
		"error": message,
		"code":  code,
	})
}

// ServiceAuthMiddleware authenticates a server-to-server client (bot backend,
// future Bale/Instagram services) by the X-API-Key header. It is the external
// counterpart of AuthMiddleware: no JWT, no user session — the caller speaks
// for itself and resolves users itself via the /api/auth/external/* routes.
//
//   - The presented key is SHA-256 hashed and looked up against
//     external_services.key_hash; a rotated-out key still authenticates while
//     previous_key_expires_at is in the future (grace window for deploys).
//   - The service must be status "active".
//   - The service must hold the required scope (see models.Scopes constants).
//   - Valid keys are rate limited per key; invalid keys share a small
//     global bucket.
//
// On success the context carries the service document (CtxExternalService).
// Handlers MUST take the provider for identity work from the service
// document (or the request body's provider, validated against it) rather
// than trusting any other source.
func ServiceAuthMiddleware(scope string) func(http.Handler) http.Handler {
	if !models.ValidExternalServiceScope(scope) {
		panic("middlewares.ServiceAuthMiddleware: unknown scope " + scope)
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if db.Database == nil {
				serviceAuthError(w, http.StatusServiceUnavailable, ServiceErrCodeUninitialized, "Authentication service unavailable")
				return
			}

			presented := strings.TrimSpace(r.Header.Get("X-API-Key"))
			if presented == "" {
				serviceAuthError(w, http.StatusUnauthorized, ServiceErrCodeMissingKey, "X-API-Key header required")
				return
			}
			if !utils.ValidateExternalServiceKeyFormat(presented) {
				serviceAuthError(w, http.StatusUnauthorized, ServiceErrCodeInvalidKey, "Invalid API key")
				return
			}

			keyHash := utils.HashServiceKey(presented)

			// Resolve the service FIRST: buckets exist only for real keys,
			// so fabricated key material can never grow the limiter map.
			// Unknown keys are metered by the shared invalid bucket before
			// the 401 is written.
			svc, err := findServiceByKeyHash(r.Context(), keyHash)
			if err == mongo.ErrNoDocuments {
				if !serviceRequests.allowInvalid() {
					serviceAuthError(w, http.StatusTooManyRequests, ServiceErrCodeRateLimited, "Too many invalid key attempts")
					return
				}
				serviceAuthError(w, http.StatusUnauthorized, ServiceErrCodeInvalidKey, "Invalid API key")
				return
			} else if err != nil {
				serviceAuthError(w, http.StatusServiceUnavailable, ServiceErrCodeUninitialized, "Authentication service unavailable")
				return
			}

			if !serviceRequests.allow(keyHash, serviceAuthRequestLimit) {
				serviceAuthError(w, http.StatusTooManyRequests, ServiceErrCodeRateLimited, "Too many requests for this service")
				return
			}

			if svc.Status != models.ExternalServiceStatusActive {
				serviceAuthError(w, http.StatusForbidden, ServiceErrCodeDisabled, "This service is disabled")
				return
			}
			if !svc.GrantsScope(scope) {
				serviceAuthError(w, http.StatusForbidden, ServiceErrCodeInsufficientScope, "This service lacks the required scope")
				return
			}

			// Best-effort bookkeeping; never blocks the request.
			if serviceRequests.shouldTouchLastUsed(svc.ID.Hex()) {
				go func(serviceID primitive.ObjectID) {
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					_, _ = db.Database.Collection("external_services").UpdateOne(
						ctx, bson.M{"_id": serviceID},
						bson.M{"$set": bson.M{"last_used_at": time.Now()}},
					)
				}(svc.ID)
			}

			reqCtx := context.WithValue(r.Context(), CtxExternalService, svc)

			next.ServeHTTP(w, r.WithContext(reqCtx))
		})
	}
}

// findServiceByKeyHash resolves the service owning a key: first the live key,
// then the rotated-out key inside its grace window.
func findServiceByKeyHash(ctx context.Context, keyHash string) (*models.ExternalService, error) {
	collection := db.Database.Collection("external_services")
	var svc models.ExternalService
	err := collection.FindOne(ctx, bson.M{"key_hash": keyHash}).Decode(&svc)
	if err == nil {
		return &svc, nil
	}
	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Grace-window lookup for a key that was rotated out recently.
	now := time.Now()
	graceFilter := bson.M{
		"previous_key_hash":       keyHash,
		"previous_key_expires_at": bson.M{"$gt": now},
	}
	err = collection.FindOne(ctx, graceFilter).Decode(&svc)
	if err != nil {
		return nil, err
	}
	return &svc, nil
}
