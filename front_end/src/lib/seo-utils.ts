/**
 * SEO Utilities for canonical URLs and hreflang
 * 
 * This module provides utilities for generating consistent canonical URLs
 * and language alternates across all pages.
 * 
 * SEO: Canonical URLs consolidate ranking signals
 * SEO: Hreflang helps search engines serve correct language
 */

/**
 * Base URL for the site - used for generating absolute canonical URLs
 */
export const SITE_URL = 'https://voxcina.com';

/**
 * Default locale for the site
 */
export const DEFAULT_LOCALE = 'fa';

/**
 * Generate alternates object for Next.js metadata
 * Includes canonical URL and language alternates
 * 
 * @param path - The path relative to the site root (e.g., '/products', '/blog/my-post')
 * @returns Alternates object for Next.js metadata
 */
export function generateAlternates(path: string) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash except for root
  const cleanPath = normalizedPath === '/' ? '/' : normalizedPath.replace(/\/$/, '');
  
  return {
    canonical: cleanPath,
    languages: {
      'fa-IR': cleanPath,
      'x-default': cleanPath,
    },
  };
}

/**
 * Generate full canonical URL (absolute)
 * 
 * @param path - The path relative to the site root
 * @returns Full absolute URL
 */
export function getCanonicalUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const cleanPath = normalizedPath === '/' ? '' : normalizedPath.replace(/\/$/, '');
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Generate alternates for paginated pages
 * Handles canonical URLs for paginated content to avoid duplicate content issues
 * 
 * @param basePath - The base path without pagination (e.g., '/products')
 * @param page - Current page number (1-indexed)
 * @param totalPages - Total number of pages
 * @returns Alternates object with pagination-aware canonical
 */
export function generatePaginatedAlternates(
  basePath: string,
  page: number,
  totalPages: number
) {
  // For page 1, canonical should be the base path without page parameter
  // For other pages, include the page parameter
  const canonicalPath = page === 1 ? basePath : `${basePath}?page=${page}`;
  
  return {
    canonical: canonicalPath,
    languages: {
      'fa-IR': canonicalPath,
      'x-default': canonicalPath,
    },
  };
}

/**
 * Generate alternates for filtered pages
 * Handles canonical URLs for pages with filters to manage duplicate content
 * 
 * @param basePath - The base path (e.g., '/products')
 * @param filters - Object containing filter parameters
 * @returns Alternates object with filter-aware canonical
 */
export function generateFilteredAlternates(
  basePath: string,
  filters: Record<string, string | undefined>
) {
  // Build query string from non-empty filters
  const queryParams = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistent URLs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
    .join('&');
  
  const canonicalPath = queryParams ? `${basePath}?${queryParams}` : basePath;
  
  return {
    canonical: canonicalPath,
    languages: {
      'fa-IR': canonicalPath,
      'x-default': canonicalPath,
    },
  };
}
