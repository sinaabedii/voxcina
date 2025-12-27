/**
 * Server-Side Data Fetching Utilities
 * 
 * This module provides utilities for fetching data from the Go backend
 * in Next.js Server Components. It uses the GO_BACKEND_URL environment
 * variable for Docker internal networking.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

/**
 * Configuration options for server-side fetch requests
 */
export interface ServerApiConfig {
  /** ISR cache duration in seconds. Set to 0 for no caching, false to disable caching entirely */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation */
  tags?: string[];
}

/**
 * ISR Revalidation Times (in seconds)
 * Based on design document specifications
 */
export const CACHE_TIMES = {
  PRODUCT_DETAIL: 60,      // 1 minute - products change frequently
  PRODUCTS_LIST: 300,      // 5 minutes - list can be slightly stale
  HOME_PAGE: 600,          // 10 minutes - home page content stable
  BLOG_POST: 3600,         // 1 hour - blog content rarely changes
  CATEGORIES: 600,         // 10 minutes - categories stable
  BRANDS: 600,             // 10 minutes - brands stable
  SLIDERS: 600,            // 10 minutes - sliders stable
  HERO_IMAGES: 360,       // 1 hour - hero images stable (Requirements: 3.2)
} as const;

/**
 * Get the backend URL for server-side requests.
 * Uses GO_BACKEND_URL environment variable for Docker internal networking.
 * Falls back to localhost:8080 for local development.
 * 
 * Requirements: 6.1, 6.3
 */
function getBackendUrl(): string {
  // In Docker, GO_BACKEND_URL is set to http://server:8080
  // In local development, fall back to localhost
  return process.env.GO_BACKEND_URL || 'http://localhost:8080';
}

/**
 * Generic server-side fetch wrapper with error handling and ISR support.
 * 
 * This function is designed to be used in Next.js Server Components
 * to fetch data from the Go backend API.
 * 
 * Features:
 * - Uses internal Docker network URL (GO_BACKEND_URL)
 * - Supports ISR revalidation configuration
 * - Provides error handling with fallback support
 * - Logs errors for debugging without crashing
 * 
 * Requirements: 6.1, 6.2, 6.3
 * 
 * @param endpoint - API endpoint path (e.g., '/api/products')
 * @param config - Optional configuration for caching and revalidation
 * @returns Promise resolving to the fetched data or null on error
 * 
 * @example
 * // Fetch a product with 60-second revalidation
 * const product = await serverFetch<Product>('/api/products/123', {
 *   revalidate: CACHE_TIMES.PRODUCT_DETAIL,
 *   tags: ['product', 'product-123']
 * });
 */
export async function serverFetch<T>(
  endpoint: string,
  config?: ServerApiConfig
): Promise<T | null> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}${endpoint}`;

  try {
    const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Configure Next.js caching/revalidation
    if (config) {
      fetchOptions.next = {};
      
      if (config.revalidate !== undefined) {
        fetchOptions.next.revalidate = config.revalidate;
      }
      
      if (config.tags && config.tags.length > 0) {
        fetchOptions.next.tags = config.tags;
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      // Log error but don't throw - return null for graceful degradation
      console.error(
        `[serverFetch] HTTP error: ${response.status} ${response.statusText} for ${url}`
      );
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    // Log error for debugging but return null for graceful fallback
    // This satisfies Requirement 6.2: render fallback UI without crashing
    console.error(`[serverFetch] Failed to fetch ${url}:`, error);
    return null;
  }
}

/**
 * Fetch with fallback value - returns fallback on error instead of null.
 * 
 * Use this when you need a guaranteed return value (e.g., empty array for lists).
 * 
 * Requirements: 6.2
 * 
 * @param endpoint - API endpoint path
 * @param fallback - Value to return if fetch fails
 * @param config - Optional configuration for caching and revalidation
 * @returns Promise resolving to fetched data or fallback value
 * 
 * @example
 * // Fetch products with empty array fallback
 * const products = await serverFetchWithFallback<Product[]>(
 *   '/api/products',
 *   [],
 *   { revalidate: CACHE_TIMES.PRODUCTS_LIST }
 * );
 */
export async function serverFetchWithFallback<T>(
  endpoint: string,
  fallback: T,
  config?: ServerApiConfig
): Promise<T> {
  const result = await serverFetch<T>(endpoint, config);
  return result ?? fallback;
}

/**
 * Build URL with query parameters for server-side fetching.
 * 
 * @param endpoint - Base API endpoint
 * @param params - Query parameters object
 * @returns Full endpoint with query string
 * 
 * @example
 * const url = buildApiUrl('/api/products', { page: '1', limit: '20', category: 'men' });
 * // Returns: '/api/products?page=1&limit=20&category=men'
 */
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | string[] | undefined>
): string {
  if (!params) return endpoint;

  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}
