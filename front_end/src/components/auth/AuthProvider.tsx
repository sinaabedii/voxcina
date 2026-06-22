"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { checkCurrentUrlForTokenExposure } from "@/lib/url-security";

/**
 * AuthProvider Component
 * 
 * Handles authentication initialization and cross-tab synchronization.
 * Should be placed near the root of the application.
 * 
 * Implements:
 * - Requirements 2.3, 2.4: Token validation on app initialization
 * - Requirement 7.2: URL security check to prevent token exposure
 * - Requirements 8.1, 8.2, 8.3: Cross-tab state synchronization
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const setupStorageListener = useAuthStore((state) => state.setupStorageListener);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  // Track if we've already started initialization
  const initStarted = useRef(false);
  // Track if URL security check has been performed
  const urlSecurityChecked = useRef(false);

  // Check for token exposure in URL on mount (Requirement 7.2)
  useEffect(() => {
    if (!urlSecurityChecked.current) {
      urlSecurityChecked.current = true;
      // Check and sanitize current URL if tokens are exposed
      checkCurrentUrlForTokenExposure();
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    if (!initStarted.current && !isInitialized) {
      initStarted.current = true;
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  // Setup cross-tab synchronization
  useEffect(() => {
    const cleanup = setupStorageListener();
    return cleanup;
  }, [setupStorageListener]);

  return <>{children}</>;
}

export default AuthProvider;
