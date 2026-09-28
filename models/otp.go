package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OTP represents a one-time password for phone verification
type OTP struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Phone     string             `bson:"phone"         json:"phone"`      // IR phone number (09xxxxxxxxx)
	Code      string             `bson:"code"          json:"-"`          // 5-digit OTP code (not exposed in JSON)
	FirstName string             `bson:"first_name"    json:"first_name"` // User's first name (Persian)
	LastName  string             `bson:"last_name"     json:"last_name"`  // User's last name (Persian)
	Birthday  *time.Time         `bson:"birthday,omitempty" json:"-"`     // User's birthday (optional, not exposed in JSON)
	Purpose   string             `bson:"purpose"       json:"purpose"`    // "signup", "login", "reset_password", "bind_phone"
	// UserID pins a bind_phone OTP to the user it was requested for, so a
	// verified code can only promote that identity — not whichever account
	// queries the record first.
	UserID primitive.ObjectID `bson:"user_id,omitempty" json:"-"`
	// SellerReferrerID pins a seller_signup OTP to the referring seller the
	// ref code resolved to at send time, so verification cannot be retargeted
	// at a different referrer. It is re-validated (still a seller, still
	// allowed to recruit) at verify time.
	SellerReferrerID *primitive.ObjectID `bson:"seller_referrer_id,omitempty" json:"-"`
	Verified         bool                `bson:"verified"      json:"verified"` // Whether OTP has been verified
	// VerificationToken is a short-lived, one-time grant created after a
	// successful login OTP check. It is never exposed in normal OTP responses.
	VerificationToken string    `bson:"verification_token,omitempty" json:"-"`
	Attempts          int       `bson:"attempts"      json:"attempts"` // Number of verification attempts
	ExpiresAt         time.Time `bson:"expires_at"    json:"expires_at"`
	CreatedAt         time.Time `bson:"created_at"    json:"created_at"`
}

// OTPPurpose constants
const (
	OTPPurposeSignup        = "signup"
	OTPPurposeLogin         = "login"
	OTPPurposeResetPassword = "reset_password"
	// OTPPurposeBindPhone verifies control of a phone for an external
	// (bot-channel) identity. It is independent of the signup/login purposes.
	OTPPurposeBindPhone = "bind_phone"
	// OTPPurposeSellerSignup verifies control of a phone for the referral
	// seller signup flow. It reuses the otps collection and the standard
	// code/rate-limit/SMS machinery; the referrer binding travels on
	// SellerReferrerID below.
	OTPPurposeSellerSignup = "seller_signup"
)

// MaxOTPAttempts is the maximum number of verification attempts allowed
const MaxOTPAttempts = 10

// OTPExpirationMinutes is the OTP validity duration in minutes
const OTPExpirationMinutes = 10
