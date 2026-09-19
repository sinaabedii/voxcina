package snappayfeed

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
	"regexp"
	"strings"

	"backEnd/models"
)

// Description keys for the variant facts the catalog keeps outside
// Product.Attributes. The academy asks for structured key/value descriptions,
// and these two are what a clothing shopper filters on.
const (
	descColorKey = "رنگ"
	descSizeKey  = "سایز"
)

// shortDescriptionRunes caps short_description. Runes, not bytes: Persian is
// multi-byte and a byte cap would cut a character in half.
const shortDescriptionRunes = 300

// variantKeyLength is how much of the surrogate hash a legacy variant's key
// uses. 12 hex chars = 48 bits, far beyond collision range for a catalog of
// this size, and short enough to stay readable in a URL and a log line.
const variantKeyLength = 12

// ---------------------------------------------------------------------------
// Row identity
// ---------------------------------------------------------------------------

// variantKey is the stable per-variant identity used as the feed row's slug.
//
// ColorVariant.VariantID is stamped only on WRITE (handlers.ensureColorVariantIDs),
// so a product that has not been re-saved since that field landed can still
// carry empty IDs. The feed may not backfill it — it is read-only — so it
// derives a deterministic surrogate from the colour instead. The surrogate is
// stable for as long as the colour values are, and the row silently upgrades
// to the real variant_id the next time an admin saves the product.
func variantKey(productID string, v models.ColorVariant) string {
	if id := strings.TrimSpace(v.VariantID); id != "" {
		return id
	}
	sum := sha256.Sum256([]byte(productID + "|" + strings.TrimSpace(v.Color) + "|" + strings.TrimSpace(v.ColorName)))
	return hex.EncodeToString(sum[:])[:variantKeyLength]
}

// variantLinkParam returns the query parameter that deep-links the storefront
// to this colour. It mirrors ProductCard/ProductGridItem exactly: ?variant=
// when the variant has an ID, ?color= otherwise.
func variantLinkParam(v models.ColorVariant) (name, value string) {
	if id := strings.TrimSpace(v.VariantID); id != "" {
		return "variant", id
	}
	if c := strings.TrimSpace(v.Color); c != "" {
		return "color", c
	}
	return "color", strings.TrimSpace(v.ColorName)
}

// rowID composes the feed's unique row id. Source #3's first rule is that no
// two rows may share an id; product id + variant key guarantees it and stays
// reversible (ObjectID hex contains no "-").
func rowID(productID, key string) string {
	if key == "" {
		return productID
	}
	return productID + "-" + key
}

