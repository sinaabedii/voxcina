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
	"backEnd/utils"
)

// ============================================================================
// Shared phone-binding engine
// ============================================================================

// Sentinel outcomes of bindPhoneToUser. They map to stable HTTP codes the
// external service can branch on.
var (
	// errPhoneAlreadySet — the account already has a DIFFERENT identity phone.
	// The phone is write-once: nothing verifies, sends, or merges past this.
	errPhoneAlreadySet = errors.New("identity phone already bound")
	// errPhoneTaken — the requested phone belongs to another registered
	// account and the caller did not confirm merge.
	errPhoneTaken = errors.New("phone owned by another account")
	// errPhoneOwnerConflict — the phone's owner exists but cannot be a merge
	// target (banned / merged-away / same account anomaly).
	errPhoneOwnerConflict = errors.New("phone owner is not a valid merge target")
)

// bindPhoneToUser implements the single write path into users.phone.
//
// The identity phone is WRITE-ONCE: it can only be written while the field is
// empty, and only through this function. Behavior:
//
//   - account already holds the same phone → idempotent no-op;
//   - account holds a different phone → errPhoneAlreadySet (no SMS, no
//     verification, no merge — ever);
//   - phone owned by another user:
//     owner banned/merged → errPhoneOwnerConflict;
//     !allowMerge        → errPhoneTaken;
//     allowMerge         → merge engine folds the shadow into that account.
//     allowMerge is true ONLY on the SMS-OTP path (backend-sent code proves
//     control of the number) with the caller's explicit merge flag — the
//     contact path hard-codes false, so a leaked service key can never turn
//     a self-attested contact into an account takeover.
//   - otherwise → claim-in-place: guarded update sets phone + verification
//     provenance and promotes account_type to "registered".
//
// method is models.PhoneVerifiedMethod*; serviceID stamps
// phone_verified_by_service for the audit trail.
func bindPhoneToUser(
	ctx context.Context,
	user *models.User,
	phone string,
	method string,
	serviceID primitive.ObjectID,
	allowMerge bool,
) (*models.User, bool, error) {
	// 1. Write-once guard.
	if user.HasPhone() {
		if user.Phone == phone {
			return user, false, nil // idempotent
		}
		return nil, false, errPhoneAlreadySet
	}

	// 2. Who owns this phone already?
	var owner models.User
	err := db.Database.Collection("users").FindOne(ctx, bson.M{"phone": phone}).Decode(&owner)
	switch {
	case err == nil:
		// Phone already claimed.
		if owner.ID == user.ID {
			// Race that the read-outdated snapshot missed; treat as idempotent.
			return &owner, false, nil
		}
		if owner.IsMerged() || !owner.IsActive {
			return nil, false, errPhoneOwnerConflict
		}
		if !allowMerge {
			return nil, false, errPhoneTaken
		}
		if _, err := services.MergeExternalUserIntoRegistered(ctx, db.Database, user.ID, owner.ID); err != nil {
			return nil, false, fmt.Errorf("merge on phone bind: %w", err)
		}
		var target models.User
		if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": owner.ID}).Decode(&target); err != nil {
			return nil, false, err
		}
		return &target, true, nil

	case err != mongo.ErrNoDocuments:
		return nil, false, err
	}

	// 3. Claim-in-place. Every guard lives in the filter so a concurrent
	// phone write cannot be overwritten (write-once is enforced by Mongo, not
	// by trust in the earlier read): the phone must be absent/empty and the
	// account must not be merged.
	now := time.Now()
	result, err := db.Database.Collection("users").UpdateOne(ctx, bson.M{
		"_id": user.ID,
		"$or": []bson.M{
			{"phone": bson.M{"$exists": false}},
			{"phone": ""},
		},
		"account_type": bson.M{"$ne": models.AccountTypeMerged},
	}, bson.M{"$set": bson.M{
		"phone":                     phone,
		"phone_verified_method":     method,
		"phone_verified_at":         now,
		"phone_verified_by_service": serviceID,
		"account_type":              models.AccountTypeRegistered,
		"updated_at":                now,
	}})
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			// The phone was claimed between the check and the write.
			return nil, false, errPhoneTaken
		}
		return nil, false, err
	}
	if result.MatchedCount == 0 {
		// The account changed underneath us (merged concurrently).
		return nil, false, errPhoneOwnerConflict
	}

	var updated models.User
	if err := db.Database.Collection("users").FindOne(ctx, bson.M{"_id": user.ID}).Decode(&updated); err != nil {
		return nil, false, err
	}
	return &updated, false, nil
}

