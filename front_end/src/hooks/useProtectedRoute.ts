/**
 * useProtectedRoute Hook
 * 
 * Provides protected route functionality with authentication and role-based access control.
 * Implements Requirements 3.1, 3.2, 3.4 for protected route redirection.
 * Implements Requirement 7.2 for URL security (no token exposure in URLs).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { localStorageManager } from '@/lib/local-storage-manager';
import { validateReturnUrl } from '@/lib/url-security';
import { User } from '@/types/user';
import { isBackOfficeRole } from '@/lib/admin-access';

/**
 * Options for the useProtectedRoute hook
 */
export interface UseProtectedRouteOptions {
  /**
   * Whether authentication is required (default: true)
   */
  requiredAuth?: boolean;
  
  /**
   * Required role for access ('customer' | 'staff' | 'admin')
   *
   * Each value names who passes, not an exact match:
   * 'customer' admits everyone signed in, 'staff' admits staff and admins
   * (the whole back office), 'admin' admits admins only.
   *
   * 'seller' is the exception and admits ONLY sellers — it is a separate
   * panel, not a rung on the same ladder, and an admin there would read their
   * own empty partner figures. Mirrors middlewares.SellerAuthMiddleware.
   *
   * If not specified, any authenticated user can access.
   */
  requiredRole?: 'customer' | 'seller' | 'staff' | 'admin';
  
  /**
   * Custom redirect URL for unauthenticated users (default: '/sign-in')
   */
  redirectUrl?: string;
  
  /**
   * URL to redirect non-admin users when admin role is required (default: '/dashboard')
   */
  nonAdminRedirectUrl?: string;
}

/**
 * Return type for the useProtectedRoute hook
 */
export interface UseProtectedRouteReturn {
  /**
   * Whether the auth check is still in progress
   */
  isLoading: boolean;
  
  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Whether the user has the required role (if specified)
   */
  hasRequiredRole: boolean;
  
  /**
   * Whether access is granted (authenticated + has required role)
   */
  isAuthorized: boolean;
  
  /**
   * The current user object (null if not authenticated)
   */
  user: User | null;
}

/**
 * Hook for protecting routes with authentication and role-based access control
 * 
 * @param options - Configuration options for the protected route
 * @returns Object containing loading state, authentication status, and authorization status
 * 
 * @example
 * // Basic usage - require authentication
 * const { isLoading, isAuthorized } = useProtectedRoute();
 * 
 * @example
 * // Require admin role
 * const { isLoading, isAuthorized } = useProtectedRoute({ requiredRole: 'admin' });
 * 
 * @example
 * // Custom redirect URL
 * const { isLoading, isAuthorized } = useProtectedRoute({ redirectUrl: '/login' });
 */
export function useProtectedRoute(options: UseProtectedRouteOptions = {}): UseProtectedRouteReturn {
  const {
    requiredAuth = true,
    requiredRole,
    redirectUrl = '/sign-in',
    nonAdminRedirectUrl = '/dashboard',
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, initializeAuth } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  /**
   * The current path, read through a ref so the redirect helpers below keep a
   * stable identity.
   *
   * Those helpers are dependencies of the auth effect. When they depended on
   * `pathname` directly they were rebuilt on every route change, so the effect
   * re-ran on every navigation and re-evaluated its redirect conditions in the
   * middle of one. Any momentary gap in auth state — a token refresh landing
   * between two renders, say — then fired router.push() and cancelled the
   * navigation the user had just started, which reads as a sidebar link that
   * did nothing. The effect now runs only when auth state actually changes.
   */
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  /**
   * Check if user has the required role
   */
  const hasRequiredRole = useCallback((): boolean => {
    if (!requiredRole) return true;
    if (!user) return false;
    
    // Admin role check
    if (requiredRole === 'admin') {
      return user.role === 'admin';
    }

    // Back office: the restricted 'staff' role plus admins. Which SECTIONS a
    // staff member may open is a separate question, answered by
    // canAccessAdminSection in @/lib/admin-access.
    if (requiredRole === 'staff') {
      return isBackOfficeRole(user.role);
    }

    // Sellers only — see the note on requiredRole above.
    if (requiredRole === 'seller') {
      return user.role === 'seller';
    }
    
    // Customer role - any authenticated user except admin-only routes.
    // Back-office roles are included because they still have a shopper account:
    // /dashboard is where they read their own orders and addresses.
    if (requiredRole === 'customer') {
      return (
        user.role === 'customer' ||
        user.role === 'user' ||
        user.role === 'seller' ||
        isBackOfficeRole(user.role)
      );
    }
    
    return false;
  }, [requiredRole, user]);

  /**
   * Store the current URL for post-login redirect
   * Validates URL to ensure no token exposure (Requirement 7.2)
   * Implements Requirement 3.2
   */
  const storeReturnUrl = useCallback(() => {
    const currentPath = pathnameRef.current;
    if (currentPath && currentPath !== redirectUrl && currentPath !== '/sign-up') {
      // Validate the URL before storing to prevent token exposure (Requirement 7.2)
      const validatedUrl = validateReturnUrl(currentPath);
      if (validatedUrl) {
        localStorageManager.setReturnUrl(validatedUrl);
      }
    }
  }, [redirectUrl]);

  /**
   * Handle redirect for unauthenticated users
   * Implements Requirement 3.1
   */
  const handleUnauthenticatedRedirect = useCallback(() => {
    storeReturnUrl();
    router.push(redirectUrl);
  }, [router, redirectUrl, storeReturnUrl]);

  /**
   * Handle redirect for users without required role
   * Implements Requirement 3.4
   */
  const handleUnauthorizedRedirect = useCallback(() => {
    // Shoppers who wander into a back-office route go to their own dashboard
    if (requiredRole === 'admin' || requiredRole === 'staff' || requiredRole === 'seller') {
      router.push(nonAdminRedirectUrl);
    } else {
      // For other role mismatches, redirect to sign-in
      storeReturnUrl();
      router.push(redirectUrl);
    }
  }, [router, requiredRole, nonAdminRedirectUrl, redirectUrl, storeReturnUrl]);

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Main auth check effect
  useEffect(() => {
    // Wait for auth initialization
    if (!isInitialized) {
      return;
    }

    // If auth is not required, allow access
    if (!requiredAuth) {
      setIsLoading(false);
      setHasCheckedAuth(true);
      return;
    }

    // Check authentication status
    if (!isAuthenticated) {
      // User is not authenticated - redirect to login (Requirement 3.1)
      handleUnauthenticatedRedirect();
      setIsLoading(false);
      setHasCheckedAuth(true);
      return;
    }

    // Check role-based access
    if (requiredRole && !hasRequiredRole()) {
      // User doesn't have required role - redirect (Requirement 3.4)
      handleUnauthorizedRedirect();
      setIsLoading(false);
      setHasCheckedAuth(true);
      return;
    }

    // User is authenticated and has required role
    setIsLoading(false);
    setHasCheckedAuth(true);
  }, [
    isInitialized,
    isAuthenticated,
    requiredAuth,
    requiredRole,
    hasRequiredRole,
    handleUnauthenticatedRedirect,
    handleUnauthorizedRedirect,
  ]);

  return {
    isLoading: isLoading || !isInitialized,
    isAuthenticated,
    hasRequiredRole: hasRequiredRole(),
    isAuthorized: isAuthenticated && hasRequiredRole(),
    user,
  };
}

/**
 * Default export for convenience
 */
export default useProtectedRoute;
