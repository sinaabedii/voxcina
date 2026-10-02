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
  image_path?: string;
  admin_measurement_guide?: string;
  general_fit_guide?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface SizingGenerateResponse {
  name: string;
  slug: string;
  measurements: SizingMeasurementDef[];
  admin_measurement_guide?: string;
  general_fit_guide: string;
  nano_banana_prompt: string;
}