// bindOutcomeResponse is the shared 200 body for successful binds: tokens for
// the surviving account (the caller's old pair dies with the shadow on merge).
func bindOutcomeResponse(w http.ResponseWriter, r *http.Request, ctx context.Context, user *models.User, phone, method string, merged, idempotent bool) {
	pair, err := issueTokenPairForUser(ctx, user, externalClientPlatform())
	if err != nil {
		log.Printf("phone bind: token issue failed: %v", err)
		externalServiceError(w, http.StatusInternalServerError, "TOKEN_ISSUE_FAILED", "Phone verified but token issue failed", nil)
		return
	}
	message := "شماره تلفن با موفقیت به حساب شما متصل شد"
	if merged {
		message = "شماره تلفن تأیید و حساب‌ها ادغام شدند"
	}
	if idempotent {
		message = "این شماره قبلاً به حساب شما متصل شده است"
	}
	body := map[string]interface{}{
		"message":         message,
		"phone":           phone,
		"verified_method": method,
		"merged":          merged,
		"already_bound":   idempotent,
		"user":            externalUserSummary(user),
		"token":           pair.AccessToken,
		"refreshToken":    pair.RefreshToken,
	}
	utils.JSONResponse(w, http.StatusOK, body)
}

// respondBindError maps the sentinel errors to their stable HTTP shapes.
// mergeable tells the bot whether retrying with "merge": true is meaningful:
// true ONLY on the SMS-OTP path, where ownership of the number has been
// proven to the backend. The contact path reports can_merge:false with a
// merge_via hint — a self-attested contact blob must never be able to claim
// an account that already exists.
func respondBindError(w http.ResponseWriter, err error, mergeable bool) {
	switch {
	case errors.Is(err, errPhoneAlreadySet):
		externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneAlreadySet,
			"این حساب قبلاً شماره تلفن داشته است و تغییر آن امکان‌پذیر نیست", nil)
	case errors.Is(err, errPhoneTaken):
		if mergeable {
			externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneTaken,
				"این شماره قبلاً ثبت شده است", map[string]interface{}{"can_merge": true})
		} else {
			externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneTaken,
				"این شماره قبلاً ثبت شده است", map[string]interface{}{
					"can_merge": false, "merge_via": models.PhoneVerifiedMethodSMSOTP,
				})
		}
	case errors.Is(err, errPhoneOwnerConflict):
		externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneOwnerConflict,
			"این شماره قابل اتصال نیست", nil)
	case errors.Is(err, services.ErrMergeIncomplete):
		// Moves failed, tombstone NOT committed; the shadow is untouched.
		log.Printf("phone bind merge incomplete: %v", err)
		externalServiceError(w, http.StatusServiceUnavailable, "MERGE_INCOMPLETE",
			"ادغام حساب‌ها ناقص ماند. لطفاً کمی بعد دوباره تلاش کنید", nil)
	default:
		log.Printf("phone bind failed: %v", err)
		externalServiceError(w, http.StatusInternalServerError, "BIND_FAILED", "Failed to bind phone number", nil)
	}
}

// ============================================================================
// POST /api/auth/external/phone/contact
// ============================================================================

