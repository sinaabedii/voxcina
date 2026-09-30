package services

import (
	"fmt"
	"testing"
)

func showCall(ids ...string) accumulatedToolCall {
	args := `{"variant_ids":[`
	for i, id := range ids {
		if i > 0 {
			args += ","
		}
		args += fmt.Sprintf("%q", id)
	}
	args += `]}`
	return accumulatedToolCall{name: "show_color_variants", arguments: args}
}

// resolveShownVariants is the gate between the model's show_color_variants
// curation and the customer's screen: only ids that name a real sibling of the
// garment in focus or a search_catalog hit from the same turn may become cards.
func TestResolveShownVariants(t *testing.T) {
	siblings := []CatalogVariantHit{
		{ProductID: "p1", VariantID: "v-black", ProductName: "تیشرت", ColorName: "مشکی", InStock: true},
		{ProductID: "p1", VariantID: "v-navy", ProductName: "تیشرت", ColorName: "سرمه‌ای", InStock: true},
	}
	searchHits := []CatalogVariantHit{
		{ProductID: "p2", VariantID: "v-red", ProductName: "شلوار", ColorName: "قرمز"},
		{ProductID: "p3", VariantID: "v-cream", ProductName: "کت", ColorName: "کرمی"},
	}
	in := SellerAgentInput{SiblingVariants: siblings}

	t.Run("no call falls back to raw search hits", func(t *testing.T) {
		hits, title, curated := resolveShownVariants(in, []accumulatedToolCall{{name: "search_catalog", arguments: "{}"}}, searchHits)
		if curated {
			t.Error("no show_color_variants call must not count as curation")
		}
		if title != "" {
			t.Errorf("fallback title = %q, want empty", title)
		}
		if len(hits) != len(searchHits) {
			t.Errorf("fallback hits = %d, want %d", len(hits), len(searchHits))
		}
	})

	t.Run("sibling ids resolve and set the sibling title", func(t *testing.T) {
		hits, title, curated := resolveShownVariants(in, []accumulatedToolCall{showCall("v-black", "v-navy")}, nil)
		if !curated {
			t.Error("a show_color_variants call must count as curation")
		}
		if title != "رنگ‌های دیگر همین مدل" {
			t.Errorf("title = %q, want sibling title", title)
		}
		if len(hits) != 2 || hits[0].VariantID != "v-black" || hits[1].VariantID != "v-navy" {
			t.Errorf("unexpected hits: %+v", hits)
		}
	})

	t.Run("search-hit ids resolve without the sibling title", func(t *testing.T) {
		hits, title, curated := resolveShownVariants(in, []accumulatedToolCall{showCall("v-black", "v-red")}, searchHits)
		if !curated {
			t.Error("expected curation")
		}
		if title != "" {
			t.Errorf("mixed sources must not get the sibling title, got %q", title)
		}
		if len(hits) != 2 {
			t.Errorf("expected 2 hits, got %+v", hits)
		}
	})

	t.Run("unknown ids are dropped", func(t *testing.T) {
		hits, _, _ := resolveShownVariants(in, []accumulatedToolCall{showCall("v-black", "hallucinated")}, searchHits)
		if len(hits) != 1 || hits[0].VariantID != "v-black" {
			t.Errorf("unknown id was not dropped: %+v", hits)
		}
	})

	t.Run("duplicates collapse by product_id:variant_id", func(t *testing.T) {
		hits, _, _ := resolveShownVariants(in, []accumulatedToolCall{showCall("v-black", "v-black", "v-navy")}, nil)
		if len(hits) != 2 {
			t.Errorf("expected 2 deduped hits, got %+v", hits)
		}
	})

	t.Run("cap at 8", func(t *testing.T) {
		var many []CatalogVariantHit
		var ids []string
		for i := 0; i < 12; i++ {
			id := fmt.Sprintf("v-%d", i)
			many = append(many, CatalogVariantHit{ProductID: "p1", VariantID: id})
			ids = append(ids, id)
		}
		bigIn := SellerAgentInput{SiblingVariants: many}
		hits, _, _ := resolveShownVariants(bigIn, []accumulatedToolCall{showCall(ids...)}, nil)
		if len(hits) != 8 {
			t.Errorf("expected cap of 8, got %d", len(hits))
		}
	})

	t.Run("a call that resolves to zero hits stays curated — no search fallback", func(t *testing.T) {
		hits, title, curated := resolveShownVariants(in, []accumulatedToolCall{showCall("hallucinated")}, searchHits)
		if !curated {
			t.Error("a made call must count as curation even when nothing resolved")
		}
		if len(hits) != 0 {
			t.Errorf("expected no hits, got %+v", hits)
		}
		if title != "" {
			t.Errorf("title = %q, want empty", title)
		}
	})

	t.Run("unparseable call args resolve to zero hits but still curated", func(t *testing.T) {
		hits, _, curated := resolveShownVariants(in,
			[]accumulatedToolCall{{name: "show_color_variants", arguments: "{not json"}}, searchHits)
		if !curated || len(hits) != 0 {
			t.Errorf("bad args: curated=%t hits=%+v", curated, hits)
		}
	})
}

// formatSiblingVariants is the ONLY prompt source of variant_ids for
// same-product color cards — it must ship the ids verbatim and say "never
// invent one" when the garment has no other colors.
func TestFormatSiblingVariants(t *testing.T) {
	if got := formatSiblingVariants(nil); got == "" || !containsAny(got, "none") {
		t.Errorf("empty siblings must say so, got %q", got)
	}
	out := formatSiblingVariants([]CatalogVariantHit{
		{VariantID: "v1", ColorName: "مشکی", InStock: true, Sizes: []string{"M", "L"}},
	})
	for _, want := range []string{`"variant_id":"v1"`, `"color_name":"مشکی"`, `"in_stock":true`, `"sizes":["M","L"]`} {
		if !containsAny(out, want) {
			t.Errorf("sibling block missing %s:\n%s", want, out)
		}
	}
}
