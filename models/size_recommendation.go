package models

// SizeRecommendationRequest is the intentionally small, stateless input to
// the public size recommendation endpoint. Measurements are strings because
// the mobile clients also send Persian and Arabic-Indic digits and, in some
// cases, a unit suffix.
type SizeRecommendationRequest struct {
	VariantID          string            `json:"variant_id,omitempty"`
	FitPreference      string            `json:"fit_preference"`
	UsualSize          string            `json:"usual_size,omitempty"`
	Measurements       map[string]string `json:"measurements,omitempty"`
	MeasurementSources map[string]string `json:"measurement_sources,omitempty"`
}

type SizeRecommendationReason struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Message   string `json:"message"`
	Direction string `json:"direction"`
}

type SizeRecommendationAlternative struct {
	Size       string `json:"size"`
	Available  bool   `json:"available"`
	FitSummary string `json:"fit_summary"`
}

type SizeRecommendationDataQuality struct {
	UsedKeys      []string `json:"used_keys"`
	EstimatedKeys []string `json:"estimated_keys"`
	MissingKeys   []string `json:"missing_keys"`
}

// SizeRecommendationResponse is safe to expose publicly: it contains the
// chart's size names and high-level explanations, never the admin sizing
// guidance or raw measurement values.
type SizeRecommendationResponse struct {
	Status               string                          `json:"status"`
	Approximate          bool                            `json:"approximate"`
	RecommendedSize      string                          `json:"recommended_size"`
	RecommendedVariantID string                          `json:"recommended_variant_id,omitempty"`
	ConfidenceLevel      string                          `json:"confidence_level"`
	FitSummary           string                          `json:"fit_summary"`
	Reasons              []SizeRecommendationReason      `json:"reasons"`
	Alternatives         []SizeRecommendationAlternative `json:"alternatives"`
	DataQuality          SizeRecommendationDataQuality   `json:"data_quality"`
	LimitingMeasurement  string                          `json:"limiting_measurement"`
	EngineVersion        string                          `json:"engine_version"`
}
