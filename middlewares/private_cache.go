package middlewares

import "net/http"

// markPrivate tells every cache between this process and the browser that the
// response belongs to one caller and must not be stored.
//
// Authenticated API responses used to leave Cache-Control unset entirely, so
// the only thing keeping them out of a shared cache was a single CDN page rule
// ("/api/* → cache off"). That is one checkbox away from a cross-user leak:
// /api/tryon/history carries no query string and no cookie — every user asks
// for the byte-identical URL and is named only in the Authorization header — so
// any cache that stores it (a reordered page rule, a new domain in front, or
// plain heuristic freshness on a 200 with no expiry) hands the first caller's
// try-on photos to everyone who asks next.
//
// `private` covers shared caches, `no-store` covers the browser's own, and the
// added Vary keeps the Authorization header in the cache key for anything that
// stores the response despite both.
func markPrivate(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Add("Vary", "Authorization")
}
