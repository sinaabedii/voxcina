package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
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

// sellerReferrerUsable is the pure resolution decision behind the seller
// signup flow: whether a loaded user may act as a referrer. The send-otp
// query already filters on role/permission/code, but the decision is
// re-applied to the loaded document (and re-checked at verify time) so a
// permission revoked between the two steps cannot be exploited, and so the
// matrix stays unit-testable without a database.
func sellerReferrerUsable(u models.User) bool {
	if u.Role != RoleSeller || !u.CanReferSellers || u.SellerReferralCode == "" {
		return false
	}
	// True one-level depth: a recruited seller can never recruit, so chains
	// are impossible even if the grant path is ever bypassed.
	if u.ParentSellerID != nil {
		return false
	}
	if !u.IsActive {
		return false
	}
	return true
}

// sellerSignupUpgradeDecide decides whether the owner of an already-registered
// phone may be upgraded to a referral seller. "" means eligible; otherwise
// the Persian message for a 409. Only plain active customers qualify —
// sellers are already in, staff/admin accounts are never converted, and
// merged tombstones or deactivated accounts are never resurrected through
// this path. Pure (no DB) so the matrix stays unit-testable.
func sellerSignupUpgradeDecide(u models.User) string {
	if u.IsMerged() {
		return "این حساب کاربری ادغام شده و قابل ارتقا به فروشندگی نیست"
	}
	if !u.IsActive {
		return "این حساب کاربری غیرفعال است و قابل ارتقا به فروشندگی نیست"
	}
	switch u.Role {
	case RoleCustomer:
		return ""
	case RoleSeller:
		return "این شماره تلفن قبلاً به‌عنوان فروشنده ثبت شده است"
	default:
		return "این حساب کاربری مجاز به ثبت‌نام فروشندگی نیست"
	}
}

// parseSellerSignupBirthday converts an optional Jalali birthday string to
// Gregorian, mirroring SendSignupOTP. Unparseable input yields nil rather
// than an error — the birthday is decorative, never load-bearing.
func parseSellerSignupBirthday(raw string) *time.Time {
	s := convertPersianToEnglishDigits(strings.TrimSpace(raw))
	if s == "" {
		return nil
	}
	s = strings.ReplaceAll(s, "/", "-")
	parts := strings.Split(s, "-")
	if len(parts) != 3 {
		return nil
	}
	jYear, _ := strconv.Atoi(parts[0])
	jMonth, _ := strconv.Atoi(parts[1])
	jDay, _ := strconv.Atoi(parts[2])
	if gTime, gErr := utils.JalaliToGregorian(jYear, jMonth, jDay); gErr == nil {
		return &gTime
	}
	return nil
}

