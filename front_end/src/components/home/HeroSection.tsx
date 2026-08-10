import { serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import { HeroImage } from "@/types/hero-image";
import HeroSectionClient from "./HeroSectionClient";

/**
 * API response format for hero images
 */
interface HeroImagesResponse {
  heroImages: HeroImage[];
}

/** Fetch active hero images with ISR caching and a graceful empty fallback. */
export async function getHeroImages(): Promise<HeroImage[]> {
  const response = await serverFetchWithFallback<HeroImagesResponse>(
    '/api/hero-images',
    { heroImages: [] },
    { revalidate: CACHE_TIMES.HERO_IMAGES, tags: ['home', 'hero-images'] }
  );
  
  return Array.isArray(response?.heroImages) ? response.heroImages : [];
}

/**
 * HeroSection - Server Component
 * 
 * Receives data fetched in parallel with the rest of the homepage and passes it to
 * the client component. Keeping the data fetch above the client boundary makes the
 * first hero content part of the initial server-rendered HTML.
 * 
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.8
 */
export default function HeroSection({ heroImages }: { heroImages: HeroImage[] }) {
  return <HeroSectionClient heroImages={heroImages} />;
}
