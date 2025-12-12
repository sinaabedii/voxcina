import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Cart, CartSummary, PromoCode } from "@/types/cart";
import { Product } from "@/types/product";
import { generateId, formatPrice } from "@/lib/utils";
import { useAuthStore, type AuthStore } from "./auth-store";

// ============================================================================
// HELPER FUNCTIONS (Refactoring: DRY principle - Task 9)
// ============================================================================

// Module-level flags for operation guards (Task 9.4)
const operationGuards: Record<string, boolean> = {};

/**
 * Task 9.1: Helper function to get auth state with error handling
 * Replaces duplicate try-catch blocks in addItem, updateItemQuantity, removeItem, clearCart, syncCartWithBackend
 */
const getAuthState = (): { isAuthenticated: boolean; user: any } => {
  try {
    const authState = useAuthStore.getState();
    return {
      isAuthenticated: authState.isAuthenticated,
      user: authState.user,
    };
  } catch (error) {
    console.error('Error accessing auth store:', error);
    return { isAuthenticated: false, user: null };
  }
};

/**
 * Task 9.2: Helper function for making cart API requests
 * Handles Authorization header, Content-Type, and error parsing consistently
 */
const makeCartApiRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: object
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(endpoint, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.message || errorData.error || `Request failed with status ${response.status}` 
      };
    }
  } catch (error) {
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error occurred' 
    };
  }
};

/**
 * Task 9.4: Unified operation guard wrapper
 * Provides consistent duplicate-call prevention across all cart operations
 */
const withOperationGuard = async <T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T | undefined> => {
  if (operationGuards[operationName]) {
    console.log(`${operationName} already in progress, skipping duplicate call`);
    return undefined;
  }
  
  operationGuards[operationName] = true;
  try {
    return await fn();
  } finally {
    operationGuards[operationName] = false;
  }
};

const validPromoCodes = [
  {
    code: "WELCOME10",
    discountPercentage: 10,
    minPurchase: 0,
    maxDiscount: 0,
    expireDate: "2025-12-31T23:59:59Z",
    description: "10% تخفیف برای اولین خرید",
  },
  {
    code: "SUMMER20",
    discountPercentage: 20,
    minPurchase: 1000000,
    maxDiscount: 500000,
    expireDate: "2025-08-31T23:59:59Z",
    description: "20% تخفیف تابستانه تا سقف 50 هزار تومان",
  },
  {
    code: "FLASH30",
    discountPercentage: 30,
    minPurchase: 2000000,
    maxDiscount: 800000,
    expireDate: "2025-05-15T23:59:59Z",
    description: "30% تخفیف ویژه تا سقف 80 هزار تومان",
  },
];

interface CartStore {
  cart: Cart;
  summary: CartSummary;
  promoCode: PromoCode | null;
  isLoading: boolean;
  error: string | null;
  syncRetryCount: number;
  
  // Sync control properties (Requirements 3.1, 3.2, 3.3)
  isSyncing: boolean;           // Tracks ongoing sync operations
  syncCompleted: boolean;       // Tracks if sync has completed for current session
  lastSyncTimestamp: number;    // Timestamp of last successful sync

