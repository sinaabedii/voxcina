package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func sellerReferralUser(role string, canRefer bool, code string, parent *primitive.ObjectID, active bool) models.User {
	return models.User{
		ID:                 primitive.NewObjectID(),
		Role:               role,
		CanReferSellers:    canRefer,
		SellerReferralCode: code,
		ParentSellerID:     parent,
		IsActive:           active,
	}
}

func TestSellerReferrerUsable(t *testing.T) {
	parentID := primitive.NewObjectID()
	tests := []struct {
		name string
		user models.User
		want bool
	}{
		{
			name: "eligible recruiter",
			user: sellerReferralUser(RoleSeller, true, "REF-ABCDEF12", nil, true),
			want: true,
		},
		{
			name: "non-seller role",
			user: sellerReferralUser(RoleCustomer, true, "REF-ABCDEF12", nil, true),
		},
		{
			name: "permission revoked",
			user: sellerReferralUser(RoleSeller, false, "REF-ABCDEF12", nil, true),
		},
		{
			name: "no code issued",
			user: sellerReferralUser(RoleSeller, true, "", nil, true),
		},
		{
			name: "recruited seller can never recruit (one level)",
			user: sellerReferralUser(RoleSeller, true, "REF-ABCDEF12", &parentID, true),
		},
		{
			name: "deactivated seller",
			user: sellerReferralUser(RoleSeller, true, "REF-ABCDEF12", nil, false),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := sellerReferrerUsable(tt.user); got != tt.want {
				t.Fatalf("sellerReferrerUsable = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSellerSignupUpgradeDecide(t *testing.T) {
	parentID := primitive.NewObjectID()
	tests := []struct {
		name         string
		user         models.User
		wantEligible bool
	}{
		{
			name:         "active customer is eligible",
			user:         models.User{Role: RoleCustomer, IsActive: true},
			wantEligible: true,
		},
		{
			name: "existing seller is rejected",
			user: models.User{Role: RoleSeller, IsActive: true},
		},
		{
			name: "staff is rejected",
			user: models.User{Role: RoleStaff, IsActive: true},
		},
		{
			name: "admin is rejected",
			user: models.User{Role: RoleAdmin, IsActive: true},
		},
		{
			name: "merged account is rejected",
			user: models.User{Role: RoleCustomer, IsActive: false, AccountType: models.AccountTypeMerged, MergedInto: &parentID},
		},
		{
			name: "deactivated customer is rejected",
			user: models.User{Role: RoleCustomer, IsActive: false},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := sellerSignupUpgradeDecide(tt.user)
			if tt.wantEligible && msg != "" {
				t.Fatalf("eligible user rejected: %q", msg)
			}
			if !tt.wantEligible && msg == "" {
				t.Fatal("ineligible user accepted")
			}
		})
	}
}

func TestSendSellerSignupOTPMissingRef(t *testing.T) {
	// Valid identity, no ref: rejected before any database access, so this
	// runs without MongoDB.
	body := `{"firstName":"علی","lastName":"رضایی","phone":"09123456789"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/seller-signup/send-otp", strings.NewReader(body))
	rec := httptest.NewRecorder()

	SendSellerSignupOTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "کد معرفی الزامی است") {
		t.Fatalf("expected missing-ref message, got %s", rec.Body.String())
	}
}

func TestSendSellerSignupOTPRejectsBadPhone(t *testing.T) {
	body := `{"firstName":"علی","lastName":"رضایی","phone":"123","ref":"REF-ABCDEF12"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/seller-signup/send-otp", strings.NewReader(body))
	rec := httptest.NewRecorder()

	SendSellerSignupOTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestVerifySellerSignupOTPMissingFields(t *testing.T) {
	// Empty payload: rejected before any database access.
	req := httptest.NewRequest(http.MethodPost, "/api/auth/seller-signup/verify-otp", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	VerifySellerSignupOTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
