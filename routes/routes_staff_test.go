package routes

import (
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

// staffReachableAdminRoutes is the exact set of /api/admin endpoints the
// restricted "staff" back-office role may call: the catalog and content
// sections it owns (products, categories, brands, blogs, tickets) plus the AI
// helpers embedded in the product editor.
//
// Everything else under /api/admin is admin-only, and stays that way by
// default: a route reaches staff only by being registered on staffRouter.
// This list is asserted to match the router exactly — in BOTH directions — so
// adding an endpoint to the staff subrouter without widening a staff member's
// intended reach on purpose fails here rather than in production.
var staffReachableAdminRoutes = []string{
	"GET /api/admin/products",
	"POST /api/admin/products",
	"GET /api/admin/products/{id}/cart-usage",
	"PUT /api/admin/products/{id}",
	"DELETE /api/admin/products/{id}",

	"POST /api/admin/categories",
	"PUT /api/admin/categories/{id}",
	"DELETE /api/admin/categories/{id}",
	"GET /api/admin/avatars",

	"POST /api/admin/brands",
	"PUT /api/admin/brands/{id}",
	"DELETE /api/admin/brands/{id}",

	"GET /api/admin/tickets",
	"PUT /api/admin/tickets/{ticketId}/status",

	"GET /api/admin/blog-posts",
	"PATCH /api/admin/blog-posts/{id}/blocks",
	"GET /api/admin/blog-posts/{id}/product-blocks/search",
	"POST /api/admin/blog-posts/{id}/product-blocks/{order}/auto-match",
	"PATCH /api/admin/blog-posts/{id}/product-blocks/{order}",
	"POST /api/admin/blog-posts/{id}/publish",
	"POST /api/admin/blog-posts/{id}/unpublish",
	"POST /api/admin/blog-posts/{id}/archive",
	"POST /api/admin/blog-posts/{id}/restore",
	"POST /api/admin/blog-posts/{id}/media",
	"DELETE /api/admin/blog-posts/{id}/media/{mediaId}",

	"GET /api/admin/blog-categories",
	"POST /api/admin/blog-categories",
	"PUT /api/admin/blog-categories/{id}",
	"DELETE /api/admin/blog-categories/{id}",
	"DELETE /api/admin/blog-categories/{id}/hard",
	"POST /api/admin/blog-categories/{id}/restore",
	"POST /api/admin/blog-categories/recount",

	"POST /api/admin/blog-runs",
	"GET /api/admin/blog-runs",
	"GET /api/admin/blog-runs/{id}",
	"DELETE /api/admin/blog-runs/{id}",
	"POST /api/admin/blog-runs/{id}/approve",
	"POST /api/admin/blog-runs/{id}/research",
	"POST /api/admin/blog-runs/{id}/write",
	"POST /api/admin/blog-runs/{id}/prompts",
}

// staffReachableWhenAIEnabled holds the product-editor AI helpers. They are
// registered only when handlers.NewAIMetadataHandler() succeeds, which needs
// config/ai_prompts.json relative to the process working directory — true for
// the server, not for `go test ./routes`. So they are allowed but not required.
var staffReachableWhenAIEnabled = []string{
	"GET /api/admin/ai/field-descriptions",
	"GET /api/admin/ai/models",
	"POST /api/admin/ai/generate-metadata",
	"POST /api/admin/ai/generate-variant-metadata",
}

// sectionsClosedToStaff names admin areas that must never appear on the staff
// subrouter. The set-equality assertion below already covers them, but naming
// them makes the failure message say what actually leaked.
var sectionsClosedToStaff = []string{
	"/api/admin/users",
	"/api/admin/orders",
	"/api/admin/return-requests",
	"/api/admin/carts",
	"/api/admin/discounts",
	"/api/admin/vouchers",
	"/api/admin/reviews",
	"/api/admin/external-services",
	"/api/admin/dashboard-stats",
	"/api/admin/activity",
	"/api/admin/chat",
	"/api/admin/ai/settings",
	"/api/admin/ai/tryon-chats",
	"/api/admin/career-submissions",
	"/api/admin/job-positions",
	"/api/admin/shop-collections",
	"/api/admin/sliders",
	"/api/admin/hero-images",
	"/api/admin/faqs",
}

// collectAdminRoutes returns "METHOD /path" entries for every admin endpoint,
// split by the gate it sits behind. The gate is read from the named PathPrefix
// route that owns the subrouter, so this reflects the real middleware wiring
// rather than a parallel list of path strings.
func collectAdminRoutes(t *testing.T) (staff, adminOnly []string) {
	t.Helper()

	router := NewRouter()
	err := router.Walk(func(route *mux.Route, _ *mux.Router, ancestors []*mux.Route) error {
		tmpl, err := route.GetPathTemplate()
		if err != nil || !strings.HasPrefix(tmpl, "/api/admin/") {
			return nil
		}
		methods, err := route.GetMethods()
		if err != nil || len(methods) == 0 {
			// PathPrefix parents carry no methods; they are not dispatch targets.
			return nil
		}

		gate := ""
		for _, ancestor := range ancestors {
			switch ancestor.GetName() {
			case StaffPrefixRouteName, AdminPrefixRouteName:
				gate = ancestor.GetName()
			}
		}
		if gate == "" {
			t.Errorf("%s sits under /api/admin but behind neither admin gate", tmpl)
			return nil
		}

		for _, method := range methods {
			entry := method + " " + tmpl
			if gate == StaffPrefixRouteName {
				staff = append(staff, entry)
			} else {
				adminOnly = append(adminOnly, entry)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking router: %v", err)
	}
	return staff, adminOnly
}

// TestStaffReachableAdminRoutes pins exactly which admin endpoints the staff
// role can reach. It fails both ways: an endpoint that quietly becomes
// staff-reachable, and one the dashboard's staff sections need that quietly
// stopped being reachable.
func TestStaffReachableAdminRoutes(t *testing.T) {
	staff, _ := collectAdminRoutes(t)

	allowed := make(map[string]bool, len(staffReachableAdminRoutes)+len(staffReachableWhenAIEnabled))
	for _, e := range staffReachableAdminRoutes {
		allowed[e] = true
	}
	for _, e := range staffReachableWhenAIEnabled {
		allowed[e] = true
	}

	registered := make(map[string]bool, len(staff))
	for _, e := range staff {
		registered[e] = true
		if !allowed[e] {
			t.Errorf("%s is reachable by staff but is not in staffReachableAdminRoutes — widen the list deliberately or move the route back to adminRouter", e)
		}
	}

	for _, e := range staffReachableAdminRoutes {
		if !registered[e] {
			t.Errorf("%s is listed as staff-reachable but is not registered on the staff subrouter", e)
		}
	}
}

// TestAdminOnlySectionsClosedToStaff asserts the sensitive sections never drift
// onto the staff subrouter.
func TestAdminOnlySectionsClosedToStaff(t *testing.T) {
	staff, _ := collectAdminRoutes(t)

	for _, entry := range staff {
		path := entry[strings.Index(entry, " ")+1:]
		for _, closed := range sectionsClosedToStaff {
			if path == closed || strings.HasPrefix(path, closed+"/") {
				t.Errorf("%s is admin-only but is registered on the staff subrouter", entry)
			}
		}
	}
}

// TestEveryAdminRouteHasAGate guards the fallthrough design: both subrouters
// share the /api/admin prefix, so a route registered on neither would be
// unreachable, and one registered on a third, ungated subrouter would be open.
func TestEveryAdminRouteHasAGate(t *testing.T) {
	staff, adminOnly := collectAdminRoutes(t)
	if len(staff) == 0 {
		t.Fatal("no staff-reachable admin routes found; the staff subrouter is not wired up")
	}
	if len(adminOnly) == 0 {
		t.Fatal("no admin-only routes found; the admin subrouter is not wired up")
	}
}

// TestNoAdminRouteRegisteredTwice catches a method+path registered on both
// subrouters. staffRouter matches first, so the adminRouter copy would be dead
// code and the endpoint would be quietly open to staff.
func TestNoAdminRouteRegisteredTwice(t *testing.T) {
	staff, adminOnly := collectAdminRoutes(t)

	onStaff := make(map[string]bool, len(staff))
	for _, entry := range staff {
		onStaff[entry] = true
	}
	for _, entry := range adminOnly {
		if onStaff[entry] {
			t.Errorf("%s is registered on both subrouters; the admin-only copy is unreachable", entry)
		}
	}
}
