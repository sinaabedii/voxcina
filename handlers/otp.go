package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
)

// Persian to English digit mapping
var persianDigits = map[rune]rune{
	'۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
	'۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
}

// convertPersianToEnglishDigits converts Persian digits to English
func convertPersianToEnglishDigits(s string) string {
	var result strings.Builder
	for _, r := range s {
		if eng, ok := persianDigits[r]; ok {
			result.WriteRune(eng)
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// isPersianName checks if the name contains only Persian characters and spaces
func isPersianName(name string) bool {
	name = strings.TrimSpace(name)
	if name == "" {
		return false
	}
	for _, r := range name {
		if !unicode.Is(unicode.Arabic, r) && !unicode.IsSpace(r) {
			return false
		}
	}
	return true
}

// generateOTPCode generates a random 5-digit OTP code
func generateOTPCode() (string, error) {
	const digits = "0123456789"
	code := make([]byte, 5)
	randomBytes := make([]byte, 5)
	
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	
	for i := 0; i < 5; i++ {
		code[i] = digits[randomBytes[i]%10]
	}
	
	return string(code), nil
}

// SendSignupOTP handles POST /api/auth/signup/send-otp
// Step 1: User sends first name, last name, and phone number
func SendSignupOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Phone     string `json:"phone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Trim whitespace
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Phone = strings.TrimSpace(req.Phone)

	// Convert Persian digits to English in phone number
	req.Phone = convertPersianToEnglishDigits(req.Phone)

	// Validate first name (Persian only)
	if req.FirstName == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام الزامی است")
		return
	}
	if !isPersianName(req.FirstName) {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام باید فقط شامل حروف فارسی باشد")
		return
	}

	// Validate last name (Persian only)
	if req.LastName == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام خانوادگی الزامی است")
		return
	}
	if !isPersianName(req.LastName) {
		utils.ErrorResponse(w, http.StatusBadRequest, "نام خانوادگی باید فقط شامل حروف فارسی باشد")
		return
	}

	// Validate phone number (IR format)
	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن الزامی است")
		return
	}
	if !irPhoneRegex.MatchString(req.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	otpCollection := db.Database.Collection("otps")

	// Check if phone already registered
	var existingUser models.User
	err := userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == nil {
		utils.ErrorResponse(w, http.StatusConflict, "این شماره تلفن قبلاً ثبت شده است")
		return
	}
	if err != mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی شماره تلفن")
		return
	}

	// Check for existing unexpired OTP (rate limiting)
	var existingOTP models.OTP
	err = otpCollection.FindOne(ctx, bson.M{
		"phone":      req.Phone,
		"purpose":    models.OTPPurposeSignup,
		"verified":   false,
		"expires_at": bson.M{"$gt": time.Now()},
	}).Decode(&existingOTP)
	
	if err == nil {
		// OTP already exists and not expired - check if we should allow resend
		timeSinceCreated := time.Since(existingOTP.CreatedAt)
		if timeSinceCreated < 2*time.Minute {
			remainingSeconds := int((2*time.Minute - timeSinceCreated).Seconds())
			utils.ErrorResponse(w, http.StatusTooManyRequests, 
				fmt.Sprintf("لطفاً %d ثانیه صبر کنید و سپس دوباره تلاش کنید", remainingSeconds))
			return
		}
		// Delete old OTP if more than 2 minutes passed
		otpCollection.DeleteOne(ctx, bson.M{"_id": existingOTP.ID})
	}

	// Generate OTP code
	code, err := generateOTPCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد تأیید")
		return
	}

	// Create OTP record
	otp := models.OTP{
		ID:        primitive.NewObjectID(),
		Phone:     req.Phone,
		Code:      code,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Purpose:   models.OTPPurposeSignup,
		Verified:  false,
		Attempts:  0,
		ExpiresAt: time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
		CreatedAt: time.Now(),
	}

	// Save OTP to database
	_, err = otpCollection.InsertOne(ctx, otp)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد تأیید")
		return
	}

	// Send OTP via SMS
	smsService := services.NewSMSService()
	if err := smsService.SendOTP(req.Phone, code, req.FirstName); err != nil {
		// Log the error but don't expose details to client
		fmt.Printf("SMS send error: %v\n", err)
		// Delete the OTP record since SMS failed
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":    "کد تأیید به شماره تلفن شما ارسال شد",
		"expiresIn":  models.OTPExpirationMinutes * 60, // seconds
		"phone":      req.Phone,
	})
}

// VerifySignupOTP handles POST /api/auth/signup/verify-otp
// Step 2: User sends OTP code, password, and password confirmation
func VerifySignupOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone           string `json:"phone"`
		Code            string `json:"code"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Convert Persian digits to English
	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))
	req.Code = convertPersianToEnglishDigits(strings.TrimSpace(req.Code))

	// Validate inputs
	if req.Phone == "" || req.Code == "" || req.Password == "" || req.ConfirmPassword == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "تمام فیلدها الزامی هستند")
		return
	}

	if req.Password != req.ConfirmPassword {
		utils.ErrorResponse(w, http.StatusBadRequest, "رمز عبور و تکرار آن مطابقت ندارند")
		return
	}

	// Validate password strength
	if len(req.Password) < 8 || passwordRegex.MatchString(req.Password) {
		utils.ErrorResponse(w, http.StatusBadRequest, 
			"رمز عبور باید حداقل ۸ کاراکتر و شامل حروف بزرگ، کوچک و عدد باشد")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	otpCollection := db.Database.Collection("otps")
	userCollection := db.Database.Collection("users")

	// Find the most recent OTP record (sorted by created_at descending)
	var otp models.OTP
	findOptions := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err := otpCollection.FindOne(ctx, bson.M{
		"phone":    req.Phone,
		"purpose":  models.OTPPurposeSignup,
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

	// Check if OTP expired
	if time.Now().After(otp.ExpiresAt) {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusBadRequest, "کد تأیید منقضی شده است. لطفاً دوباره درخواست کد کنید")
		return
	}

	// Check attempts
	if otp.Attempts >= models.MaxOTPAttempts {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusTooManyRequests, "تعداد تلاش‌های مجاز به پایان رسید. لطفاً دوباره درخواست کد کنید")
		return
	}

	// Increment attempts
	otpCollection.UpdateOne(ctx, bson.M{"_id": otp.ID}, bson.M{"$inc": bson.M{"attempts": 1}})

	// Verify code
	if otp.Code != req.Code {
		remainingAttempts := models.MaxOTPAttempts - otp.Attempts - 1
		utils.ErrorResponse(w, http.StatusBadRequest, 
			fmt.Sprintf("کد تأیید نادرست است. %d تلاش باقی مانده", remainingAttempts))
		return
	}

	// Check if phone already registered (double check)
	var existingUser models.User
	err = userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == nil {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusConflict, "این شماره تلفن قبلاً ثبت شده است")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در پردازش رمز عبور")
		return
	}

	// Create user
	user := models.User{
		ID:           primitive.NewObjectID(),
		Name:         otp.FirstName + " " + otp.LastName,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		Addresses:    []models.Address{}, // Initialize with empty slice
		Role:         RoleCustomer,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = userCollection.InsertOne(ctx, user)
	if err != nil {
		// Log the actual error for debugging
		fmt.Printf("User creation error: %v\n", err)
		if strings.Contains(err.Error(), "duplicate key") {
			utils.ErrorResponse(w, http.StatusConflict, "این شماره تلفن قبلاً ثبت شده است")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ایجاد حساب کاربری")
		}
		return
	}

	// Mark OTP as verified and delete it
	otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})

	// Generate JWT token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید توکن")
		return
	}

	// Generate refresh token
	refreshExpirationTime := time.Now().Add(7 * 24 * time.Hour)
	refreshClaims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExpirationTime),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(jwtKey)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید توکن")
		return
	}

	// Return user info and tokens
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message":      "ثبت‌نام با موفقیت انجام شد",
		"id":           user.ID,
		"name":         user.Name,
		"phone":        user.Phone,
		"email":        user.Email,
		"role":         user.Role,
		"token":        tokenString,
		"refreshToken": refreshTokenString,
		"created_at":   user.CreatedAt,
		"updated_at":   user.UpdatedAt,
	})
}

