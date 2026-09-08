import { HeroImage } from "@/types/hero-image";
import HeroSectionClient from "./HeroSectionClient";

// Re-export canonical fetcher from the shared data layer so both the
// page and this component resolve to the same ISR cache semantics.
export { getHeroImages } from "@/lib/data/home";

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
