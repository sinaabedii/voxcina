import { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import CategoryPageClient from "@/app/(shop)/categories/[categorySlug]/CategoryPageClient";
import { Loading } from "@/components/ui";

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    inStockOnly?: string;
  }>;
}

// Helper to build page URL with filters
function buildPageUrl(
  page: number,
  categorySlug: string,
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
  const baseUrl = `/categories/${categorySlug}`;
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Server-side category data fetching for SSR.
 * Fetches category info and products on the server.
 * 
 * SEO: Category pages are critical for e-commerce SEO
 */
async function getCategoryData(
  categorySlug: string,
  searchParams: { page?: string; sort?: string; inStockOnly?: string }
) {
  // Fetch all categories
  const categories = await serverFetchWithFallback<Category[]>(
    '/api/categories',
    [],
    { revalidate: CACHE_TIMES.CATEGORIES, tags: ['categories'] }
  );

  // Find category by slug or name (case-insensitive)
  const decodedSlug = decodeURIComponent(categorySlug);
  const category = categories.find((c: Category) =>
    c.slug?.toLowerCase() === decodedSlug.toLowerCase() ||
    c.name?.toLowerCase() === decodedSlug.toLowerCase() ||
    c.name === decodedSlug ||
    c.id === decodedSlug
  );

  if (!category) {
    return null;
  }

  // Build query parameters for products API
  const page = searchParams.page || "1";
  const queryParams: Record<string, string | undefined> = {
    page,
    limit: "20",
    category: category.name, // Use category name for filtering
  };

  if (searchParams.sort) {
    queryParams.sort = searchParams.sort;
  }
  if (searchParams.inStockOnly === "true") {
    queryParams.in_stock = "true";
  }

  const endpoint = buildApiUrl("/api/products", queryParams);

  // Fetch products with ISR caching
  const response = await serverFetch<PaginatedColorVariantsResponse | ColorVariantListItem[]>(
    endpoint,
    {
      revalidate: CACHE_TIMES.PRODUCTS_LIST,
      tags: ["products", `category-${category.id}`],
    }
  );

  let products: ColorVariantListItem[] = [];
  let pagination: PaginationInfo | null = null;

  if (response) {
    if (Array.isArray(response)) {
      products = response;
    } else {
      products = response.data || [];
      pagination = response.pagination || null;
    }
  }

  // Find parent category if exists
  let parentCategory: Category | null = null;
  if (category.parent_id) {
    parentCategory = categories.find((c: Category) => c.id === category.parent_id) || null;
  }

  return { category, products, pagination, categories, parentCategory };
}

/**
 * Generate dynamic metadata for category pages
 */
export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const search = await searchParams;
  const data = await getCategoryData(categorySlug, search);

  if (!data) {
    return {
      title: 'دسته‌بندی یافت نشد',
      description: 'متأسفانه دسته‌بندی مورد نظر یافت نشد.',
    };
  }

  const { category, products, pagination } = data;
  const page = parseInt(search.page || "1", 10);
  const totalPages = pagination?.totalPages || 1;
  // The grid renders one card per color variant, so the displayed count
  // should reflect variant rows, not distinct products.
  const productCount = pagination?.totalColorVariants ?? products.length;

  let title = category.name;
  if (page > 1) {
    title = `${category.name} - صفحه ${page}`;
  }

  const siteUrl = "https://voxcina.com";
  const canonicalUrl = `${siteUrl}${buildPageUrl(page, categorySlug, search)}`;

  // Build alternates for pagination
  const alternates: Metadata["alternates"] = {
    canonical: canonicalUrl,
    languages: {
      'fa-IR': canonicalUrl,
      'x-default': canonicalUrl,
    },
  };

  // Sort order doesn't change the underlying product set, only its ordering,
  // so a sorted URL is a near-duplicate of the default-sort category page —
  // index the default-sort version, keep sorted variants crawlable (follow)
  // but out of the index to avoid duplicate content.
  const isNonDefaultSort = Boolean(search.sort);
  const robots: Metadata["robots"] = isNonDefaultSort
    ? { index: false, follow: true }
    : undefined;

  // Build other link elements for prev/next
  const other: Record<string, string> = {};
  
  if (page > 1) {
    other["prev"] = `${siteUrl}${buildPageUrl(page - 1, categorySlug, search)}`;
  }
  
  if (page < totalPages) {
    other["next"] = `${siteUrl}${buildPageUrl(page + 1, categorySlug, search)}`;
  }

  return {
    title,
    description: category.description || `خرید آنلاین محصولات دسته‌بندی ${category.name} با بهترین قیمت و کیفیت از فروشگاه آنلاین ${APP_NAME}. ${productCount} محصول موجود.`,
    keywords: [
      category.name,
      'خرید آنلاین',
      'فروشگاه اینترنتی',
      'وکسینا',
      category.slug,
    ],
    openGraph: {
      title: `${category.name} | ${APP_NAME}`,
      description: category.description || `خرید آنلاین محصولات دسته‌بندی ${category.name} از فروشگاه ${APP_NAME}`,
      images: category.image ? [
        {
          url: category.image.startsWith('http') ? category.image : `https://voxcina.com${category.image}`,
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ] : [],
      locale: 'fa_IR',
      type: 'website',
      url: canonicalUrl,
    },
    alternates,
    robots,
    other: Object.keys(other).length > 0 ? other : undefined,
  };
}

/**
 * Category Page - Server Component
 * 
 * This page is rendered on the server with full category and product data,
 * including JSON-LD structured data for SEO.
 * 
 * SEO: Category pages are critical for e-commerce SEO
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categorySlug } = await params;
  const search = await searchParams;
  
  // Fetch category data on the server
  const data = await getCategoryData(categorySlug, search);
  
  // Return 404 for non-existent categories
  if (!data) {
    notFound();
  }

  const { category, products, pagination, categories, parentCategory } = data;
  const currentPage = parseInt(search.page || "1", 10);
  const totalPages = pagination?.totalPages || 1;

  // Build breadcrumb items for schema
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: 'خانه', url: '/' },
  ];

  // Add parent category if exists
  if (parentCategory) {
    breadcrumbItems.push({
      name: parentCategory.name,
      url: `/categories/${parentCategory.slug || parentCategory.id}`,
    });
  }

  breadcrumbItems.push({
    name: category.name,
    url: `/categories/${categorySlug}`,
  });

  // Build item list for schema
  const itemListItems: ItemListItem[] = products.map((product) => ({
    name: product.name,
    url: `/products/${product.productId}`,
    image: product.colorVariant?.images?.[0] || '',
    price: product.price,
    availability: product.inStock ? 'InStock' : 'OutOfStock',
  }));

  return (
    <>
      {/* BreadcrumbList JSON-LD Schema */}
      <BreadcrumbSchema items={breadcrumbItems} />
      
      {/* ItemList JSON-LD Schema for products */}
      {products.length > 0 && (
        <ItemListSchema
          listName={category.name}
          description={category.description || `مجموعه محصولات ${category.name} در فروشگاه وکسینا`}
          listUrl={`/categories/${categorySlug}`}
          items={itemListItems}
        />
      )}

      {/* Hidden pagination links for crawlers */}
      <nav aria-label="Pagination" className="sr-only">
        {currentPage > 1 && (
          <a href={buildPageUrl(currentPage - 1, categorySlug, search)} rel="prev">
            صفحه قبل
          </a>
        )}
        {currentPage < totalPages && (
          <a href={buildPageUrl(currentPage + 1, categorySlug, search)} rel="next">
            صفحه بعد
          </a>
        )}
      </nav>

      {/* Category Page Content - Client Component for interactivity */}
      <Suspense
        fallback={
          <div className="container py-16 flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" text="در حال بارگذاری محصولات..." />
          </div>
        }
      >
        <CategoryPageClient
          category={category}
          products={products}
          pagination={pagination}
          categories={categories}
          currentPage={currentPage}
          categorySlug={categorySlug}
          initialFilters={{
            sort: search.sort,
            inStockOnly: search.inStockOnly === "true",
          }}
        />
      </Suspense>
    </>
  );
}
