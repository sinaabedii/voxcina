package services

import (
	"strings"
	"testing"

	"backEnd/models"
)

func TestValidateSegmentAcceptsKnownFields(t *testing.T) {
	err := ValidateSegment(map[string]interface{}{
		models.SegmentFieldBoughtWithinDays:   30,
		models.SegmentFieldNeverBought:        true,
		models.SegmentFieldHasAbandonedCart:   true,
		models.SegmentFieldOwnsUnusedVoucher:  true,
		models.SegmentFieldFavouritedProduct:  "65f0a1b2c3d4e5f6a7b8c9d0",
		models.SegmentFieldCity:               "تهران",
		models.SegmentFieldProvince:           "تهران",
		models.SegmentFieldLastOpenWithinDays: 7,
	})
	if err != nil {
		t.Fatalf("valid rule rejected: %v", err)
	}
}

func TestValidateSegmentRejectsUnknownField(t *testing.T) {
	err := ValidateSegment(map[string]interface{}{"made_up_field": 1})
	if err == nil || !strings.Contains(err.Error(), "unsupported field") {
		t.Fatalf("unknown field accepted: %v", err)
	}
}

func TestValidateSegmentRejectsEmptyRule(t *testing.T) {
	if err := ValidateSegment(map[string]interface{}{}); err == nil {
		t.Fatalf("empty rule accepted — an empty segment must not silently fan out to nobody")
	}
}

func TestValidateSegmentRejectsBadProductID(t *testing.T) {
	err := ValidateSegment(map[string]interface{}{models.SegmentFieldFavouritedProduct: "not-a-hex"})
	if err == nil {
		t.Fatalf("bad product id accepted")
	}
}

func TestSegmentDaysDefaults(t *testing.T) {
	if got := segmentDays(nil); got != 30 {
		t.Fatalf("nil default = %d", got)
	}
	if got := segmentDays(-5); got != 30 {
		t.Fatalf("negative default = %d", got)
	}
	if got := segmentDays(float64(7)); got != 7 {
		t.Fatalf("float64 7 = %d", got)
	}
	if got := segmentDays(14); got != 14 {
		t.Fatalf("int 14 = %d", got)
	}
}

func TestEscapeRegexp(t *testing.T) {
	got := escapeRegexp("تهران (شمال) + 1.5")
	for _, meta := range []string{"(", ")", "+", "."} {
		if !strings.Contains(got, "\\"+meta) {
			t.Fatalf("metachar %q not escaped in %q", meta, got)
		}
	}
}
