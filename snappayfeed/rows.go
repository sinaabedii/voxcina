package snappayfeed

import (
	"net/url"
	"strings"

	"backEnd/models"
)

// buildOptions carries everything the pure row builders need. Keeping it a
// plain value (no Mongo handle, no *http.Request) is what makes the whole
// mapping layer unit-testable without a database.
type buildOptions struct {
	cfg Config

	// categories maps a category ObjectID hex to its breadcrumb path,
	// resolved once per request.
	categories map[string]string

	includeContent bool

	// variantKeys, when non-empty, restricts variant rows to exactly these
	// keys. It is how a targeted `products=<productID>-<variantKey>` refresh
	// answers with one colour instead of all of them.
	variantKeys map[string]bool
}

// buildRows converts catalog documents into feed rows, honouring the
// configured granularity.
func buildRows(products []models.Product, opts buildOptions) []feedRow {
	rows := make([]feedRow, 0, len(products))
	for _, p := range products {
		if opts.cfg.Granularity == GranularityProduct {
			row, ok := productRow(p, opts)
			if ok {
				rows = append(rows, row)
			}
			continue
		}
		for _, v := range p.ColorVariants {
			row, ok := variantRow(p, v, opts)
			if ok {
				rows = append(rows, row)
			}
		}
	}
	return rows
}

// variantRow renders one colour as its own sellable row: its own id, its own
// deep link, its own photos and its own stock state.
func variantRow(p models.Product, v models.ColorVariant, opts buildOptions) (feedRow, bool) {
	productID := p.ID.Hex()
	key := variantKey(productID, v)

	if len(opts.variantKeys) > 0 && !opts.variantKeys[key] {
		return feedRow{}, false
	}

	inStock := variantInStock(p, v)
	if !inStock && opts.cfg.SkipOutOfStock {
		return feedRow{}, false
	}

	row := feedRow{
		ID:               rowID(productID, key),
		Slug:             key,
		Title:            variantTitle(p, v),
		RegularPrice:     priceRials(regularPriceToman(p)),
		SalePrice:        priceRials(p.Price),
		Availability:     availabilityWord(opts.cfg, inStock),
		Category:         categoryPathsOf(p, opts),
		ImageLink:        variantImages(p, v, opts.cfg.BaseURL),
		Link:             variantLink(p, v, opts.cfg),
		ShortDescription: shortDescription(p.Description),
		Description:      variantDescription(p, v),
		Color:            strings.TrimSpace(v.ColorName),
		Size:             inStockSizes(v),
		Brand:            strings.TrimSpace(p.Brand),
	}
	if opts.includeContent {
		row.Content = plainText(p.Description)
	}
	return row, true
}

// productRow is the escape hatch (SNAPPAY_FEED_GRANULARITY=product): one row
// per product with every colour folded into it.
func productRow(p models.Product, opts buildOptions) (feedRow, bool) {
	inStock := productInStock(p)
	if !inStock && opts.cfg.SkipOutOfStock {
		return feedRow{}, false
	}

	productID := p.ID.Hex()
	row := feedRow{
		ID:               productID,
		Slug:             productID,
		Title:            strings.TrimSpace(p.Name),
		RegularPrice:     priceRials(regularPriceToman(p)),
		SalePrice:        priceRials(p.Price),
		Availability:     availabilityWord(opts.cfg, inStock),
		Category:         categoryPathsOf(p, opts),
		ImageLink:        productImages(p, opts.cfg.BaseURL),
		Link:             productLink(p, opts.cfg),
		ShortDescription: shortDescription(p.Description),
		Description:      productDescription(p),
		Size:             allInStockSizes(p),
		Brand:            strings.TrimSpace(p.Brand),
	}
	if colors := colorNames(p); len(colors) > 0 {
		row.Color = strings.Join(colors, ", ")
	}
	if opts.includeContent {
		row.Content = plainText(p.Description)
	}
	return row, true
}

// variantLink is the storefront's own deep link for this colour, byte for
// byte: /products/{productId}?variant={variantId}, or ?color= for a variant
// that predates variant IDs.
func variantLink(p models.Product, v models.ColorVariant, cfg Config) string {
	base := productLink(p, cfg)
	name, value := variantLinkParam(v)
	if value == "" {
		return base
	}
	return base + "?" + name + "=" + url.QueryEscape(value)
}

func productLink(p models.Product, cfg Config) string {
	return strings.TrimRight(cfg.BaseURL, "/") + "/products/" + p.ID.Hex()
}

// categoryPathsOf resolves the product's categories to breadcrumb strings.
// Source #3 rejects a flat "دیجیتال" and asks for "دیجیتال > موبایل و تبلت >
// گوشی موبایل"; categoryPaths() builds those chains from the existing
// parent_id links, with no schema change.
//
// A product tagged with both a category and its ancestor would otherwise emit
// both "زنانه" and "زنانه > کت و بارونی زنانه"; the shorter path adds nothing,
// because the longer one already contains it. Ancestor paths are dropped, so
// only the deepest paths survive.
func categoryPathsOf(p models.Product, opts buildOptions) []string {
	paths := make([]string, 0, len(p.CategoryIDs))
	seen := make(map[string]bool, len(p.CategoryIDs))
	for _, id := range p.CategoryIDs {
		path := opts.categories[id.Hex()]
		if path == "" || seen[path] {
			continue
		}
		seen[path] = true
		paths = append(paths, path)
	}
	return dropAncestorPaths(paths)
}

// dropAncestorPaths removes any path that is an ancestor of another path in
// the list, preserving the order of what remains. The " > " boundary is part
// of the prefix test, so "زنانه" is not treated as an ancestor of a
// hypothetical "زنانهپوشاک".
func dropAncestorPaths(paths []string) []string {
	if len(paths) < 2 {
		return paths
	}
	out := make([]string, 0, len(paths))
	for i, path := range paths {
		ancestor := false
		for j, other := range paths {
			if i != j && strings.HasPrefix(other, path+" > ") {
				ancestor = true
				break
			}
		}
		if !ancestor {
			out = append(out, path)
		}
	}
	return out
}
