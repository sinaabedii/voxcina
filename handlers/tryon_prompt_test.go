package handlers

import (
	"os"
	"strings"
	"testing"

	"backEnd/models"
)

// The garment photo is attached to the same request, but it does not pin down
// the cut: the model will happily return an oversized shirt tailored to the
// body. The prompt therefore names the garment and its قواره in words, using
// the phrases the AI metadata generator wrote for this product.
func TestBuildTryOnPromptStatesGarmentAndFit(t *testing.T) {
	prompt := buildTryOnPrompt("upper_body", garmentDetails{
		Name:   "پیراهن مردانه آستین بلند",
		Type:   "shirt (پیراهن)",
		Fit:    "loose, boxy cut with dropped shoulders",
		Phrase: "long-sleeve checked cotton overshirt",
	})

	for _, want := range []string{
		"پیراهن مردانه آستین بلند",
		"long-sleeve checked cotton overshirt",
		"shirt (پیراهن)",
		"REQUIRED FIT (قواره): loose, boxy cut with dropped shoulders",
		"MUST be worn with exactly this fit",
		"this fit wins",
		"Above all, the garment must end up with the required fit",
		"take these into careful consideration",
	} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt is missing %q:\n%s", want, prompt)
		}
	}

	// The geometry instructions still have to close the prompt — the model is
	// told to emit nothing but the image by that final line.
	if !strings.HasSuffix(prompt, tryOnPromptUpper) {
		t.Errorf("garment details displaced the base prompt:\n%s", prompt)
	}
}

// Metadata is generated per product and may not exist yet. Whatever is missing
// must drop out of both the fact list and the instruction that refers to it, so
// the model is never told to honour a fit nobody stated.
func TestBuildTryOnPromptOmitsUnknownDetails(t *testing.T) {
	nameOnly := buildTryOnPrompt("lower_body", garmentDetails{Name: "شلوار جین راسته"})

	if !strings.Contains(nameOnly, "شلوار جین راسته") {
		t.Errorf("prompt dropped the product name:\n%s", nameOnly)
	}
	for _, unwanted := range []string{"Garment type:", "REQUIRED FIT", "required fit", "do not substitute"} {
		if strings.Contains(nameOnly, unwanted) {
			t.Errorf("prompt refers to %q with no such detail known:\n%s", unwanted, nameOnly)
		}
	}

	// A fit with nothing else known still gets its full required-fit block, and
	// no bullet list header for facts that do not exist.
	fitOnly := buildTryOnPrompt("upper_body", garmentDetails{Fit: "slim tapered fit"})
	if !strings.Contains(fitOnly, "REQUIRED FIT (قواره): slim tapered fit") {
		t.Errorf("prompt dropped a known fit:\n%s", fitOnly)
	}
	if strings.Contains(fitOnly, "GARMENT DETAILS") {
		t.Errorf("prompt opened a fact list with no facts in it:\n%s", fitOnly)
	}
	if strings.Contains(fitOnly, "described above") {
		t.Errorf("prompt points at a garment description it never wrote:\n%s", fitOnly)
	}

	// With nothing known at all the prompt is exactly what it was before
	// garment details existed.
	if bare := buildTryOnPrompt("dresses", garmentDetails{}); bare != tryOnPromptDress {
		t.Errorf("empty details changed the base prompt:\n%s", bare)
	}
}

