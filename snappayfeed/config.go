package snappayfeed

import (
	"net/url"
	"os"
	"strings"
)

const (
	// PluginVersion is the Searchwise plugin release whose contract this
	// package reproduces. It is sent in the envelope and in every token
	// validation call, exactly like the plugin does. Bump it only after
	// re-reading their source — the wire format is theirs, not ours.
	PluginVersion = "1.0.2"

	// Path is the route under the /api subrouter. The public URL is the
	// WooCommerce-identical /wp-json/v1/product/feed, mapped here by a
	// Next.js rewrite (see README.md).
	Path = "/snappay/feed"

	// defaultValidateURL is the endpoint the plugin posts the presented key
	// to (searchwise-api-data-feed.php L70).
	defaultValidateURL = "https://merchants.searchwise.ir/api/v1/feed/validate-token"

	// defaultLimit mirrors the plugin's code default (L103). Its Readme says
	// 10; the code wins.
	defaultLimit = 100

	// maxLimit caps what a caller can ask for in one page. The plugin has no
	// cap because WordPress paginates for it; we scan Mongo, so we do.
	maxLimit = 500
)

// Feed granularity: one row per color variant (default, matches the
// storefront) or one aggregated row per product (escape hatch if Searchwise
// says their ingester expects product-level rows).
const (
	GranularityVariant = "variant"
	GranularityProduct = "product"
)

// availability vocabularies. The plugin emits WooCommerce's get_stock_status()
// words; the academy field list spells them with a space. They cannot both be
// right, so the choice is an env flip rather than a redeploy.
const (
	availabilityStylePlugin = "plugin"
	availabilityStyleGuide  = "guide"
)

// Config is resolved from the environment on every request: the values are
// cheap to read and an ops flip (granularity, availability wording) then takes
// effect on container restart without a rebuild.
type Config struct {
	// BaseURL is the public origin used to build link/image_link. Trailing
	// slash stripped.
	BaseURL string

	// APIKey, when set, is accepted directly as x-api-key. It exists so the
	// endpoint is testable before Searchwise provisions a real key.
	APIKey string

	// ValidateURL is the Searchwise token-validation endpoint.
	ValidateURL string

	// MerchantDomain is sent to Searchwise as merchant_domain. Defaults to the
	// host of BaseURL, which is what the plugin sends.
	MerchantDomain string

	// Granularity is GranularityVariant or GranularityProduct.
	Granularity string

	// AvailabilityStyle is availabilityStylePlugin or availabilityStyleGuide.
	AvailabilityStyle string

	// SkipOutOfStock drops sold-out rows instead of marking them outofstock.
	SkipOutOfStock bool
}

// LoadConfig reads the feed configuration from the environment.
func LoadConfig() Config {
	cfg := Config{
		BaseURL:           strings.TrimRight(strings.TrimSpace(os.Getenv("APP_URL")), "/"),
		APIKey:            strings.TrimSpace(os.Getenv("SNAPPAY_FEED_API_KEY")),
		ValidateURL:       strings.TrimSpace(os.Getenv("SNAPPAY_FEED_VALIDATE_URL")),
		MerchantDomain:    strings.TrimSpace(os.Getenv("SNAPPAY_FEED_MERCHANT_DOMAIN")),
		Granularity:       strings.ToLower(strings.TrimSpace(os.Getenv("SNAPPAY_FEED_GRANULARITY"))),
		AvailabilityStyle: strings.ToLower(strings.TrimSpace(os.Getenv("SNAPPAY_FEED_AVAILABILITY_STYLE"))),
		SkipOutOfStock:    isTruthy(os.Getenv("SNAPPAY_FEED_SKIP_OUT_OF_STOCK")),
	}

	if cfg.ValidateURL == "" {
		cfg.ValidateURL = defaultValidateURL
	}
	if cfg.Granularity != GranularityProduct {
		cfg.Granularity = GranularityVariant
	}
	if cfg.AvailabilityStyle != availabilityStyleGuide {
		cfg.AvailabilityStyle = availabilityStylePlugin
	}
	if cfg.MerchantDomain == "" {
		cfg.MerchantDomain = hostOf(cfg.BaseURL)
	}

	return cfg
}

// hostOf extracts the bare host from an origin, tolerating a value that was
// configured without a scheme.
func hostOf(origin string) string {
	if origin == "" {
		return ""
	}
	if !strings.Contains(origin, "//") {
		return strings.TrimSuffix(origin, "/")
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return ""
	}
	return parsed.Host
}

// isTruthy accepts the spellings a form-encoded or JSON caller may send.
func isTruthy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}