// ExternalPhoneContact handles POST /api/auth/external/phone/contact.
//
// Telegram-style contact-share binding. The backend re-verifies what the bot
// must already have checked: contact_user_id MUST equal external_id — a
// contact record about somebody else (or a typed number with no user_id,
// which the bot must route to the OTP path instead) is refused.
//
// SECURITY: the contact path can only CLAIM A FREE PHONE. It can never take
// over an existing account. Both external_id and contact_user_id arrive in
// the same request body, so their equality proves nothing the backend can
// verify — the actual proof of phone ownership is what the bot attests, and
// a leaked/compromised service key must not be able to convert that
// self-attestation into someone else's session. Merging into an existing
// account therefore requires the SMS-OTP path (backend-sent code) with
// "merge": true; this endpoint hard-codes allowMerge=false.
//
// Request:
//
//	{"provider": "telegram", "external_id": "123456789",
//	 "phone": "+989123456789", "contact_user_id": "123456789"}
//
// Responses:
//
//	200          bound (or idempotent re-bind of the same number)
//	403 CONTACT_MISMATCH      contact does not belong to the sender
//	400 INVALID_PHONE         normalization left a non-09xxxxxxxxx value
//	409 phone_already_set     account has a different identity phone
//	409 phone_taken + can_merge:false   phone owned by a registered account;
//	          switch the user to the SMS-OTP flow to bind or merge
//	409 phone_owner_conflict  owner banned/merged — never merge into it
func ExternalPhoneContact(w http.ResponseWriter, r *http.Request) {
	service, err := requireServiceScope(r, models.ExternalServiceScopeIdentityBindPhone)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, ServiceErrCodeUninitialized(err), "Service context unavailable", nil)
		return
	}

	var req struct {
		Provider      string `json:"provider"`
		ExternalID    string `json:"external_id"`
		Phone         string `json:"phone"`
		ContactUserID string `json:"contact_user_id"`
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
	if strings.TrimSpace(req.ContactUserID) != externalID {
		// The platform contact must belong to the message sender. A forwarded
		// or hand-typed contact is NOT proof of phone ownership.
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeContactMismatch,
			"contact_user_id must equal external_id; only a contact the sender shared about themselves is accepted", nil)
		return
	}
	if !service.AllowsPhoneMethod(models.ExternalServicePhoneMethodContact) {
		externalServiceError(w, http.StatusForbidden, "PHONE_METHOD_NOT_ALLOWED",
			"This service is not configured for contact-share phone binding", nil)
		return
	}

	phone := utils.NormalizeIRPhone(req.Phone)
	if !irPhoneRegex.MatchString(phone) {
		externalServiceError(w, http.StatusBadRequest, ExternalErrCodeInvalidPhone,
			"شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	identity, user, err := ensureExternalIdentity(ctx, req.Provider, externalID, nil, "")
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "IDENTITY_RESOLUTION_FAILED", "Failed to resolve external identity", nil)
		return
	}
	if !user.IsActive {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
		return
	}

	idempotent := wasAlreadyBound(user, phone)
	finalUser, merged, err := bindPhoneToUser(ctx, user, phone, models.PhoneVerifiedMethodContact, service.ID, false)
	if err != nil {
		respondBindError(w, err, false)
		return
	}
	// Stamp how the identity ended up on a registered account (claim path;
	// the merge path stamps inside the merge engine).
	if !merged && !idempotent {
		_, _ = db.Database.Collection("external_identities").UpdateOne(ctx,
			bson.M{"_id": identity.ID},
			bson.M{"$set": bson.M{"linked_via": models.ExternalIdentityLinkedViaContact, "updated_at": time.Now()}},
		)
	}
	bindOutcomeResponse(w, r, ctx, finalUser, phone, models.PhoneVerifiedMethodContact, merged, idempotent)
}

// wasAlreadyBound reports whether the pre-bind snapshot already had exactly
// this phone (idempotent no-op detection for the response flag).
func wasAlreadyBound(before *models.User, phone string) bool {
	return before.HasPhone() && before.Phone == phone
}

// ============================================================================
// POST /api/auth/external/phone/send-otp
// ============================================================================