// ResendSignupOTP handles POST /api/auth/signup/resend-otp
// Resend OTP for signup (with rate limiting)
func ResendSignupOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))

	if !irPhoneRegex.MatchString(req.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن نامعتبر است")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	otpCollection := db.Database.Collection("otps")

	// Find the most recent OTP
	var existingOTP models.OTP
	findOpts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err := otpCollection.FindOne(ctx, bson.M{
		"phone":    req.Phone,
		"purpose":  models.OTPPurposeSignup,
		"verified": false,
	}, findOpts).Decode(&existingOTP)

	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusBadRequest, "ابتدا اطلاعات ثبت‌نام را وارد کنید")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی درخواست")
		return
	}

	// Check rate limit (2 minutes between resends)
	timeSinceCreated := time.Since(existingOTP.CreatedAt)
	if timeSinceCreated < 2*time.Minute {
		remainingSeconds := int((2*time.Minute - timeSinceCreated).Seconds())
		utils.ErrorResponse(w, http.StatusTooManyRequests,
			fmt.Sprintf("لطفاً %d ثانیه صبر کنید و سپس دوباره تلاش کنید", remainingSeconds))
		return
	}

	// Generate new OTP code
	code, err := generateOTPCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد تأیید")
		return
	}

	// Update OTP record
	_, err = otpCollection.UpdateOne(ctx, bson.M{"_id": existingOTP.ID}, bson.M{
		"$set": bson.M{
			"code":       code,
			"attempts":   0,
			"expires_at": time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
			"created_at": time.Now(),
		},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بروزرسانی کد تأیید")
		return
	}

	// Send OTP via SMS
	smsService := services.NewSMSService()
	if err := smsService.SendOTP(req.Phone, code, existingOTP.FirstName); err != nil {
		fmt.Printf("SMS resend error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":   "کد تأیید جدید ارسال شد",
		"expiresIn": models.OTPExpirationMinutes * 60,
	})
}

