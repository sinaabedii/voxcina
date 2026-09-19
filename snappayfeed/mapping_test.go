package snappayfeed

import (
	"reflect"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

const (
	testProductHex  = "6512ab34cd56ef7890123456"
	testVariantHex  = "9f4e11223344556677889900"
	testCategoryHex = "7012ab34cd56ef7890123456"
	testParentHex   = "7112ab34cd56ef7890123456"
)

func objectID(t *testing.T, hex string) primitive.ObjectID {
	t.Helper()
	id, err := primitive.ObjectIDFromHex(hex)
	if err != nil {
		t.Fatalf("bad fixture id %q: %v", hex, err)
	}
	return id
}

// sampleProduct is a two-colour product: black has stock, blue is sold out.
// That asymmetry is the point — it is what a product-level feed would hide.
func sampleProduct(t *testing.T) models.Product {
	t.Helper()
	return models.Product{
		ID:            objectID(t, testProductHex),
		Name:          "بامبر کتان مردانه F3330",
		Description:   "<p>پارچه کتان با دوخت تقویت‌شده</p>",
		Price:         480000,
		OriginalPrice: 600000,
		Brand:         "Voxcina",
		MainImages:    []string{"/uploads/products/main.jpg"},
		CategoryIDs:   []primitive.ObjectID{objectID(t, testCategoryHex)},
		Attributes:    []models.ProductAttribute{{Name: "جنس", Value: "کتان"}},
		IsActive:      true,
		ColorVariants: []models.ColorVariant{
			{
				VariantID: testVariantHex,
				Color:     "#000000",
				ColorName: "مشکی",
				Images:    []string{"/uploads/products/black-1.jpg", "/uploads/products/black-2.jpg"},
				Sizes: []models.SizeVariant{
					{Size: "M", Quantity: 3},
					{Size: "L", Quantity: 0},
					{Size: "XL", Quantity: 7},
				},
			},
			{
				Color:     "#0000FF",
				ColorName: "آبی",
				Images:    []string{"/uploads/products/blue-1.jpg"},
				Sizes: []models.SizeVariant{
					{Size: "M", Quantity: 0},
				},
			},
		},
	}
}

func TestVariantKeyPrefersStoredID(t *testing.T) {
	p := sampleProduct(t)
	if got := variantKey(p.ID.Hex(), p.ColorVariants[0]); got != testVariantHex {
		t.Fatalf("want stored variant id %q, got %q", testVariantHex, got)
	}
}

// A variant that predates variant_id must still get a key — and the same key
// every crawl, or Searchwise would see a new product each time.
func TestVariantKeySurrogateIsStableAndDistinct(t *testing.T) {
	p := sampleProduct(t)
	legacy := p.ColorVariants[1]

	first := variantKey(p.ID.Hex(), legacy)
	second := variantKey(p.ID.Hex(), legacy)
	if first != second {
		t.Fatalf("surrogate key is not deterministic: %q vs %q", first, second)
	}
	if len(first) != variantKeyLength {
		t.Fatalf("surrogate key length = %d, want %d", len(first), variantKeyLength)
	}

	other := legacy
	other.ColorName = "قرمز"
	if variantKey(p.ID.Hex(), other) == first {
		t.Fatal("different colours produced the same surrogate key")
	}
	if variantKey("6512ab34cd56ef7890123457", legacy) == first {
		t.Fatal("different products produced the same surrogate key")
	}
}

func TestRowIDRoundTrip(t *testing.T) {
	id := rowID(testProductHex, testVariantHex)
	if id != testProductHex+"-"+testVariantHex {
		t.Fatalf("unexpected row id %q", id)
	}

	product, key := splitRowID(id)
	if product != testProductHex || key != testVariantHex {
		t.Fatalf("splitRowID(%q) = %q, %q", id, product, key)
	}

	// A bare product id is a legitimate products= entry too.
	product, key = splitRowID(testProductHex)
	if product != testProductHex || key != "" {
		t.Fatalf("bare id split to %q, %q", product, key)
	}
}

func TestPriceConversionToRials(t *testing.T) {
	p := sampleProduct(t)
	if got := priceRials(p.Price); got != 4800000 {
		t.Fatalf("sale price = %d, want 4800000", got)
	}
	if got := priceRials(regularPriceToman(p)); got != 6000000 {
		t.Fatalf("regular price = %d, want 6000000", got)
	}

	// No discount recorded: regular must fall back to price, never 0 (a zero
	// regular_price reads as free).
	noDiscount := p
	noDiscount.OriginalPrice = 0
	if got := priceRials(regularPriceToman(noDiscount)); got != 4800000 {
		t.Fatalf("regular price without original = %d, want 4800000", got)
	}
}

// The core guarantee of a variant-level feed: one colour's stock never speaks
// for another's.
func TestAvailabilityIsPerVariant(t *testing.T) {
	p := sampleProduct(t)

	if !variantInStock(p, p.ColorVariants[0]) {
		t.Fatal("black has an in-stock size but reported out of stock")
	}
	if variantInStock(p, p.ColorVariants[1]) {
		t.Fatal("blue is sold out in every size but reported in stock")
	}
	if !productInStock(p) {
		t.Fatal("product has one in-stock colour, aggregate should be in stock")
	}

	hidden := p
	hidden.IsActive = false
	if variantInStock(hidden, hidden.ColorVariants[0]) {
		t.Fatal("an inactive product must never be advertised as in stock")
	}
}

func TestAvailabilityVocabulary(t *testing.T) {
	plugin := Config{AvailabilityStyle: availabilityStylePlugin}
	guide := Config{AvailabilityStyle: availabilityStyleGuide}

	if got := availabilityWord(plugin, true); got != "instock" {
		t.Fatalf("plugin style in stock = %q", got)
	}
	if got := availabilityWord(plugin, false); got != "outofstock" {
		t.Fatalf("plugin style out of stock = %q", got)
	}
	if got := availabilityWord(guide, true); got != "in stock" {
		t.Fatalf("guide style in stock = %q", got)
	}
	if got := availabilityWord(guide, false); got != "out of stock" {
		t.Fatalf("guide style out of stock = %q", got)
	}
}

func TestVariantTitleAppendsColourOnce(t *testing.T) {
	p := sampleProduct(t)

	if got := variantTitle(p, p.ColorVariants[0]); got != "بامبر کتان مردانه F3330 مشکی" {
		t.Fatalf("title = %q", got)
	}

	already := p
	already.Name = "بامبر کتان مردانه مشکی"
	if got := variantTitle(already, p.ColorVariants[0]); got != "بامبر کتان مردانه مشکی" {
		t.Fatalf("colour duplicated in title: %q", got)
	}
}

func TestVariantImagesPreferOwnColourAndAbsolutise(t *testing.T) {
	p := sampleProduct(t)
	p.ColorVariants[0].SwatchImage = "/uploads/products/swatch.jpg"
	p.ColorVariants[0].TryOnImage = "/uploads/products/tryon.jpg"
	p.ColorVariants[0].Images = append(p.ColorVariants[0].Images, "/uploads/products/black-1.jpg")

	got := variantImages(p, p.ColorVariants[0], "https://voxcina.com")
	want := []string{
		"https://voxcina.com/uploads/products/black-1.jpg",
		"https://voxcina.com/uploads/products/black-2.jpg",
		"https://voxcina.com/uploads/products/main.jpg",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("images = %#v, want %#v", got, want)
	}

	for _, img := range got {
		if img == "https://voxcina.com/uploads/products/swatch.jpg" ||
			img == "https://voxcina.com/uploads/products/tryon.jpg" {
			t.Fatalf("swatch/try-on asset leaked into image_link: %q", img)
		}
	}
}

func TestAbsoluteURLLeavesRemoteURLsAlone(t *testing.T) {
	if got := absoluteURL("https://voxcina.com", "https://cdn.example.com/a.jpg"); got != "https://cdn.example.com/a.jpg" {
		t.Fatalf("remote URL rewritten to %q", got)
	}
	if got := absoluteURL("https://voxcina.com/", "uploads/a.jpg"); got != "https://voxcina.com/uploads/a.jpg" {
		t.Fatalf("relative path = %q", got)
	}
	if got := absoluteURL("https://voxcina.com", "   "); got != "" {
		t.Fatalf("blank image should be dropped, got %q", got)
	}
}

func TestInStockSizesOnlyListsBuyableSizes(t *testing.T) {
	p := sampleProduct(t)
	if got := inStockSizes(p.ColorVariants[0]); !reflect.DeepEqual(got, []string{"M", "XL"}) {
		t.Fatalf("sizes = %#v, want [M XL]", got)
	}
	if got := inStockSizes(p.ColorVariants[1]); len(got) != 0 {
		t.Fatalf("sold-out colour listed sizes: %#v", got)
	}
}

func TestVariantDescriptionShape(t *testing.T) {
	p := sampleProduct(t)

	desc := variantDescription(p, p.ColorVariants[0])
	if desc["جنس"] != "کتان" {
		t.Fatalf("attribute missing: %#v", desc)
	}
	// One colour per row, so رنگ is always a plain string here.
	if desc[descColorKey] != "مشکی" {
		t.Fatalf("colour = %#v, want string مشکی", desc[descColorKey])
	}
	// Two sizes in stock -> array, matching the plugin's single-vs-list rule.
	if !reflect.DeepEqual(desc[descSizeKey], []string{"M", "XL"}) {
		t.Fatalf("sizes = %#v, want []string{M, XL}", desc[descSizeKey])
	}

	single := p.ColorVariants[0]
	single.Sizes = []models.SizeVariant{{Size: "M", Quantity: 1}}
	if got := variantDescription(p, single)[descSizeKey]; got != "M" {
		t.Fatalf("a lone size must serialise as a string, got %#v", got)
	}
}

func TestProductDescriptionAggregatesColours(t *testing.T) {
	p := sampleProduct(t)
	desc := productDescription(p)
	if !reflect.DeepEqual(desc[descColorKey], []string{"مشکی", "آبی"}) {
		t.Fatalf("colours = %#v", desc[descColorKey])
	}
}

func TestShortDescriptionStripsMarkup(t *testing.T) {
	got := shortDescription("<p>پارچه <b>کتان</b>&nbsp;مرغوب</p>")
	if got != "پارچه کتان مرغوب" {
		t.Fatalf("short description = %q", got)
	}

	long := ""
	for i := 0; i < 200; i++ {
		long += "واژه "
	}
	truncated := []rune(shortDescription(long))
	if len(truncated) > shortDescriptionRunes+1 {
		t.Fatalf("short description not truncated: %d runes", len(truncated))
	}
}

func TestBuildCategoryPathsWalksParents(t *testing.T) {
	child := objectID(t, testCategoryHex)
	parent := objectID(t, testParentHex)

	paths := buildCategoryPaths([]models.Category{
		{ID: child, Name: "بامبر", ParentID: parent},
		{ID: parent, Name: "پوشاک"},
	})

	if paths[child.Hex()] != "پوشاک > بامبر" {
		t.Fatalf("breadcrumb = %q, want 'پوشاک > بامبر'", paths[child.Hex()])
	}
	if paths[parent.Hex()] != "پوشاک" {
		t.Fatalf("root breadcrumb = %q", paths[parent.Hex()])
	}
}

// A category whose parent chain loops must not hang the crawl.
func TestBuildCategoryPathsSurvivesCycle(t *testing.T) {
	a := objectID(t, testCategoryHex)
	b := objectID(t, testParentHex)

	paths := buildCategoryPaths([]models.Category{
		{ID: a, Name: "A", ParentID: b},
		{ID: b, Name: "B", ParentID: a},
	})
	if paths[a.Hex()] == "" {
		t.Fatal("cycle produced no breadcrumb at all")
	}
}
