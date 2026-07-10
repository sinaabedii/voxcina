import { Metadata } from "next";
import { Suspense } from "react";
import {
  serverFetch,
  buildApiUrl,
  CACHE_TIMES,
} from "@/lib/server-api";
import {
  ColorVariantListItem,
  PaginationInfo,
} from "@/types/product";
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import { Loading } from "@/components/ui";
import CollectionPageClient from "./CollectionPageClient";

interface CollectionPageProps {
  params: Promise<{ collectionValue: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    inStockOnly?: string;
  }>;
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

function buildPageUrl(
  page: number,
  collectionValue: string,
  searchParams: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== "page") {
      params.set(key, value);
    }
  });
  if (page > 1) {
    params.set("page", String(page));
  }
  const queryString = params.toString();
  const baseUrl = `/collection/${collectionValue}`;
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Server-side collection data fetching for SSR.
 */
async function getCollectionData(
  collectionValue: string,
  searchParams: { page?: string; sort?: string; inStockOnly?: string }
) {
  const decodedCollection = decodeURIComponent(collectionValue);

  const queryParams: Record<string, string | undefined> = {
    page: searchParams.page || "1",
    limit: "20",
  };
  if (searchParams.sort) {
    queryParams.sort = searchParams.sort;
  }
  if (searchParams.inStockOnly === "true") {
    queryParams.inStockOnly = "true";
  }

  const endpoint = buildApiUrl(
    `/api/products/collection/${encodeURIComponent(decodedCollection)}`,
    queryParams
  );

  const response = await serverFetch<CollectionApiResponse>(endpoint, {
    revalidate: CACHE_TIMES.PRODUCTS_LIST,
    tags: ["products", `collection-${decodedCollection}`],
  });

  const items: ColorVariantListItem[] = response?.data || [];
  const pagination: PaginationInfo | null = response
    ? {
        totalPages: response.pagination.totalPages,
        currentPage: response.pagination.currentPage,
        nextPage: response.pagination.nextPage,
        prevPage: response.pagination.prevPage,
        totalItems: response.pagination.totalItems ?? response.pagination.totalProducts,
      }
    : null;

  return { collection: decodedCollection, items, pagination };
}

export async function generateMetadata({ params, searchParams }: CollectionPageProps): Promise<Metadata> {
  const { collectionValue } = await params;
  const search = await searchParams;
  const data = await getCollectionData(collectionValue, search);

  const title = getCollectionTitle(data.collection);
  const description = getCollectionTagline(data.collection);
  const page = parseInt(search.page || "1", 10);
  const totalPages = data.pagination?.totalPages || 1;

  const siteUrl = "https://voxcina.com";
  const canonicalUrl = `${siteUrl}${buildPageUrl(page, collectionValue, search)}`;

  const alternates: Metadata["alternates"] = {
    canonical: canonicalUrl,
    languages: {
      "fa-IR": canonicalUrl,
      "x-default": canonicalUrl,
    },
  };

  const other: Record<string, string> = {};
  if (page > 1) {
    other["prev"] = `${siteUrl}${buildPageUrl(page - 1, collectionValue, search)}`;
  }
  if (page < totalPages) {
    other["next"] = `${siteUrl}${buildPageUrl(page + 1, collectionValue, search)}`;
  }

  return {
    title: page > 1 ? `${title} - صفحه ${page}` : title,
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
    other: Object.keys(other).length > 0 ? other : undefined,
  };
}

/**
 * Collection Page — Server Component.
 *
 * Fetches collection products server-side (SSR/ISR) and hands off to the
 * client component for the GSAP-powered intro, stuck-grid showcase, and
 * interactive filter/sort/pagination UI.
 */
export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { collectionValue } = await params;
  const search = await searchParams;

  const data = await getCollectionData(collectionValue, search);

  const { collection, items, pagination } = data;
  const currentPage = parseInt(search.page || "1", 10);

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
    price: item.price,
    availability: item.inStock ? "InStock" : "OutOfStock",
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

      <nav aria-label="Pagination" className="sr-only">
        {currentPage > 1 && (
          <a href={buildPageUrl(currentPage - 1, collectionValue, search)} rel="prev">
            صفحه قبل
          </a>
        )}
        {pagination && currentPage < pagination.totalPages && (
          <a href={buildPageUrl(currentPage + 1, collectionValue, search)} rel="next">
            صفحه بعد
          </a>
        )}
      </nav>

      <Suspense
        fallback={
          <div className="container py-16 flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text="در حال بارگذاری محصولات..." />
          </div>
        }
      >
        <CollectionPageClient
          collectionValue={collectionValue}
          title={title}
          tagline={tagline}
          items={items}
          pagination={pagination}
          currentPage={currentPage}
          initialFilters={{
            sort: search.sort,
            inStockOnly: search.inStockOnly === "true",
          }}
        />
      </Suspense>
    </>
  );
}
