package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
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

// ============================================================================
// Service endpoint: POST /api/auth/external/link
// ============================================================================

// ExternalLinkAccount handles POST /api/auth/external/link.
//
// Attaches the caller's channel identity to an EXISTING registered account via
// a single-use link code the shopper generated on the site profile
// (POST /api/users/link-code) and handed to the bot (typed, or deep link
// https://t.me/<bot>?start=link_<code>).
//
// The shadow's accumulated data merges into the target exactly like a phone
// bind would; the response re-issues tokens for the survivor.
//
// The code is NOT burned until every validation (including the merge-consent
// flag) has passed: a 409 MERGE_REQUIRED leaves the code valid, so the
// documented consent retry (same code, "merge": true) succeeds. The burn is
// a single atomic FindOneAndUpdate that re-checks consumed_at/expiry, so two
// racing calls can never both consume it.
//
// Request:
//
//	{"provider": "telegram", "external_id": "123456789", "code": "AB12CD34", "merge": true}
//
// Responses:
//
//	200         linked (or idempotent re-link)
//	400 LINK_CODE_INVALID   unknown/expired/already-used code
//	409 MERGE_REQUIRED + can_merge   code valid, caller did not confirm merge
//	409 IDENTITY_LINKED_ELSEWHERE    identity belongs to a different account
//	409 ACCOUNT_UNAVAILABLE          target banned or merged away
//	503 MERGE_INCOMPLETE      moves failed, tombstone not committed; retry
func ExternalLinkAccount(w http.ResponseWriter, r *http.Request) {
	service, err := requireServiceScope(r, models.ExternalServiceScopeIdentityExchange)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, ServiceErrCodeUninitialized(err), "Service context unavailable", nil)
		return
	}

	var req struct {
		Provider   string `json:"provider"`
		ExternalID string `json:"external_id"`
		Code       string `json:"code"`
		Merge      bool   `json:"merge"`
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
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		externalServiceError(w, http.StatusBadRequest, ExternalErrCodeLinkCodeInvalid, "Link code is required", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	_, shadow, err := ensureExternalIdentity(ctx, req.Provider, externalID, nil, "")
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "IDENTITY_RESOLUTION_FAILED", "Failed to resolve external identity", nil)
		return
	}
	if !shadow.IsActive {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
		return
	}

	// 1. Read the code WITHOUT burning it; every check below must pass
	// before the atomic burn, so a MERGE_REQUIRED retry with the same code
	// still finds it unconsumed.
	now := time.Now()
	codes := db.Database.Collection("link_codes")
	var linkCode models.LinkCode
	if err := codes.FindOne(ctx,
		bson.M{"code": code, "consumed_at": nil, "expires_at": bson.M{"$gt": now}},
	).Decode(&linkCode); err != nil {
		if err == mongo.ErrNoDocuments {
			externalServiceError(w, http.StatusBadRequest, ExternalErrCodeLinkCodeInvalid,
				"کد اتصال نامعتبر یا منقضی شده است", nil)
			return
		}
		externalServiceError(w, http.StatusInternalServerError, "LINK_CODE_LOOKUP_FAILED", "Failed to check link code", nil)
		return
	}

	// 2. The target must be a live registered account.
	var target models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": linkCode.UserID}).Decode(&target); err != nil {
		if err == mongo.ErrNoDocuments {
			externalServiceError(w, http.StatusConflict, ExternalErrCodeAccountUnavailable, "حساب مقصد یافت نشد", nil)
			return
		}
		externalServiceError(w, http.StatusInternalServerError, "LINK_TARGET_LOOKUP_FAILED", "Failed to load target account", nil)
		return
	}
	if target.IsMerged() || !target.IsActive || target.EffectiveAccountType() != models.AccountTypeRegistered {
		externalServiceError(w, http.StatusConflict, ExternalErrCodeAccountUnavailable,
			"حساب مقصد برای اتصال در دسترس نیست", nil)
		return
	}

	// 3. Identity-side checks (skipped on the idempotent re-link path).
	idempotent := shadow.ID == target.ID
	if !idempotent {
		// The identity must not belong to someone else.
		if shadow.EffectiveAccountType() != models.AccountTypeExternal {
			externalServiceError(w, http.StatusConflict, ExternalErrCodeIdentityLinked,
				"این حساب تلگرامی از قبل به حساب دیگری متصل است", nil)
			return
		}
		// A merge is a data-moving operation; require the explicit flag.
		if !req.Merge {
			externalServiceError(w, http.StatusConflict, ExternalErrCodeMergeRequired,
				"این حساب تلگرامی سفارش یا سبد خرید دارد. ادغام با حساب سایت نیازمند تأیید است",
				map[string]interface{}{"can_merge": true})
			return
		}
	}

	// 4. Burn the code atomically — consumed_at must still be nil and the
	// code unexpired at the moment of the swap. Racing callers of the same
	// code: exactly one wins, the loser reports the code as invalid. If the
	// merge below fails, the burn is REFUNDED so the documented retry (same
	// code) works.
	if err := codes.FindOneAndUpdate(ctx,
		bson.M{"code": code, "consumed_at": nil, "expires_at": bson.M{"$gt": now}},
		bson.M{"$set": bson.M{"consumed_at": now}},
	).Err(); err != nil {
		if err == mongo.ErrNoDocuments {
			externalServiceError(w, http.StatusBadRequest, ExternalErrCodeLinkCodeInvalid,
				"کد اتصال نامعتبر یا منقضی شده است", nil)
			return
		}
		externalServiceError(w, http.StatusInternalServerError, "LINK_CODE_LOOKUP_FAILED", "Failed to check link code", nil)
		return
	}

	// 5. Idempotent re-link: the identity already belongs to exactly this
	// account.
	if idempotent {
		issueLinkedResponse(w, r, ctx, &target, false, true)
		return
	}

	// 6. Merge the shadow into the target. Only a phone-less shadow's DATA
	// moves; a shadow with its own phone keeps it (identity, not phone, is
	// what the link code moves).
	if _, err := services.MergeExternalUserIntoRegistered(ctx, db.Database, shadow.ID, target.ID); err != nil {
		refundLinkCode(ctx, codes, code)
		switch {
		case errors.Is(err, services.ErrMergeSameAccount), errors.Is(err, services.ErrMergeTargetInvalid):
			externalServiceError(w, http.StatusConflict, ExternalErrCodeAccountUnavailable, "اتصال ممکن نیست", nil)
		case errors.Is(err, services.ErrMergeIncomplete):
			log.Printf("external link merge incomplete: %v", err)
			externalServiceError(w, http.StatusServiceUnavailable, "MERGE_INCOMPLETE",
				"ادغام حساب‌ها ناقص ماند. لطفاً کمی بعد دوباره تلاش کنید", nil)
		default:
			log.Printf("external link merge failed: %v", err)
			externalServiceError(w, http.StatusInternalServerError, "LINK_MERGE_FAILED", "Failed to merge accounts", nil)
		}
		return
	}

	// Stamp how the identity got onto the target.
	_, _ = db.Database.Collection("external_identities").UpdateOne(ctx,
		bson.M{"provider": req.Provider, "external_id": externalID, "status": models.ExternalIdentityStatusActive},
		bson.M{"$set": bson.M{"linked_via": models.ExternalIdentityLinkedViaCodeLink, "updated_at": time.Now()}},
	)

	var finalUser models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": target.ID}).Decode(&finalUser); err != nil {
		externalServiceError(w, http.StatusInternalServerError, "LINK_REFRESH_FAILED", "Failed to load merged account", nil)
		return
	}
	issueLinkedResponse(w, r, ctx, &finalUser, true, false)
}