// SendSellerSignupOTP handles POST /api/auth/seller-signup/send-otp.
//
// Step 1 of the referral seller signup: the recruit's identity plus the
// referral code carried invisibly in the signup link (?ref=REF-XXXXXXXX).
// There is no editable referral field — the binding resolves server-side to a
// seller who currently holds the recruiter permission, and is pinned on the
// OTP record for the verify step.
//
// A phone that already belongs to an active customer starts an upgrade
// intent; any other existing account (seller, staff, admin, merged or
// deactivated) is rejected here. New phones follow the standard OTP path.
// The OTP store, rate limit and SMS dispatch are the shared signup
// machinery, namespaced under the seller_signup purpose.
func SendSellerSignupOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Phone     string `json:"phone"`
		Birthday  string `json:"birthday"`
		Ref       string `json:"ref"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Phone = convertPersianToEnglishDigits(req.Phone)

	if req.FirstName == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام الزامی است")
		return
	}
	if !isPersianName(req.FirstName) {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام باید فقط شامل حروف فارسی باشد")
		return
	}
	if req.LastName == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام خانوادگی الزامی است")
		return
	}
	if !isPersianName(req.LastName) {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام خانوادگی باید فقط شامل حروف فارسی باشد")
		return
	}
	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن الزامی است")
		return
	}
	if !irPhoneRegex.MatchString(req.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)")
		return
	}
	ref := strings.ToUpper(strings.TrimSpace(req.Ref))
	if ref == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد معرفی الزامی است")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	otpCollection := db.Database.Collection("otps")

	var referrer models.User
	err := userCollection.FindOne(ctx, bson.M{
		"role":                 RoleSeller,
		"can_refer_sellers":    true,
		"seller_referral_code": ref,
	}).Decode(&referrer)
	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "کد معرفی نامعتبر است")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد معرفی")
		return
	}
	if !sellerReferrerUsable(referrer) {
		utils.ErrorResponse(w, http.StatusNotFound, "کد معرفی نامعتبر است")
		return
	}

	var existingUser models.User
	err = userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == nil {
		if msg := sellerSignupUpgradeDecide(existingUser); msg != "" {
			utils.ErrorResponse(w, http.StatusConflict, msg)
			return
		}
	} else if err != mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی شماره تلفن")
		return
	}

	var existingOTP models.OTP
	err = otpCollection.FindOne(ctx, bson.M{
		"phone":      req.Phone,
		"purpose":    models.OTPPurposeSellerSignup,
		"verified":   false,
		"expires_at": bson.M{"$gt": time.Now()},
	}).Decode(&existingOTP)
	if err == nil {
		timeSinceCreated := time.Since(existingOTP.CreatedAt)
		if timeSinceCreated < 2*time.Minute {
			remainingSeconds := int((2*time.Minute - timeSinceCreated).Seconds())
			utils.ErrorResponse(w, http.StatusTooManyRequests,
				fmt.Sprintf("لطفاً %d ثانیه صبر کنید و سپس دوباره تلاش کنید", remainingSeconds))
			return
		}
		otpCollection.DeleteOne(ctx, bson.M{"_id": existingOTP.ID})
	}

	code, err := generateOTPCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد تأیید")
		return
	}

	otp := models.OTP{
		ID:               primitive.NewObjectID(),
		Phone:            req.Phone,
		Code:             code,
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Birthday:         parseSellerSignupBirthday(req.Birthday),
		Purpose:          models.OTPPurposeSellerSignup,
		SellerReferrerID: &referrer.ID,
		Verified:         false,
		Attempts:         0,
		ExpiresAt:        time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
		CreatedAt:        time.Now(),
	}

	if _, err = otpCollection.InsertOne(ctx, otp); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد تأیید")
		return
	}

	smsService := services.NewSMSService()
	if err := smsService.SendOTP(req.Phone, code, req.FirstName); err != nil {
		fmt.Printf("SMS send error (seller signup): %v\n", err)
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":   "کد تأیید به شماره تلفن شما ارسال شد",
		"expiresIn": models.OTPExpirationMinutes * 60,
		"phone":     req.Phone,
	})
}

// VerifySellerSignupOTP handles POST /api/auth/seller-signup/verify-otp.
//
// Step 2: the OTP is checked through the shared verification flow, the
// referrer pinned on the OTP record is re-validated (still a seller, still
// allowed to recruit), and the phone either creates a referral seller
// (role=seller, 20% budget, parent bound) or upgrades an existing customer
// (role→seller only if still a customer — re-checked — plus budget and
// parent; admins, staff, existing sellers, merged and deactivated accounts
// are never touched). Tokens are issued exactly like the normal signup path.
func VerifySellerSignupOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))
	req.Code = convertPersianToEnglishDigits(strings.TrimSpace(req.Code))

	if req.Phone == "" || req.Code == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن و کد تأیید الزامی هستند")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	otpCollection := db.Database.Collection("otps")
	userCollection := db.Database.Collection("users")

	var otp models.OTP
	findOptions := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err := otpCollection.FindOne(ctx, bson.M{
		"phone":    req.Phone,
		"purpose":  models.OTPPurposeSellerSignup,
		"verified": false,
	}, findOptions).Decode(&otp)
	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد تأیید یافت نشد. لطفاً دوباره درخواست کد کنید")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تأیید")
		return
	}

	if time.Now().After(otp.ExpiresAt) {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusBadRequest, "کد تأیید منقضی شده است. لطفاً دوباره درخواست کد کنید")
		return
	}
	if otp.Attempts >= models.MaxOTPAttempts {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusTooManyRequests, "تعداد تلاش‌های مجاز به پایان رسید. لطفاً دوباره درخواست کد کنید")
		return
	}
	otpCollection.UpdateOne(ctx, bson.M{"_id": otp.ID}, bson.M{"$inc": bson.M{"attempts": 1}})
	if otp.Code != req.Code {
		remainingAttempts := models.MaxOTPAttempts - otp.Attempts - 1
		utils.ErrorResponse(w, http.StatusBadRequest,
			fmt.Sprintf("کد تأیید نادرست است. %d تلاش باقی مانده", remainingAttempts))
		return
	}

	// The referrer is pinned by id at send time and re-validated here: a
	// permission revoked in between must fail closed.
	if otp.SellerReferrerID == nil {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusBadRequest, "کد معرفی نامعتبر است")
		return
	}
	var referrer models.User
	if err := userCollection.FindOne(ctx, bson.M{"_id": *otp.SellerReferrerID}).Decode(&referrer); err != nil {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusBadRequest, "کد معرفی دیگر معتبر نیست")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد معرفی")
		}
		return
	}
	if !sellerReferrerUsable(referrer) {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusBadRequest, "کد معرفی دیگر معتبر نیست")
		return
	}

	now := time.Now()
	var existingUser models.User
	err = userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == nil {
		// Upgrade path. Eligibility is re-checked: the account may have
		// changed role or state since the OTP was sent.
		if msg := sellerSignupUpgradeDecide(existingUser); msg != "" {
			otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
			utils.ErrorResponse(w, http.StatusConflict, msg)
			return
		}
		if _, err := userCollection.UpdateOne(ctx, bson.M{"_id": existingUser.ID}, bson.M{
			"$set": bson.M{
				"role":                  RoleSeller,
				"seller_budget_percent": models.ReferralSellerVoucherBudgetPercent,
				"parent_seller_id":      referrer.ID,
				"updated_at":            now,
			},
			"$inc": bson.M{"token_version": 1},
		}); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ارتقا به فروشندگی")
			return
		}
		// The role change invalidates previous sessions, mirroring
		// UpdateUserRole; the fresh pair below carries the new version.
		if err := GetRefreshTokenService().RevokeAllForUser(ctx, existingUser.ID, false); err != nil {
			fmt.Printf("Warning: seller upgrade succeeded but refresh-token revocation failed for %v: %v\n", existingUser.ID, err)
		}
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})

		// The caller's identity for the token pair reflects the post-upgrade
		// document; the stored names/birthday are left untouched.
		existingUser.Role = RoleSeller
		existingUser.SellerBudgetPercent = models.ReferralSellerVoucherBudgetPercent
		existingUser.ParentSellerID = &referrer.ID
		existingUser.TokenVersion++
		existingUser.UpdatedAt = now
		pair, err := issueTokenPairForUser(ctx, &existingUser, clientPlatformFromRequest(r))
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید توکن")
			return
		}
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"message":               "ارتقا به فروشندگی با موفقیت انجام شد",
			"id":                    existingUser.ID,
			"name":                  existingUser.Name,
			"first_name":            existingUser.FirstName,
			"last_name":             existingUser.LastName,
			"phone":                 existingUser.Phone,
			"email":                 existingUser.Email,
			"role":                  existingUser.Role,
			"seller_budget_percent": existingUser.SellerBudgetPercent,
			"parent_seller_id":      existingUser.ParentSellerID,
			"token":                 pair.AccessToken,
			"refreshToken":          pair.RefreshToken,
			"created_at":            existingUser.CreatedAt,
			"updated_at":            existingUser.UpdatedAt,
			"last_login":            existingUser.LastLogin,
			"birthday":              existingUser.Birthday,
		})
		return
	}
	if err != mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی شماره تلفن")
		return
	}

	// New-account path. Passwordless like any OTP-established identity: the
	// seller signs in through the OTP login flow.
	user := models.User{
		ID:                  primitive.NewObjectID(),
		Name:                otp.FirstName + " " + otp.LastName,
		FirstName:           otp.FirstName,
		LastName:            otp.LastName,
		Phone:               req.Phone,
		Addresses:           []models.Address{},
		Role:                RoleSeller,
		IsActive:            true,
		AccountType:         models.AccountTypeRegistered,
		CreatedAt:           now,
		UpdatedAt:           now,
		LastLogin:           &now,
		Birthday:            otp.Birthday,
		SellerBudgetPercent: models.ReferralSellerVoucherBudgetPercent,
		ParentSellerID:      &referrer.ID,
	}
	if _, err = userCollection.InsertOne(ctx, user); err != nil {
		fmt.Printf("Seller signup creation error: %v\n", err)
		if strings.Contains(err.Error(), "duplicate key") {
			utils.ErrorResponse(w, http.StatusConflict, "این شماره تلفن قبلاً ثبت شده است")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ایجاد حساب فروشندگی")
		}
		return
	}
	otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})

	pair, err := issueTokenPairForUser(ctx, &user, clientPlatformFromRequest(r))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید توکن")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message":               "ثبت‌نام فروشندگی با موفقیت انجام شد",
		"id":                    user.ID,
		"name":                  user.Name,
		"first_name":            user.FirstName,
		"last_name":             user.LastName,
		"phone":                 user.Phone,
		"email":                 user.Email,
		"role":                  user.Role,
		"seller_budget_percent": user.SellerBudgetPercent,
		"parent_seller_id":      user.ParentSellerID,
		"token":                 pair.AccessToken,
		"refreshToken":          pair.RefreshToken,
		"created_at":            user.CreatedAt,
		"updated_at":            user.UpdatedAt,
		"last_login":            user.LastLogin,
		"birthday":              user.Birthday,
	})
}
