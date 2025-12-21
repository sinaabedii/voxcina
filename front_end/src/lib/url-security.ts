/**
 * URL Security Service
 * 
 * Provides security checks to prevent token exposure in URLs.
 * Implements Requirement 7.2: Auth tokens should never appear in URL parameters or query strings.
 */

/**
 * List of sensitive parameter names that should never appear in URLs
 * These are common names used for authentication tokens
 */
const SENSITIVE_PARAMS = [
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authToken',
  'auth_token',
  'jwt',
  'bearer',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'password',
  'pwd',
  'credential',
  'credentials',
  'session',
  'sessionId',
  'session_id',
] as const;

/**
 * Pattern to detect JWT tokens in URLs
 * JWT format: xxxxx.yyyyy.zzzzz (three base64url-encoded parts separated by dots)
 */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/;

/**
 * Result of URL security validation
 */
export interface URLSecurityCheckResult {
  /** Whether the URL is safe (no token exposure) */
  isSafe: boolean;
  /** List of issues found (empty if safe) */
  issues: string[];
  /** The sanitized URL with sensitive params removed (if any were found) */
  sanitizedUrl: string;
}

/**
 * Checks if a URL contains sensitive authentication parameters
 * 
 * @param url - URL string or URL object to check
 * @returns Security check result with safety status and any issues found
 * 
 * @example
 * // Safe URL
 * checkUrlForTokenExposure('/dashboard?page=1')
 * // Returns: { isSafe: true, issues: [], sanitizedUrl: '/dashboard?page=1' }
 * 
 * @example
 * // Unsafe URL with token parameter
 * checkUrlForTokenExposure('/api/data?token=abc123')
 * // Returns: { isSafe: false, issues: ['Sensitive parameter found: token'], sanitizedUrl: '/api/data' }
 */
export function checkUrlForTokenExposure(url: string | URL): URLSecurityCheckResult {
  const issues: string[] = [];
  
  try {
    // Handle relative URLs by creating a full URL
    const urlObj = typeof url === 'string' 
      ? new URL(url, 'http://localhost') 
      : url;
    
    // Check query parameters for sensitive names
    const paramsToRemove: string[] = [];
    
    urlObj.searchParams.forEach((value, key) => {
      const keyLower = key.toLowerCase();
      
      // Check if parameter name matches sensitive params
      if (SENSITIVE_PARAMS.some(param => keyLower === param.toLowerCase())) {
        issues.push(`Sensitive parameter found: ${key}`);
        paramsToRemove.push(key);
      }
      
      // Check if parameter value looks like a JWT token
      if (JWT_PATTERN.test(value)) {
        issues.push(`JWT token detected in parameter: ${key}`);
        paramsToRemove.push(key);
      }
    });
    
    // Check URL path for JWT tokens (sometimes tokens are embedded in paths)
    if (JWT_PATTERN.test(urlObj.pathname)) {
      issues.push('JWT token detected in URL path');
    }
    
    // Check hash fragment for tokens
    if (urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.slice(1));
      hashParams.forEach((value, key) => {
        const keyLower = key.toLowerCase();
        if (SENSITIVE_PARAMS.some(param => keyLower === param.toLowerCase())) {
          issues.push(`Sensitive parameter found in hash: ${key}`);
        }
        if (JWT_PATTERN.test(value)) {
          issues.push(`JWT token detected in hash parameter: ${key}`);
        }
      });
    }
    
    // Create sanitized URL by removing sensitive params
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    
    // Return relative URL if input was relative
    const sanitizedUrl = typeof url === 'string' && !url.startsWith('http')
      ? urlObj.pathname + urlObj.search + urlObj.hash
      : urlObj.toString();
    
    return {
      isSafe: issues.length === 0,
      issues,
      sanitizedUrl,
    };
  } catch {
    // If URL parsing fails, return as unsafe
    return {
      isSafe: false,
      issues: ['Invalid URL format'],
      sanitizedUrl: '',
    };
  }
}

/**
 * Validates that a redirect URL is safe (no token exposure)
 * 
 * @param url - URL to validate for redirect
 * @returns true if URL is safe for redirect, false otherwise
 * 
 * @example
 * isRedirectUrlSafe('/dashboard') // true
 * isRedirectUrlSafe('/api?token=xyz') // false
 */
