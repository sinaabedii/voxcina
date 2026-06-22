/**
 * LocalStorage Manager Service
 * 
 * Manages auth-related localStorage items with cross-tab synchronization.
 * Implements Requirements 2.1 (cleanup on invalid token), 7.1 (localStorage persistence),
 * 7.2 (no token exposure in URLs), and 7.4 (logout cleanup).
 */

import { validateReturnUrl } from './url-security';

/**
 * Storage keys for auth-related items
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  AUTH_STORAGE: 'auth-storage',
  RETURN_URL: 'auth-return-url',
} as const;

/**
 * Type for storage key values
 */
export type AuthStorageKey = typeof AUTH_STORAGE_KEYS[keyof typeof AUTH_STORAGE_KEYS];

/**
 * LocalStorageManager class for managing auth-related localStorage items
 * 
 * This class provides methods for token storage, return URL management,
 * and cross-tab synchronization via storage events.
 */
export class LocalStorageManager {
  /**
   * Check if localStorage is available (handles SSR)
   */
  private isStorageAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Token Storage Methods ====================

  /**
   * Stores the access token in localStorage
   * 
   * @param token - JWT access token to store
   */
  setAccessToken(token: string): void {
    if (!this.isStorageAvailable()) return;
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  /**
   * Retrieves the access token from localStorage
   * 
   * @returns Access token string or null if not found
   */
  getAccessToken(): string | null {
    if (!this.isStorageAvailable()) return null;
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Stores the refresh token in localStorage
   * 
   * @param token - JWT refresh token to store
   */
  setRefreshToken(token: string): void {
    if (!this.isStorageAvailable()) return;
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  /**
   * Retrieves the refresh token from localStorage
   * 
   * @returns Refresh token string or null if not found
   */
  getRefreshToken(): string | null {
    if (!this.isStorageAvailable()) return null;
    return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Stores both access and refresh tokens
   * 
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  // ==================== Auth Data Cleanup ====================

  /**
   * Clears all auth-related localStorage items
   * 
   * Removes: authToken, refreshToken, auth-storage (Zustand persisted state)
   * This implements Requirement 2.1 and 7.4
   */
  clearAuthData(): void {
    if (!this.isStorageAvailable()) return;
    
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_STORAGE);
  }

  /**
   * Checks if any auth tokens exist in storage
   * 
   * @returns true if either access or refresh token exists
   */
  hasAuthTokens(): boolean {
    return this.getAccessToken() !== null || this.getRefreshToken() !== null;
  }

  // ==================== Return URL Management ====================

  /**
   * Stores the return URL for post-login redirection
   * Validates the URL to ensure no token exposure (Requirement 7.2)
   * 
   * @param url - URL to redirect to after login
   */
  setReturnUrl(url: string): void {
    if (!this.isStorageAvailable()) return;
    
    // Validate and sanitize the URL to prevent token exposure (Requirement 7.2)
    const validatedUrl = validateReturnUrl(url);
    if (validatedUrl) {
      localStorage.setItem(AUTH_STORAGE_KEYS.RETURN_URL, validatedUrl);
    } else {
      console.warn('[LocalStorageManager] Invalid return URL rejected:', url);
    }
  }

  /**
   * Retrieves the stored return URL
   * 
   * @returns Return URL string or null if not found
   */
  getReturnUrl(): string | null {
    if (!this.isStorageAvailable()) return null;
    return localStorage.getItem(AUTH_STORAGE_KEYS.RETURN_URL);
  }

  /**
   * Clears the stored return URL
   */
  clearReturnUrl(): void {
    if (!this.isStorageAvailable()) return;
    localStorage.removeItem(AUTH_STORAGE_KEYS.RETURN_URL);
  }

  /**
   * Gets and clears the return URL in one operation
   * Useful for consuming the return URL after login
   * Validates the URL before returning to ensure no token exposure (Requirement 7.2)
   * 
   * @returns Return URL string or null if not found or invalid
   */
  consumeReturnUrl(): string | null {
    const url = this.getReturnUrl();
    if (url) {
      this.clearReturnUrl();
      // Re-validate the URL before returning (Requirement 7.2)
      return validateReturnUrl(url);
    }
    return null;
  }

  // ==================== Cross-Tab Synchronization ====================

  /**
   * Registers a callback for storage change events
   * Used for cross-tab synchronization of auth state
   * 
   * @param callback - Function to call when storage changes
   * @returns Cleanup function to remove the listener
   */
  onStorageChange(callback: (event: StorageEvent) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {}; // No-op for SSR
    }

    const handler = (event: StorageEvent) => {
      // Only trigger for auth-related keys
      if (event.key && this.isAuthStorageKey(event.key)) {
        callback(event);
      }
    };

    window.addEventListener('storage', handler);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handler);
    };
  }

  /**
   * Checks if a storage key is auth-related
   * 
   * @param key - Storage key to check
   * @returns true if the key is an auth storage key
   */
  private isAuthStorageKey(key: string): boolean {
    return Object.values(AUTH_STORAGE_KEYS).includes(key as AuthStorageKey);
  }

  /**
   * Gets the Zustand persisted auth state from localStorage
   * 
   * @returns Parsed auth storage state or null
   */
  getPersistedAuthState(): { state: { user: unknown; isAuthenticated: boolean; adminToken: string | null }; version: number } | null {
    if (!this.isStorageAvailable()) return null;
    
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_STORAGE);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}

// Export singleton instance for convenience
export const localStorageManager = new LocalStorageManager();
