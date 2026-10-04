package services

import (
	"testing"

	"backEnd/models"
)

func recommendationProduct() models.Product {
	return models.Product{
		InStock: true,
		SizeChart: []models.ProductSizeMeasurement{
			{Size: "S", Values: map[string]string{"chest": "90 cm", "waist": "74"}},
			{Size: "M", Values: map[string]string{"chest": "100", "waist": "82"}},
			{Size: "L", Values: map[string]string{"chest": "110", "waist": "92"}},
		},
		ColorVariants: []models.ColorVariant{{VariantID: "black", Sizes: []models.SizeVariant{{Size: "S", Quantity: 0}, {Size: "M", Quantity: 4}, {Size: "L", Quantity: 0}}}},
	}
}

func TestParseMeasurementValuePersianDigitsAndUnits(t *testing.T) {
	tests := []struct {
		name, raw, key string
		want           float64
	}{
		{name: "persian cm", raw: "۱۸۰ cm", key: "height", want: 180},
		{name: "arabic kg", raw: "٧٥ kg", key: "weight", want: 75},
		{name: "inches", raw: "38 inch", key: "chest", want: 96.52},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := ParseMeasurementValue(test.raw, test.key)
			if err != nil || got < test.want-.01 || got > test.want+.01 {
				t.Fatalf("ParseMeasurementValue() = %v, %v; want %v", got, err, test.want)
			}
		})
	}
	if _, err := ParseMeasurementValue("98 cm junk", "chest"); err == nil {
		t.Fatal("expected malformed unit to be rejected")
	}
}

func TestRecommendSizeQuestionnaireFallbackAndAnchorOverride(t *testing.T) {
	product := recommendationProduct()
	product.SizeChart = []models.ProductSizeMeasurement{
		{Size: "M", Values: map[string]string{"chest": "100", "waist": "82"}},
		{Size: "L", Values: map[string]string{"chest": "110", "waist": "92"}},
	}
	product.ColorVariants[0].Sizes = []models.SizeVariant{{Size: "M", Quantity: 4}, {Size: "L", Quantity: 2}}
	fallback, err := RecommendSize(product, models.SizeRecommendationRequest{
		FitPreference: "slim",
		Measurements:  map[string]string{"height": "180", "weight": "75"},
	}, nil)
	if err != nil || fallback.Status != "recommended" || len(fallback.DataQuality.EstimatedKeys) == 0 {
		t.Fatalf("fallback = %#v, err=%v", fallback, err)
	}
	overridden, err := RecommendSize(product, models.SizeRecommendationRequest{
		FitPreference: "slim",
		Measurements:  map[string]string{"height": "180", "weight": "75", "chest": "۱۰۹", "waist": "۹۱"},
	}, nil)
	if err != nil || overridden.RecommendedSize != "L" || len(overridden.DataQuality.EstimatedKeys) != 0 {
		t.Fatalf("override = %#v, err=%v", overridden, err)
	}
}

func TestRecommendSizeFitPreferenceAndStockAwareAlternatives(t *testing.T) {
	product := recommendationProduct()
	product.ColorVariants[0].Sizes = []models.SizeVariant{{Size: "S", Quantity: 0}, {Size: "M", Quantity: 3}, {Size: "L", Quantity: 2}}
	product.SizeChart = []models.ProductSizeMeasurement{
		{Size: "M", Values: map[string]string{"chest": "100"}},
		{Size: "L", Values: map[string]string{"chest": "110"}},
	}
	slim, err := RecommendSize(product, models.SizeRecommendationRequest{FitPreference: "slim", Measurements: map[string]string{"chest": "100"}}, nil)
	if err != nil || slim.RecommendedSize != "M" {
		t.Fatalf("slim = %#v, err=%v", slim, err)
	}
	relaxed, err := RecommendSize(product, models.SizeRecommendationRequest{FitPreference: "relaxed", Measurements: map[string]string{"chest": "100"}}, nil)
	if err != nil || relaxed.RecommendedSize != "L" {
		t.Fatalf("relaxed = %#v, err=%v", relaxed, err)
	}
	reference, err := RecommendSize(product, models.SizeRecommendationRequest{
		FitPreference:      "relaxed",
		Measurements:       map[string]string{"chest": "100"},
		MeasurementSources: map[string]string{"chest": "reference"},
	}, nil)
	if err != nil || reference.RecommendedSize != "M" {
		t.Fatalf("reference garment = %#v, err=%v", reference, err)
	}
	if len(relaxed.Alternatives) != 1 || relaxed.Alternatives[0].Size != "M" || !relaxed.Alternatives[0].Available {
		t.Fatalf("alternatives = %#v", relaxed.Alternatives)
	}
}

func TestRecommendSizeNoChartAndVariantSelection(t *testing.T) {
	noChart := models.Product{InStock: true, SizeChart: nil}
	response, err := RecommendSize(noChart, models.SizeRecommendationRequest{FitPreference: "regular", Measurements: map[string]string{"chest": "100"}}, nil)
	if err != nil || response.Status != "no_chart" {
		t.Fatalf("no chart = %#v, err=%v", response, err)
	}
	free := models.Product{InStock: true, SizeChart: []models.ProductSizeMeasurement{{Size: "فری سایز", Values: map[string]string{}}}}
	response, err = RecommendSize(free, models.SizeRecommendationRequest{FitPreference: "regular"}, nil)
	if err != nil || response.Status != "no_chart" || response.RecommendedSize == "S" {
		t.Fatalf("free size = %#v, err=%v", response, err)
	}
	product := recommendationProduct()
	product.ColorVariants = []models.ColorVariant{
		{VariantID: "red", Sizes: []models.SizeVariant{{Size: "S", Quantity: 1}}},
		{VariantID: "blue", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
	}
	response, err = RecommendSize(product, models.SizeRecommendationRequest{VariantID: "blue", FitPreference: "slim", Measurements: map[string]string{"chest": "100", "waist": "82"}}, nil)
	if err != nil || response.RecommendedVariantID != "blue" || response.RecommendedSize != "M" {
		t.Fatalf("variant selection = %#v, err=%v", response, err)
	}
}

func TestRecommendSizeMalformedInput(t *testing.T) {
	product := recommendationProduct()
	for _, request := range []models.SizeRecommendationRequest{
		{FitPreference: "regular", Measurements: map[string]string{"chest": "NaN"}},
		{FitPreference: "unknown", Measurements: map[string]string{"chest": "98"}},
		{FitPreference: "regular", Measurements: map[string]string{"chest": "999"}},
	} {
		if _, err := RecommendSize(product, request, nil); err == nil {
			t.Fatalf("expected validation error for %#v", request)
		}
	}
}
