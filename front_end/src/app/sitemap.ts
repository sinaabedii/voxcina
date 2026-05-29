import { MetadataRoute } from 'next';

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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com';

// Get backend URL for server-side fetching (Docker internal network)
function getBackendUrl(): string {
  return process.env.GO_BACKEND_URL || 'http://localhost:8080';
}

// Types for API responses
interface Product {
  id?: string;
  _id?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface Category {
  id?: string;
  _id?: string;
  slug: string;
  updated_at?: string;
  updatedAt?: string;
}

interface Brand {
  id?: string;
  _id?: string;
  slug: string;
  updatedAt?: string;
}

interface BlogPost {
  id?: string;
  _id?: string;
  slug: string;
  publishedAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  data?: T[];
}

/**
 * Safely fetch data from the backend API
 * Returns empty array if fetch fails (e.g., during Docker build)
 */
async function safeFetch<T>(endpoint: string): Promise<T[]> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}${endpoint}`, {
      next: { revalidate: 3600 }, // Revalidate sitemap every hour
    });
    
    if (!response.ok) {
      console.warn(`[sitemap] Failed to fetch ${endpoint}: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as T[] | ApiResponse<T> | null;
    if (!data) return [];
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    // During Docker build, backend may not be available
    console.warn(`[sitemap] Could not fetch ${endpoint}:`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  
  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/shoppingGuide`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/shipping`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/returns`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/orderTracking`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/careers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Fetch dynamic content from backend
  const [products, categories, brands, blogPosts] = await Promise.all([
    safeFetch<Product>('/api/products?limit=1000'),
    safeFetch<Category>('/api/categories'),
    safeFetch<Brand>('/api/brands'),
    safeFetch<BlogPost>('/api/blog-posts?limit=500'),
  ]);

  // Generate product URLs
  const productUrls: MetadataRoute.Sitemap = products.map((product) => {
    const productId = product.id || product._id;
    const lastMod = product.updated_at || product.updatedAt;
    
    return {
      url: `${BASE_URL}/products/${productId}`,
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // Generate category URLs
  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => {
    const lastMod = category.updated_at || category.updatedAt;
    
    return {
      url: `${BASE_URL}/categories/${category.slug}`,
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // Generate brand URLs
  const brandUrls: MetadataRoute.Sitemap = brands.map((brand) => {
    return {
      url: `${BASE_URL}/brands/${brand.slug}`,
      lastModified: brand.updatedAt ? new Date(brand.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  // Generate blog post URLs
  const blogUrls: MetadataRoute.Sitemap = blogPosts.map((post) => {
    const lastMod = post.updatedAt || post.publishedAt;
    
    return {
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: lastMod ? new Date(lastMod) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  return [
    ...staticPages,
    ...productUrls,
    ...categoryUrls,
    ...brandUrls,
    ...blogUrls,
  ];
}
