package snappayfeed

import (
	"github.com/gorilla/mux"
)

// Register mounts the feed on the existing /api subrouter.
//
// It is the package's ONLY hook into the application. routes.go carries one
// import and one call; deleting those two lines plus this directory removes
// the feature completely (README.md, "Removing this feature").
//
// The route lives under /api because main.go mounts the gorilla router at
// "/api/" on a plain ServeMux — a root-level path such as /wp-json/... would
// never be handed to this router at all. The WooCommerce-identical public URL
// is produced by the edge instead (nginx, with the Next rewrite as fallback).
func Register(api *mux.Router) {
	// Deliberately not .Methods(POST): gorilla would answer a GET with a bare
	// "404 page not found" in text/plain. WordPress answers a method mismatch
	// on a registered REST route with a JSON rest_no_route body, and someone
	// checking the feed URL in a browser during onboarding should see that
	// rather than what looks like a broken endpoint. Handler enforces POST.
	api.HandleFunc(Path, Handler)
}
