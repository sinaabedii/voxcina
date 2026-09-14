package middlewares

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Every response behind AuthMiddleware is addressed to one caller, including
// the rejections it writes itself. A URL like /api/tryon/history is identical
// for every user — only the Authorization header tells them apart — so a
// response that leaves caching to whatever sits in front of it is one CDN rule
// away from handing the first caller's try-on photos to the next one.
func TestAuthMiddlewareMarksResponsesPrivate(t *testing.T) {
	handler := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// No token: the middleware answers 401 itself, which is the response most
	// likely to look cacheable to a CDN (short, identical for everyone).
	req := httptest.NewRequest(http.MethodGet, "/api/tryon/history", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	cc := rec.Header().Get("Cache-Control")
	if !strings.Contains(cc, "no-store") || !strings.Contains(cc, "private") {
		t.Errorf("Cache-Control = %q, want it to carry both no-store and private", cc)
	}
	if vary := rec.Header().Get("Vary"); !strings.Contains(vary, "Authorization") {
		t.Errorf("Vary = %q, want Authorization in it", vary)
	}
}
