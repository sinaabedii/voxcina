package snappayfeed

import (
	"encoding/json"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

func testConfig() Config {
	return Config{
		BaseURL:           "https://voxcina.com",
		Granularity:       GranularityVariant,
		AvailabilityStyle: availabilityStylePlugin,
	}
}

func testOptions(t *testing.T) buildOptions {
	t.Helper()
	return buildOptions{
		cfg:        testConfig(),
		categories: map[string]string{testCategoryHex: "مردانه > پوشاک > بامبر"},
	}
}

// The whole reason the feed is variant-first: three colours must reach
// SnappPay as three cards, each with its own link and its own stock state.
func TestBuildRowsEmitsOneRowPerColour(t *testing.T) {
	p := sampleProduct(t)
	rows := buildRows([]models.Product{p}, testOptions(t))

	if len(rows) != 2 {
		t.Fatalf("got %d rows for a 2-colour product, want 2", len(rows))
	}

	black, blue := rows[0], rows[1]

	if black.ID == blue.ID {
		t.Fatalf("both colours share the id %q — source #3's first rule", black.ID)
	}
	if black.Link == blue.Link {
		t.Fatalf("both colours share the link %q", black.Link)
	}
	if black.Availability != "instock" {
		t.Fatalf("black availability = %q, want instock", black.Availability)
	}
	if blue.Availability != "outofstock" {
		t.Fatalf("blue availability = %q, want outofstock", blue.Availability)
	}

	if want := testProductHex + "-" + testVariantHex; black.ID != want {
		t.Fatalf("black id = %q, want %q", black.ID, want)
	}
	if black.Slug != testVariantHex {
		t.Fatalf("black slug = %q, want the variant key", black.Slug)
	}

	// The link must be the storefront's own deep link, so the shopper lands
	// on the colour they tapped.
	if want := "https://voxcina.com/products/" + testProductHex + "?variant=" + testVariantHex; black.Link != want {
		t.Fatalf("black link = %q, want %q", black.Link, want)
	}
	// The colour with no variant_id falls back to ?color=, exactly as
	// ProductGridItem does.
	if !strings.Contains(blue.Link, "?color=") {
		t.Fatalf("legacy colour link = %q, want a ?color= deep link", blue.Link)
	}

	if black.Color != "مشکی" || blue.Color != "آبی" {
		t.Fatalf("colour fields = %q / %q", black.Color, blue.Color)
	}
	if len(black.ImageLink) == 0 || !strings.Contains(black.ImageLink[0], "black-1") {
		t.Fatalf("black row does not lead with its own photo: %#v", black.ImageLink)
	}
	if len(blue.ImageLink) == 0 || !strings.Contains(blue.ImageLink[0], "blue-1") {
		t.Fatalf("blue row does not lead with its own photo: %#v", blue.ImageLink)
	}
	if len(black.Category) != 1 || black.Category[0] != "مردانه > پوشاک > بامبر" {
		t.Fatalf("category = %#v", black.Category)
	}
	if black.Brand != "Voxcina" {
		t.Fatalf("brand = %q", black.Brand)
	}
}

func TestBuildRowsSkipOutOfStock(t *testing.T) {
	p := sampleProduct(t)
	opts := testOptions(t)
	opts.cfg.SkipOutOfStock = true

	rows := buildRows([]models.Product{p}, opts)
	if len(rows) != 1 {
		t.Fatalf("got %d rows, want only the in-stock colour", len(rows))
	}
	if rows[0].Color != "مشکی" {
		t.Fatalf("kept the wrong colour: %q", rows[0].Color)
	}
}

func TestBuildRowsVariantKeyFilter(t *testing.T) {
	p := sampleProduct(t)
	opts := testOptions(t)
	opts.variantKeys = map[string]bool{testVariantHex: true}

	rows := buildRows([]models.Product{p}, opts)
	if len(rows) != 1 || rows[0].Slug != testVariantHex {
		t.Fatalf("targeted refresh returned %#v", rows)
	}
}

func TestBuildRowsProductGranularity(t *testing.T) {
	p := sampleProduct(t)
	opts := testOptions(t)
	opts.cfg.Granularity = GranularityProduct

	rows := buildRows([]models.Product{p}, opts)
	if len(rows) != 1 {
		t.Fatalf("product granularity produced %d rows, want 1", len(rows))
	}

	row := rows[0]
	if row.ID != testProductHex || row.Slug != testProductHex {
		t.Fatalf("product row id/slug = %q / %q", row.ID, row.Slug)
	}
	if row.Link != "https://voxcina.com/products/"+testProductHex {
		t.Fatalf("product link = %q", row.Link)
	}
	// One colour still has stock, so the aggregate row is in stock.
	if row.Availability != "instock" {
		t.Fatalf("aggregate availability = %q", row.Availability)
	}
	if len(row.ImageLink) != 4 {
		t.Fatalf("aggregate row should carry every photo, got %#v", row.ImageLink)
	}
}

func TestIncludeContent(t *testing.T) {
	p := sampleProduct(t)
	opts := testOptions(t)

	if rows := buildRows([]models.Product{p}, opts); rows[0].Content != "" {
		t.Fatalf("content leaked without include_content: %q", rows[0].Content)
	}

	opts.includeContent = true
	rows := buildRows([]models.Product{p}, opts)
	if rows[0].Content == "" {
		t.Fatal("include_content=true produced no content")
	}
	if strings.Contains(rows[0].Content, "<p>") {
		t.Fatalf("content still carries markup: %q", rows[0].Content)
	}
}

// The envelope is the part Searchwise's parser touches first; its key set and
// the count/max_pages presence rules are contractual.
func TestEnvelopeShape(t *testing.T) {
	p := sampleProduct(t)
	response := newResponse(buildRows([]models.Product{p}, testOptions(t)))

	encoded, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	for _, key := range []string{"products", "plugin_version", "wc_version", "wp_version"} {
		if _, ok := decoded[key]; !ok {
			t.Fatalf("envelope is missing %q: %s", key, encoded)
		}
	}
	if decoded["plugin_version"] != PluginVersion {
		t.Fatalf("plugin_version = %v", decoded["plugin_version"])
	}
	if decoded["wc_version"] != "not_installed" {
		t.Fatalf("wc_version = %v", decoded["wc_version"])
	}
	// Targeted answers omit the pagination keys, like the plugin.
	if _, ok := decoded["count"]; ok {
		t.Fatal("count must be absent unless the caller asked for a page")
	}
	if _, ok := decoded["max_pages"]; ok {
		t.Fatal("max_pages must be absent unless the caller asked for a page")
	}
}

// Every name the plugin's code, its Readme and the academy list use must be
// present, or a parser built against one of them silently reads zero.
func TestRowCarriesEveryFieldNameSpelling(t *testing.T) {
	p := sampleProduct(t)
	rows := buildRows([]models.Product{p}, testOptions(t))

	encoded, err := json.Marshal(rows[0])
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	required := []string{
		"id", "slug", "title", "regular_price", "sale_price", "availability",
		"category", "image_link", "link", "short_description", "description",
		"brand", "shipping_cost", "cost_shipping", "delivery_time", "time_delivery",
	}
	for _, key := range required {
		if _, ok := decoded[key]; !ok {
			t.Fatalf("row is missing %q: %s", key, encoded)
		}
	}

	// description must be an object, never a string — the academy asks for
	// key/value attributes and the plugin casts to (object).
	if _, ok := decoded["description"].(map[string]any); !ok {
		t.Fatalf("description is not an object: %T", decoded["description"])
	}
}

// An empty description must serialise as {} rather than null: a parser
// expecting an object should not have to special-case it.
func TestEmptyDescriptionIsObject(t *testing.T) {
	p := sampleProduct(t)
	p.Attributes = nil
	p.ColorVariants[1].Sizes = nil
	p.ColorVariants[1].ColorName = ""

	rows := buildRows([]models.Product{p}, testOptions(t))
	encoded, err := json.Marshal(rows[1])
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(encoded), `"description":{}`) {
		t.Fatalf("empty description did not serialise as an object: %s", encoded)
	}
}

