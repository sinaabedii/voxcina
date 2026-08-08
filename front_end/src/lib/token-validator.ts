/**
 * Token Validator Service
 * 
 * Validates JWT tokens client-side without API calls.
 * Implements Requirements 2.3 (token validation on init) and 6.2 (client-side expiration check).
 */

/**
 * JWT Payload structure matching backend token claims
 */
export interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  exp: number;
  iat?: number;
  token_type?: 'access' | 'refresh';
}

/**
 * Token configuration constants
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 7 * 24 * 60 * 60,   // 7 days in seconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60, // 30 days in seconds
  PROACTIVE_REFRESH_THRESHOLD: 5 * 60,    // 5 minutes in seconds
} as const;

/**
 * TokenValidator class for client-side JWT validation
 * 
 * This class provides methods to validate, decode, and check expiration
 * of JWT tokens without making API calls.
 */
export class TokenValidator {
  /**
   * Validates if a token is structurally valid and not expired
   * 
   * @param token - JWT token string to validate
   * @returns true if token is valid and not expired, false otherwise
   */
  isTokenValid(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const payload = this.decodeToken(token);
    if (!payload) {
      return false;
    }

    return payload.token_type === 'access' && !this.isTokenExpired(token);
  }

  /**
   * Decodes a JWT token and extracts the payload without verification
   * 
   * Note: This only decodes the token, it does NOT verify the signature.
   * Signature verification is done server-side.
   * 
   * @param token - JWT token string to decode
   * @returns JWTPayload if successfully decoded, null otherwise
   */
  decodeToken(token: string): JWTPayload | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      // Handle base64url encoding (replace - with + and _ with /)
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decode base64
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const decoded = JSON.parse(jsonPayload);

      // Validate required fields
      if (!decoded.user_id || !decoded.exp) {
        return null;
      }

      return {
        user_id: decoded.user_id,
        email: decoded.email || '',
        role: decoded.role || 'customer',
        exp: decoded.exp,
        iat: decoded.iat,
        token_type: decoded.token_type,
      };
    } catch {
      return null;
    }
  }

  /**
   * Checks if a token is expired based on its exp claim
   * 
   * @param token - JWT token string to check
   * @returns true if token is expired, false if valid or unable to decode
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) {
      return true; // Treat invalid tokens as expired
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp <= currentTime;
  }

  /** Returns true only for a structurally valid, unexpired refresh token. */
  isRefreshTokenValid(token: string): boolean {
    const payload = this.decodeToken(token);
    return payload?.token_type === 'refresh' && !this.isTokenExpired(token);
  }

  /**
   * Gets the time remaining until token expiration in seconds
   * 
   * @param token - JWT token string to check
   * @returns Number of seconds until expiration, 0 if expired or invalid
   */
  getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = payload.exp - currentTime;
    
    return Math.max(0, timeRemaining);
  }

  /**
   * Checks if token should be proactively refreshed
   * (within PROACTIVE_REFRESH_THRESHOLD of expiration)
   * 
   * @param token - JWT token string to check
   * @returns true if token should be refreshed proactively
   */
  shouldRefreshProactively(token: string): boolean {
    const timeRemaining = this.getTimeUntilExpiration(token);
    return timeRemaining > 0 && timeRemaining <= TOKEN_CONFIG.PROACTIVE_REFRESH_THRESHOLD;
  }
}

// Export singleton instance for convenience
export const tokenValidator = new TokenValidator();
