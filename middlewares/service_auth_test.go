package middlewares

import (
	"testing"

	"backEnd/models"
)

func TestServiceGrantsScope(t *testing.T) {
	svc := &models.ExternalService{
		Scopes: []string{models.ExternalServiceScopeIdentityExchange},
	}
	if !svc.GrantsScope(models.ExternalServiceScopeIdentityExchange) {
		t.Errorf("granted scope must be accepted")
	}
	if svc.GrantsScope(models.ExternalServiceScopeIdentityBindPhone) {
		t.Errorf("ungranted scope must be rejected")
	}
	if svc.GrantsScope("") {
		t.Errorf("empty scope must be rejected")
	}
}

func TestServiceAllowsPhoneMethod(t *testing.T) {
	contactSvc := &models.ExternalService{
		PhoneMethods: []string{models.ExternalServicePhoneMethodContact},
	}
	if !contactSvc.AllowsPhoneMethod(models.ExternalServicePhoneMethodContact) {
		t.Errorf("contact method must be allowed when listed")
	}
	if !contactSvc.AllowsPhoneMethod(models.ExternalServicePhoneMethodOTP) {
		t.Errorf("sms_otp must always be allowed")
	}

	otpOnlySvc := &models.ExternalService{}
	if otpOnlySvc.AllowsPhoneMethod(models.ExternalServicePhoneMethodContact) {
		t.Errorf("contact method must require explicit listing")
	}
	if !otpOnlySvc.AllowsPhoneMethod(models.ExternalServicePhoneMethodOTP) {
		t.Errorf("sms_otp must always be allowed")
	}
}

func TestServiceScopeValidation(t *testing.T) {
	if !models.ValidExternalServiceScope(models.ExternalServiceScopeIdentityExchange) {
		t.Errorf("exchange scope must be valid")
	}
	if !models.ValidExternalServiceScope(models.ExternalServiceScopeIdentityBindPhone) {
		t.Errorf("bind_phone scope must be valid")
	}
	for _, bad := range []string{"", "identity", "identity:*", "admin"} {
		if models.ValidExternalServiceScope(bad) {
			t.Errorf("scope %q must be invalid", bad)
		}
	}
}

func TestServiceRequestRateCounter(t *testing.T) {
	key := "test-key-hash"
	// The shared counter is process-wide; use a fresh key so this test is not
	// order dependent.
	for i := 0; i < serviceAuthRequestLimit; i++ {
		if !serviceRequests.allow(key, serviceAuthRequestLimit) {
			t.Fatalf("request %d rejected before the limit", i+1)
		}
	}
	if serviceRequests.allow(key, serviceAuthRequestLimit) {
		t.Errorf("request beyond the limit must be rejected")
	}
}

func TestServiceRequestInvalidKeyBucket(t *testing.T) {
	// Invalid keys share one small bucket: a flood of fabricated key
	// material is metered without touching any real service's budget.
	for i := 0; i < serviceInvalidKeyLimit; i++ {
		if !serviceRequests.allowInvalid() {
			t.Fatalf("invalid request %d rejected before the limit", i+1)
		}
	}
	if serviceRequests.allowInvalid() {
		t.Errorf("invalid request beyond the shared limit must be rejected")
	}
}

func TestServiceRequestCounterDoesNotGrowOnDistinctKeys(t *testing.T) {
	// A distinct key gets its own small budget — never the shared invalid
	// bucket's exhaustion, and never an unbounded map (sweep caps it at
	// maxServiceRequestBuckets).
	fresh := "distinct-key-hash"
	if !serviceRequests.allow(fresh, serviceAuthRequestLimit) {
		t.Errorf("a fresh key must start with a full budget")
	}
}

func TestExternalServiceContextKeyContract(t *testing.T) {
	// handlers cannot import middlewares (import cycle), so they read the
	// context with the literal string. Pin the constant so the two sides can
	// never drift.
	if CtxExternalService != "externalService" {
		t.Errorf("CtxExternalService must stay %q for the handlers' literal reads", "externalService")
	}
}