// A product tagged with both a category and its ancestor must not advertise
// the ancestor: the longer breadcrumb already contains it, and source #3 only
// asks for a precise path to be present.
func TestCategoryPathsOfDropsAncestorPaths(t *testing.T) {
	parent := objectID(t, testCategoryHex)
	child := objectID(t, "7012ab34cd56ef7890123457")
	other := objectID(t, "7012ab34cd56ef7890123458")

	p := sampleProduct(t)
	p.CategoryIDs = []primitive.ObjectID{parent, child, other}

	opts := testOptions(t)
	opts.categories = map[string]string{
		parent.Hex(): "زنانه",
		child.Hex():  "زنانه > کت و بارونی زنانه",
		other.Hex():  "مردانه > پوشاک",
	}

	got := categoryPathsOf(p, opts)
	want := []string{"زنانه > کت و بارونی زنانه", "مردانه > پوشاک"}
	if len(got) != len(want) {
		t.Fatalf("category paths = %#v, want %#v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("category paths = %#v, want %#v", got, want)
		}
	}
}

func TestDropAncestorPaths(t *testing.T) {
	tests := []struct {
		name  string
		paths []string
		want  []string
	}{
		{name: "single path is untouched", paths: []string{"زنانه"}, want: []string{"زنانه"}},
		{name: "parent and child keep only the child", paths: []string{"زنانه", "زنانه > کت و بارونی زنانه"}, want: []string{"زنانه > کت و بارونی زنانه"}},
		{name: "a whole chain keeps only the deepest", paths: []string{"الف", "الف > ب", "الف > ب > ج"}, want: []string{"الف > ب > ج"}},
		{name: "siblings both survive", paths: []string{"الف > ب", "الف > ج"}, want: []string{"الف > ب", "الف > ج"}},
		{name: "prefix without the separator is not an ancestor", paths: []string{"زنانه", "زنانهپوشاک"}, want: []string{"زنانه", "زنانهپوشاک"}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := dropAncestorPaths(tc.paths)
			if len(got) != len(tc.want) {
				t.Fatalf("got %#v, want %#v", got, tc.want)
			}
			for i := range tc.want {
				if got[i] != tc.want[i] {
					t.Fatalf("got %#v, want %#v", got, tc.want)
				}
			}
		})
	}
}
