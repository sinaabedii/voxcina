import { MetadataRoute } from 'next';
import { getBackendUrl } from '@/lib/server-api';

/**
 * Dynamic Sitemap Generation using Next.js App Router
 * 
 * This generates a sitemap at /sitemap.xml that includes:
 * - Static pages (home, about, contact, etc.)
 * - All products from the database
 * - All categories from the database
 * - All brands from the database
 * - All blog posts from the database
 * 
 * SEO: Dynamic sitemap ensures all pages are discoverable by search engines
 * 
 * Note: During Docker build, API calls may fail if the backend isn't running.
 * The sitemap gracefully handles this by returning static pages only.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com').replace(/\/+$/, '');

// Types for API responses
interface Product {
  productId?: string;
  id?: string;
  _id?: string;
  created_at?: string;
  updated_at?: string;
  updatedAt?: string;
  collection?: string;
}

interface Category {
  id?: string;
  _id?: string;
  slug: string;
  is_active?: boolean;
  updated_at?: string;
  updatedAt?: string;
}

interface Brand {
  id?: string;
  _id?: string;
  slug: string;
  isActive?: boolean;
  updatedAt?: string;
}

interface BlogPost {
  id?: string;
  _id?: string;
  slug: string;
  publishedAt?: string;
  updatedAt?: string;
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
}

interface ApiResponse<T> {
  data?: T[];
  totalPages?: number;
  pagination?: {
    totalPages?: number;
  };
}

interface FetchPageResult<T> {
  items: T[];
  totalPages: number;
}

/**
 * Safely fetch data from the backend API
 * Returns empty array if fetch fails (e.g., during Docker build)
 */
async function fetchPage<T>(endpoint: string): Promise<FetchPageResult<T> | null> {
  const backendUrl = getBackendUrl();
  // No backend during the production build — emit the static pages only.
  if (!backendUrl) return null;

  try {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      next: { revalidate: 3600 }, // Revalidate sitemap every hour
    });
    
    if (!response.ok) {
      console.warn(`[sitemap] Failed to fetch ${endpoint}: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as T[] | ApiResponse<T> | null;
    if (!data) return { items: [], totalPages: 1 };
    if (Array.isArray(data)) return { items: data, totalPages: 1 };

    return {
      items: data.data || [],
      totalPages: Math.max(1, data.pagination?.totalPages || data.totalPages || 1),
    };
  } catch (error) {
    // During Docker build, backend may not be available
    console.warn(`[sitemap] Could not fetch ${endpoint}:`, error);
    return null;
  }
}

async function safeFetch<T>(endpoint: string): Promise<T[]> {
  const firstPage = await fetchPage<T>(endpoint);
  if (!firstPage || firstPage.totalPages === 1) {
    return firstPage?.items || [];
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      fetchPage<T>(`${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${index + 2}`)
    )
  );

  return [firstPage, ...remainingPages.filter((page): page is FetchPageResult<T> => page !== null)]
    .flatMap((page) => page.items);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only include canonical, publicly indexable pages here. `lastModified` is
  // intentionally omitted for static pages because the current date would be
  // misleading when the page content has not changed.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/shoppingGuide`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/shipping`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/returns`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/orderTracking`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/careers`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Fetch dynamic content from backend
  const [products, categories, brands, blogPosts] = await Promise.all([
    safeFetch<Product>('/api/products?limit=1000'),
    safeFetch<Category>('/api/categories'),
    safeFetch<Brand>('/api/brands'),
    safeFetch<BlogPost>('/api/blog-posts?limit=50'),
  ]);

  // The products endpoint returns one row per color variant. Deduplicate by
  // productId so each product URL appears only once in the sitemap.
  const uniqueProducts = new Map<string, Product>();
  products.forEach((product) => {
    const productId = product.productId || product.id || product._id;
    if (productId && !uniqueProducts.has(productId)) {
      uniqueProducts.set(productId, product);
    }
  });

  const productUrls: MetadataRoute.Sitemap = Array.from(uniqueProducts, ([productId, product]) => {
    return {
      url: `${BASE_URL}/products/${productId}`,
      lastModified: toDate(product.updated_at || product.updatedAt || product.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // Collection pages are public, canonical landing pages and their values are
  // available on the same product-list response.
  const collectionValues = new Set(
    products
      .map((product) => product.collection?.trim())
      .filter((collection): collection is string => Boolean(collection))
  );
  const collectionUrls: MetadataRoute.Sitemap = Array.from(collectionValues, (collection) => ({
    url: `${BASE_URL}/collection/${encodeURIComponent(collection)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Generate category URLs
  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((category) => category.is_active !== false && Boolean(category.slug))
    .map((category) => {
      const lastMod = category.updated_at || category.updatedAt;

      return {
        url: `${BASE_URL}/categories/${category.slug}`,
        lastModified: toDate(lastMod),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    });

  // Generate brand URLs
  const brandUrls: MetadataRoute.Sitemap = brands
    .filter((brand) => brand.isActive !== false && Boolean(brand.slug))
    .map((brand) => {
      return {
        url: `${BASE_URL}/brands/${brand.slug}`,
        lastModified: toDate(brand.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });

  // Generate blog post URLs
  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((post) => {
    const lastMod = post.updatedAt || post.publishedAt;
    
    return {
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: toDate(lastMod),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  return [
    ...staticPages,
    ...productUrls,
    ...collectionUrls,
    ...categoryUrls,
    ...brandUrls,
    ...blogUrls,
  ];
}
