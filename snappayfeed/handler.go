package snappayfeed

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/db"
	"backEnd/models"
)

// requestTimeout bounds the catalog reads. A crawl page is one indexed scan;
// anything slower than this is a symptom, not a slow query worth waiting for.
const requestTimeout = 20 * time.Second

// database is indirected so a test can run the handler without Mongo. It is
// the package's only link to the global connection.
var database = func() *mongo.Database { return db.Database }

// Handler serves POST /api/snappay/feed — published to Searchwise as
// /wp-json/v1/product/feed (see README.md for the routing).
func Handler(w http.ResponseWriter, r *http.Request) {
	// WordPress routes before it authenticates, and answers a method mismatch
	// with rest_no_route — reproduced here so a browser check during
	// onboarding sees a structured API response, not a bare 404.
	if r.Method != http.MethodPost {
		writeError(w, http.StatusNotFound, "rest_no_route", "No route was found matching the URL and request method.")
		return
	}

	cfg := LoadConfig()

	// Header lookup is case-insensitive in net/http, so the plugin's
	// lowercase x-api-key matches.
	if err := authorize(r.Context(), cfg, r.Header.Get("X-API-Key"), nil); err != nil {
		writeAuthError(w, err)
		return
	}

	req := parseRequest(r)

	mongoDB := database()
	if mongoDB == nil {
		writeError(w, http.StatusServiceUnavailable, "error", "Catalog is unavailable.")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	repo := repository{db: mongoDB}

	categories, err := repo.categoryPaths(ctx)
	if err != nil {
		// A breadcrumb is not worth failing a crawl over: the rows are still
		// valid without the category array.
		log.Printf("SNAPPAY_FEED_CATEGORIES_FAILED: %v", err)
		categories = map[string]string{}
	}

	opts := buildOptions{cfg: cfg, categories: categories, includeContent: req.IncludeContent}

	var response feedResponse
	if req.Targeted() {
		response, err = targetedResponse(ctx, repo, req, opts)
	} else {
		response, err = pagedResponse(ctx, repo, req, opts)
	}
	if err != nil {
		log.Printf("SNAPPAY_FEED_QUERY_FAILED: %v", err)
		writeError(w, http.StatusInternalServerError, "error", "Could not read the catalog.")
		return
	}

	writeJSON(w, http.StatusOK, response)
}

// pagedResponse answers a full crawl page and reports the totals. In variant
// granularity these count feed ROWS (colour variants), which is what the
// crawler is paginating through.
func pagedResponse(ctx context.Context, repo repository, req feedRequest, opts buildOptions) (feedResponse, error) {
	products, total, err := repo.page(ctx, opts.cfg, req.Limit, req.Page)
	if err != nil {
		return feedResponse{}, err
	}

	response := newResponse(buildRows(products, opts))

	maxPages := maxPagesFor(total, req.Limit)
	response.Count = &total
	response.MaxPages = &maxPages
	return response, nil
}

// maxPagesFor mirrors WP_Query's max_num_pages: how many pages of this size
// the crawler has to walk to see everything.
func maxPagesFor(total, limit int) int {
	if total <= 0 || limit <= 0 {
		return 0
	}
	return (total + limit - 1) / limit
}

// targetedResponse answers a products=/slugs= refresh. It omits count and
// max_pages, exactly like the plugin does on this path (L157-181), and skips
// anything it cannot resolve rather than erroring.
func targetedResponse(ctx context.Context, repo repository, req feedRequest, opts buildOptions) (feedResponse, error) {
	wholeProducts := map[string]bool{}
	wantedKeys := map[string]bool{}
	productIDs := []primitive.ObjectID{}
	seenID := map[string]bool{}

	// products= accepts a bare product id (refresh every colour) or a
	// composite "<productID>-<variantKey>" row id (refresh that one colour).
	for _, entry := range req.Products {
		productHex, key := splitRowID(entry)
		objectID, err := primitive.ObjectIDFromHex(productHex)
		if err != nil {
			continue
		}
		if !seenID[productHex] {
			seenID[productHex] = true
			productIDs = append(productIDs, objectID)
		}
		if key == "" {
			wholeProducts[productHex] = true
		} else {
			wantedKeys[key] = true
		}
	}

	// slugs= carries bare variant keys, which is what the feed puts in `slug`.
	for _, slug := range req.Slugs {
		wantedKeys[slug] = true
	}

	products, err := repo.byProductIDs(ctx, productIDs)
	if err != nil {
		return feedResponse{}, err
	}
	collected := map[string]models.Product{}
	for _, p := range products {
		collected[p.ID.Hex()] = p
	}

	if len(req.Slugs) > 0 {
		bySlug, err := repo.byVariantIDs(ctx, req.Slugs)
		if err != nil {
			return feedResponse{}, err
		}
		for _, p := range bySlug {
			collected[p.ID.Hex()] = p
		}

		// Any slug still unaccounted for is either unknown or a surrogate key
		// belonging to a variant that predates variant_id. Only then do we pay
		// for the fallback scan.
		if unresolved := unresolvedKeys(req.Slugs, collected); len(unresolved) > 0 {
			ids, err := repo.resolveSurrogateKeys(ctx, unresolved)
			if err != nil {
				return feedResponse{}, err
			}
			legacy, err := repo.byProductIDs(ctx, ids)
			if err != nil {
				return feedResponse{}, err
			}
			for _, p := range legacy {
				collected[p.ID.Hex()] = p
			}
		}
	}

	rows := []feedRow{}
	emitted := map[string]bool{}
	for _, p := range collected {
		rowOpts := opts
		if !wholeProducts[p.ID.Hex()] {
			rowOpts.variantKeys = wantedKeys
		}
		for _, row := range buildRows([]models.Product{p}, rowOpts) {
			if emitted[row.ID] {
				continue
			}
			emitted[row.ID] = true
			rows = append(rows, row)
		}
	}

	return newResponse(rows), nil
}

// unresolvedKeys reports which requested slugs no already-fetched variant
// answers to.
func unresolvedKeys(slugs []string, collected map[string]models.Product) map[string]bool {
	found := map[string]bool{}
	for hex, p := range collected {
		for _, v := range p.ColorVariants {
			found[variantKey(hex, v)] = true
		}
	}

	unresolved := map[string]bool{}
	for _, slug := range slugs {
		if !found[slug] {
			unresolved[slug] = true
		}
	}
	return unresolved
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

// wpError mirrors the JSON WordPress produces for a WP_Error, so a client
// written against the plugin parses our failures with the same code path.
type wpError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Status int `json:"status"`
	} `json:"data"`
}

func writeAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errValidatorUnreachable):
		writeError(w, http.StatusServiceUnavailable, "error", "Authentication server could not be reached.")
	default:
		// Missing and invalid keys answer alike, as the plugin does: it never
		// distinguishes them, and neither should we.
		writeError(w, http.StatusUnauthorized, "rest_forbidden", "Invalid API Key.")
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	payload := wpError{Code: code, Message: message}
	payload.Data.Status = status
	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// The whole point of an API feed over a file feed is freshness; a cached
	// response would hand Searchwise yesterday's stock.
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("SNAPPAY_FEED_ENCODE_FAILED: %v", err)
	}
}
