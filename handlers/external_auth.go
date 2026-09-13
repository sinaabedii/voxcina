package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/services/authjwt"
	"backEnd/utils"
)

// ============================================================================
// Shared plumbing for the external-service routes
// ============================================================================

// External error codes returned in the "code" field of the JSON error body so
// bot integrations can branch programmatically instead of parsing messages.
const (
	ExternalErrCodeProviderMismatch   = "PROVIDER_MISMATCH"
	ExternalErrCodeInvalidExternalID  = "INVALID_EXTERNAL_ID"
	ExternalErrCodeInvalidPhone       = "INVALID_PHONE"
	ExternalErrCodeUserInactive       = "USER_INACTIVE"
	ExternalErrCodeContactMismatch    = "CONTACT_MISMATCH"
	ExternalErrCodePhoneAlreadySet    = "phone_already_set"
	ExternalErrCodePhoneTaken         = "phone_taken"
	ExternalErrCodePhoneOwnerConflict = "phone_owner_conflict"
	ExternalErrCodeLinkCodeInvalid    = "LINK_CODE_INVALID"
	ExternalErrCodeAccountUnavailable = "ACCOUNT_UNAVAILABLE"
	ExternalErrCodeMergeRequired      = "MERGE_REQUIRED"
	ExternalErrCodeIdentityLinked     = "IDENTITY_LINKED_ELSEWHERE"
	ExternalErrCodeSoleLoginMethod    = "SOLE_LOGIN_METHOD"
)

// externalServiceError writes the standard error body with a machine-readable
// code plus optional extra fields (e.g. can_merge).
func externalServiceError(w http.ResponseWriter, status int, code, message string, extra map[string]interface{}) {
	body := map[string]interface{}{
		"error": message,
		"code":  code,
	}
	for k, v := range extra {
		body[k] = v
	}
	utils.JSONResponse(w, status, body)
}

// serviceFromRequest returns the service authenticated by
// middlewares.ServiceAuthMiddleware. External handlers must not run without it.
func serviceFromRequest(r *http.Request) (*models.ExternalService, error) {
	svc := r.Context().Value("externalService")
	if svc == nil {
		return nil, errors.New("external service missing from request context")
	}
	typed, ok := svc.(*models.ExternalService)
	if !ok || typed == nil {
		return nil, errors.New("external service in context has unexpected type")
	}
	return typed, nil
}

// externalUserSummary is the safe user shape returned to external services —
// no addresses, no hashes, no internal-only fields. phone appears only when a
// phone is actually bound.
func externalUserSummary(u *models.User) map[string]interface{} {
	summary := map[string]interface{}{
		"id":           u.ID.Hex(),
		"name":         u.Name,
		"first_name":   u.FirstName,
		"last_name":    u.LastName,
		"account_type": u.EffectiveAccountType(),
		"has_phone":    u.HasPhone(),
		"has_password": u.HasPassword(),
	}
	if u.HasPhone() {
		summary["phone"] = u.Phone
		summary["phone_verified_method"] = u.PhoneVerifiedMethod
	}
	if u.SignupChannel != "" {
		summary["signup_channel"] = u.SignupChannel
	}
	return summary
}

// resolveExternalUser walks a user id through merge tombstones until it finds
// an active, non-merged account, re-pointing identities it heals along the
// way. This is the crash-recovery path that keeps old identity rows usable
// after a merge.
func resolveExternalUser(ctx context.Context, identity *models.ExternalIdentity) (*models.User, error) {
	const maxChain = 5
	userID := identity.UserID
	healed := false
	for i := 0; i < maxChain; i++ {
		var user models.User
		err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, fmt.Errorf("external identity points at missing user %s", userID.Hex())
			}
			return nil, err
		}
		if !user.IsMerged() {
			if healed && user.IsActive {
				// Persist the self-heal so the next request skips the chain.
				_, _ = db.Database.Collection("external_identities").UpdateOne(
					ctx,
					bson.M{"_id": identity.ID},
					bson.M{"$set": bson.M{"user_id": user.ID, "updated_at": time.Now()}},
				)
				identity.UserID = user.ID
			}
			return &user, nil
		}
		if user.MergedInto == nil || user.MergedInto.IsZero() {
			return nil, fmt.Errorf("merged user %s has no merge target", userID.Hex())
		}
		userID = *user.MergedInto
		healed = true
	}
	return nil, fmt.Errorf("merge chain for identity %s exceeds %d hops", identity.ID.Hex(), maxChain)
}

