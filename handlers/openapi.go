package handlers

import (
	_ "embed"
	"encoding/json"
	"net/http"
)

// The OpenAPI document served to authenticated admins. It is embedded at
// build time so the binary carries its own API reference; the Swagger UI at
// https://voxcina.com/swagger fetches it through the storefront's /api proxy
// and attaches the caller's Bearer token, so the spec is never public.

//go:embed docs/openapi.json
var openAPISpec []byte

// GetOpenAPISpec handles GET /api/admin/docs/openapi.json (admin only).
func GetOpenAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Personal surface: never cached by browsers, proxies or the CDN.
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(openAPISpec)
}

// compile-time guard that the embedded document is well-formed JSON
var _ = json.Valid(openAPISpec)