  syncCartWithBackend: () => Promise<void>;
  addItem: (
    product: Product,
    quantity: number,
    size?: string,
    color?: string
  ) => Promise<void>;
  updateItemQuantity: (
    productId: string, 
    quantity: number,
    size?: string, 
    color?: string,
  ) => Promise<void>;
  removeItem: ( 
    productId: string,
    size?: string, 
    color?: string
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => void;
  removePromoCode: () => void;
  calculateSummary: () => void;
  cleanupSubscriptions: () => void;
  dismissCartWarnings: () => void;
  clearLocalCartStorage: () => void;
}

// Helper function to transform backend cart items to frontend structure if needed
const transformBackendCartItemProduct = (backendProduct: any): Product => {
  // Handle the new color variant structure
  const id = backendProduct.id || backendProduct.ID;
  const name = backendProduct.name || backendProduct.Name;
  const description = backendProduct.description || backendProduct.Description;
  const price = backendProduct.price || backendProduct.Price;
  const originalPrice = backendProduct.originalPrice || backendProduct.original_price || price;
  
  // Handle colorVariants - new structure
  let colorVariants = backendProduct.colorVariants || backendProduct.color_variants || [];
  
  // If no colorVariants but has legacy image field, create a default colorVariant
  if (colorVariants.length === 0 && backendProduct.image) {
    colorVariants = [{
      color: '#000000',
      colorName: 'پیش‌فرض',
      images: [backendProduct.image],
      sizes: [{ size: 'فری', sku: `${id}-default`, quantity: 1 }]
    }];
  }
  
  // Handle mainImages
  const mainImages = backendProduct.mainImages || backendProduct.main_images || [];
  
  return {
    id,
    name,
    description,
    price,
    originalPrice,
    mainImages,
    colorVariants,
    category_ids: backendProduct.category_ids || backendProduct.categoryIds || [],
    brand_id: backendProduct.brand_id || backendProduct.brandId || '',
    brand: backendProduct.brand || '',
    collection: backendProduct.collection || '',
    attributes: backendProduct.attributes || [],
    is_flash_sale: backendProduct.is_flash_sale || backendProduct.isFlashSale || false,
    is_active: backendProduct.is_active !== false,
    inStock: backendProduct.inStock !== false,
    created_at: backendProduct.created_at || backendProduct.createdAt || new Date().toISOString(),
    updated_at: backendProduct.updated_at || backendProduct.updatedAt || new Date().toISOString(),
    average_rating: backendProduct.average_rating || backendProduct.averageRating,
    review_count: backendProduct.review_count || backendProduct.reviewCount,
  } as Product;
};

// Helper function to process the cart data from backend
const processBackendCartData = (backendCartData: any): { cart: Cart; summary: CartSummary } => {
  if (!backendCartData || typeof backendCartData !== 'object') {
    console.error('Invalid cart data received from backend (not an object):', backendCartData);
    throw new Error('Invalid cart data received from backend (not an object)');
  }
  if (!Array.isArray(backendCartData.items)) {
    console.warn('Backend cart data items is not an array, defaulting to empty array:', backendCartData.items);
    backendCartData.items = [];
  }

  const processedItems: CartItem[] = backendCartData.items.map((item: any) => ({
    ...item, // Spreads quantity, variant, etc.
    product: item.product ? transformBackendCartItemProduct(item.product) : undefined as unknown as Product,
    price: item.product ? item.product.price : (item.price || 0),
    id: item.id || generateId(),
    productId: item.product ? (item.product.id || item.product.ID) : item.productId,
    size: item.variant?.size,
    color: item.variant?.color,
    colorName: item.variant?.colorName || item.variant?.color_name,
    sku: item.variant?.sku || item.variant?.SKU,
  }));

  return {
    cart: {
      id: backendCartData.id || generateId(), // Use backend cart ID or generate a new one
      userId: backendCartData.userId || null,
      items: processedItems,
      createdAt: backendCartData.createdAt || new Date().toISOString(),
      updatedAt: backendCartData.updatedAt || new Date().toISOString(),
      warnings: backendCartData.warnings || [], // Pass warnings from backend
    },
    summary: backendCartData.summary || { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
  };
};

/**
 * Task 9.3: Helper function to update cart state from backend response
 * Combines processBackendCartData call and set() with common state updates
 * Note: This is a factory function that returns a function to be used inside the store
 */
const createUpdateCartFromBackendResponse = (
  set: (state: Partial<CartStore>) => void
) => (rawBackendCart: any, additionalState: Partial<CartStore> = {}) => {
  const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
  set({
    cart: processedCart,
    summary: processedSummary,
    isLoading: false,
    error: null,
    ...additionalState,
  });
  return { cart: processedCart, summary: processedSummary };
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: {
        id: generateId(),
        userId: null,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      summary: {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        discount: 0,
        total: 0,
      },
      promoCode: null,
      isLoading: false,
      error: null,
      syncRetryCount: 0,
      
      // Sync control state (Requirements 3.1, 3.2, 3.3)
      isSyncing: false,
      syncCompleted: false,
      lastSyncTimestamp: 0,

      // Helper function to clear localStorage cart items only (Requirements 1.5, 4.1)
      clearLocalCartStorage: () => {
        try {
          const storageKey = 'cart-storage';
          const storedData = localStorage.getItem(storageKey);
          
          if (storedData) {
            const parsed = JSON.parse(storedData);
            // Clear only cart items, preserve other persisted state structure
            if (parsed.state) {
              parsed.state.cart = {
                ...parsed.state.cart,
                items: [],
                updatedAt: new Date().toISOString(),
              };
              localStorage.setItem(storageKey, JSON.stringify(parsed));
              console.log('✅ localStorage cart items cleared');
            }
          }
        } catch (error) {
          console.error('Error clearing localStorage cart:', error);
        }
      },

      syncCartWithBackend: async () => {
        // Sync guard: Check if already syncing or sync completed (Requirements 3.1, 3.2)
        const { isSyncing, syncCompleted } = get();
        
        if (isSyncing) {
          console.log('Sync already in progress, skipping duplicate sync request');
          return;
        }
        
        if (syncCompleted) {
          console.log('Sync already completed for this session, skipping');
          return;
        }
        
        // Task 9.1: Use helper for auth state
        const { isAuthenticated, user } = getAuthState();
        if (!isAuthenticated || !user) return;

        // Set isSyncing flag to prevent concurrent sync operations (Requirement 3.1)
        set({ isLoading: true, error: null, isSyncing: true });
        
        // Store reference to local cart items before sync for potential rollback
        const localCartItemsBeforeSync = [...get().cart.items];
        const hasLocalItems = localCartItemsBeforeSync.length > 0;
        
        try {
          const localCartItems = localCartItemsBeforeSync;
          
          // Fetch the backend cart
          const response = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          });

          let backendCart = null;

          if (response.ok) {
            // Backend cart exists
            backendCart = await response.json();
            const backendHasItems = backendCart.items?.length > 0;
            console.log('Found existing backend cart with', backendCart.items?.length || 0, 'items');
            
            // If we have local items, merge them to backend (handles both empty and non-empty backend)
            if (hasLocalItems) {
              console.log('Merging local items to backend cart...');
              const localCartItemsForBackend = localCartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                variant: { size: item.size, color: item.color }
              }));

              const mergeResponse = await fetch('/api/cart', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ items: localCartItemsForBackend })
              });

              if (mergeResponse.ok) {
                backendCart = await mergeResponse.json();
                console.log('✅ Local items merged to backend cart');
              }
            }
          } else if (response.status === 404) {
            // No backend cart exists - create with local items if any
            console.log('No backend cart found, creating new cart...');
            const itemsToCreate = hasLocalItems 
              ? localCartItems.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  variant: { size: item.size, color: item.color }
                }))
              : [];
              
            const postResponse = await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
              body: JSON.stringify({ items: itemsToCreate })
            });

            if (postResponse.ok) {
              const rawNewCart = await postResponse.json();
              const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawNewCart);
              
              // Clear localStorage after successful sync (Requirement 1.5)
              get().clearLocalCartStorage();
              
              set({
                cart: processedCart,
                summary: processedSummary,
                isLoading: false,
                syncRetryCount: 0,
                syncCompleted: true,
                lastSyncTimestamp: Date.now(),
                isSyncing: false,
              });
              console.log('New backend cart created with', hasLocalItems ? 'local items' : 'empty items');
              console.log('✅ Sync completed, localStorage cart cleared');
              return;
            } else {
              const errorData = await postResponse.json().catch(() => ({ message: 'Failed to create cart' }));
              throw new Error(errorData.message || 'Failed to create backend cart');
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Failed to get backend cart'}));
            // Handle specific backend error for empty cart
            if (
              errorData.message === 'Active cart is empty for user' ||
              errorData.error === 'Active cart is empty for user'
            ) {
              const { cart: emptyCart, summary: emptySummary } = processBackendCartData({ items: [], summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 } });
              
              // Clear localStorage after successful sync (Requirement 1.5)
              get().clearLocalCartStorage();
              
              set({ 
                cart: emptyCart, 
                summary: emptySummary, 
                isLoading: false,
                syncCompleted: true,
                lastSyncTimestamp: Date.now(),
                isSyncing: false,
              });
              console.log('✅ Sync completed (empty cart), localStorage cart cleared');
              return;
            }
            throw new Error(errorData.message || errorData.error || 'Failed to get backend cart');
          }
          
          // Process and set the final cart state from backend
          const { cart: processedCart, summary: processedSummary } = processBackendCartData(backendCart);
          
          // Clear localStorage after successful sync (Requirement 1.5)
          get().clearLocalCartStorage();
          
          set({
            cart: processedCart,
            summary: processedSummary,
            isLoading: false,
            syncRetryCount: 0,
            syncCompleted: true,
            lastSyncTimestamp: Date.now(),
            isSyncing: false,
          });
          
          console.log('Cart sync completed successfully - backend cart now has', processedCart.items.length, 'items');
          console.log('✅ Sync completed, localStorage cart cleared');
          
        } catch (error) {
          console.error('Error in syncCartWithBackend:', error);
          // On error, preserve local cart (Requirement 5.1) - don't clear localStorage
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred while syncing cart', 
            isLoading: false, 
            syncRetryCount: (get().syncRetryCount || 0) + 1,
            isSyncing: false,
            // Don't set syncCompleted to true on error - allow retry (Requirement 5.3)
          });
          console.log('⚠️ Sync failed, localStorage cart preserved for retry');
        }
      },

      addItem: async (product, quantity, size, color) => {
        // Task 9.4: Use unified operation guard
        await withOperationGuard('addItem', async () => {
          const { cart: currentLocalCart } = get();
          const updateCartFromBackend = createUpdateCartFromBackendResponse(set);
          set({ isLoading: true, error: null });
          
          try {
            // Task 9.1: Use helper for auth state
            const { isAuthenticated, user } = getAuthState();

            if (isAuthenticated && user) {
              // Task 9.2: Use helper for API request
              const result = await makeCartApiRequest<any>(
                '/api/cart/item',
                'POST',
                { productId: product.id, quantity, variant: { size, color } }
              );
              
              if (!result.ok) {
                throw new Error(result.error || 'Failed to add item to backend cart');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              // Local add logic (remains the same)
              const existingItemIndex = currentLocalCart.items.findIndex(
                item => item.productId === product.id && item.size === size && item.color === color
              );
              let updatedItems;
              if (existingItemIndex > -1) {
                updatedItems = currentLocalCart.items.map((item, index) =>
                  index === existingItemIndex
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                );
              } else {
                const newItem: CartItem = {
                  id: generateId(),
                  productId: product.id,
                  product: product,
                  quantity: quantity,
                  size: size,
                  color: color,
                  price: product.price,
                };
                updatedItems = [...currentLocalCart.items, newItem];
              }
              set({
                cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() },
                isLoading: false,
              });
              get().calculateSummary(); // Calculate summary for local changes
            }
          } catch (error) { 
            console.error('Error adding item:', error);
            set({ error: error instanceof Error ? error.message : 'Error adding item', isLoading: false }); 
          }
        });
      },

      updateItemQuantity: async (productId, quantity, size, color) => {
        // Task 9.4: Use unified operation guard
        await withOperationGuard('updateItemQuantity', async () => {
          const updateCartFromBackend = createUpdateCartFromBackendResponse(set);
          set({ isLoading: true, error: null });
          
          try {
            // Task 9.1: Use helper for auth state
            const { isAuthenticated, user } = getAuthState();

            if (isAuthenticated && user) {
              // Task 9.2: Use helper for API request
              const result = await makeCartApiRequest<any>(
                '/api/cart/item',
                'PUT',
                { productId, variant: { size, color }, quantity }
              );
              
              if (!result.ok) {
                throw new Error(result.error || 'Failed to update quantity');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              const { cart: currentLocalCart } = get();
              const updatedItems = currentLocalCart.items.map(item => 
                item.productId === productId && item.size === size && item.color === color 
                  ? { ...item, quantity } 
                  : item
              ).filter(item => item.quantity > 0);
              set({ cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() }, isLoading: false });
              get().calculateSummary(); // Calculate summary for local changes
            }
          } catch (error) { 
            console.error('Error updating quantity:', error);
            set({ error: error instanceof Error ? error.message : 'Error updating qty', isLoading: false }); 
          }
        });
      },

      removeItem: async (productId, size, color) => {
        // Task 9.4: Use unified operation guard
        await withOperationGuard('removeItem', async () => {
          const updateCartFromBackend = createUpdateCartFromBackendResponse(set);
          set({ isLoading: true, error: null });
          
          try {
            // Task 9.1: Use helper for auth state
            const { isAuthenticated, user } = getAuthState();

            if (isAuthenticated && user) {
              // Task 9.2: Use helper for API request (DELETE with query params)
              const queryParams = new URLSearchParams({ 
                productId, 
                ...(size && { variantSize: size }), 
                ...(color && { variantColor: color }) 
              });
              const result = await makeCartApiRequest<any>(
                `/api/cart/item?${queryParams.toString()}`,
                'DELETE'
              );
              
              if (!result.ok) {
                throw new Error(result.error || 'Failed to remove item');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              const { cart: currentLocalCart } = get();
              const updatedItems = currentLocalCart.items.filter(
                item => !(item.productId === productId && item.size === size && item.color === color)
              );
              set({ cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() }, isLoading: false });
              get().calculateSummary(); // Calculate summary for local changes
            }
          } catch (error) { 
            console.error('Error removing item:', error);
            set({ error: error instanceof Error ? error.message : 'Error removing item', isLoading: false }); 
          }
        });
      },
      
      clearCart: async () => {
        // Task 9.4: Use unified operation guard
        await withOperationGuard('clearCart', async () => {
          const updateCartFromBackend = createUpdateCartFromBackendResponse(set);
          set({ isLoading: true, error: null });
          
          try {
            // Task 9.1: Use helper for auth state
            const { isAuthenticated, user } = getAuthState();

            if (isAuthenticated && user) {
              // Task 9.2: Use helper for API request
              const result = await makeCartApiRequest<any>('/api/cart', 'DELETE');
              
              if (!result.ok) {
                throw new Error(result.error || 'Failed to clear cart on backend');
              }
              
              // Task 9.3: Use helper for cart state update with additional promoCode reset
              updateCartFromBackend(result.data, { promoCode: null });
            } else {
              const { cart: currentLocalCart } = get();
              set({
                cart: { ...currentLocalCart, items: [], updatedAt: new Date().toISOString() },
                promoCode: null,
                isLoading: false,
              });
              get().calculateSummary(); // Calculate summary for local changes
            }
          } catch (error) { 
            console.error('Error clearing cart:', error);
            set({ error: error instanceof Error ? error.message : 'Error clearing cart', isLoading: false }); 
          }
        });
      },

      calculateSummary: () => {
        const { cart, promoCode } = get();
        if (!cart || !cart.items) {
          set({ summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 } });
          return;
        }
        let subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let discountVal = 0;
        if (promoCode && promoCode.isValid) {
            const potentialDiscount = (subtotal * promoCode.discountPercentage) / 100;
            if (promoCode.maxDiscount !== undefined && promoCode.maxDiscount > 0) {
                discountVal = Math.min(potentialDiscount, promoCode.maxDiscount);
            } else {
                discountVal = potentialDiscount;
            }
        }
        discountVal = Math.min(subtotal, discountVal);
        const subtotalAfterDiscount = subtotal - discountVal;
        const taxRate = 0.10; // 10% tax
        const tax = subtotalAfterDiscount * taxRate;
        const shipping = subtotalAfterDiscount > 500000 ? 0 : 35000; // Free shipping over 500,000
        const total = subtotalAfterDiscount + tax + shipping;
        set({
          summary: {
            subtotal: subtotal, 
            shipping,
            tax,
            discount: discountVal,
            total,
          },
        });
      },

       applyPromoCode: (code) => {
        const { cart } = get(); // cart is used to check items, but summary.subtotal is used for minPurchase
        const promo = validPromoCodes.find((p) => p.code === code);

        if (promo) {
          const now = new Date();
          const expiry = new Date(promo.expireDate);
          const currentSubtotal = get().summary.subtotal; 

          if (now > expiry) {
            set({ error: "کد تخفیف منقضی شده است", promoCode: { ...promo, isValid: false, errorMessage: 'منقضی شده' } });
            return;
          }
          if (currentSubtotal < promo.minPurchase) {
            set({ error: `حداقل خرید برای این کد ${formatPrice(promo.minPurchase)} تومان است`, promoCode: { ...promo, isValid: false, errorMessage: `حداقل خرید ${formatPrice(promo.minPurchase)}` } });
            return;
          }

          set({ promoCode: { ...promo, isValid: true, errorMessage: '' }, error: null });
        } else {
          set({ error: "کد تخفیف نامعتبر است", promoCode: { code, isValid: false, errorMessage: 'نامعتبر', discountPercentage: 0, maxDiscount:0, expireDate: '', minPurchase: 0 } });
        }
        get().calculateSummary();
      },

      removePromoCode: () => {
        set({ promoCode: null, error: null }); // Clear any promo related errors
        get().calculateSummary();
      },
      cleanupSubscriptions: () => {
        // No direct subscriptions to cleanup in this version
      },
      dismissCartWarnings: () => {
        set((state) => ({
          cart: { ...state.cart, warnings: [] }
        }));
      },
    }),
    {
      name: "cart-storage",
      version: 1, // Add version to handle migrations
      // Exclude sync control flags from persistence (Requirements 3.2, 3.3)
      // isSyncing, syncCompleted, lastSyncTimestamp should reset on page refresh
      // to allow fresh sync on next login
      partialize: (state) => ({
        cart: state.cart,
        summary: state.summary, 
        promoCode: state.promoCode,
        // Note: isSyncing, syncCompleted, lastSyncTimestamp are intentionally excluded
        // These flags should reset on page refresh to allow fresh sync
      }),
      migrate: (persistedState: any, version: number) => {
        // Migration logic for different versions
        if (version === 0) {
          // Handle migration from version 0 to 1
          console.log('Migrating cart store from version 0 to 1');
          return {
            ...persistedState,
            cart: {
              ...persistedState.cart,
              warnings: persistedState.cart?.warnings || [],
            },
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) {
          console.error("Error rehydrating cart state:", error);
          // Fallback to initial state calculation if rehydration fails
          setTimeout(() => {
            try {
              // Reset sync flags to initial values on error (Requirement 3.2)
              useCartStore.setState({
                isSyncing: false,
                syncCompleted: false,
                lastSyncTimestamp: 0,
              });
              useCartStore.getState().calculateSummary();
            } catch (calcError) {
              console.error('Error calculating summary during error recovery:', calcError);
            }
          }, 0);
          return;
        }
        if (hydratedState) {
          console.log("Cart state rehydrated successfully");
          
          // Wrap in setTimeout to ensure useCartStore is fully initialized before access
          setTimeout(() => {
            try {
              // Ensure persisted cart items are properly structured for Product type if needed
              if (hydratedState.cart && Array.isArray(hydratedState.cart.items)) {
                hydratedState.cart.items = hydratedState.cart.items.map(item => {
                  try {
                    return {
                      ...item,
                      product: item.product ? transformBackendCartItemProduct(item.product) : undefined as unknown as Product,
                    };
                  } catch (transformError) {
                    console.error('Error transforming cart item during rehydration:', transformError, item);
                    return item;
                  }
                });
                
                // Safely update the store with rehydrated state
                // Reset sync flags to initial values on rehydration (Requirement 3.2)
                // This prevents stale sync state from blocking new syncs after page refresh
                useCartStore.setState({ 
                  cart: hydratedState.cart, 
                  summary: hydratedState.summary || { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }, 
                  promoCode: hydratedState.promoCode,
                  // Explicitly reset sync flags on rehydration
                  isSyncing: false,
                  syncCompleted: false,
                  lastSyncTimestamp: 0,
                });
              }

              useCartStore.getState().calculateSummary();
              console.log("Sync flags reset on rehydration - fresh sync allowed on next login");
            } catch (rehydrationError) {
              console.error('Error during cart rehydration processing:', rehydrationError);
            }
          }, 0);

        } else {
            // If hydratedState is null (e.g. nothing in storage or version mismatch), calculate summary for initial empty cart.
            console.log("No persisted cart state found or rehydration returned null, using initial state.");
            setTimeout(() => {
              try {
                // Reset sync flags to initial values (Requirement 3.2)
                useCartStore.setState({
                  isSyncing: false,
                  syncCompleted: false,
                  lastSyncTimestamp: 0,
                });
                useCartStore.getState().calculateSummary();
              } catch (calcError) {
                console.error('Error calculating summary for initial state:', calcError);
              }
            }, 0);
        }
      },
    }
  )
);

