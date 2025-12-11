package handlers

import (
	"regexp"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JWT secret key - TODO: Use a strong, configurable secret key from env variables
var jwtKey = []byte("my_secret_key")

// User roles
const (
	RoleCustomer = "customer"
	RoleAdmin    = "admin"
	RoleSeller   = "seller"
)

// Password validation regex: at least 8 characters, one uppercase, one lowercase, one digit
var passwordRegex = regexp.MustCompile(`^(.{0,7}|[^0-9]*|[^A-Z]*|[^a-z]*)$`)

// Email validation regex (optional)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// IR phone number validation regex: 09xxxxxxxxx (11 digits starting with 09)
var irPhoneRegex = regexp.MustCompile(`^09[0-9]{9}$`)

// Claims struct for JWT
type Claims struct {
	UserID primitive.ObjectID `json:"user_id"`
	Email  string             `json:"email"`
	Role   string             `json:"role"`
	jwt.RegisteredClaims
}

// GetJWTKey returns the JWT signing key
func GetJWTKey() []byte {
	return jwtKey
}