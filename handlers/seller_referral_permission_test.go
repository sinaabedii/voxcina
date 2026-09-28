package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func TestSellerReferralGrantDecide(t *testing.T) {
	parentID := primitive.NewObjectID()
	tests := []struct {
		name     string
		user     models.User
		grant    bool
		needCode bool
		wantErr  bool
	}{
		{
			name:     "grant to code-less seller mints a code",
			user:     models.User{Role: RoleSeller},
			grant:    true,
			needCode: true,
		},
		{
			name:  "grant to seller with a code keeps it",
			user:  models.User{Role: RoleSeller, SellerReferralCode: "REF-ABCDEF12"},
			grant: true,
		},
		{
			name:    "grant to a recruited seller is rejected (one level)",
			user:    models.User{Role: RoleSeller, ParentSellerID: &parentID},
			grant:   true,
			wantErr: true,
		},
		{
			name:    "grant to a customer is rejected",
			user:    models.User{Role: RoleCustomer},
			grant:   true,
			wantErr: true,
		},
		{
			name:    "grant to staff is rejected",
			user:    models.User{Role: RoleStaff},
			grant:   true,
			wantErr: true,
		},
		{
			name:  "revoke keeps the code without error",
			user:  models.User{Role: RoleSeller, SellerReferralCode: "REF-ABCDEF12"},
			grant: false,
		},
		{
			name:    "revoke for a non-seller is rejected",
			user:    models.User{Role: RoleCustomer},
			grant:   false,
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			needCode, errMsg := sellerReferralGrantDecide(tt.user, tt.grant)
			if tt.wantErr && errMsg == "" {
				t.Fatal("expected an error message, got none")
			}
			if !tt.wantErr && errMsg != "" {
				t.Fatalf("unexpected error message: %q", errMsg)
			}
			if needCode != tt.needCode {
				t.Fatalf("needCode = %v, want %v", needCode, tt.needCode)
			}
		})
	}
}

func TestUpdateSellerReferralPermissionRejectsBadID(t *testing.T) {
	// Malformed id: rejected before any database access, so this runs
	// without MongoDB.
	req := httptest.NewRequest(http.MethodPut, "/api/admin/users/not-an-objectid/seller-referral-permission",
		strings.NewReader(`{"can_refer":true}`))
	req = mux.SetURLVars(req, map[string]string{"userId": "not-an-objectid"})
	rec := httptest.NewRecorder()

	UpdateSellerReferralPermission(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestUpdateSellerReferralPermissionRejectsBadBody(t *testing.T) {
	// Undecodable body: rejected before any database access.
	req := httptest.NewRequest(http.MethodPut,
		"/api/admin/users/"+primitive.NewObjectID().Hex()+"/seller-referral-permission",
		strings.NewReader(`{`))
	req = mux.SetURLVars(req, map[string]string{"userId": primitive.NewObjectID().Hex()})
	rec := httptest.NewRecorder()

	UpdateSellerReferralPermission(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestUpdateSellerReferralPermissionRequiresCanRefer(t *testing.T) {
	// Missing can_refer: rejected before any database access.
	req := httptest.NewRequest(http.MethodPut,
		"/api/admin/users/"+primitive.NewObjectID().Hex()+"/seller-referral-permission",
		strings.NewReader(`{}`))
	req = mux.SetURLVars(req, map[string]string{"userId": primitive.NewObjectID().Hex()})
	rec := httptest.NewRecorder()

	UpdateSellerReferralPermission(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "can_refer") {
		t.Fatalf("expected can_refer message, got %s", rec.Body.String())
	}
}
