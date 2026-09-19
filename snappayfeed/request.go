package snappayfeed

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// maxBodyBytes bounds what the endpoint will read. A feed request is a handful
// of parameters; anything larger is a mistake or an attack.
const maxBodyBytes = 1 << 20

// feedRequest is the parsed, validated parameter set.
type feedRequest struct {
	Limit          int
	Page           int
	Products       []string
	Slugs          []string
	IncludeContent bool
}

// Targeted reports whether this is a products=/slugs= refresh rather than a
// full crawl page. The distinction matters twice: targeted answers skip
// pagination, and the plugin omits count/max_pages for them.
func (f feedRequest) Targeted() bool {
	return len(f.Products) > 0 || len(f.Slugs) > 0
}

// parseRequest reads parameters from a JSON body, a form body, or the query
// string — in that order of precedence.
//
// WordPress hands all three to $request->get_param() interchangeably, so a
// crawler configured against the plugin may legitimately use any of them. The
// cost of accepting all three here is a dozen lines; the cost of guessing
// wrong is a silent empty feed.
func parseRequest(r *http.Request) feedRequest {
	body, _ := io.ReadAll(io.LimitReader(r.Body, maxBodyBytes))

	var jsonParams map[string]any
	if looksLikeJSON(body) {
		_ = json.Unmarshal(body, &jsonParams)
	}

	// Restore the body so ParseForm can still read a urlencoded payload.
	r.Body = io.NopCloser(bytes.NewReader(body))
	_ = r.ParseForm()

	src := paramSource{json: jsonParams, form: r.Form}

	req := feedRequest{
		Limit:          defaultLimit,
		Page:           1,
		Products:       src.list("products"),
		Slugs:          src.list("slugs"),
		IncludeContent: isTruthy(src.get("include_content")),
	}

	// Invalid numbers fall back to the defaults rather than erroring: the
	// plugin's intval() does the same, and a crawler that sends limit=abc
	// should still get a feed.
	if n, err := strconv.Atoi(strings.TrimSpace(src.get("limit"))); err == nil && n > 0 {
		req.Limit = n
	}
	if req.Limit > maxLimit {
		req.Limit = maxLimit
	}
	if n, err := strconv.Atoi(strings.TrimSpace(src.get("page"))); err == nil && n > 0 {
		req.Page = n
	}

	return req
}

func looksLikeJSON(body []byte) bool {
	trimmed := bytes.TrimSpace(body)
	return len(trimmed) > 0 && trimmed[0] == '{'
}

// paramSource resolves one parameter name across the accepted transports.
type paramSource struct {
	json map[string]any
	form url.Values
}

func (s paramSource) get(key string) string {
	if raw, ok := s.json[key]; ok {
		if value := scalarString(raw); value != "" {
			return value
		}
	}
	return s.form.Get(key)
}

// list splits a comma-separated parameter, and also accepts a JSON array —
// which a non-WordPress client is likely to send for products/slugs.
func (s paramSource) list(key string) []string {
	if raw, ok := s.json[key]; ok {
		if values, ok := raw.([]any); ok {
			return cleanList(values)
		}
	}
	return splitList(s.get(key))
}

func splitList(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func cleanList(values []any) []string {
	out := make([]string, 0, len(values))
	for _, raw := range values {
		if value := strings.TrimSpace(scalarString(raw)); value != "" {
			out = append(out, value)
		}
	}
	return out
}

// scalarString renders a JSON scalar the way a form value would have arrived,
// so the rest of the parser has one type to deal with.
func scalarString(raw any) string {
	switch value := raw.(type) {
	case string:
		return value
	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(value)
	default:
		return ""
	}
}
