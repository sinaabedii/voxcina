package snappayfeed

// The wire shapes below reproduce what searchwise-api-data-feed.php emits.
// Field names, types and even the redundant spellings are theirs; do not
// "clean them up" without re-reading their source or asking Searchwise.

// feedResponse is the envelope. count/max_pages are pointers because the
// plugin emits them ONLY for the all-rows query (L140-141) and omits them
// entirely on the products=/slugs= paths.
type feedResponse struct {
	Count    *int      `json:"count,omitempty"`
	MaxPages *int      `json:"max_pages,omitempty"`
	Products []feedRow `json:"products"`

	// Always present in the plugin's envelope (L118-121). wc_version falls
	// back to the literal "not_installed" there when WooCommerce is absent,
	// which is exactly our permanent state; wp_version has no honest value
	// for a Go store, so it stays empty rather than inventing one.
	PluginVersion string `json:"plugin_version"`
	WCVersion     string `json:"wc_version"`
	WPVersion     string `json:"wp_version"`
}

// feedRow is one product row. In the default variant granularity it is one
// COLOR VARIANT: its own id, link, images and stock state.
type feedRow struct {
	ID    string `json:"id"`
	Slug  string `json:"slug"`
	Title string `json:"title"`

	// Rials, integer. The catalog stores Toman.
	RegularPrice int64 `json:"regular_price"`
	SalePrice    int64 `json:"sale_price"`

	Availability     string         `json:"availability"`
	Category         []string       `json:"category"`
	ImageLink        []string       `json:"image_link"`
	Link             string         `json:"link"`
	ShortDescription string         `json:"short_description"`
	Description      map[string]any `json:"description"`

	// Optional fields from the academy's field list. Omitted when unknown.
	Color string   `json:"color,omitempty"`
	Size  []string `json:"size,omitempty"`

	Brand string `json:"brand"`

	// The plugin code, its Readme and the academy list disagree on these two
	// names. Emitting every spelling costs a few bytes and removes the guess:
	// whichever key their parser reads, it finds the same value.
	ShippingCost float64 `json:"shipping_cost"`
	CostShipping float64 `json:"cost_shipping"`
	DeliveryTime int     `json:"delivery_time"`
	TimeDelivery int     `json:"time_delivery"`

	// Only when include_content=true (L195-197).
	Content string `json:"content,omitempty"`
}

// newResponse builds an envelope with the always-present version keys set.
func newResponse(rows []feedRow) feedResponse {
	if rows == nil {
		rows = []feedRow{}
	}
	return feedResponse{
		Products:      rows,
		PluginVersion: PluginVersion,
		WCVersion:     "not_installed",
		WPVersion:     "",
	}
}