// splitRowID reverses rowID. It accepts a bare product id too, because
// products= may legitimately carry either form.
func splitRowID(value string) (productID, key string) {
	value = strings.TrimSpace(value)
	if i := strings.Index(value, "-"); i > 0 {
		return value[:i], value[i+1:]
	}
	return value, ""
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

// priceRials converts a stored Toman price to the Rials the academy asks for.
func priceRials(toman float64) int64 {
	if toman <= 0 {
		return 0
	}
	return int64(math.Round(toman * 10))
}

// regularPriceToman is the pre-discount price. OriginalPrice is 0 on products
// that never had a discount, and a 0 regular_price would read as free.
func regularPriceToman(p models.Product) float64 {
	if p.OriginalPrice > 0 {
		return p.OriginalPrice
	}
	return p.Price
}

// ---------------------------------------------------------------------------
// Availability — per variant, never borrowed from a sibling colour
// ---------------------------------------------------------------------------

// variantInStock reports whether THIS colour can be bought: the product is
// visible and this variant has at least one size with stock. Product.InStock
// is deliberately ignored — it is the aggregate across every colour, so using
// it would advertise a sold-out colour as available.
func variantInStock(p models.Product, v models.ColorVariant) bool {
	if !p.IsActive {
		return false
	}
	for _, size := range v.Sizes {
		if size.Quantity > 0 {
			return true
		}
	}
	return false
}

// productInStock is the aggregate used by the product-granularity escape hatch.
func productInStock(p models.Product) bool {
	if !p.IsActive {
		return false
	}
	for _, v := range p.ColorVariants {
		if variantInStock(p, v) {
			return true
		}
	}
	return false
}

// availabilityWord renders the configured vocabulary. The plugin emits
// WooCommerce's get_stock_status() words (L230); the academy field list spells
// them with a space. onbackorder is never emitted — the catalog has no
// backorder concept.
func availabilityWord(cfg Config, inStock bool) string {
	if cfg.AvailabilityStyle == availabilityStyleGuide {
		if inStock {
			return "in stock"
		}
		return "out of stock"
	}
	if inStock {
		return "instock"
	}
	return "outofstock"
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

// variantTitle appends the colour to the product name, which source #2
// requires ("omitting variant specifics" is listed as a mistake). It skips the
// suffix when the name already carries that colour, so a product named
// "پیراهن مردانه آبی" does not become "پیراهن مردانه آبی آبی".
func variantTitle(p models.Product, v models.ColorVariant) string {
	name := strings.TrimSpace(p.Name)
	color := strings.TrimSpace(v.ColorName)
	if color == "" || name == "" {
		if name == "" {
			return color
		}
		return name
	}
	if strings.Contains(name, color) {
		return name
	}
	return name + " " + color
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

// variantImages puts THIS colour's own photos first, then falls back to the
// shared main images. SwatchImage and TryOnImage are never included: one is a
// fabric chip and the other an AR asset, and source #3 calls out thumbnails
// and non-product images as a datafeed mistake.
func variantImages(p models.Product, v models.ColorVariant, baseURL string) []string {
	images := make([]string, 0, len(v.Images)+len(p.MainImages))
	seen := make(map[string]bool, len(v.Images)+len(p.MainImages))
	images = appendImages(images, seen, baseURL, v.Images)
	images = appendImages(images, seen, baseURL, p.MainImages)
	return images
}

// productImages is the aggregated variant of the above: main images first,
// then every colour's photos.
func productImages(p models.Product, baseURL string) []string {
	images := make([]string, 0, len(p.MainImages)+4*len(p.ColorVariants))
	seen := make(map[string]bool, len(images))
	images = appendImages(images, seen, baseURL, p.MainImages)
	for _, v := range p.ColorVariants {
		images = appendImages(images, seen, baseURL, v.Images)
	}
	return images
}

func appendImages(dst []string, seen map[string]bool, baseURL string, values []string) []string {
	for _, raw := range values {
		abs := absoluteURL(baseURL, raw)
		if abs == "" || seen[abs] {
			continue
		}
		seen[abs] = true
		dst = append(dst, abs)
	}
	return dst
}

// absoluteURL turns a stored "/uploads/..." path into a full URL. Values that
// are already absolute are passed through untouched.
func absoluteURL(baseURL, ref string) string {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return ""
	}
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") || strings.HasPrefix(ref, "//") {
		return ref
	}
	if !strings.HasPrefix(ref, "/") {
		ref = "/" + ref
	}
	return strings.TrimRight(baseURL, "/") + ref
}

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

// inStockSizes lists the size codes a shopper can actually buy in this colour,
// in the order the admin entered them.
func inStockSizes(v models.ColorVariant) []string {
	sizes := make([]string, 0, len(v.Sizes))
	seen := make(map[string]bool, len(v.Sizes))
	for _, size := range v.Sizes {
		code := strings.TrimSpace(size.Size)
		if code == "" || size.Quantity <= 0 || seen[code] {
			continue
		}
		seen[code] = true
		sizes = append(sizes, code)
	}
	return sizes
}

// allInStockSizes is the union across colours, for product granularity.
func allInStockSizes(p models.Product) []string {
	sizes := make([]string, 0)
	seen := make(map[string]bool)
	for _, v := range p.ColorVariants {
		for _, code := range inStockSizes(v) {
			if seen[code] {
				continue
			}
			seen[code] = true
			sizes = append(sizes, code)
		}
	}
	return sizes
}

// colorNames lists every colour of a product, for product granularity.
func colorNames(p models.Product) []string {
	names := make([]string, 0, len(p.ColorVariants))
	seen := make(map[string]bool, len(p.ColorVariants))
	for _, v := range p.ColorVariants {
		name := strings.TrimSpace(v.ColorName)
		if name == "" {
			name = strings.TrimSpace(v.Color)
		}
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	return names
}

// ---------------------------------------------------------------------------
// description object
// ---------------------------------------------------------------------------

// attributeMap copies Product.Attributes into the description object. The
// plugin's rule is reproduced below in the callers: one value serialises as a
// string, several as an array.
func attributeMap(p models.Product) map[string]any {
	out := make(map[string]any, len(p.Attributes)+2)
	for _, attr := range p.Attributes {
		name := strings.TrimSpace(attr.Name)
		value := strings.TrimSpace(attr.Value)
		if name == "" || value == "" {
			continue
		}
		out[name] = value
	}
	return out
}

// variantDescription is the attributes plus this colour's own facts.
func variantDescription(p models.Product, v models.ColorVariant) map[string]any {
	out := attributeMap(p)
	if color := strings.TrimSpace(v.ColorName); color != "" {
		out[descColorKey] = color
	}
	if sizes := inStockSizes(v); len(sizes) > 0 {
		out[descSizeKey] = singleOrList(sizes)
	}
	return out
}

// productDescription is the aggregated variant of the above.
func productDescription(p models.Product) map[string]any {
	out := attributeMap(p)
	if colors := colorNames(p); len(colors) > 0 {
		out[descColorKey] = singleOrList(colors)
	}
	if sizes := allInStockSizes(p); len(sizes) > 0 {
		out[descSizeKey] = singleOrList(sizes)
	}
	return out
}

// singleOrList reproduces the plugin's shape rule (L280): a lone option is a
// string, several options are an array.
func singleOrList(values []string) any {
	if len(values) == 1 {
		return values[0]
	}
	return values
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

var (
	tagPattern        = regexp.MustCompile(`<[^>]*>`)
	whitespacePattern = regexp.MustCompile(`\s+`)
)

// plainText strips the HTML an admin description may contain and collapses
// whitespace. Source #3 asks for clean, structured text rather than markup.
func plainText(value string) string {
	value = tagPattern.ReplaceAllString(value, " ")
	value = strings.NewReplacer("&nbsp;", " ", "&amp;", "&", "&lt;", "<", "&gt;", ">", "&quot;", `"`).Replace(value)
	return strings.TrimSpace(whitespacePattern.ReplaceAllString(value, " "))
}

// shortDescription is the plain-text description truncated on a word boundary.
func shortDescription(value string) string {
	text := plainText(value)
	runes := []rune(text)
	if len(runes) <= shortDescriptionRunes {
		return text
	}
	cut := string(runes[:shortDescriptionRunes])
	if i := strings.LastIndex(cut, " "); i > 0 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "…"
}
