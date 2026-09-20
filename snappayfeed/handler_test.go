package snappayfeed

import (
	"bufio"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/mongo"
)

// withoutDatabase points the handler at no connection at all, which is how
// these tests stay free of MongoDB: authentication and parameter handling run
// long before the first query.
func withoutDatabase(t *testing.T) {
	t.Helper()
	original := database
	database = func() *mongo.Database { return nil }
	t.Cleanup(func() { database = original })
}

func TestHandlerRejectsMissingAPIKey(t *testing.T) {
	withoutDatabase(t)

	recorder := httptest.NewRecorder()
	Handler(recorder, postJSON(`{"limit":2}`))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", recorder.Code)
	}

	// The plugin answers a bad key with WordPress's WP_Error JSON; a client
	// written against it parses our refusal with the same code path.
	var decoded wpError
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("error body is not JSON: %v (%s)", err, recorder.Body)
	}
	if decoded.Code != "rest_forbidden" || decoded.Data.Status != http.StatusUnauthorized {
		t.Fatalf("error body = %+v", decoded)
	}
	if decoded.Message != "Invalid API Key." {
		t.Fatalf("message = %q, want the plugin's wording", decoded.Message)
	}
}

// A GET on the feed URL — what a person checks first during onboarding — must
// look like a REST API saying "wrong method", not like a dead URL.
func TestHandlerRejectsNonPostWithWordPressShape(t *testing.T) {
	withoutDatabase(t)

	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		recorder := httptest.NewRecorder()
		Handler(recorder, httptest.NewRequest(method, "/api/snappay/feed", nil))

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("%s status = %d, want 404", method, recorder.Code)
		}

		var decoded wpError
		if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
			t.Fatalf("%s body is not JSON: %v (%s)", method, err, recorder.Body)
		}
		if decoded.Code != "rest_no_route" {
			t.Fatalf("%s error code = %q, want rest_no_route", method, decoded.Code)
		}
		if decoded.Data.Status != http.StatusNotFound {
			t.Fatalf("%s error data.status = %d", method, decoded.Data.Status)
		}
	}
}

func TestHandlerAcceptsStaticKeyAndReportsCatalogOutage(t *testing.T) {
	withoutDatabase(t)
	t.Setenv("SNAPPAY_FEED_API_KEY", "local-test-key")

	request := postJSON(`{"limit":2}`)
	request.Header.Set("x-api-key", "local-test-key")

	recorder := httptest.NewRecorder()
	Handler(recorder, request)

	// The key was accepted (not 401); the missing database is a 503.
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503 (auth passed, catalog unavailable)", recorder.Code)
	}
}

// Searchwise sends the header spelled "x-api-key", as the plugin reads it.
// Parsing a real request off the wire (rather than building one in memory)
// is what proves the lowercase spelling survives: net/http canonicalises
// header names as it reads them.
func TestHandlerReadsLowercaseHeaderFromTheWire(t *testing.T) {
	withoutDatabase(t)
	t.Setenv("SNAPPAY_FEED_API_KEY", "local-test-key")

	raw := "POST /api/snappay/feed HTTP/1.1\r\n" +
		"Host: voxcina.com\r\n" +
		"Content-Type: application/json\r\n" +
		"x-api-key: local-test-key\r\n" +
		"Content-Length: 2\r\n" +
		"\r\n{}"

	request, err := http.ReadRequest(bufio.NewReader(strings.NewReader(raw)))
	if err != nil {
		t.Fatalf("could not parse the wire request: %v", err)
	}

	recorder := httptest.NewRecorder()
	Handler(recorder, request)

	if recorder.Code == http.StatusUnauthorized {
		t.Fatal("lowercase x-api-key from the wire was not recognised")
	}
}

// Freshness is the entire argument for an API feed over a file feed; a cached
// answer would hand Searchwise yesterday's stock.
func TestHandlerNeverAllowsCaching(t *testing.T) {
	withoutDatabase(t)

	recorder := httptest.NewRecorder()
	Handler(recorder, postJSON(`{}`))

	if got := recorder.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", got)
	}
	if got := recorder.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Fatalf("Content-Type = %q", got)
	}
}

func TestMaxPagesArithmetic(t *testing.T) {
	cases := []struct {
		total, limit, want int
	}{
		{total: 0, limit: 100, want: 0},
		{total: 1, limit: 100, want: 1},
		{total: 100, limit: 100, want: 1},
		{total: 101, limit: 100, want: 2},
		{total: 250, limit: 100, want: 3},
		{total: 10, limit: 0, want: 0},
	}
	for _, c := range cases {
		if got := maxPagesFor(c.total, c.limit); got != c.want {
			t.Fatalf("maxPagesFor(%d, %d) = %d, want %d", c.total, c.limit, got, c.want)
		}
	}
}
