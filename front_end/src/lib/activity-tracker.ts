/**
 * User Activity Tracker
 * Tracks user interactions and sends them to the backend for analytics
 */

import { localStorageManager } from "@/lib/local-storage-manager";

// Activity types matching backend constants
export const ActivityType = {
  PAGE_VIEW: 'page_view',
  PRODUCT_VIEW: 'product_view',
  PRODUCT_CLICK: 'product_click',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  REMOVE_FROM_WISHLIST: 'remove_from_wishlist',
  SEARCH: 'search',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  ORDER_PLACED: 'order_placed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  CATEGORY_VIEW: 'category_view',
  FILTER_APPLIED: 'filter_applied',
  SORT_APPLIED: 'sort_applied',
  REVIEW_SUBMITTED: 'review_submitted',
  NEWSLETTER_SUBSCRIBE: 'newsletter_subscribe',
  CHAT_STARTED: 'chat_started',
  CHAT_MESSAGE: 'chat_message',
  VIDEO_PLAYED: 'video_played',
  IMAGE_VIEWED: 'image_viewed',
  DOWNLOAD: 'download',
  SHARE: 'share',
  ERROR: 'error',
} as const;

export type ActivityTypeValue = typeof ActivityType[keyof typeof ActivityType];

interface ActivityData {
  activityType: ActivityTypeValue;
  sessionId: string;
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;
  productId?: string;
  productName?: string;
  categoryId?: string;
  searchQuery?: string;
  searchResults?: number;
  orderId?: string;
  orderValue?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class ActivityTracker {
  private sessionId: string;
  private queue: ActivityData[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private pageLoadTime: number = Date.now();
  private recentProductViews = new Map<string, number>();
  private pageViewInterval: NodeJS.Timeout | null = null;
  private readonly sessionKey = 'activity_session_id';
  private readonly sessionDuration = 30 * 60 * 1000; // 30 minutes
  private readonly productViewDedupeWindow = 30 * 1000;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.initPageViewTracking();
    this.initBeforeUnloadTracking();
  }

  /**
   * Get or create a unique session ID
   */
  private getOrCreateSessionId(): string {
    const storage = this.getStorage();
    if (!storage) {
      return this.createSessionId();
    }

    try {
      const stored = storage.getItem(this.sessionKey);
      const storedTime = storage.getItem(`${this.sessionKey}_time`);

      if (stored && storedTime) {
        const elapsed = Date.now() - parseInt(storedTime, 10);
        if (elapsed < this.sessionDuration) {
          // Extend session
          storage.setItem(`${this.sessionKey}_time`, Date.now().toString());
          return stored;
        }
      }

      // Create new session
      const newSessionId = this.createSessionId();
      storage.setItem(this.sessionKey, newSessionId);
      storage.setItem(`${this.sessionKey}_time`, Date.now().toString());
      return newSessionId;
    } catch {
      return this.createSessionId();
    }
  }

  private createSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Some real mobile browsers expose localStorage but throw when it is used
   * due to private browsing, restricted WebViews, or blocked storage.
   */
  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
      const storage = window.localStorage;
      const testKey = '__activity_storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return storage;
    } catch {
      return null;
    }
  }

  /**
   * Track automatic page views
   */
  private initPageViewTracking() {
    // Track initial page view
    if (typeof window !== 'undefined') {
      this.trackPageView();

      // Track page views on route changes (for SPAs)
      let lastPath = window.location.pathname;
      const checkPathChange = () => {
        const currentPath = window.location.pathname;
        if (currentPath !== lastPath) {
          lastPath = currentPath;
          this.pageLoadTime = Date.now();
          this.trackPageView();
        }
      };

      // Listen for popstate (browser back/forward)
      window.addEventListener('popstate', checkPathChange);

      // For Next.js/React Router, you might use their router events
      // This is a fallback that checks periodically
      this.pageViewInterval = setInterval(checkPathChange, 1000);
    }
  }

  /**
   * Stop automatic page-view tracking and clean up the interval.
   * Call this on pages/components where polling-based tracking is unwanted.
   */
  public stopPageViewTracking(): void {
    if (this.pageViewInterval) {
      clearInterval(this.pageViewInterval);
      this.pageViewInterval = null;
    }
  }

  /**
   * Track page unload to send final duration
   */
  private initBeforeUnloadTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        const duration = Date.now() - this.pageLoadTime;
        this.track({
          activityType: ActivityType.PAGE_VIEW,
          pagePath: window.location.pathname,
          pageTitle: document.title,
          duration,
        });
        this.flush(true); // Force immediate flush
      });
    }
  }

  /**
   * Track an activity
   */
  public track(data: Omit<ActivityData, 'sessionId'>): void {
    const activity: ActivityData = {
      activityType: data.activityType,
      sessionId: this.sessionId,
      pagePath: data.pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
      pageTitle: data.pageTitle || (typeof window !== 'undefined' ? document.title : ''),
      referrer: data.referrer || (typeof window !== 'undefined' ? document.referrer : ''),
      productId: data.productId,
      productName: data.productName,
      categoryId: data.categoryId,
      searchQuery: data.searchQuery,
      searchResults: data.searchResults,
      orderId: data.orderId,
      orderValue: data.orderValue,
      duration: data.duration,
      metadata: data.metadata,
    };

    this.queue.push(activity);

    // Auto-flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      // Schedule flush
      this.scheduleFlush();
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pagePath?: string): void {
    this.track({
      activityType: ActivityType.PAGE_VIEW,
      pagePath: pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
    });
  }

  /**
   * Track product view
   */
  public trackProductView(
    productId: string,
    productName?: string,
    duration?: number,
    metadata?: Record<string, any>,
    immediate: boolean = false
  ): void {
    const pagePath = typeof window !== 'undefined' ? window.location.pathname : '';
    const key = `${productId}:${pagePath}`;
    const now = Date.now();
    const lastViewedAt = this.recentProductViews.get(key);

    if (lastViewedAt && now - lastViewedAt < this.productViewDedupeWindow) {
      return;
    }

    this.recentProductViews.set(key, now);
    this.track({
      activityType: ActivityType.PRODUCT_VIEW,
      productId,
      productName,
      pagePath,
      duration,
      metadata,
    });
    if (immediate) {
      this.flush(true);
    }
  }

  /**
   * Track add to cart
   */
  public trackAddToCart(productId: string, productName?: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.ADD_TO_CART,
      productId,
      productName,
      metadata,
    });
  }

  /**
   * Track remove from cart
   */
  public trackRemoveFromCart(productId: string, productName?: string): void {
    this.track({
      activityType: ActivityType.REMOVE_FROM_CART,
      productId,
      productName,
    });
  }

  /**
   * Track search
   */
  public trackSearch(query: string, resultCount?: number): void {
    this.track({
      activityType: ActivityType.SEARCH,
      searchQuery: query,
      searchResults: resultCount,
    });
  }

  /**
   * Track order placed
   */
  public trackOrderPlaced(orderId: string, orderValue: number, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.ORDER_PLACED,
      orderId,
      orderValue,
      metadata,
    });
    this.flush(true); // Immediately flush important events
  }

  /**
   * Track checkout started
   */
  public trackCheckoutStarted(metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.CHECKOUT_STARTED,
      metadata,
    });
  }

  /**
   * Track login
   */
  public trackLogin(): void {
    this.track({
      activityType: ActivityType.LOGIN,
    });
  }

  /**
   * Track logout
   */
  public trackLogout(): void {
    this.track({
      activityType: ActivityType.LOGOUT,
    });
    this.flush(true);
  }

  /**
   * Track category view
   */
  public trackCategoryView(categoryId: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.CATEGORY_VIEW,
      categoryId,
      metadata,
    });
  }

  /**
   * Track a product click from a card/link with structured product context.
   * Use this for product card clicks; the global anchor listener auto-tracks
   * other links as product_click (with link text/href only).
   */
  public trackProductClick(productId: string, productName?: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.PRODUCT_CLICK,
      productId,
      productName,
      metadata: { source: 'product_card', ...metadata },
    });
  }

  /**
   * Track a color selection on the product detail page.
   * Pass undefined colorName to record a color deselection.
   */
  public trackColorClick(productId: string, productName: string | undefined, colorName: string | undefined, colorHex?: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.PRODUCT_CLICK,
      productId,
      productName,
      metadata: {
        source: 'color_selector',
        clickType: colorName ? 'color_selected' : 'color_deselected',
        colorName: colorName ?? null,
        colorHex: colorHex ?? null,
        ...metadata,
      },
    });
  }

  /**
   * Track when a product image is selected in the gallery.
   * `source` describes how the user got there: 'thumbnail' | 'arrow' | 'keyboard' | 'lightbox'.
   * Duration is the time (ms) the user spent on the previous image (0 for the first one).
   */
  public trackImageViewed(productId: string, productName: string | undefined, imageIndex: number, totalImages: number, source: string, duration?: number, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.IMAGE_VIEWED,
      productId,
      productName,
      duration,
      metadata: {
        imageIndex,
        totalImages,
        source,
        ...metadata,
      },
    });
  }

  /**
   * Track successful payment verification (authoritative backend-confirmed).
   * Force-flushes the queue because this is a high-value terminal event.
   */
  public trackPaymentSuccess(orderId: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.PAYMENT_SUCCESS,
      orderId,
      metadata,
    });
    this.flush(true);
  }

  /**
   * Track a failed or abandoned payment.
   * `reason` is one of: 'cancelled' | 'abandoned' | 'gateway_failed' | 'verify_failed'.
   */
  public trackPaymentFailed(orderId: string | null, reason: string, metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.PAYMENT_FAILED,
      orderId: orderId ?? undefined,
      metadata: { reason, ...metadata },
    });
  }

  /**
   * Track start of a conversation (e.g. coupon negotiation chatbot).
   * Pass `metadata.context` to disambiguate the conversation type.
   */
  public trackChatStarted(metadata?: Record<string, any>): void {
    this.track({
      activityType: ActivityType.CHAT_STARTED,
      metadata,
    });
  }

  /**
   * Schedule a flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Flush queued activities to backend
   */
  public flush(immediate: boolean = false): void {
    if (typeof window === 'undefined') return;
    if (this.queue.length === 0) return;

    const activities = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Send to backend
    const endpoint = '/api/activity/track/batch';
    const token = localStorageManager.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      if (immediate && typeof fetch !== 'undefined') {
        // On page unload use fetch with keepalive: true so the Authorization
        // header is preserved for authenticated users. sendBeacon cannot set
        // custom headers, so it is only used as a fallback for anonymous users
        // if the keepalive fetch fails.
        fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(activities),
          keepalive: true,
        }).catch((error) => {
          console.error('Failed to send activity data:', error);
          // Re-queue failed activities
          this.queue.unshift(...activities);
          // Fallback to sendBeacon for anonymous users; it cannot carry the JWT.
          if (!token && typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(activities)], { type: 'application/json' });
            navigator.sendBeacon(endpoint, blob);
          }
        });
      } else if (typeof fetch !== 'undefined') {
        // Normal fetch request
        fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(activities),
        }).catch((error) => {
          console.error('Failed to send activity data:', error);
          // Re-queue failed activities
          this.queue.unshift(...activities);
        });
      }
    } catch (error) {
      console.error('Failed to send activity data:', error);
      this.queue.unshift(...activities);
    }
  }

  /**
   * Clear session (useful for logout)
   */
  public clearSession(): void {
    const storage = this.getStorage();
    try {
      storage?.removeItem(this.sessionKey);
      storage?.removeItem(`${this.sessionKey}_time`);
    } catch {
      // Ignore storage failures; clearSession should still rotate memory state.
    }
    this.sessionId = this.getOrCreateSessionId();
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();

// Auto-track common events
if (typeof window !== 'undefined') {
  // Track clicks on links. Links with `data-activity-tracked="true"` are
  // expected to fire their own structured product_click event (e.g. product
  // cards), so we skip them here to avoid duplicate tracking.
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a');

    if (link && link.href && link.getAttribute('data-activity-tracked') !== 'true') {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#')) {
        activityTracker.track({
          activityType: ActivityType.PRODUCT_CLICK,
          metadata: {
            source: 'global_link',
            linkText: link.textContent?.trim().slice(0, 200),
            linkHref: href,
          },
        });
      }
    }
  });
}
