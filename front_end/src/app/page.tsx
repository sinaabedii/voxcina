import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
// Client components for interactive features
import HeroSectionClient from "@/components/home/HeroSectionClient";
import ModernCategoriesSection from "@/components/home/ModernCategoriesSection";
import ProductCarouselSectionClient from "@/components/home/ProductCarouselSectionClient";
import { ModernSliderSectionClient } from "@/components/home/ModernSliderClient";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import AIAssistantPromo from "@/components/home/AIAssistantPromo";
import ColorMatchingTool from "@/components/home/ColorMatchingTool";
import SeasonalCollectionBanner from "@/components/home/SeasonalCollectionBanner";
import BenefitsSection from "@/components/home/BenefitsSection";
import SEOContentSection from "@/components/home/SEOContentSection";
import { serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import { ColorVariantListItem } from "@/types/product";
import { Slider } from "@/types/slider";
import { fallbackSliders } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "وکسینا | فروشگاه اینترنتی لباس و پوشاک | خرید آنلاین مد و استایل",
  },
  description: "خرید آنلاین جدیدترین مدل‌های لباس زنانه، مردانه و بچگانه با بهترین قیمت و کیفیت در فروشگاه اینترنتی وکسینا. ضمانت اصالت و بازگشت کالا.",
};

/**
 * Server-side data fetching for home page
 * Requirements: 3.1, 3.2, 3.3
 * 
 * Fetches:
 * - Featured products (popular products)
 * - New products
 * - Sliders
 * 
 * Uses ISR with 600-second revalidation as per design document
 */

interface ProductsResponse {
  data?: ColorVariantListItem[];
}

async function getHomePageData() {
  // Fetch all data in parallel for better performance
  const [featuredProductsData, newProductsData, slidersData] = await Promise.all([
    // Fetch featured/popular products
    serverFetchWithFallback<ProductsResponse | ColorVariantListItem[]>(
      '/api/products?limit=10',
      [],
      { revalidate: CACHE_TIMES.HOME_PAGE, tags: ['home', 'featured-products'] }
    ),
    // Fetch new products
    serverFetchWithFallback<ProductsResponse | ColorVariantListItem[]>(
      '/api/products?is_new=true&limit=10',
      [],
      { revalidate: CACHE_TIMES.HOME_PAGE, tags: ['home', 'new-products'] }
    ),
    // Fetch sliders
    serverFetchWithFallback<Slider[]>(
      '/api/sliders',
      fallbackSliders,
      { revalidate: CACHE_TIMES.SLIDERS, tags: ['home', 'sliders'] }
    ),
  ]);

  // Normalize product responses (handle both array and paginated response formats)
  const featuredProducts = Array.isArray(featuredProductsData) 
    ? featuredProductsData 
    : (featuredProductsData as ProductsResponse)?.data || [];
  
  const newProducts = Array.isArray(newProductsData) 
    ? newProductsData 
    : (newProductsData as ProductsResponse)?.data || [];

  // Use fallback sliders if API returns empty
  const sliders = slidersData && slidersData.length > 0 ? slidersData : fallbackSliders;

  return {
    featuredProducts,
    newProducts,
    sliders,
  };
}

/**
 * Home Page - Server Component
 * 
 * This page is server-rendered with ISR (600-second revalidation).
 * Interactive components are hydrated on the client side.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export default async function HomePage() {
  const { featuredProducts, newProducts, sliders } = await getHomePageData();

  return (
    <>
      <Header />
      <AnimatedBackground />
      <div className="pb-10 overflow-x-hidden font-sans bg-transparent relative z-10">
        {/* Hero Section - Client component for scroll animations */}
        <HeroSectionClient />
        
        {/* Categories Section - Client component with useState */}
        <ModernCategoriesSection />
        
        {/* Seasonal Collection Banner - Client component for animations */}
        <SeasonalCollectionBanner />

        {/* Featured Products Carousel - Client component for drag/scroll */}
        <ProductCarouselSectionClient
          title="محصولات پرطرفدار"
          viewAllHref="/products?sort=popular"
          products={featuredProducts}
        />

        {/* AI Assistant Promo */}
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              در حال بارگذاری...
            </div>
          }
        >
          <AIAssistantPromo />
        </Suspense>

        {/* New Products Carousel - Client component for drag/scroll */}
        <ProductCarouselSectionClient
          title="جدیدترین محصولات"
          viewAllHref="/products?sort=newest"
          products={newProducts}
        />

        {/* Slider Section - Client component for animations */}
        <ModernSliderSectionClient sliders={sliders} />

        {/* Color Matching Tool - Client component */}
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              در حال بارگذاری...
            </div>
          }
        >
          <ColorMatchingTool />
        </Suspense>

        {/* SEO Content Section - Keyword-rich content for better SEO */}
        <SEOContentSection />

        {/* Benefits Section - Client component for animations */}
        <BenefitsSection />
      </div>
      <Footer />
    </>
  );
}
