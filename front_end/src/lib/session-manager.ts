/**
 * Session Manager Service
 * 
 * Handles all authenticated API requests with automatic token refresh.
 * Implements Requirements:
 * - 1.1: Token refresh on 401 response
 * - 1.2: Automatic retry with new token
 * - 1.3: Clear auth data on invalid refresh token
 * - 1.4: Request queuing during refresh
 * - 6.1: Proactive token refresh
 * - 6.4: Track last activity timestamp
 */

import { localStorageManager } from './local-storage-manager';
import { tokenValidator } from './token-validator';

/**
 * Error types for auth operations
 */
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVER_ERROR = 'SERVER_ERROR',
}

/**
 * Auth error structure
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: Error;
}

/**
 * Pending request structure for queue management
 */
interface PendingRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

/**
 * Refresh state to track ongoing refresh operations
 */
interface RefreshState {
  isRefreshing: boolean;
  refreshPromise: Promise<string | null> | null;
  pendingRequests: PendingRequest[];
}

/**
 * API endpoints for authentication
 */
const AUTH_ENDPOINTS = {
  REFRESH: '/api/users/refresh',
} as const;

/**
 * Activity events to track for proactive refresh
 * These events indicate user is actively using the application
 */
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
] as const;

/**
 * Throttle interval for activity updates (in milliseconds)
 * Prevents excessive updates on rapid user interactions
 */
const ACTIVITY_THROTTLE_MS = 30000; // 30 seconds

/**
 * SessionManager class for handling authenticated API requests
 * 
 * This class provides:
 * - Automatic token refresh on 401 responses
 * - Request queuing during refresh to prevent multiple simultaneous refresh attempts
 * - Proactive token refresh before expiration
 * - Proper cleanup on invalid refresh tokens
 * - Activity tracking for proactive refresh decisions (Requirement 6.4)
 */
export class SessionManager {
  private refreshState: RefreshState = {
    isRefreshing: false,
    refreshPromise: null,
    pendingRequests: [],
  };

  private lastActivityTimestamp: number = Date.now();
  private activityListenersAttached: boolean = false;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private lastThrottledUpdate: number = 0;

