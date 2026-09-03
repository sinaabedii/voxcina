import { Metadata } from "next";
import { Suspense } from "react";
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import { Loading } from "@/components/ui";
import CollectionPageClient from "@/components/collection/CollectionPageClient";
import { fetchShopCollections } from "@/lib/shop-collections";

/**
 * Next 16 does not infer page ISR from fetch-level revalidate and the build
 * runs with no backend — without this the page ships prerendered empty and
 * stays that way forever (see the ISR note in AGENTS.md). Must stay a
 * literal: segment configs are statically analyzed, and this mirrors
 * CACHE_TIMES.SHOP_COLLECTIONS in lib/server-api.ts.
 */
export const revalidate = 300;

const SITE_URL = "https://voxcina.com";
const PAGE_TITLE = "کالکشن‌ها";
const PAGE_TAGLINE = "ست‌های انتخاب‌شده وکسینا؛ هر کالکشن ترکیبی از رنگ‌هایی که کنار هم دیده می‌شوند";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = `${SITE_URL}/collection`;

  return {
    title: PAGE_TITLE,
    description: `${PAGE_TAGLINE}. مجموعه‌های آماده فروشگاه آنلاین ${APP_NAME}.`,
    keywords: ["کالکشن", "ست لباس", "مجموعه", "خرید آنلاین", "فروشگاه اینترنتی", "وکسینا"],
    openGraph: {
      title: `${PAGE_TITLE} | ${APP_NAME}`,
      description: PAGE_TAGLINE,
      locale: "fa_IR",
      type: "website",
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "fa-IR": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
  };
}

/**
 * Collections Page — Server Component.
 *
 * Serves the admin-curated collections (bundles of specific color variants,
 * `/api/shop-collections`) rather than the old per-season product listing:
 * every published collection is fetched server-side and handed to the client
 * showcase, which plays one scroll-scrubbed scene per collection.
 */
export default async function CollectionsPage() {
  const collections = await fetchShopCollections();

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: "خانه", url: "/" },
    { name: PAGE_TITLE, url: "/collection" },
  ];

  const itemListItems: ItemListItem[] = collections.map((collection) => ({
    name: collection.title,
    url: `/collection/${collection.id}`,
    image: collection.images?.[0] || "",
  }));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      {collections.length > 0 && (
        <ItemListSchema
          listName={PAGE_TITLE}
          description={PAGE_TAGLINE}
          listUrl="/collection"
          items={itemListItems}
        />
      )}

      <Suspense
        fallback={
          <div className="container py-16 flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text="در حال بارگذاری کالکشن‌ها..." />
          </div>
        }
      >
        <CollectionPageClient
          title={PAGE_TITLE}
          tagline={PAGE_TAGLINE}
          collections={collections}
        />
      </Suspense>
    </>
  );
}