// SendForgotPasswordOTP handles POST /api/auth/forgot-password/send-otp
// Step 1: User sends phone number to receive OTP for password reset
func SendForgotPasswordOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Convert Persian digits to English and trim
	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))

	// Validate phone number
	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن الزامی است")
		return
	}
	if !irPhoneRegex.MatchString(req.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	otpCollection := db.Database.Collection("otps")

	// Check if user exists
	var existingUser models.User
	err := userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "کاربری با این شماره تلفن یافت نشد")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی شماره تلفن")
		return
	}

	// Check for existing unexpired OTP (rate limiting)
	var existingOTP models.OTP
	err = otpCollection.FindOne(ctx, bson.M{
		"phone":      req.Phone,
		"purpose":    models.OTPPurposeResetPassword,
		"verified":   false,
		"expires_at": bson.M{"$gt": time.Now()},
	}).Decode(&existingOTP)

	if err == nil {
		// OTP already exists and not expired - check if we should allow resend
		timeSinceCreated := time.Since(existingOTP.CreatedAt)
		if timeSinceCreated < 2*time.Minute {
			remainingSeconds := int((2*time.Minute - timeSinceCreated).Seconds())
			utils.ErrorResponse(w, http.StatusTooManyRequests,
				fmt.Sprintf("لطفاً %d ثانیه صبر کنید و سپس دوباره تلاش کنید", remainingSeconds))
			return
		}
		// Delete old OTP if more than 2 minutes passed
		otpCollection.DeleteOne(ctx, bson.M{"_id": existingOTP.ID})
	}

	// Generate OTP code
	code, err := generateOTPCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد تأیید")
		return
	}

	// Extract first name from full name
	firstName := strings.Split(existingUser.Name, " ")[0]

	// Create OTP record
	otp := models.OTP{
		ID:        primitive.NewObjectID(),
		Phone:     req.Phone,
		Code:      code,
		FirstName: firstName,
		Purpose:   models.OTPPurposeResetPassword,
		Verified:  false,
		Attempts:  0,
		ExpiresAt: time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
		CreatedAt: time.Now(),
	}

	// Save OTP to database
	_, err = otpCollection.InsertOne(ctx, otp)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد تأیید")
		return
	}

	// Send OTP via SMS
	smsService := services.NewSMSService()
	if err := smsService.SendOTP(req.Phone, code, firstName); err != nil {
		fmt.Printf("SMS send error for password reset: %v\n", err)
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

// SendLoginOTP handles POST /api/auth/send-otp
// Send OTP for login (user must already exist)
func SendLoginOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone string `json:"phone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))

	if req.Phone == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن الزامی است")
		return
	}
	if !irPhoneRegex.MatchString(req.Phone) {
		utils.ErrorResponse(w, http.StatusBadRequest, "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userCollection := db.Database.Collection("users")
	otpCollection := db.Database.Collection("otps")

	// Check if user exists
	var existingUser models.User
	err := userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&existingUser)
	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusNotFound, "کاربری با این شماره تلفن یافت نشد")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی شماره تلفن")
		return
	}

	// Check for existing unexpired OTP (rate limiting)
	var existingOTP models.OTP
	err = otpCollection.FindOne(ctx, bson.M{
		"phone":      req.Phone,
		"purpose":    models.OTPPurposeLogin,
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

	// Generate OTP code
	code, err := generateOTPCode()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در تولید کد تأیید")
		return
	}

	// Extract first name from full name
	firstName := strings.Split(existingUser.Name, " ")[0]

	// Create OTP record
	otp := models.OTP{
		ID:        primitive.NewObjectID(),
		Phone:     req.Phone,
		Code:      code,
		FirstName: firstName,
		Purpose:   models.OTPPurposeLogin,
		Verified:  false,
		Attempts:  0,
		ExpiresAt: time.Now().Add(time.Duration(models.OTPExpirationMinutes) * time.Minute),
		CreatedAt: time.Now(),
	}

	_, err = otpCollection.InsertOne(ctx, otp)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره کد تأیید")
		return
	}

	smsService := services.NewSMSService()
	if err := smsService.SendOTP(req.Phone, code, firstName); err != nil {
		fmt.Printf("SMS send error for login: %v\n", err)
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

// VerifyLoginOTP handles POST /api/auth/check-otp
// Verify OTP for login
func VerifyLoginOTP(w http.ResponseWriter, r *http.Request) {
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

	// Find the most recent OTP
	var otp models.OTP
	loginFindOpts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err := otpCollection.FindOne(ctx, bson.M{
		"phone":    req.Phone,
		"purpose":  models.OTPPurposeLogin,
		"verified": false,
	}, loginFindOpts).Decode(&otp)

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

	// Mark OTP as verified and delete it
	otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "کد تأیید صحیح است",
		"valid":   true,
	})
}

// ResetPasswordWithOTP handles POST /api/auth/forgot-password/reset
// Step 2: User sends OTP code, new password, and password confirmation
func ResetPasswordWithOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phone           string `json:"phone"`
		Code            string `json:"code"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Convert Persian digits to English
	req.Phone = convertPersianToEnglishDigits(strings.TrimSpace(req.Phone))
	req.Code = convertPersianToEnglishDigits(strings.TrimSpace(req.Code))

	// Validate inputs
	if req.Phone == "" || req.Code == "" || req.Password == "" || req.ConfirmPassword == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "تمام فیلدها الزامی هستند")
		return
	}

	if req.Password != req.ConfirmPassword {
		utils.ErrorResponse(w, http.StatusBadRequest, "رمز عبور و تکرار آن مطابقت ندارند")
		return
	}

	// Validate password strength
	if len(req.Password) < 8 || passwordRegex.MatchString(req.Password) {
		utils.ErrorResponse(w, http.StatusBadRequest,
			"رمز عبور باید حداقل ۸ کاراکتر و شامل حروف بزرگ، کوچک و عدد باشد")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	otpCollection := db.Database.Collection("otps")
	userCollection := db.Database.Collection("users")

	// Find the most recent OTP record
	var otp models.OTP
	resetFindOpts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	err := otpCollection.FindOne(ctx, bson.M{
		"phone":    req.Phone,
		"purpose":  models.OTPPurposeResetPassword,
		"verified": false,
	}, resetFindOpts).Decode(&otp)

	if err == mongo.ErrNoDocuments {
		utils.ErrorResponse(w, http.StatusBadRequest, "کد تأیید یافت نشد. لطفاً دوباره درخواست کد کنید")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بررسی کد تأیید")
		return
	}

	// Check if OTP expired
	if time.Now().After(otp.ExpiresAt) {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusBadRequest, "کد تأیید منقضی شده است. لطفاً دوباره درخواست کد کنید")
		return
	}

	// Check attempts
	if otp.Attempts >= models.MaxOTPAttempts {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusTooManyRequests, "تعداد تلاش‌های مجاز به پایان رسید. لطفاً دوباره درخواست کد کنید")
		return
	}

	// Increment attempts
	otpCollection.UpdateOne(ctx, bson.M{"_id": otp.ID}, bson.M{"$inc": bson.M{"attempts": 1}})

	// Verify code
	if otp.Code != req.Code {
		remainingAttempts := models.MaxOTPAttempts - otp.Attempts - 1
		utils.ErrorResponse(w, http.StatusBadRequest,
			fmt.Sprintf("کد تأیید نادرست است. %d تلاش باقی مانده", remainingAttempts))
		return
	}

	// Find the user
	var user models.User
	err = userCollection.FindOne(ctx, bson.M{"phone": req.Phone}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})
		utils.ErrorResponse(w, http.StatusNotFound, "کاربر یافت نشد")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در یافتن کاربر")
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در پردازش رمز عبور")
		return
	}

	// Update user's password
	_, err = userCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"password_hash": string(hashedPassword),
			"updated_at":    time.Now(),
		},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در بروزرسانی رمز عبور")
		return
	}

	// Delete the OTP record
	otpCollection.DeleteOne(ctx, bson.M{"_id": otp.ID})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "رمز عبور با موفقیت تغییر کرد",
	})
}