// refundLinkCode un-consumes a link code after a failed merge so the
// documented retry (same code) works — MERGE_INCOMPLETE's "safe to retry"
// contract. Safe against races: while the code is consumed no other request
// can burn it, so the refund can never clobber a re-burn.
func refundLinkCode(ctx context.Context, codes *mongo.Collection, code string) {
	if _, err := codes.UpdateOne(ctx,
		bson.M{"code": code, "consumed_at": bson.M{"$ne": nil}},
		bson.M{"$unset": bson.M{"consumed_at": ""}},
	); err != nil {
		log.Printf("external link: code refund failed for %s: %v", code, err)
	}
}

// issueLinkedResponse emits the 200 body for a successful link: tokens for the
// surviving account plus its safe summary.
func issueLinkedResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, user *models.User, merged, already bool) {
	pair, err := issueTokenPairForUser(ctx, user, externalClientPlatform())
	if err != nil {
		log.Printf("external link: token issue failed: %v", err)
		externalServiceError(w, http.StatusInternalServerError, "TOKEN_ISSUE_FAILED", "Account linked but token issue failed", nil)
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":       "حساب تلگرامی با موفقیت به حساب شما متصل شد",
		"merged":        merged,
		"already_bound": already,
		"user":          externalUserSummary(user),
		"token":         pair.AccessToken,
		"refreshToken":  pair.RefreshToken,
	})
}

// ============================================================================
// POST /api/users/link-code (authenticated user)
// ============================================================================

// linkCodeAlphabet excludes visually ambiguous characters (0/O, 1/I).
const linkCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