// findExternalIdentity loads the ACTIVE identity for a (provider, external_id)
// pair. Returns mongo.ErrNoDocuments when absent. Revoked rows are excluded
// by the filter (and by the partial unique index), so a channel account that
// was unlinked starts over with a fresh identity + shadow user at the next
// contact — the old account keeps its revoked row as the audit trail, and
// nothing re-activates without the owner's fresh link code.
func findExternalIdentity(ctx context.Context, provider, externalID string) (*models.ExternalIdentity, error) {
	var identity models.ExternalIdentity
	err := db.Database.Collection("external_identities").FindOne(ctx, bson.M{
		"provider":    provider,
		"external_id": externalID,
		"status":      models.ExternalIdentityStatusActive,
	}).Decode(&identity)
	if err != nil {
		return nil, err
	}
	return &identity, nil
}

// createShadowExternalUser builds the phone-less, password-less shadow user a
// new channel identity attaches to.
func createShadowExternalUser(provider, externalID string, profile bson.M) *models.User {
	now := time.Now()
	firstName, _ := profile["first_name"].(string)
	lastName, _ := profile["last_name"].(string)
	username, _ := profile["username"].(string)

	firstName = strings.TrimSpace(firstName)
	lastName = strings.TrimSpace(lastName)
	name := strings.TrimSpace(strings.TrimSpace(firstName) + " " + strings.TrimSpace(lastName))
	if name == "" {
		name = strings.TrimSpace(username)
	}
	if name == "" {
		name = "کاربر " + provider
	}

	return &models.User{
		ID:            primitive.NewObjectID(),
		Name:          name,
		FirstName:     firstName,
		LastName:      lastName,
		Addresses:     []models.Address{},
		Role:          RoleCustomer,
		IsActive:      true,
		AccountType:   models.AccountTypeExternal,
		SignupChannel: provider,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// upsertExternalIdentity is the find-or-create for (provider, external_id).
// The unique index covers ACTIVE rows only (partial on status), so a revoked
// row never blocks the fresh identity a later re-contact creates. Two
// concurrent first-contacts race the index; the loser re-reads the winner
// and cleans up its just-created shadow user when that user is still
// brand-new and referenced by nothing.
func upsertExternalIdentity(
	ctx context.Context,
	provider, externalID string,
	profile bson.M,
	botID string,
) (*models.ExternalIdentity, *models.User, bool, error) {
	collection := db.Database.Collection("external_identities")

	for attempt := 0; attempt < 3; attempt++ {
		identity, err := findExternalIdentity(ctx, provider, externalID)
		switch {
		case err == nil:
			user, err := resolveExternalUser(ctx, identity)
			if err != nil {
				return nil, nil, false, err
			}
			return identity, user, false, nil

		case err != mongo.ErrNoDocuments:
			return nil, nil, false, err
		}

		// Create path: user first, then identity pointing at it.
		user := createShadowExternalUser(provider, externalID, profile)
		if _, err := db.Database.Collection("users").InsertOne(ctx, user); err != nil {
			return nil, nil, false, fmt.Errorf("create shadow user: %w", err)
		}

		now := time.Now()
		newIdentity := models.ExternalIdentity{
			ID:              primitive.NewObjectID(),
			Provider:        provider,
			ExternalID:      externalID,
			UserID:          user.ID,
			ProfileSnapshot: profile,
			Status:          models.ExternalIdentityStatusActive,
			LinkedVia:       models.ExternalIdentityLinkedViaAuto,
			LinkedAt:        now,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if botID != "" {
			newIdentity.BotIDs = []string{botID}
		}
		_, insertErr := collection.InsertOne(ctx, newIdentity)
		if insertErr == nil {
			return &newIdentity, user, true, nil
		}
		if !mongo.IsDuplicateKeyError(insertErr) {
			return nil, nil, false, fmt.Errorf("create identity: %w", insertErr)
		}

		// A concurrent request created the identity first. Re-read it to
		// confirm the settled state, then drop our orphaned shadow user if
		// nothing references it yet.
		if _, findErr := findExternalIdentity(ctx, provider, externalID); findErr != nil {
			return nil, nil, false, findErr
		}
		cleanupOrphanShadowUser(ctx, user.ID)
	}
	return nil, nil, false, errors.New("external identity upsert did not settle")
}

// cleanupOrphanShadowUser deletes a shadow user that lost an identity-creation
// race, but only when it is fresh and has no commerce rows yet — the safe
// precondition set for "nobody has ever seen this account".
func cleanupOrphanShadowUser(ctx context.Context, userID primitive.ObjectID) {
	cutoff := time.Now().Add(-time.Minute)
	count, err := db.Database.Collection("orders").CountDocuments(ctx, bson.M{"user_id": userID})
	if err != nil || count > 0 {
		return
	}
	if count, err = db.Database.Collection("carts").CountDocuments(ctx, bson.M{"user_id": userID}); err != nil || count > 0 {
		return
	}
	if count, err = db.Database.Collection("reviews").CountDocuments(ctx, bson.M{"user_id": userID}); err != nil || count > 0 {
		return
	}
	var doc struct {
		CreatedAt time.Time `bson:"created_at"`
	}
	if err := db.Database.Collection("users").FindOne(
		ctx, bson.M{"_id": userID},
		options.FindOne().SetProjection(bson.M{"created_at": 1}),
	).Decode(&doc); err != nil || doc.CreatedAt.Before(cutoff) {
		return
	}
	if _, err := db.Database.Collection("users").DeleteOne(ctx, bson.M{"_id": userID}); err != nil {
		log.Printf("external identity: could not clean orphan shadow user %s: %v", userID.Hex(), err)
	}
}

// touchExternalIdentity refreshes the profile snapshot and last-seen stamp on
// every service call. Best-effort: failure never blocks the flow.
func touchExternalIdentity(ctx context.Context, identity *models.ExternalIdentity, profile bson.M, botID string) {
	set := bson.M{
		"last_seen_at": time.Now(),
		"updated_at":   time.Now(),
	}
	if len(profile) > 0 {
		set["profile_snapshot"] = profile
	}
	update := bson.M{"$set": set}
	if botID != "" {
		update["$addToSet"] = bson.M{"bot_ids": botID}
	}
	_, _ = db.Database.Collection("external_identities").UpdateOne(
		ctx, bson.M{"_id": identity.ID}, update,
	)
	identity.LastSeenAt = nowPtr(time.Now())
	if len(profile) > 0 {
		identity.ProfileSnapshot = profile
	}
}

func nowPtr(t time.Time) *time.Time { return &t }

// ============================================================================
// POST /api/auth/external/token
// ============================================================================

// ExternalTokenExchange handles POST /api/auth/external/token.
//
// The bot backend (an authenticated external service) presents a verified
// platform identity and receives a normal user token pair for it. The flow:
//
//  1. Resolve (provider, external_id) — find-or-create. A new identity gets a
//     fresh phone-less, password-less shadow user (account_type "external").
//  2. Self-heal: if the identity's user was merged into a registered account,
//     the identity is re-pointed and tokens are issued for the survivor.
//  3. Issue an access/refresh pair via the standard refresh-token service
//     (web policy), carrying the provider as the JWT `channel` claim so the
//     storefront can attribute orders to this sales channel (order.placed_via).
//
// Request:
//
//	{"provider": "telegram", "external_id": "123456789",
//	 "profile": {"username": "...", "first_name": "...", "last_name": "...", "language_code": "fa"},
//	 "bot_id": "bot-username"}
//
// Response 200:
//
//	{"token": "...", "refreshToken": "...", "is_new": false, "has_phone": false,
//	 "user": {"id": "...", "account_type": "external", "has_phone": false, "has_password": false, ...}}
func ExternalTokenExchange(w http.ResponseWriter, r *http.Request) {
	service, err := serviceFromRequest(r)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, ServiceErrCodeUninitialized(err), "Service context unavailable", nil)
		return
	}

	var req struct {
		Provider   string                 `json:"provider"`
		ExternalID string                 `json:"external_id"`
		Profile    map[string]interface{} `json:"profile"`
		BotID      string                 `json:"bot_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		externalServiceError(w, http.StatusBadRequest, "INVALID_FORMAT", "Invalid request payload", nil)
		return
	}

	if req.Provider != service.Provider {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeProviderMismatch,
			"Request provider does not match the authenticated service", nil)
		return
	}
	externalID := strings.TrimSpace(req.ExternalID)
	if externalID == "" || len(externalID) > 128 {
		externalServiceError(w, http.StatusBadRequest, ExternalErrCodeInvalidExternalID,
			"external_id is required (max 128 characters)", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	profile := sanitizeExternalProfile(req.Profile)
	identity, user, isNew, err := upsertExternalIdentity(ctx, req.Provider, externalID, profile, strings.TrimSpace(req.BotID))
	if err != nil {
		log.Printf("external token exchange failed (provider=%s): %v", req.Provider, err)
		externalServiceError(w, http.StatusInternalServerError, "EXCHANGE_FAILED", "Failed to resolve external identity", nil)
		return
	}
	if !user.IsActive {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
		return
	}
	touchExternalIdentity(ctx, identity, profile, strings.TrimSpace(req.BotID))

	// The JWT channel claim records the signup/attribution channel; order
	// placement stamps it into order.placed_via. Backward compatible: every
	// other issuance path leaves the claim empty.
	pair, err := issueTokenPairForUser(ctx, user, externalClientPlatform(), req.Provider)
	if err != nil {
		if err == services.ErrUserInactive {
			externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
			return
		}
		log.Printf("external token exchange: token issue failed: %v", err)
		externalServiceError(w, http.StatusInternalServerError, "TOKEN_ISSUE_FAILED", "Failed to issue tokens", nil)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"token":        pair.AccessToken,
		"refreshToken": pair.RefreshToken,
		"is_new":       isNew,
		"has_phone":    user.HasPhone(),
		"user":         externalUserSummary(user),
	})
}

// sanitizeExternalProfile bounds and cleans the profile blob a service sends:
// string keys, bounded sizes, UTF-8 safe. Unknown keys are kept (the snapshot
// is display-only) but oversized values are dropped.
func sanitizeExternalProfile(profile map[string]interface{}) bson.M {
	if len(profile) == 0 {
		return nil
	}
	cleaned := bson.M{}
	for key, value := range profile {
		key = strings.TrimSpace(key)
		if key == "" || len(key) > 64 {
			continue
		}
		switch v := value.(type) {
		case string:
			v = strings.TrimSpace(v)
			if len(v) <= 256 {
				cleaned[key] = v
			}
		case float64, bool:
			cleaned[key] = v
		}
	}
	if len(cleaned) == 0 {
		return nil
	}
	return cleaned
}

// ServiceErrCodeUninitialized keeps the middleware's error code shared with
// handlers without an import cycle back into middlewares. The cause (usually
// a route registered without ServiceAuthMiddleware) is logged, not swallowed.
func ServiceErrCodeUninitialized(err error) string {
	if err != nil {
		log.Printf("external service context unavailable: %v", err)
	}
	return "SERVICE_UNAVAILABLE"
}

// externalClientPlatform pins external-service token issuance to the web
// policy. Tokens live on the bot SERVER, never on a mobile device, so a bot
// must not be able to mint the Android 100-year non-rotating session by
// echoing X-Client-Platform: android — a leaked key would then be a
// permanent session. Revisit only as a deliberate plan §9.2 decision.
func externalClientPlatform() string {
	return authjwt.ClientWeb
}

// ensureExternalIdentity resolves (or, failing that, creates) the identity for
// a (provider, external_id) pair, returning identity + its user. Used by the
// phone-bind and link routes so a bot never needs to call /token first.
func ensureExternalIdentity(ctx context.Context, provider, externalID string, profile bson.M, botID string) (*models.ExternalIdentity, *models.User, error) {
	identity, user, _, err := upsertExternalIdentity(ctx, provider, externalID, profile, botID)
	return identity, user, err
}

// requireServiceScope re-checks scope on routes whose middleware was already
// registered with the right scope — cheap defense against registration drift.
func requireServiceScope(r *http.Request, scope string) (*models.ExternalService, error) {
	service, err := serviceFromRequest(r)
	if err != nil {
		return nil, err
	}
	if !service.GrantsScope(scope) {
		return nil, fmt.Errorf("service %s lacks scope %s", service.ID.Hex(), scope)
	}
	return service, nil
}