// Move auth subscription to be lazy-loaded to avoid circular dependency issues
let authUnsubscribe: (() => void) | null = null;

// Initialize auth subscription after stores are ready
const initializeAuthSubscription = () => {
  if (authUnsubscribe) return; // Already initialized
  
  try {
    authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
      // User just logged in - sync local cart with backend
      if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
        console.log('User logged in, syncing local cart with backend...');
        
        // Use a small delay to ensure auth token is properly set
        setTimeout(async () => {
          try {
            const cartState = useCartStore.getState();
            
            // Check sync flags before triggering sync (Requirement 3.2)
            // Only trigger sync if not already syncing and sync hasn't completed this session
            if (cartState.isSyncing) {
              console.log('Sync already in progress, skipping duplicate sync from auth subscription');
              return;
            }
            
            if (cartState.syncCompleted) {
              console.log('Sync already completed for this session, skipping from auth subscription');
              return;
            }
            
            const hasLocalItems = cartState.cart.items.length > 0;
            
            if (hasLocalItems) {
              console.log(`Found ${cartState.cart.items.length} local cart items, syncing to backend...`);
            }
            
            // This will handle merging local cart with backend or creating new backend cart
            await cartState.syncCartWithBackend();
            
            // If sync was successful and we had local items, log success
            if (hasLocalItems && !cartState.error) {
              console.log('Cart sync completed successfully after login');
            }
          } catch (error) {
            console.error('Error during post-login cart sync:', error);
            // Don't set store error here as syncCartWithBackend handles its own errors
          }
        }, 200); // Slightly longer delay to ensure auth token is set
      } 
      // User logged out - clear LOCAL cart only (preserve backend cart)
      else if (!state.isAuthenticated && prevState.isAuthenticated) {
        console.log('User logged out, clearing LOCAL cart from localStorage (backend cart preserved).');
        try {
          // ✅ Clear localStorage only - DO NOT delete backend cart
          // User's incomplete cart in database will be available when they log back in
          
          // Clear localStorage cart using helper function (Requirement 4.1)
          useCartStore.getState().clearLocalCartStorage();
          
          useCartStore.setState({
            cart: {
              id: generateId(),
              userId: null,
              items: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            summary: {
              subtotal: 0,
              shipping: 0,
              tax: 0,
              discount: 0,
              total: 0,
            },
            promoCode: null,
            error: null,
            isLoading: false,
            // Reset sync flags on logout to allow sync on next login (Requirement 4.1)
            isSyncing: false,
            syncCompleted: false,
            lastSyncTimestamp: 0,
          });
          console.log('✅ Local cart cleared from localStorage, sync flags reset, backend cart preserved for next login');
        } catch (error) {
          console.error('Error clearing local cart on logout:', error);
        }
      }
    });
  } catch (error) {
    console.error('Error initializing auth subscription:', error);
  }
};

// Initialize the subscription after a timeout to ensure both stores are ready
setTimeout(initializeAuthSubscription, 200);

// Optional: Cleanup subscription when the module is unloaded (e.g., in a test environment or on app exit)
// This is more relevant for React components, but good practice for long-lived stores.
// useCartStore.getState().cleanupSubscriptions = () => {
//   if (authUnsubscribe) {
//     authUnsubscribe();
//   }
// };

// Selector for cart warnings (for UI usage)
export const getCartWarnings = () => useCartStore.getState().cart.warnings || [];
