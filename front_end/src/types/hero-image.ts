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

export const DEFAULT_GRADIENT = "bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900";
