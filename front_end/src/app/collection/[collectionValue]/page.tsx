import { Metadata } from "next";
import { Suspense } from "react";
import {
  serverFetch,
  buildApiUrl,
  CACHE_TIMES,
} from "@/lib/server-api";
import { ColorVariantListItem } from "@/types/product";
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import { Loading } from "@/components/ui";
import CollectionPageClient from "./CollectionPageClient";

interface CollectionPageProps {
  params: Promise<{ collectionValue: string }>;
}

interface CollectionApiResponse {
  data: ColorVariantListItem[];
  pagination: {
    totalPages: number;
    currentPage: number;
    nextPage?: number;
    prevPage?: number;
    totalProducts: number;
    totalItems: number;
  };
  collection: string;
}

/** Fetched in one request — the scroll showcase presents every collection
 * item via scroll, so there's no server-side pagination anymore. */
const MAX_COLLECTION_ITEMS = 300;

const COLLECTION_TITLES: Record<string, string> = {
  "بهار": "کالکشن بهار",
  "تابستان": "کالکشن تابستان",
  "پاییز": "کالکشن پاییز",
  "زمستان": "کالکشن زمستان",
};

const COLLECTION_TAGLINES: Record<string, string> = {
  "بهار": "مجموعهای از محصولات زیبا و رنگارنگ برای فصل بهار",
  "تابستان": "لباسهای خنک و راحت برای روزهای گرم تابستان",
  "پاییز": "استایلهای گرم و شیک برای روزهای پاییزی",
  "زمستان": "پوشاک گرم و مد روز برای فصل سرد زمستان",
};

function getCollectionTitle(collection: string): string {
  return COLLECTION_TITLES[collection] || `کالکشن ${collection}`;
}

function getCollectionTagline(collection: string): string {
  return COLLECTION_TAGLINES[collection] || `محصولات ویژه کالکشن ${collection}`;
}

/**
 * Server-side collection data fetching for SSR. Fetches the full collection
 * (up to MAX_COLLECTION_ITEMS) in a single request — the scroll showcase
 * has no client-side pagination.
 */
async function getCollectionData(collectionValue: string) {
  const decodedCollection = decodeURIComponent(collectionValue);

  const endpoint = buildApiUrl(
    `/api/products/collection/${encodeURIComponent(decodedCollection)}`,
    { page: "1", limit: String(MAX_COLLECTION_ITEMS) }
  );

  const response = await serverFetch<CollectionApiResponse>(endpoint, {
    revalidate: CACHE_TIMES.PRODUCTS_LIST,
    tags: ["products", `collection-${decodedCollection}`],
  });

  const items: ColorVariantListItem[] = response?.data || [];

  return { collection: decodedCollection, items };
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { collectionValue } = await params;
  const data = await getCollectionData(collectionValue);

  const title = getCollectionTitle(data.collection);
  const description = getCollectionTagline(data.collection);

  const siteUrl = "https://voxcina.com";
  const canonicalUrl = `${siteUrl}/collection/${collectionValue}`;

  const alternates: Metadata["alternates"] = {
    canonical: canonicalUrl,
    languages: {
      "fa-IR": canonicalUrl,
      "x-default": canonicalUrl,
    },
  };

  return {
    title,
    description: `${description} از فروشگاه آنلاین ${APP_NAME}. جدیدترین محصولات با بهترین قیمت.`,
    keywords: [data.collection, "کالکشن", "خرید آنلاین", "فروشگاه اینترنتی", "وکسینا"],
    openGraph: {
      title: `${title} | ${APP_NAME}`,
      description,
      locale: "fa_IR",
      type: "website",
      url: canonicalUrl,
    },
    alternates,
  };
}

/**
 * Collection Page — Server Component.
 *
 * Fetches the full collection server-side (SSR/ISR) and hands off to the
 * client component for the GSAP-powered intro and scroll-scrubbed product
 * showcase (no grid, no pagination — every product appears/disappears as
 * the user scrolls through a single pinned section).
 */
export default async function CollectionPage({ params }: CollectionPageProps) {
  const { collectionValue } = await params;

  const data = await getCollectionData(collectionValue);
  const { collection, items } = data;

  const title = getCollectionTitle(collection);
  const tagline = getCollectionTagline(collection);

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: "خانه", url: "/" },
    { name: title, url: `/collection/${collectionValue}` },
  ];

  const itemListItems: ItemListItem[] = items.map((item) => ({
    name: item.name,
    url: `/products/${item.productId}`,
    image: item.colorVariant?.images?.[0] || "",
  }));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      {items.length > 0 && (
        <ItemListSchema
          listName={title}
          description={tagline}
          listUrl={`/collection/${collectionValue}`}
          items={itemListItems}
        />
      )}

      <Suspense
        fallback={
          <div className="container py-16 flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text="در حال بارگذاری محصولات..." />
          </div>
        }
      >
        <CollectionPageClient title={title} tagline={tagline} items={items} />
      </Suspense>
    </>
  );
}
