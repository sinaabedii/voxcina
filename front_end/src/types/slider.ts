export interface SliderStats {
  items: string;
  brands: string;
  reviews: string;
}

export interface Slider {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  badge: string;
  bgColor: string;
  accentColor: string;
  discount: string;
  features: string[];
  stats: SliderStats;
  /** Display sequence, ascending; ties fall back to createdAt. */
  order?: number;
  contentPosition?: ContentPosition;
  overlayStrength?: OverlayStrength;
  /** ISO timestamps bounding public visibility; absent means unbounded. */
  startAt?: string | null;
  endAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ContentPosition = "right" | "left" | "center";
export type OverlayStrength = "none" | "light" | "dark";

export const CONTENT_POSITIONS: ContentPosition[] = ["right", "left", "center"];
export const OVERLAY_STRENGTHS: OverlayStrength[] = ["none", "light", "dark"]; 