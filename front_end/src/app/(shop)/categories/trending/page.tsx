import { Metadata } from "next";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import BreadcrumbSchema from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema from "@/components/SEO/ItemListSchema";
import { APP_NAME } from "@/lib/constants";
import { CACHE_TIMES, serverFetch } from "@/lib/server-api";
import { ColorVariantListItem } from "@/types/product";
import TrendingPageClient from "./TrendingPageClient";

interface TrendingResponse {
  data?: ColorVariantListItem[];
}

async function getTrendingItems(): Promise<ColorVariantListItem[]> {
  const response = await serverFetch<TrendingResponse>("/api/products/trending", {
    revalidate: CACHE_TIMES.TRENDING_PRODUCTS,
    tags: ["products", "trending-products"],
  });
  return response?.data?.slice(0, 10) || [];
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `پربازدیدترین‌ها | ${APP_NAME}`,
    description: "مشاهده ده رنگ و طرح پربازدید فروشگاه وکسینا.",
    alternates: { canonical: "https://voxcina.com/categories/trending" },
    openGraph: {
      title: `پربازدیدترین‌ها | ${APP_NAME}`,
      description: "محبوب‌ترین رنگ‌ها و طرح‌های فروشگاه وکسینا بر اساس بازدید کاربران.",
      locale: "fa_IR",
      type: "website",
      url: "https://voxcina.com/categories/trending",
    },
  };
}

export default async function TrendingPage() {
  const items = await getTrendingItems();
  const schemaItems = items.map((item) => ({
    name: `${item.name} - ${item.colorVariant.colorName}`,
    url: `/products/${item.productId}?variant=${encodeURIComponent(item.colorVariant.variantId || "")}`,
    image: item.colorVariant.images?.[0] || "",
  }));

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "خانه", url: "/" },
          { name: "پربازدیدترین‌ها", url: "/categories/trending" },
        ]}
      />
      {schemaItems.length > 0 && (
        <ItemListSchema
          listName="پربازدیدترین‌ها"
          description="ده رنگ و طرح پربازدید فروشگاه وکسینا"
          listUrl="/categories/trending"
          items={schemaItems}
        />
      )}
      <div className="container pt-6">
        <Breadcrumbs items={[{ title: "خانه", href: "/" }, { title: "پربازدیدترین‌ها", href: "/categories/trending" }]} />
      </div>
      <TrendingPageClient items={items} />
    </>
  );
}
