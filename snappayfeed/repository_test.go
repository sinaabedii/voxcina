package snappayfeed

import (
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

// pipelineJSON renders a pipeline as text so a test can assert its shape
// without a MongoDB connection.
func pipelineJSON(t *testing.T, value any) string {
	t.Helper()
	raw, err := bson.MarshalExtJSON(bson.M{"pipeline": value}, false, false)
	if err != nil {
		t.Fatalf("marshal pipeline: %v", err)
	}
	return string(raw)
}

// The exclusion must use the BSON field names. Spelling it with the Go JSON
// tag (aiMetadata) matches nothing and silently ships a 1536-dim embedding per
// variant — the bug AGENTS.md records as fixed in 8660e36.
func TestPipelineExcludesEmbeddingsByBSONName(t *testing.T) {
	rendered := pipelineJSON(t, pagePipeline(testConfig(), 100, 1))

	if !strings.Contains(rendered, "color_variants.ai_metadata") {
		t.Fatalf("pipeline does not strip per-variant AI metadata: %s", rendered)
	}
	if !strings.Contains(rendered, "search_metadata") {
		t.Fatalf("pipeline does not strip product search metadata: %s", rendered)
	}
	if strings.Contains(rendered, "aiMetadata") || strings.Contains(rendered, "searchMetadata") {
		t.Fatalf("pipeline uses Go JSON tags instead of BSON names: %s", rendered)
	}
}

func TestPipelinePaginatesOverVariantsInVariantMode(t *testing.T) {
	rendered := pipelineJSON(t, pagePipeline(testConfig(), 50, 3))

	if !strings.Contains(rendered, `"$unwind"`) {
		t.Fatalf("variant granularity must paginate over colours: %s", rendered)
	}
	if !strings.Contains(rendered, `"$color_variants"`) {
		t.Fatalf("unwind target is wrong: %s", rendered)
	}
	// page 3 of 50 rows starts at offset 100.
	if !strings.Contains(rendered, `"$skip":100`) {
		t.Fatalf("skip offset is wrong: %s", rendered)
	}
	if !strings.Contains(rendered, `"$limit":50`) {
		t.Fatalf("limit is wrong: %s", rendered)
	}
	// The unwound subdocument is re-wrapped so it still decodes as a Product.
	if !strings.Contains(rendered, `"$addFields"`) {
		t.Fatalf("unwound variant is not re-wrapped: %s", rendered)
	}
}

func TestPipelineKeepsWholeProductsInProductMode(t *testing.T) {
	cfg := testConfig()
	cfg.Granularity = GranularityProduct

	rendered := pipelineJSON(t, pagePipeline(cfg, 50, 1))
	if strings.Contains(rendered, `"$unwind"`) {
		t.Fatalf("product granularity must not unwind colours: %s", rendered)
	}
	if strings.Contains(rendered, `"$addFields"`) {
		t.Fatalf("product granularity must not re-wrap colours: %s", rendered)
	}
}

// Only visible products may be advertised in SnappPay search.
func TestPipelineFiltersInactiveProducts(t *testing.T) {
	rendered := pipelineJSON(t, pagePipeline(testConfig(), 10, 1))
	if !strings.Contains(rendered, `"is_active":true`) {
		t.Fatalf("pipeline does not filter on is_active: %s", rendered)
	}
}

// $match and $sort must stay adjacent at the head so the _id index can serve
// the sort instead of Mongo sorting in memory.
func TestPipelineSortsBeforeReshaping(t *testing.T) {
	pipeline := pagePipeline(testConfig(), 10, 1)
	if len(pipeline) < 2 {
		t.Fatalf("pipeline too short: %d stages", len(pipeline))
	}
	if pipeline[0][0].Key != "$match" {
		t.Fatalf("first stage = %s, want $match", pipeline[0][0].Key)
	}
	if pipeline[1][0].Key != "$sort" {
		t.Fatalf("second stage = %s, want $sort", pipeline[1][0].Key)
	}
}