export function isRedirectUrlSafe(url: string): boolean {
  const result = checkUrlForTokenExposure(url);
  return result.isSafe;
}

/**
 * Sanitizes a URL by removing any sensitive parameters
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL with sensitive parameters removed
 * 
 * @example
 * sanitizeUrl('/dashboard?token=abc&page=1')
 * // Returns: '/dashboard?page=1'
 */
export function sanitizeUrl(url: string): string {
  const result = checkUrlForTokenExposure(url);
  return result.sanitizedUrl;
}

/**
 * Validates a return URL before storing it for post-login redirect
 * Ensures the URL is safe and doesn't contain tokens
 * 
 * @param url - Return URL to validate
 * @returns Validated and sanitized URL, or null if invalid
 * 
 * @example
 * validateReturnUrl('/checkout') // '/checkout'
 * validateReturnUrl('/api?token=xyz') // '/api' (sanitized)
 * validateReturnUrl('https://evil.com') // null (external URL)
 */
export function validateReturnUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  
  // Reject external URLs (potential open redirect vulnerability)
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    // Only allow same-origin URLs
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      if (typeof window !== 'undefined' && urlObj.origin !== window.location.origin) {
        console.warn('[URLSecurity] Rejected external return URL:', url);
        return null;
      }
    } catch {
      return null;
    }
  }
  
  // Reject URLs that try to use javascript: or data: protocols
  const lowerUrl = url.toLowerCase().trim();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
    console.warn('[URLSecurity] Rejected dangerous protocol in return URL:', url);
    return null;
  }
  
  // Sanitize the URL to remove any sensitive parameters
  const result = checkUrlForTokenExposure(url);
  
  if (!result.isSafe) {
    console.warn('[URLSecurity] Sanitized return URL, removed sensitive params:', result.issues);
  }
  
  return result.sanitizedUrl || null;
}

/**
 * Checks the current browser URL for token exposure
 * Should be called on app initialization to detect and clean up any exposed tokens
 * 
 * @returns Security check result for the current URL
 */
export function checkCurrentUrlForTokenExposure(): URLSecurityCheckResult | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const result = checkUrlForTokenExposure(window.location.href);
  
  if (!result.isSafe) {
    console.error('[URLSecurity] Token exposure detected in current URL:', result.issues);
    
    // Clean up the URL by replacing it with the sanitized version
    // This removes tokens from the browser history
    try {
      const sanitizedUrl = new URL(result.sanitizedUrl, window.location.origin);
      window.history.replaceState(null, '', sanitizedUrl.pathname + sanitizedUrl.search + sanitizedUrl.hash);
      console.info('[URLSecurity] URL sanitized, sensitive parameters removed');
    } catch (error) {
      console.error('[URLSecurity] Failed to sanitize URL:', error);
    }
  }
  
  return result;
}

/**
 * Creates a safe URL for navigation, ensuring no tokens are exposed
 * 
 * @param baseUrl - Base URL path
 * @param params - Query parameters to add (will be filtered for sensitive data)
 * @returns Safe URL string
 * 
 * @example
 * createSafeUrl('/dashboard', { page: '1', filter: 'active' })
 * // Returns: '/dashboard?page=1&filter=active'
 * 
 * createSafeUrl('/api', { token: 'abc', data: 'xyz' })
 * // Returns: '/api?data=xyz' (token removed)
 */
export function createSafeUrl(baseUrl: string, params?: Record<string, string>): string {
  try {
    const url = new URL(baseUrl, 'http://localhost');
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        
        // Skip sensitive parameters
        if (SENSITIVE_PARAMS.some(param => keyLower === param.toLowerCase())) {
          console.warn(`[URLSecurity] Blocked sensitive parameter from URL: ${key}`);
          return;
        }
        
        // Skip values that look like JWT tokens
        if (JWT_PATTERN.test(value)) {
          console.warn(`[URLSecurity] Blocked JWT token value in parameter: ${key}`);
          return;
        }
        
        url.searchParams.set(key, value);
      });
    }
    
    // Return relative URL
    return url.pathname + url.search;
  } catch {
    return baseUrl;
  }
}

// Export singleton for convenience
export const urlSecurity = {
  checkUrlForTokenExposure,
  isRedirectUrlSafe,
  sanitizeUrl,
  validateReturnUrl,
  checkCurrentUrlForTokenExposure,
  createSafeUrl,
};

export default urlSecurity;