// Per-colour appearance comes from the variant's vision pass. Colour drift,
// fabric substitution, and pattern smoothing are the three things a try-on most
// visibly gets wrong, so each fact carries its own defending instruction.
func TestBuildTryOnPromptDefendsAppearance(t *testing.T) {
	full := buildTryOnPrompt("upper_body", garmentDetails{
		Name:     "پیراهن مردانه",
		Color:    "آبی روشن",
		Material: "پنبه",
		Pattern:  "چهارخانه",
	})

	for _, want := range []string{
		"- Colour: آبی روشن",
		"- Fabric: پنبه",
		"- Surface pattern: چهارخانه",
		"colour, fabric, and surface pattern",
		"Reproduce the surface pattern exactly as photographed",
		"neither simplify it nor add pattern that is not there",
	} {
		if !strings.Contains(full, want) {
			t.Errorf("prompt is missing %q:\n%s", want, full)
		}
	}

	// A plain garment names no pattern, so the pattern instruction must go too —
	// otherwise the model is warned about something it was never told.
	colorOnly := buildTryOnPrompt("upper_body", garmentDetails{Color: "مشکی"})
	if !strings.Contains(colorOnly, "Carry the colour over") {
		t.Errorf("single appearance fact did not produce prose:\n%s", colorOnly)
	}
	for _, unwanted := range []string{"Fabric:", "Surface pattern:", "surface pattern exactly as photographed"} {
		if strings.Contains(colorOnly, unwanted) {
			t.Errorf("prompt mentions %q with no such detail known:\n%s", unwanted, colorOnly)
		}
	}
}

func TestJoinWithAnd(t *testing.T) {
	cases := []struct {
		in   []string
		want string
	}{
		{nil, ""},
		{[]string{"colour"}, "colour"},
		{[]string{"colour", "fabric"}, "colour and fabric"},
		{[]string{"colour", "fabric", "pattern"}, "colour, fabric, and pattern"},
	}
	for _, c := range cases {
		if got := joinWithAnd(c.in); got != c.want {
			t.Errorf("joinWithAnd(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// Every garment fact in the prompt must trace back to a value the AI produced
// or an admin typed. The prompt states these as binding, so a constant this
// code supplied would be a lie told confidently to the image model.
//
// AIMetadata.FitType is the specific trap: validateMetadata rewrites it to
// "معمولی" whenever the model declines to answer, so it looks like a populated
// AI field while carrying a value nobody chose. It must never reach the prompt.
func TestGarmentFactsAreNeverSourcedFromConstants(t *testing.T) {
	source, err := os.ReadFile("tryon.go")
	if err != nil {
		t.Fatalf("read tryon.go: %v", err)
	}
	body := string(source)

	start := strings.Index(body, "func resolveGarmentDetails")
	if start < 0 {
		t.Fatal("resolveGarmentDetails not found")
	}
	resolver := body[start:]
	if end := strings.Index(resolver, "\nfunc "); end > 0 {
		resolver = resolver[:end]
	}

	for _, banned := range []string{"AIMetadata.FitType", "SearchMetadata.FitType"} {
		// Comments explaining the ban are fine; assignments are not.
		for _, line := range strings.Split(resolver, "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "//") {
				continue
			}
			if strings.Contains(trimmed, banned) {
				t.Errorf("resolveGarmentDetails reads %s, which validateMetadata defaults to a constant: %s", banned, trimmed)
			}
		}
	}
}

// The fit falls back to the admin's own قواره attribute, which the catalogue
// already carries, so the prompt describes the cut before anyone regenerates
// product metadata. The attribute name selects the field; the value is always
// whatever the admin typed.
func TestProductAttributeValueReadsAdminFit(t *testing.T) {
	attrs := []models.ProductAttribute{
		{Name: "جنس", Value: "نخ‌پنبه"},
		{Name: "قواره", Value: "Slim Fit"},
		{Name: "قابلیت شستشو", Value: "دارد"},
	}

	if got := productAttributeValue(attrs, garmentFitAttributeName); got != "Slim Fit" {
		t.Errorf("admin fit attribute not read: %q", got)
	}
	if got := productAttributeValue(attrs, "طرح"); got != "" {
		t.Errorf("absent attribute invented a value: %q", got)
	}
	if got := productAttributeValue(nil, garmentFitAttributeName); got != "" {
		t.Errorf("nil attributes invented a value: %q", got)
	}
}