  /**
   * Initialize activity tracking
   * Attaches event listeners for user interactions
   * Implements Requirement 6.4
   */
  initActivityTracking(): void {
    if (typeof window === 'undefined' || this.activityListenersAttached) {
      return;
    }

    // Attach event listeners for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, this.handleUserActivity, { passive: true });
    });

    // Also track visibility changes - user returning to tab is activity
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Set up periodic check for proactive refresh
    this.startProactiveRefreshCheck();

    this.activityListenersAttached = true;
  }

  /**
   * Clean up activity tracking listeners
   */
  destroyActivityTracking(): void {
    if (typeof window === 'undefined' || !this.activityListenersAttached) {
      return;
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, this.handleUserActivity);
    });

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    this.activityListenersAttached = false;
  }

  /**
   * Handle user activity events (throttled)
   * Updates activity timestamp and checks for proactive refresh
   */
  private handleUserActivity = (): void => {
    const now = Date.now();
    
    // Throttle activity updates to prevent excessive processing
    if (now - this.lastThrottledUpdate < ACTIVITY_THROTTLE_MS) {
      return;
    }

    this.lastThrottledUpdate = now;
    this.updateActivity();

    // Check if proactive refresh is needed on activity
    this.checkAndPerformProactiveRefresh();
  };

  /**
   * Handle visibility change (user returning to tab)
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.updateActivity();
      // Check for proactive refresh when user returns to tab
      this.checkAndPerformProactiveRefresh();
    }
  };

  /**
   * Start periodic check for proactive token refresh
   * Runs every minute to check if token needs refresh
   */
  private startProactiveRefreshCheck(): void {
    if (this.activityCheckInterval) {
      return;
    }

    // Check every minute
    this.activityCheckInterval = setInterval(() => {
      this.checkAndPerformProactiveRefresh();
    }, 60000); // 1 minute
  }

  /**
   * Check and perform proactive refresh if needed
   * Implements Requirement 6.1
   */
  private async checkAndPerformProactiveRefresh(): Promise<void> {
    if (this.shouldRefreshToken()) {
      try {
        await this.refreshAccessToken();
      } catch {
        // Proactive refresh failed silently
        // Will fall back to reactive refresh on 401 (Requirement 6.3)
      }
    }
  }

  /**
   * Updates the last activity timestamp
   * Used for proactive refresh decisions
   * Implements Requirement 6.4
   */
  updateActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  /**
   * Gets the last activity timestamp
   */
  getLastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }

  /**
   * Checks if the user has been active recently (within last 5 minutes)
   */
  isUserActive(): boolean {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return this.lastActivityTimestamp > fiveMinutesAgo;
  }

  /**
   * Gets the current access token from storage
   */
  getAccessToken(): string | null {
    return localStorageManager.getAccessToken();
  }

  /**
   * Clears all authentication tokens
   * Implements Requirement 1.3
   */
  clearTokens(): void {
    localStorageManager.clearAuthData();
  }

  /**
   * Checks if the token should be proactively refreshed
   * Returns true if token is within PROACTIVE_REFRESH_THRESHOLD of expiration
   * and user is active
   * 
   * Implements Requirement 6.1
   */
  shouldRefreshToken(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    // Only proactively refresh if user is active
    if (!this.isUserActive()) {
      return false;
    }

    return tokenValidator.shouldRefreshProactively(token);
  }

  /**
   * Refreshes the access token using the stored refresh token
   * Implements request queuing to prevent multiple simultaneous refresh attempts
   * 
   * Implements Requirements 1.1, 1.2, 1.3, 1.4
   * 
   * @returns New access token or null if refresh failed
   */
  async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, queue this request
    if (this.refreshState.isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        this.refreshState.pendingRequests.push({
          resolve: (token: string) => resolve(token),
          reject: (error: Error) => reject(error),
        });
      });
    }

    const refreshToken = localStorageManager.getRefreshToken();
    if (!refreshToken) {
      // No refresh token available, clear auth data
      this.clearTokens();
      return null;
    }

    // Check if refresh token itself is expired
    if (tokenValidator.isTokenExpired(refreshToken)) {
      this.clearTokens();
      return null;
    }

    // Set refreshing state
    this.refreshState.isRefreshing = true;

    try {
      const response = await fetch(AUTH_ENDPOINTS.REFRESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear all auth data (Requirement 1.3)
        this.clearTokens();
        this.rejectPendingRequests(new Error('Token refresh failed'));
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken;

      if (!newAccessToken) {
        this.clearTokens();
        this.rejectPendingRequests(new Error('Invalid refresh response'));
        return null;
      }

      // Store the new access token
      localStorageManager.setAccessToken(newAccessToken);

      // Resolve all pending requests with the new token
      this.resolvePendingRequests(newAccessToken);

      return newAccessToken;
    } catch (error) {
      // Network or other error during refresh
      this.rejectPendingRequests(error instanceof Error ? error : new Error('Refresh failed'));
      return null;
    } finally {
      this.refreshState.isRefreshing = false;
      this.refreshState.refreshPromise = null;
    }
  }

  /**
   * Resolves all pending requests with the new token
   */
  private resolvePendingRequests(token: string): void {
    const pending = [...this.refreshState.pendingRequests];
    this.refreshState.pendingRequests = [];
    pending.forEach(({ resolve }) => resolve(token));
  }

  /**
   * Rejects all pending requests with an error
   */
  private rejectPendingRequests(error: Error): void {
    const pending = [...this.refreshState.pendingRequests];
    this.refreshState.pendingRequests = [];
    pending.forEach(({ reject }) => reject(error));
  }

  /**
   * Makes an authenticated API request with automatic 401 handling
   * 
   * Flow:
   * 1. Update activity timestamp
   * 2. Check if proactive refresh is needed (Requirement 6.1)
   * 3. Make request with current token
   * 4. On 401, attempt to refresh token and retry (Requirement 6.3 fallback)
   * 5. On refresh failure, clear auth data
   * 
   * Implements Requirements 1.1, 1.2, 1.3, 1.4, 6.1, 6.3
   * 
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @returns Response from the API
   */
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // Update activity timestamp on API call
    this.updateActivity();

    // Check for proactive refresh (Requirement 6.1)
    // This happens before the request to prevent 401s when possible
    if (this.shouldRefreshToken()) {
      try {
        await this.refreshAccessToken();
      } catch {
        // Proactive refresh failed, continue with current token
        // Will fall back to reactive refresh on 401 (Requirement 6.3)
        console.debug('[SessionManager] Proactive refresh failed, will retry on 401');
      }
    }

    let token = this.getAccessToken();
    
    // Prepare headers with authorization
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // First attempt
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - Reactive refresh fallback (Requirements 1.1, 6.3)
    if (response.status === 401) {
      // Attempt to refresh the token
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry the request with the new token (Requirement 1.2)
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
      // If refresh failed, return the 401 response
      // The calling code should handle this appropriately
    }

    return response;
  }

  /**
   * Checks if there's a valid access token available
   */
  hasValidToken(): boolean {
    const token = this.getAccessToken();
    return token !== null && tokenValidator.isTokenValid(token);
  }

  /**
   * Checks if there's a valid refresh token available
   */
  hasValidRefreshToken(): boolean {
    const refreshToken = localStorageManager.getRefreshToken();
    return refreshToken !== null && !tokenValidator.isTokenExpired(refreshToken);
  }

  /**
   * Gets the time until the access token expires in seconds
   */
  getTokenExpirationTime(): number {
    const token = this.getAccessToken();
    if (!token) {
      return 0;
    }
    return tokenValidator.getTimeUntilExpiration(token);
  }

  /**
   * Checks if the session manager is currently refreshing tokens
   */
  isRefreshing(): boolean {
    return this.refreshState.isRefreshing;
  }

  /**
   * Gets the number of pending requests waiting for token refresh
   */
  getPendingRequestCount(): number {
    return this.refreshState.pendingRequests.length;
  }
}

// Export singleton instance for convenience
export const sessionManager = new SessionManager();
