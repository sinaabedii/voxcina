import { Suspense } from "react";
import type { Metadata } from "next";

import PageShell from "@/components/layout/PageShell";
import HeroSection from "@/components/home/HeroSection";
import ModernCategoriesSection from "@/components/home/ModernCategoriesSection";
import ProductCarouselSectionClient from "@/components/home/ProductCarouselSectionClient";
import { ModernSliderSectionClient } from "@/components/home/ModernSliderClient";
import AIAssistantPromo from "@/components/home/AIAssistantPromo";
import LazyColorMatchingTool from "@/components/home/LazyColorMatchingTool";
import SeasonalCollectionBanner from "@/components/home/SeasonalCollectionBanner";
import BenefitsSection from "@/components/home/BenefitsSection";
import SEOContentSection from "@/components/home/SEOContentSection";
import SectionFallback from "@/components/ui/SectionFallback";
import { getHomePageData, getHeroImages } from "@/lib/data/home";

// Page is ISR – without explicit revalidate Next 16 prerenders it once at
// build time (where GO_BACKEND_URL="") and caches the empty fallback forever.
export const revalidate = 600;

export const metadata: Metadata = {
  title: {
    absolute: "وکسینا | فروشگاه اینترنتی لباس و پوشاک | خرید آنلاین مد و استایل",
  },
  description:
    "خرید آنلاین جدیدترین مدل‌های لباس زنانه، مردانه و بچگانه با بهترین قیمت و کیفیت در فروشگاه اینترنتی وکسینا. ضمانت اصالت و بازگشت کالا.",
};

/**
 * Home Page – Server Component
 *
 * Data is fetched in parallel (hero + rest of the page) so the LCP image
 * starts loading as early as possible. All interactive sub-sections are
 * client components hydrated after the initial server render.
 */
export default async function HomePage() {
  const [{ featuredProducts, newProducts, sliders, categories }, heroImages] = await Promise.all([
    getHomePageData(),
    getHeroImages(),
  ]);

  return (
    <PageShell>
      {/* Hero (server-rendered for LCP) */}
      <HeroSection heroImages={heroImages} />

      <ModernCategoriesSection initialCategories={categories} />

      <SeasonalCollectionBanner />

      <ProductCarouselSectionClient
        title="محصولات پرطرفدار"
        viewAllHref="/products?sort=popular"
        products={featuredProducts}
      />

      <Suspense fallback={<SectionFallback />}>
        <AIAssistantPromo />
      </Suspense>

      <ProductCarouselSectionClient
        title="جدیدترین محصولات"
        viewAllHref="/products?sort=newest"
        products={newProducts}
      />

      <ModernSliderSectionClient sliders={sliders} />

      <Suspense fallback={<SectionFallback />}>
        <LazyColorMatchingTool />
      </Suspense>

      <SEOContentSection />

      <BenefitsSection />
    </PageShell>
  );
}
