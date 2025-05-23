/**
 * Configuration helper with environment variables
 */

// API and backend URLs
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.voxcina.com';
export const BACKEND_URL = process.env.GO_BACKEND_URL || 'http://server:8080';

// Environment detection
export const IS_PRODUCTION = process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Helper function to get the correct backend URL based on environment
export function getBackendUrl() {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NODE_ENV === 'production' 
      ? API_URL 
      : BACKEND_URL;
  } else {
    // Client-side
    return IS_PRODUCTION ? API_URL : window.location.origin;
  }
}

// Helper function to construct full URLs to backend resources
export function getBackendResourceUrl(path: string) {
  // Make sure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBackendUrl()}${normalizedPath}`;
}

// Helper function to transform upload paths to the correct URL format
export function getUploadUrl(path: string) {
  // Strip leading /uploads if present
  const uploadPath = path.replace(/^\/uploads\//, '');
  
  // In production, use the API route for better handling
  if (IS_PRODUCTION) {
    return `/api/uploads/${uploadPath}`;
  }
  
  // In development, use direct path
  return `/uploads/${uploadPath}`;
} 