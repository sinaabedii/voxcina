import { serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import { HeroImage } from "@/types/hero-image";
import HeroSectionClient from "./HeroSectionClient";

/**
 * API response format for hero images
 */
interface HeroImagesResponse {
  heroImages: HeroImage[];
}

/**
 * Fetch hero images from the backend API with 1-hour cache revalidation.
 * Requirements: 3.1, 3.2, 3.3
 */
async function getHeroImages(): Promise<HeroImage[]> {
  const response = await serverFetchWithFallback<HeroImagesResponse>(
    '/api/hero-images',
    { heroImages: [] },
    { revalidate: CACHE_TIMES.HERO_IMAGES, tags: ['home', 'hero-images'] }
  );
  
  return response?.heroImages || [];
}

/**
 * HeroSection - Server Component
 * 
 * Fetches hero images from the API server-side and passes them to the client component.
 * Uses Next.js ISR with 1-hour cache revalidation for optimal performance and SEO.
 * 
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.8
 */
export default async function HeroSection() {
  const heroImages = await getHeroImages();

  return <HeroSectionClient heroImages={heroImages} />;
}