// CreateUserLinkCode handles POST /api/users/link-code.
//
// Mints a short-lived single-use code the shopper hands to a bot (typed, or
// via the deep link) to attach their channel identity to this account.
// Telegram deep links are included when TELEGRAM_BOT_USERNAME is configured.
func CreateUserLinkCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	code, err := generateLinkCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد اتصال")
		return
	}

	now := time.Now()
	linkCode := models.LinkCode{
		ID:        primitive.NewObjectID(),
		Code:      code,
		UserID:    userID,
		ExpiresAt: now.Add(models.LinkCodeTTL),
		CreatedAt: now,
	}
	if _, err := db.Database.Collection("link_codes").InsertOne(ctx, linkCode); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد اتصال")
		return
	}

	response := map[string]interface{}{
		"code":       code,
		"expires_in": int(models.LinkCodeTTL.Seconds()),
	}
	if botUsername := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME")); botUsername != "" {
		response["links"] = map[string]string{
			"telegram": fmt.Sprintf("https://t.me/%s?start=link_%s", botUsername, code),
		}
	}
	utils.JSONResponse(w, http.StatusCreated, response)
}

// generateLinkCode builds an 8-character code from the safe alphabet.
func generateLinkCode() (string, error) {
	code := make([]byte, 8)
	max := big.NewInt(int64(len(linkCodeAlphabet)))
	for i := range code {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		code[i] = linkCodeAlphabet[n.Int64()]
	}
	return string(code), nil
}

// ============================================================================
// GET/DELETE /api/users/linked-accounts (authenticated user)
// ============================================================================

// ListLinkedAccounts handles GET /api/users/linked-accounts.
//
// Returns the channel identities attached to the caller's account (both
// active and recently revoked, newest first).
func ListLinkedAccounts(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	cursor, err := db.Database.Collection("external_identities").Find(ctx,
		bson.M{"user_id": userID},
		options.Find().SetSort(bson.D{{Key: "linked_at", Value: -1}}).SetLimit(100),
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت حساب‌های متصل")
		return
	}
	var identities []models.ExternalIdentity
	if err := cursor.All(ctx, &identities); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت حساب‌های متصل")
		return
	}

	items := make([]map[string]interface{}, 0, len(identities))
	for i := range identities {
		items = append(items, linkedAccountView(&identities[i]))
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"identities": items})
}

// linkedAccountView projects an identity for the shopper's profile: provider,
// platform handle and timestamps — never raw platform IDs of other people or
// internal flags.
func linkedAccountView(identity *models.ExternalIdentity) map[string]interface{} {
	username := ""
	firstName := ""
	lastName := ""
	if identity.ProfileSnapshot != nil {
		username, _ = identity.ProfileSnapshot["username"].(string)
		firstName, _ = identity.ProfileSnapshot["first_name"].(string)
		lastName, _ = identity.ProfileSnapshot["last_name"].(string)
	}
	view := map[string]interface{}{
		"id":         identity.ID.Hex(),
		"provider":   identity.Provider,
		"status":     identity.Status,
		"linked_via": identity.LinkedVia,
		"linked_at":  identity.LinkedAt,
	}
	if username != "" {
		view["username"] = username
	}
	if firstName != "" || lastName != "" {
		view["display_name"] = strings.TrimSpace(firstName + " " + lastName)
	}
	if identity.LastSeenAt != nil {
		view["last_seen_at"] = *identity.LastSeenAt
	}
	return view
}

// UnlinkExternalIdentity handles DELETE /api/users/linked-accounts/{id}.
//
// Revokes one channel identity. A shopper can always unlink when they still
// have an independent way in (a bound phone or a set password); a pure
// external account has no other login path, so the attempt is refused.
func UnlinkExternalIdentity(w http.ResponseWriter, r *http.Request) {
	userID, ok := authUserID(r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	identityID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "شناسه حساب متصل نامعتبر است")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var user models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}
	if user.IsExternal() {
		externalServiceError(w, http.StatusConflict, ExternalErrCodeSoleLoginMethod,
			"تنها راه ورود شما همین حساب متصل است؛ ابتدا شماره تلفن را تأیید کنید", nil)
		return
	}

	now := time.Now()
	result, err := db.Database.Collection("external_identities").UpdateOne(ctx,
		bson.M{"_id": identityID, "user_id": userID, "status": models.ExternalIdentityStatusActive},
		bson.M{"$set": bson.M{
			"status":      models.ExternalIdentityStatusRevoked,
			"unlinked_at": now,
			"updated_at":  now,
		}},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در قطع اتصال حساب")
		return
	}
	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "حساب متصل یافت نشد")
		return
	}

	utils.LogAction("EXTERNAL_IDENTITY_UNLINKED", userID.Hex()+" "+identityID.Hex())
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "اتصال حساب با موفقیت حذف شد"})
}
