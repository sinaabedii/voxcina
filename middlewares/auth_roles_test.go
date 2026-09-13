package middlewares

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backEnd/handlers"
)

// serveWithRole runs the gate that guards `routerKind` against a request whose
// context carries `role`, the way AuthMiddleware would have set it, and reports
// the status plus whether the protected handler ran.
//
// roleGate is exercised rather than the exported middleware because the
// exported one first runs AuthMiddleware, which needs a signed token and a live
// users collection. What is under test here is the role decision itself.
func serveWithRole(t *testing.T, role string, gate func(http.Handler) http.Handler) (status int, reached bool) {
	t.Helper()

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		reached = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	if role != "" {
		req = req.WithContext(context.WithValue(req.Context(), "role", role))
	}
	rec := httptest.NewRecorder()
	gate(next).ServeHTTP(rec, req)
	return rec.Code, reached
}

// adminGate and staffGate mirror AdminAuthMiddleware / StaffAuthMiddleware
// exactly, minus the AuthMiddleware wrapper.
func adminGate(next http.Handler) http.Handler {
	return roleGate(next, "Admin access required", handlers.RoleAdmin)
}

func staffGate(next http.Handler) http.Handler {
	return roleGate(next, "Staff or admin access required", handlers.RoleAdmin, handlers.RoleStaff)
}

func TestAdminGateRejectsStaff(t *testing.T) {
	status, reached := serveWithRole(t, handlers.RoleStaff, adminGate)
	if status != http.StatusForbidden {
		t.Errorf("staff on an admin-only route: status = %d, want %d", status, http.StatusForbidden)
	}
	if reached {
		t.Error("staff reached an admin-only handler")
	}
}

func TestAdminGateAdmitsAdmin(t *testing.T) {
	status, reached := serveWithRole(t, handlers.RoleAdmin, adminGate)
	if status != http.StatusOK || !reached {
		t.Errorf("admin on an admin-only route: status = %d reached = %v, want 200/true", status, reached)
	}
}

func TestStaffGateAdmitsStaffAndAdmin(t *testing.T) {
	for _, role := range []string{handlers.RoleStaff, handlers.RoleAdmin} {
		status, reached := serveWithRole(t, role, staffGate)
		if status != http.StatusOK || !reached {
			t.Errorf("%s on a staff route: status = %d reached = %v, want 200/true", role, status, reached)
		}
	}
}

func TestStaffGateRejectsCustomer(t *testing.T) {
	for _, role := range []string{handlers.RoleCustomer, "user", "seller", ""} {
		status, reached := serveWithRole(t, role, staffGate)
		// An absent role is a wiring bug, not a permission decision, so it
		// answers 500; every other non-back-office role is a plain 403.
		wantStatus := http.StatusForbidden
		if role == "" {
			wantStatus = http.StatusInternalServerError
		}
		if status != wantStatus {
			t.Errorf("role %q on a staff route: status = %d, want %d", role, status, wantStatus)
		}
		if reached {
			t.Errorf("role %q reached a staff-gated handler", role)
		}
	}
}

// TestGateErrorBodyShape pins the JSON error contract the dashboard reads to
// tell "not signed in" apart from "signed in, wrong role".
func TestGateErrorBodyShape(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Error("handler should not run")
	})
	req := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req = req.WithContext(context.WithValue(req.Context(), "role", handlers.RoleStaff))
	rec := httptest.NewRecorder()
	adminGate(next).ServeHTTP(rec, req)

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding error body: %v (body = %q)", err, rec.Body.String())
	}
	if body["code"] == nil || body["code"] == "" {
		t.Errorf("error body carries no code: %v", body)
	}
}

// TestBackOfficeRoleSet pins which roles may open the dashboard at all. The
// frontend mirrors this list; widening one side without the other is the bug
// this catches.
func TestBackOfficeRoleSet(t *testing.T) {
	for _, role := range []string{handlers.RoleAdmin, handlers.RoleStaff} {
		if !handlers.IsBackOfficeRole(role) {
			t.Errorf("IsBackOfficeRole(%q) = false, want true", role)
		}
	}
	for _, role := range []string{handlers.RoleCustomer, "user", "seller", "external", ""} {
		if handlers.IsBackOfficeRole(role) {
			t.Errorf("IsBackOfficeRole(%q) = true, want false", role)
		}
	}
}
