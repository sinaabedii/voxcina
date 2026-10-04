export type SizeFitPreference = "slim" | "regular" | "relaxed";
export type MeasurementSource = "measured" | "estimated" | "reference";

export interface SizeRecommendationRequest {
  variant_id?: string;
  fit_preference: SizeFitPreference;
  usual_size?: string;
  measurements: Record<string, string>;
  measurement_sources?: Record<string, MeasurementSource>;
}

export type SizeRecommendationStatus =
  | "recommended"
  | "insufficient_data"
  | "no_chart"
  | "no_match"
  | "unavailable";

export interface SizeRecommendationReason {
  key: string;
  label: string;
  message: string;
  direction: "good" | "tight" | "loose" | "unknown";
}

export interface SizeRecommendationAlternative {
  size: string;
  available: boolean;
  fit_summary: string;
}

export interface SizeRecommendationDataQuality {
  used_keys: string[];
  estimated_keys: string[];
  missing_keys: string[];
}

export interface SizeRecommendationResponse {
  status: SizeRecommendationStatus;
  approximate: boolean;
  recommended_size?: string;
  recommended_variant_id?: string;
  confidence_level?: "high" | "medium" | "low";
  fit_summary?: string;
  reasons: SizeRecommendationReason[];
  alternatives: SizeRecommendationAlternative[];
  data_quality: SizeRecommendationDataQuality;
  limiting_measurement?: string;
  engine_version: string;
}