// ExternalPhoneSendOTP handles POST /api/auth/external/phone/send-otp.
//
// Requests an SMS verification code for binding a phone to an external
// identity. The response is deliberately generic about the phone's ownership:
// whether the number is free or already registered is revealed only after the
// code proves control of it (verify-otp with the merge flag).
//
// An account that already has a DIFFERENT phone is refused up front
// (phone_already_set) and no SMS is sent; the same phone returns an idempotent
// already_bound without an SMS either.
func ExternalPhoneSendOTP(w http.ResponseWriter, r *http.Request) {
	service, err := requireServiceScope(r, models.ExternalServiceScopeIdentityBindPhone)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, ServiceErrCodeUninitialized(err), "Service context unavailable", nil)
		return
	}

	var req struct {
		Provider   string `json:"provider"`
		ExternalID string `json:"external_id"`
		Phone      string `json:"phone"`
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

	phone := utils.NormalizeIRPhone(req.Phone)
	if !irPhoneRegex.MatchString(phone) {
		externalServiceError(w, http.StatusBadRequest, ExternalErrCodeInvalidPhone,
			"شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	_, user, err := ensureExternalIdentity(ctx, req.Provider, externalID, nil, "")
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "IDENTITY_RESOLUTION_FAILED", "Failed to resolve external identity", nil)
		return
	}
	if !user.IsActive {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
		return
	}

	// Write-once guard BEFORE any SMS spend.
	if user.HasPhone() {
		if user.Phone == phone {
			utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
				"already_bound": true,
				"message":       "این شماره قبلاً به حساب شما متصل شده است",
			})
			return
		}
		externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneAlreadySet,
			"این حساب قبلاً شماره تلفن داشته است و تغییر آن امکان‌پذیر نیست", nil)
		return
	}

	otpCollection := db.Database.Collection("otps")

	// Resend window: per (phone, USER) — symmetric with the verify-otp
	// lookup, so two channel identities binding the same number neither get
	// a spurious 429 from each other nor invalidate each other's codes.
	// On top of that, a small per-phone cap on concurrent live codes keeps
	// the SMS-bomb guard (a flood of fabricated identities cannot send
	// unlimited SMS to one number).
	liveCodes, err := listLiveBindOTPs(ctx, otpCollection, phone)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "OTP_LOOKUP_FAILED", "خطا در بررسی کد تأیید", nil)
		return
	}
	var own *models.OTP
	others := 0
	for i := range liveCodes {
		if liveCodes[i].UserID == user.ID {
			own = &liveCodes[i]
		} else {
			others++
		}
	}
	if own != nil {
		timeSinceCreated := time.Since(own.CreatedAt)
		if timeSinceCreated < 2*time.Minute {
			remaining := int((2*time.Minute - timeSinceCreated).Seconds())
			externalServiceError(w, http.StatusTooManyRequests, "OTP_RATE_LIMITED",
				fmt.Sprintf("لطفاً %d ثانیه صبر کنید و سپس دوباره تلاش کنید", remaining), nil)
			return
		}
		// Own past-window row: replace it (this user's code alone is spent).
		_, _ = otpCollection.DeleteOne(ctx, bson.M{"_id": own.ID})
	} else if others >= maxConcurrentBindOTPs {
		externalServiceError(w, http.StatusTooManyRequests, "OTP_RATE_LIMITED",
			"درخواست‌های زیادی برای این شماره ثبت شده است. لطفاً بعداً تلاش کنید", nil)
		return
	}

	code, err := generateOTPCode()
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "OTP_GENERATION_FAILED", "خطا در تولید کد تأیید", nil)
		return
	}

	otp := models.OTP{
		ID:        primitive.NewObjectID(),
		Phone:     phone,
		Code:      code,
		FirstName: externalFirstName(user),
		Purpose:   models.OTPPurposeBindPhone,
		UserID:    user.ID,
		Verified:  false,
		Attempts:  0,
		ExpiresAt: time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
		CreatedAt: time.Now(),
	}
	if _, err := otpCollection.InsertOne(ctx, otp); err != nil {
		externalServiceError(w, http.StatusInternalServerError, "OTP_STORE_FAILED", "خطا در ذخیره کد تأیید", nil)
		return
	}

	smsService := services.NewSMSService()
	if err := smsService.SendOTP(phone, code, otp.FirstName); err != nil {
		log.Printf("external bind OTP SMS failed: %v", err)
		_, _ = otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		externalServiceError(w, http.StatusInternalServerError, "SMS_SEND_FAILED", "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید", nil)
		return
	}

	// Generic success: no claim about whether the phone is free or owned.
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":   "کد تأیید به شماره تلفن شما ارسال شد",
		"expiresIn": models.OTPExpirationMinutes * 60,
	})
}

