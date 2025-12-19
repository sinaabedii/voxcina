import { Metadata } from "next";
import { Suspense } from "react";
import {
  serverFetch,
  serverFetchWithFallback,
  buildApiUrl,
  CACHE_TIMES,
} from "@/lib/server-api";
import {
  ColorVariantListItem,
  PaginatedColorVariantsResponse,
  PaginationInfo,
} from "@/types/product";
import { Category } from "@/types/category";
import ProductsPageContent from "@/app/(shop)/products/_components/ProductsPageContent";

/**
 * Products Listing Page - Server Component
 * 
 * This page fetches products on the server for SEO optimization.
 * Filters are applied server-side based on URL query parameters.
 * 
 * Requirements: 2.1, 2.2, 2.4
 * - Returns HTML containing product cards without requiring JavaScript
 * - Applies filters on server based on URL query parameters
 * - Caches response for 300 seconds using ISR
 */

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    brand?: string;
    search?: string;
    sort?: string;
    inStockOnly?: string;
  }>;
}

// Helper to build page URL with filters
function buildPageUrl(
  page: number,
  searchParams: Record<string, string | undefined>,
  baseUrl: string = "/products"
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
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// Server-side data fetching
async function getProducts(searchParams: {
  page?: string;
  category?: string;
  brand?: string;
  search?: string;
  sort?: string;
  inStockOnly?: string;
}): Promise<{ products: ColorVariantListItem[]; pagination: PaginationInfo | null }> {
  const page = searchParams.page || "1";
  const limit = "20";

  // Build query parameters for the API
  const queryParams: Record<string, string | undefined> = {
    page,
    limit,
  };

  // Apply filters from URL parameters (Requirements: 2.2)
  if (searchParams.category) {
    queryParams.category = searchParams.category;
  }
  if (searchParams.brand) {
    queryParams.brand = searchParams.brand;
  }
  if (searchParams.search) {
    queryParams.search = searchParams.search;
  }
  if (searchParams.sort) {
    queryParams.sort = searchParams.sort;
  }
  if (searchParams.inStockOnly === "true") {
    queryParams.in_stock = "true";
  }

  const endpoint = buildApiUrl("/api/products", queryParams);

  // Fetch products with ISR caching (Requirements: 2.4 - 300 seconds)
  const response = await serverFetch<PaginatedColorVariantsResponse | ColorVariantListItem[]>(
    endpoint,
    {
      revalidate: CACHE_TIMES.PRODUCTS_LIST,
      tags: ["products", "products-list"],
    }
  );

  if (!response) {
    return { products: [], pagination: null };
  }

  // Handle both paginated and non-paginated responses
  if (Array.isArray(response)) {
    return { products: response, pagination: null };
  }

  return {
    products: response.data || [],
    pagination: response.pagination || null,
  };
}

// Fetch categories for filter sidebar
async function getCategories(): Promise<Category[]> {
  return serverFetchWithFallback<Category[]>(
    "/api/categories",
    [],
    {
      revalidate: CACHE_TIMES.CATEGORIES,
      tags: ["categories"],
    }
  );
}

// Generate metadata for SEO including pagination links (Requirements: 2.3)
export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search;

  // Fetch pagination info to determine total pages
  const { pagination } = await getProducts(params);
  const totalPages = pagination?.totalPages || 1;

  let title = "محصولات | وکسینا";
  let description = "مشاهده و خرید انواع محصولات مد و پوشاک با بهترین قیمت در فروشگاه وکسینا";

  if (search) {
    title = `جستجو: ${search} | وکسینا`;
    description = `نتایج جستجو برای "${search}" در فروشگاه وکسینا`;
  }

  if (page > 1) {
    title = `${title} - صفحه ${page}`;
  }

  const siteUrl = "https://voxcina.com";
  const canonicalUrl = `${siteUrl}${buildPageUrl(page, params)}`;

  // Build alternates for pagination (Requirements: 2.3)
  const alternates: Metadata["alternates"] = {
    canonical: canonicalUrl,
  };

  // Build other link elements for prev/next
  const other: Record<string, string> = {};
  
  if (page > 1) {
    other["prev"] = `${siteUrl}${buildPageUrl(page - 1, params)}`;
  }
  
  if (page < totalPages) {
    other["next"] = `${siteUrl}${buildPageUrl(page + 1, params)}`;
  }

  return {
    title,
    description,
    alternates,
    other: Object.keys(other).length > 0 ? other : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
    },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  
  // Fetch data on the server (Requirements: 2.1)
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ]);

  const currentPage = parseInt(params.page || "1", 10);
  const totalPages = pagination?.totalPages || 1;

  return (
    <>
      {/* Hidden pagination links for crawlers (Requirements: 2.3) */}
      <nav aria-label="Pagination" className="sr-only">
        {currentPage > 1 && (
          <a href={buildPageUrl(currentPage - 1, params)} rel="prev">
            صفحه قبل
          </a>
        )}
        {currentPage < totalPages && (
          <a href={buildPageUrl(currentPage + 1, params)} rel="next">
            صفحه بعد
          </a>
        )}
      </nav>
      
      <Suspense
        fallback={
          <div className="container py-16 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
                <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                در حال بارگذاری محصولات...
              </p>
            </div>
          </div>
        }
      >
        <ProductsPageContent
          initialProducts={products}
          initialPagination={pagination}
          categories={categories}
          initialFilters={{
            category: params.category,
            brand: params.brand,
            search: params.search,
            sort: params.sort,
            inStockOnly: params.inStockOnly === "true",
          }}
          currentPage={currentPage}
        />
      </Suspense>
    </>
  );
}
