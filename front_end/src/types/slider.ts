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
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
} 