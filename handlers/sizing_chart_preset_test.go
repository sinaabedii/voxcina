package handlers

import (
	"testing"

	"backEnd/models"
)

func TestSizingChartIsUsable(t *testing.T) {
	cases := []struct {
		name  string
		chart []models.ProductSizeMeasurement
		want  bool
	}{
		{
			name:  "empty chart",
			chart: []models.ProductSizeMeasurement{},
			want:  false,
		},
		{
			name:  "nil chart",
			chart: nil,
			want:  false,
		},
		{
			name: "rows without sizes",
			chart: []models.ProductSizeMeasurement{
				{Size: "", Values: map[string]string{"chest": "92"}},
				{Size: "   ", Values: map[string]string{"chest": "96"}},
			},
			want: false,
		},
		{
			name: "named rows but no values anywhere",
			chart: []models.ProductSizeMeasurement{
				{Size: "S", Values: map[string]string{"chest": "", "waist": "  "}},
				{Size: "M", Values: map[string]string{}},
				{Size: "L"},
			},
			want: false,
		},
		{
			name: "whitespace-only values",
			chart: []models.ProductSizeMeasurement{
				{Size: "S", Values: map[string]string{"chest": "\t "}},
			},
			want: false,
		},
		{
			name: "usable chart",
			chart: []models.ProductSizeMeasurement{
				{Size: "S", Values: map[string]string{"chest": "92", "waist": ""}},
				{Size: "M", Values: map[string]string{"chest": "96"}},
			},
			want: true,
		},
		{
			name: "usable with value on a later row",
			chart: []models.ProductSizeMeasurement{
				{Size: "S", Values: map[string]string{"chest": ""}},
				{Size: "M", Values: map[string]string{"chest": "96"}},
			},
			want: true,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			if got := sizingChartIsUsable(testCase.chart); got != testCase.want {
				t.Fatalf("sizingChartIsUsable(%v) = %v, want %v", testCase.chart, got, testCase.want)
			}
		})
	}
}

func TestSizingChartContentHashIsDeterministicAcrossMapOrders(t *testing.T) {
	chart := []models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"chest": "92", "waist": "74", "hip": "98"}},
		{Size: "M", Values: map[string]string{"hip": "102", "chest": "96", "waist": "78"}},
	}

	// Same content rebuilt as fresh maps (Go randomizes iteration order);
	// the sorted-key serialization must make the hashes identical.
	first := sizingChartContentHash(chart)
	second := sizingChartContentHash([]models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"hip": "98", "waist": "74", "chest": "92"}},
		{Size: "M", Values: map[string]string{"waist": "78", "hip": "102", "chest": "96"}},
	})
	third := sizingChartContentHash(chart)

	if first == "" {
		t.Fatal("sizingChartContentHash returned an empty hash for a usable chart")
	}
	if first != second || first != third {
		t.Fatalf("hash changed across equivalent charts: %s / %s / %s", first, second, third)
	}
	if len(first) != 64 {
		t.Fatalf("hash %q is not sha256 hex (len=%d)", first, len(first))
	}
}

func TestSizingChartContentHashDiffersWhenAValueChanges(t *testing.T) {
	base := []models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"chest": "92"}},
		{Size: "M", Values: map[string]string{"chest": "96"}},
	}
	changedValue := []models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"chest": "92"}},
		{Size: "M", Values: map[string]string{"chest": "98"}},
	}
	changedRowOrder := []models.ProductSizeMeasurement{
		{Size: "M", Values: map[string]string{"chest": "96"}},
		{Size: "S", Values: map[string]string{"chest": "92"}},
	}
	addedRow := []models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"chest": "92"}},
		{Size: "M", Values: map[string]string{"chest": "96"}},
		{Size: "L", Values: map[string]string{"chest": "100"}},
	}

	baseHash := sizingChartContentHash(base)
	for name, other := range map[string][]models.ProductSizeMeasurement{
		"changed value":  changedValue,
		"reordered rows": changedRowOrder,
		"additional row": addedRow,
	} {
		if otherHash := sizingChartContentHash(other); otherHash == baseHash {
			t.Fatalf("%s: hash collides with base chart (%s)", name, baseHash)
		}
	}
}

func TestSizingChartContentHashTrimsSizeAndNormalizesEmptyValues(t *testing.T) {
	padded := sizingChartContentHash([]models.ProductSizeMeasurement{
		{Size: "  S  ", Values: map[string]string{"chest": "92"}},
	})
	trimmed := sizingChartContentHash([]models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{"chest": "92"}},
	})
	if padded != trimmed {
		t.Fatalf("size padding changed the hash: %s vs %s", padded, trimmed)
	}

	nilValues := sizingChartContentHash([]models.ProductSizeMeasurement{
		{Size: "S", Values: nil},
		{Size: "M", Values: map[string]string{"chest": "96"}},
	})
	emptyValues := sizingChartContentHash([]models.ProductSizeMeasurement{
		{Size: "S", Values: map[string]string{}},
		{Size: "M", Values: map[string]string{"chest": "96"}},
	})
	if nilValues != emptyValues {
		t.Fatalf("nil and empty value maps should hash identically: %s vs %s", nilValues, emptyValues)
	}
}
