import { serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import type { Category } from "@/types/category";
import type { Slider } from "@/types/slider";
import type { HeroImage } from "@/types/hero-image";
import type { ColorVariantListItem } from "@/types/product";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductsResponse {
  data?: ColorVariantListItem[];
}

interface HeroImagesResponse {
  heroImages: HeroImage[];
}

export interface HomePageData {
  featuredProducts: ColorVariantListItem[];
  newProducts: ColorVariantListItem[];
  sliders: Slider[];
  categories: Category[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeProducts(
  raw: ProductsResponse | ColorVariantListItem[] | null,
): ColorVariantListItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return (raw as ProductsResponse)?.data ?? [];
}

// ---------------------------------------------------------------------------
// Fetchers – all use ISR via serverFetchWithFallback
// ---------------------------------------------------------------------------

export async function getHeroImages(): Promise<HeroImage[]> {
  const res = await serverFetchWithFallback<HeroImagesResponse>(
    "/api/hero-images",
    { heroImages: [] },
    { revalidate: CACHE_TIMES.HERO_IMAGES, tags: ["home", "hero-images"] },
  );
  return Array.isArray(res?.heroImages) ? res.heroImages : [];
}

export async function getHomePageData(): Promise<HomePageData> {
  const [featuredRaw, newRaw, slidersRaw, categoriesRaw] = await Promise.all([
    serverFetchWithFallback<ProductsResponse | ColorVariantListItem[]>(
      "/api/products?sort=popular&limit=10",
      [],
      { revalidate: CACHE_TIMES.HOME_PAGE, tags: ["home", "featured-products"] },
    ),
    serverFetchWithFallback<ProductsResponse | ColorVariantListItem[]>(
      "/api/products?is_new=true&limit=10",
      [],
      { revalidate: CACHE_TIMES.HOME_PAGE, tags: ["home", "new-products"] },
    ),
    serverFetchWithFallback<Slider[]>(
      "/api/sliders",
      [],
      { revalidate: CACHE_TIMES.SLIDERS, tags: ["home", "sliders"] },
    ),
    serverFetchWithFallback<Category[]>(
      "/api/categories",
      [],
      { revalidate: CACHE_TIMES.CATEGORIES, tags: ["home", "categories"] },
    ),
  ]);

  return {
    featuredProducts: normalizeProducts(featuredRaw),
    newProducts: normalizeProducts(newRaw),
    sliders: slidersRaw ?? [],
    categories: categoriesRaw ?? [],
  };
}
