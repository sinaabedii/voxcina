package snappayfeed

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func resetValidationCache() {
	validationCache.Lock()
	validationCache.entries = map[string]time.Time{}
	validationCache.Unlock()
}

func TestAuthorizeRejectsMissingKey(t *testing.T) {
	if err := authorize(context.Background(), Config{}, "  ", nil); !errors.Is(err, errMissingKey) {
		t.Fatalf("missing key error = %v", err)
	}
}

// The static key exists so the endpoint can be exercised before Searchwise
// provisions anything; it must short-circuit without any outbound call.
func TestAuthorizeAcceptsStaticKey(t *testing.T) {
	cfg := Config{APIKey: "local-test-key", ValidateURL: "http://127.0.0.1:1/unreachable"}
	if err := authorize(context.Background(), cfg, "local-test-key", nil); err != nil {
		t.Fatalf("static key rejected: %v", err)
	}
}

func TestAuthorizeValidatesUpstream(t *testing.T) {
	resetValidationCache()

	var gotForm map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		gotForm = map[string]string{
			"merchant_domain": r.Form.Get("merchant_domain"),
			"api_key":         r.Form.Get("api_key"),
			"plugin_version":  r.Form.Get("plugin_version"),
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
	}))
	defer server.Close()

	cfg := Config{ValidateURL: server.URL, MerchantDomain: "voxcina.com"}
	if err := authorize(context.Background(), cfg, "searchwise-key", server.Client()); err != nil {
		t.Fatalf("valid key rejected: %v", err)
	}

	// The plugin posts exactly these three form fields (L77-85).
	if gotForm["merchant_domain"] != "voxcina.com" {
		t.Fatalf("merchant_domain = %q", gotForm["merchant_domain"])
	}
	if gotForm["api_key"] != "searchwise-key" {
		t.Fatalf("api_key = %q", gotForm["api_key"])
	}
	if gotForm["plugin_version"] != PluginVersion {
		t.Fatalf("plugin_version = %q", gotForm["plugin_version"])
	}
}

func TestAuthorizeRejectsUnsuccessfulValidation(t *testing.T) {
	resetValidationCache()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false})
	}))
	defer server.Close()

	cfg := Config{ValidateURL: server.URL, MerchantDomain: "voxcina.com"}
	err := authorize(context.Background(), cfg, "bad-key", server.Client())
	if !errors.Is(err, errInvalidKey) {
		t.Fatalf("rejected key error = %v, want errInvalidKey", err)
	}
}

// An unreachable validator is an outage on our side of the wire, not a bad
// credential — reporting 401 would send Searchwise chasing a healthy key.
func TestAuthorizeReportsUnreachableValidator(t *testing.T) {
	resetValidationCache()

	cfg := Config{ValidateURL: "http://127.0.0.1:1/validate", MerchantDomain: "voxcina.com"}
	err := authorize(context.Background(), cfg, "some-key", &http.Client{Timeout: validationTimeout})
	if !errors.Is(err, errValidatorUnreachable) {
		t.Fatalf("unreachable validator error = %v, want errValidatorUnreachable", err)
	}
}

// A paginated crawl is many POSTs; only the first may pay for validation.
func TestAuthorizeCachesSuccessfulValidation(t *testing.T) {
	resetValidationCache()

	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
	}))
	defer server.Close()

	cfg := Config{ValidateURL: server.URL, MerchantDomain: "voxcina.com"}
	for i := 0; i < 3; i++ {
		if err := authorize(context.Background(), cfg, "cached-key", server.Client()); err != nil {
			t.Fatalf("call %d rejected: %v", i, err)
		}
	}
	if calls != 1 {
		t.Fatalf("validated %d times, want 1", calls)
	}
}
