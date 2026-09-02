package routes

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

// TestNoShadowedRoutes asserts that every literal path registered on the
// router is actually reachable.
//
// gorilla/mux matches in registration order, so registering "/products/{id}"
// before "/products/search" makes the latter dead code: the request is handed
// to GetProduct with id="search", which answers 400 "Invalid product ID". That
// had silently disabled /products/search, /products/recommendations,
// /products/smart-recommendations and /categories/homepage.
//
// The failure is invisible in review — both routes look correctly registered —
// so it is asserted here instead: any literal route that resolves to a
// different template is being swallowed by an earlier wildcard, and the fix is
// to register it above that wildcard.
func TestNoShadowedRoutes(t *testing.T) {
	router := NewRouter()

	err := router.Walk(func(route *mux.Route, _ *mux.Router, _ []*mux.Route) error {
		tmpl, err := route.GetPathTemplate()
		if err != nil || strings.Contains(tmpl, "{") {
			// Only literal paths can be shadowed by a wildcard.
			return nil
		}

		methods, err := route.GetMethods()
		if err != nil || len(methods) == 0 {
			// PathPrefix subrouter parents carry no methods and are not
			// dispatch targets.
			return nil
		}

		for _, method := range methods {
			var match mux.RouteMatch
			if !router.Match(httptest.NewRequest(method, tmpl, nil), &match) {
				t.Errorf("%s %s is registered but matches no route", method, tmpl)
				continue
			}
			matched, _ := match.Route.GetPathTemplate()
			if matched != tmpl {
				t.Errorf(
					"%s %s is shadowed by %s — register it before that wildcard",
					method, tmpl, matched,
				)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking router: %v", err)
	}
}
