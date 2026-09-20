package handlers

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestParseProductPriceAcceptsBothDigitScripts(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want float64
	}{
		{"ascii digits", "450000", 450000},
		{"persian digits", "۴۵۰۰۰۰", 450000},
		{"arabic indic digits", "٤٥٠٠٠٠", 450000},
		{"mixed scripts", "۴۵0000", 450000},
		{"ascii grouping separators", "450,000", 450000},
		{"persian grouping separators", "۴۵۰٬۰۰۰", 450000},
		{"surrounding spaces", "  ۴۵۰۰۰۰ ", 450000},
		{"decimal amount", "۴۵۰۰۰۰٫۵", 450000.5},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := parseProductPrice(testCase.raw)
			if err != nil {
				t.Fatalf("parseProductPrice(%q) returned error: %v", testCase.raw, err)
			}
			if got != testCase.want {
				t.Fatalf("parseProductPrice(%q) = %v, want %v", testCase.raw, got, testCase.want)
			}
		})
	}
}

func TestParseProductPriceRejectsNonNumericInput(t *testing.T) {
	for _, raw := range []string{"", "رایگان", "12a3"} {
		if _, err := parseProductPrice(raw); err == nil {
			t.Fatalf("parseProductPrice(%q) accepted a non-numeric price", raw)
		}
	}
}

func TestParseProductIDsAcceptsCommaSeparatedHex(t *testing.T) {
	first := primitive.NewObjectID()
	second := primitive.NewObjectID()

	got, err := parseProductIDs(" " + first.Hex() + " ," + second.Hex() + ", ")
	if err != nil {
		t.Fatalf("parseProductIDs returned error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("parseProductIDs returned %d ids, want 2", len(got))
	}
	if got[0] != first || got[1] != second {
		t.Fatalf("parseProductIDs returned %v, want [%v %v]", got, first, second)
	}
}

func TestParseProductIDsReturnsEmptyListForBlankInput(t *testing.T) {
	got, err := parseProductIDs(" , ,, ")
	if err != nil {
		t.Fatalf("parseProductIDs returned error: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("parseProductIDs returned %d ids, want 0", len(got))
	}
}

func TestParseProductIDsRejectsInvalidHex(t *testing.T) {
	for _, raw := range []string{"not-an-object-id", "507f1f77bcf86cd79943901z"} {
		if _, err := parseProductIDs(raw); err == nil {
			t.Fatalf("parseProductIDs(%q) accepted an invalid id", raw)
		}
	}
}
