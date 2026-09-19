package snappayfeed

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

func postJSON(body string) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/api/snappay/feed", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	return r
}

func postForm(body string) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/api/snappay/feed", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return r
}

func TestParseRequestDefaults(t *testing.T) {
	req := parseRequest(postJSON(`{}`))

	if req.Limit != defaultLimit {
		t.Fatalf("limit = %d, want the plugin's code default %d", req.Limit, defaultLimit)
	}
	if req.Page != 1 {
		t.Fatalf("page = %d, want 1", req.Page)
	}
	if req.IncludeContent {
		t.Fatal("include_content should default to false")
	}
	if req.Targeted() {
		t.Fatal("an empty body is a crawl page, not a targeted refresh")
	}
}

// WordPress reads a parameter from the JSON body, a form body or the query
// interchangeably, so a crawler configured against the plugin may use any.
func TestParseRequestAcceptsEveryTransport(t *testing.T) {
	jsonReq := parseRequest(postJSON(`{"limit": 25, "page": 3, "products": "a,b", "include_content": true}`))
	if jsonReq.Limit != 25 || jsonReq.Page != 3 || jsonReq.IncludeContent != true {
		t.Fatalf("json body parsed as %+v", jsonReq)
	}
	if !reflect.DeepEqual(jsonReq.Products, []string{"a", "b"}) {
		t.Fatalf("json products = %#v", jsonReq.Products)
	}

	formReq := parseRequest(postForm("limit=25&page=3&slugs=x,y&include_content=1"))
	if formReq.Limit != 25 || formReq.Page != 3 || !formReq.IncludeContent {
		t.Fatalf("form body parsed as %+v", formReq)
	}
	if !reflect.DeepEqual(formReq.Slugs, []string{"x", "y"}) {
		t.Fatalf("form slugs = %#v", formReq.Slugs)
	}

	queryReq := parseRequest(httptest.NewRequest(http.MethodPost, "/api/snappay/feed?limit=7&page=2", nil))
	if queryReq.Limit != 7 || queryReq.Page != 2 {
		t.Fatalf("query parsed as %+v", queryReq)
	}
}

// JSON numbers arrive as float64; a caller sending "limit": 25 must not be
// read as 0.
func TestParseRequestNumericAndStringLimits(t *testing.T) {
	if got := parseRequest(postJSON(`{"limit": "40"}`)).Limit; got != 40 {
		t.Fatalf("string limit = %d", got)
	}
	if got := parseRequest(postJSON(`{"limit": 40}`)).Limit; got != 40 {
		t.Fatalf("numeric limit = %d", got)
	}
}

func TestParseRequestClampsAndFallsBack(t *testing.T) {
	if got := parseRequest(postJSON(`{"limit": 99999}`)).Limit; got != maxLimit {
		t.Fatalf("limit not clamped: %d", got)
	}
	// intval("abc") is 0 in PHP and the plugin then falls back to its default;
	// erroring instead would hand the crawler an empty catalog.
	if got := parseRequest(postForm("limit=abc&page=-4")).Limit; got != defaultLimit {
		t.Fatalf("bad limit = %d, want the default", got)
	}
	if got := parseRequest(postForm("limit=abc&page=-4")).Page; got != 1 {
		t.Fatalf("bad page = %d, want 1", got)
	}
}

// A non-WordPress client is likely to send a real JSON array here.
func TestParseRequestAcceptsJSONArrays(t *testing.T) {
	req := parseRequest(postJSON(`{"products": ["a", "b"], "slugs": ["c"]}`))
	if !reflect.DeepEqual(req.Products, []string{"a", "b"}) {
		t.Fatalf("products = %#v", req.Products)
	}
	if !reflect.DeepEqual(req.Slugs, []string{"c"}) {
		t.Fatalf("slugs = %#v", req.Slugs)
	}
	if !req.Targeted() {
		t.Fatal("products/slugs must mark the request as targeted")
	}
}

func TestParseRequestIncludeContentSpellings(t *testing.T) {
	for _, body := range []string{`{"include_content": true}`, `{"include_content": "true"}`, `{"include_content": "1"}`, `{"include_content": "yes"}`} {
		if !parseRequest(postJSON(body)).IncludeContent {
			t.Fatalf("include_content not recognised in %s", body)
		}
	}
	for _, body := range []string{`{"include_content": false}`, `{"include_content": "0"}`, `{}`} {
		if parseRequest(postJSON(body)).IncludeContent {
			t.Fatalf("include_content wrongly enabled by %s", body)
		}
	}
}
