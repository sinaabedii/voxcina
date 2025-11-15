/**
 * User Activity Tracker
 * Tracks user interactions and sends them to the backend for analytics
 */

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

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.initPageViewTracking();
    this.initBeforeUnloadTracking();
  }

  /**
   * Get or create a unique session ID
   */
  private getOrCreateSessionId(): string {
    const SESSION_KEY = 'activity_session_id';
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

    const stored = localStorage.getItem(SESSION_KEY);
    const storedTime = localStorage.getItem(`${SESSION_KEY}_time`);

    if (stored && storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10);
      if (elapsed < SESSION_DURATION) {
        // Extend session
        localStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());
        return stored;
      }
    }

    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, newSessionId);
    localStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());
    return newSessionId;
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
      setInterval(checkPathChange, 1000);
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
          sessionId: this.sessionId,
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
  public trackProductView(productId: string, productName?: string): void {
    this.track({
      activityType: ActivityType.PRODUCT_VIEW,
      productId,
      productName,
    });
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
    if (this.queue.length === 0) return;

    const activities = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Send to backend
    const endpoint = '/api/activity/track/batch';

    if (immediate && navigator.sendBeacon) {
      // Use sendBeacon for immediate flush (like on page unload)
      const blob = new Blob([JSON.stringify(activities)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Normal fetch request
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activities),
        keepalive: immediate, // Keep connection alive for immediate flush
      }).catch((error) => {
        console.error('Failed to send activity data:', error);
        // Re-queue failed activities
        this.queue.unshift(...activities);
      });
    }
  }

  /**
   * Clear session (useful for logout)
   */
  public clearSession(): void {
    localStorage.removeItem('activity_session_id');
    localStorage.removeItem('activity_session_id_time');
    this.sessionId = this.getOrCreateSessionId();
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();

// Auto-track common events
if (typeof window !== 'undefined') {
  // Track clicks on links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#')) {
        activityTracker.track({
          activityType: ActivityType.PRODUCT_CLICK,
          metadata: {
            linkText: link.textContent,
            linkHref: href,
          },
        });
      }
    }
  });
}