// maxConcurrentBindOTPs caps how many identities may hold a live (unverified,
// unexpired) bind OTP for the same phone at once. It keeps the SMS-bomb guard
// that the per-phone resend window used to provide while letting the two
// identities of one human bind the same number without tripping each other.
const maxConcurrentBindOTPs = 2

// listLiveBindOTPs returns every unverified, unexpired bind_phone OTP for a
// phone, oldest first.
func listLiveBindOTPs(ctx context.Context, collection *mongo.Collection, phone string) ([]models.OTP, error) {
	cursor, err := collection.Find(ctx, bson.M{
		"phone":      phone,
		"purpose":    models.OTPPurposeBindPhone,
		"verified":   false,
		"expires_at": bson.M{"$gt": time.Now()},
	}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var rows []models.OTP
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

// externalFirstName extracts a display first name for SMS templates.
func externalFirstName(u *models.User) string {
	if strings.TrimSpace(u.FirstName) != "" {
		return strings.TrimSpace(u.FirstName)
	}
	fields := strings.Fields(strings.TrimSpace(u.Name))
	if len(fields) > 0 {
		return fields[0]
	}
	return "کاربر گرامی"
}

// ============================================================================
// POST /api/auth/external/phone/verify-otp
// ============================================================================

// ExternalPhoneVerifyOTP handles POST /api/auth/external/phone/verify-otp.
//
// Consumes a bind_phone OTP and finishes the binding. After a correct code:
//
//   - phone free            → claim-in-place on the identity's own user;
//   - phone == same account → idempotent;
//   - phone owned elsewhere → 409 phone_taken + can_merge unless the request
//     carried "merge": true, in which case the merge engine folds the
//     shadow's carts/orders/... into the verified account and tokens are
//     re-issued for the survivor.
//
// The code is NOT burned until the bind actually lands: a 409
// phone_taken/can_merge response leaves the code valid, so the documented
// consent retry (same code, "merge": true) succeeds without a second SMS. A
// replayed code after a successful bind can only reach the idempotent path.
//
// An account that already has a DIFFERENT phone is refused up front, before
// the code is consumed — changing an identity phone is not possible.
func ExternalPhoneVerifyOTP(w http.ResponseWriter, r *http.Request) {
	service, err := requireServiceScope(r, models.ExternalServiceScopeIdentityBindPhone)
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, ServiceErrCodeUninitialized(err), "Service context unavailable", nil)
		return
	}

	var req struct {
		Provider   string `json:"provider"`
		ExternalID string `json:"external_id"`
		Phone      string `json:"phone"`
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

	phone := utils.NormalizeIRPhone(req.Phone)
	if !irPhoneRegex.MatchString(phone) {
		externalServiceError(w, http.StatusBadRequest, ExternalErrCodeInvalidPhone,
			"شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)", nil)
		return
	}
	code := convertPersianToEnglishDigits(strings.TrimSpace(req.Code))
	if code == "" {
		externalServiceError(w, http.StatusBadRequest, "INVALID_CODE", "کد تأیید الزامی است", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	_, user, err := ensureExternalIdentity(ctx, req.Provider, externalID, nil, "")
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "IDENTITY_RESOLUTION_FAILED", "Failed to resolve external identity", nil)
		return
	}
	if !user.IsActive {
		externalServiceError(w, http.StatusForbidden, ExternalErrCodeUserInactive, "User account is deactivated", nil)
		return
	}

	// Write-once guard BEFORE burning the code.
	if user.HasPhone() {
		if user.Phone == phone {
			// Idempotent re-verify: refresh tokens, report bound.
			pair, pairErr := issueTokenPairForUser(ctx, user, externalClientPlatform())
			if pairErr != nil {
				externalServiceError(w, http.StatusInternalServerError, "TOKEN_ISSUE_FAILED", "Failed to issue tokens", nil)
				return
			}
			utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
				"message":         "این شماره قبلاً به حساب شما متصل شده است",
				"phone":           phone,
				"verified_method": user.PhoneVerifiedMethod,
				"merged":          false,
				"already_bound":   true,
				"user":            externalUserSummary(user),
				"token":           pair.AccessToken,
				"refreshToken":    pair.RefreshToken,
			})
			return
		}
		externalServiceError(w, http.StatusConflict, ExternalErrCodePhoneAlreadySet,
			"این حساب قبلاً شماره تلفن داشته است و تغییر آن امکان‌پذیر نیست", nil)
		return
	}

	otpCollection := db.Database.Collection("otps")

	// The OTP is pinned to the user it was requested for: a verified code can
	// only promote THAT identity, not whichever shadow queries the record
	// first (models.OTP.UserID).
	var otp models.OTP
	findOpts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err = otpCollection.FindOne(ctx, bson.M{
		"phone":    phone,
		"purpose":  models.OTPPurposeBindPhone,
		"verified": false,
		"user_id":  user.ID,
	}, findOpts).Decode(&otp)
	if err == mongo.ErrNoDocuments {
		externalServiceError(w, http.StatusBadRequest, "OTP_NOT_FOUND", "کد تأیید یافت نشد. لطفاً دوباره درخواست کد کنید", nil)
		return
	}
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "OTP_LOOKUP_FAILED", "خطا در بررسی کد تأیید", nil)
		return
	}

	if time.Now().After(otp.ExpiresAt) {
		_, _ = otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		externalServiceError(w, http.StatusBadRequest, "OTP_EXPIRED", "کد تأیید منقضی شده است. لطفاً دوباره درخواست کد کنید", nil)
		return
	}
	if otp.Attempts >= models.MaxOTPAttempts {
		_, _ = otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		externalServiceError(w, http.StatusTooManyRequests, "OTP_ATTEMPTS_EXHAUSTED",
			"تعداد تلاش‌های مجاز به پایان رسید. لطفاً دوباره درخواست کد کنید", nil)
		return
	}

	_, _ = otpCollection.UpdateOne(ctx, bson.M{"_id": otp.ID}, bson.M{"$inc": bson.M{"attempts": 1}})
	if otp.Code != code {
		remaining := models.MaxOTPAttempts - otp.Attempts - 1
		externalServiceError(w, http.StatusBadRequest, "OTP_MISMATCH",
			fmt.Sprintf("کد تأیید نادرست است. %d تلاش باقی مانده", remaining), nil)
		return
	}

	// NO burn here: the code must survive a 409 phone_taken so the consent
	// retry (same code, "merge": true) works without a second SMS. The burn
	// happens only after the bind has landed.

	// The verified number is proven; run the single write path. allowMerge is
	// whatever the caller confirmed — the bind engine handles both worlds.
	finalUser, merged, err := bindPhoneToUser(ctx, user, phone, models.PhoneVerifiedMethodSMSOTP, service.ID, req.Merge)
	if err != nil {
		respondBindError(w, err, true)
		return
	}

	// The bind landed; burn the code now. Burning after the bind is safe: a
	// replayed code can only reach the idempotent path, and a failed cleanup
	// merely leaves a spent row for the TTL/next-verify to consume.
	if _, err := otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID}); err != nil {
		log.Printf("external bind OTP cleanup failed (id=%s): %v", otp.ID.Hex(), err)
	}
	// Stamp how the identity ended up on a registered account (claim path;
	// the merge path stamps inside the merge engine).
	if !merged {
		_, _ = db.Database.Collection("external_identities").UpdateOne(ctx,
			bson.M{"provider": req.Provider, "external_id": externalID, "status": models.ExternalIdentityStatusActive},
			bson.M{"$set": bson.M{"linked_via": models.ExternalIdentityLinkedViaOTP, "updated_at": time.Now()}},
		)
	}

	pair, err := issueTokenPairForUser(ctx, finalUser, externalClientPlatform())
	if err != nil {
		externalServiceError(w, http.StatusInternalServerError, "TOKEN_ISSUE_FAILED", "Failed to issue tokens", nil)
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":         "شماره تلفن با موفقیت تأیید شد",
		"phone":           phone,
		"verified_method": models.PhoneVerifiedMethodSMSOTP,
		"merged":          merged,
		"already_bound":   false,
		"user":            externalUserSummary(finalUser),
		"token":           pair.AccessToken,
		"refreshToken":    pair.RefreshToken,
	})
}
