export interface HeroImage {
  id?: string;
  image: string;
  deviceType: "desktop" | "mobile";
  isActive: boolean;
  gradient: string;
  noGradient: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Default gradient for hero section background
 * This is the dark gradient applied to the section container
 */
export const DEFAULT_GRADIENT = "bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900";

/**
 * Default transparent overlay gradient
 * This is the colorful semi-transparent overlay applied on top of the image
 * Used when no custom gradient is specified and noGradient is false
 */
export const DEFAULT_OVERLAY_GRADIENT = "bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20";
