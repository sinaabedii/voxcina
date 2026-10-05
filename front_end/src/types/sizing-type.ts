import type { ProductSizeMeasurement } from "./product";

export interface SizingMeasurementDef {
  key: string;
  label: string;
  body_guide: string;
  fit_advice: string;
  garment_measurement?: string;
}

export interface SizingType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  measurements: SizingMeasurementDef[];
  image_prompt?: string;
  image_prompt_mannequin?: string;
  image_path?: string;
  admin_measurement_guide?: string;
  general_fit_guide?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  /**
   * Admin-only: distinct saved size charts for this template (learned from
   * product saves), sorted newest first. Absent when the template was never
   * used, and never returned by the public listing — treat it as optional.
   */
  saved_size_charts?: SizingTypeSavedChart[];
}

export interface SizingTypeSavedChart {
  /** Full chart rows of that save ({size, values}), keyed by template measurement. */
  size_chart: ProductSizeMeasurement[];
  /** Save timestamp; the admin list orders entries by it (newest first). */
  updated_at: string;
}

export interface SizingGenerateResponse {
  name: string;
  slug: string;
  measurements: SizingMeasurementDef[];
  admin_measurement_guide?: string;
  general_fit_guide: string;
  nano_banana_prompt: string;
  image_prompt_vector?: string;
  image_prompt_mannequin?: string;
}

export interface SizingDiagramPromptsResponse {
  image_prompt_vector: string;
  image_prompt_mannequin: string;
}

export interface ExtrapolateMeasurementsRequest {
  clothing_type: string;
  measurements: SizingMeasurementDef[];
  size_chart: ProductSizeMeasurement[];
  model?: string;
}

export interface ExtrapolateMeasurementsResponse {
  size_chart: ProductSizeMeasurement[];
}
