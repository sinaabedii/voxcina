import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Cart, CartSummary, PromoCode } from "@/types/cart";
import { Product } from "@/types/product";
import { generateId, formatPrice } from "@/lib/utils";
import { useAuthStore, type AuthStore } from "./auth-store";
import { findColorVariant, getCanonicalColor } from "@/lib/product-variants";
import { toast } from "react-toastify";

// ============================================================================
// HELPER FUNCTIONS (Refactoring: DRY principle - Task 9)
// ============================================================================

// Module-level flags for operation guards (Task 9.4)
const operationGuards: Record<string, boolean> = {};

// Mirrors the backend's variantLookupValues/colorsOverlap comparison: a cart
// item's color matches a required color if either the raw color or the
// display color name overlaps.
const variantLookupValues = (color?: string, colorName?: string): string[] => {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const value of [color, colorName]) {
    const cleaned = (value || "").trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    values.push(cleaned);
  }
  return values;
};

export const colorsOverlap = (color1?: string, colorName1?: string, color2?: string, colorName2?: string): boolean => {
  const values1 = variantLookupValues(color1, colorName1);
  const values2 = variantLookupValues(color2, colorName2);
  if (values1.length === 0 || values2.length === 0) return false;
  return values1.some((v) => values2.includes(v));
};

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

const cartSelectionMatches = (
  item: Pick<CartItem, "productId" | "size" | "variantId" | "color" | "colorName" | "product">,
  productId: string,
  size?: string,
  color?: string,
  colorName?: string,
  variantId?: string
): boolean => {
	if (item.productId !== productId || item.size !== size) return false;
	if (item.variantId && variantId && item.variantId === variantId) return true;

  const itemVariant = findColorVariant(item.product, item.color, item.colorName);
  const requestedVariant = findColorVariant(item.product, color, colorName);
  const itemValues = [
    getCanonicalColor(itemVariant),
    itemVariant?.colorName,
    item.color,
    item.colorName,
  ].filter(Boolean);
  const requestedValues = [
    getCanonicalColor(requestedVariant),
    requestedVariant?.colorName,
    color,
    colorName,
  ].filter(Boolean);
  if (!itemValues.length && !requestedValues.length) return true;
  return itemValues.some((itemValue) => requestedValues.includes(itemValue));
};



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

  // Cart operations
  fetchCart: () => Promise<void>;           // Fetch backend cart (no merge)
  syncCartWithBackend: () => Promise<void>; // Merge local cart with backend
  addItem: (
    product: Product,
    quantity: number,
    size?: string,
    color?: string,
    colorName?: string,
    variantId?: string
  ) => Promise<void>;
  updateItemQuantity: (
    productId: string, 
    quantity: number,
    size?: string, 
    color?: string,
    colorName?: string,
    variantId?: string,
  ) => Promise<void>;
  removeItem: ( 
    productId: string,
    size?: string, 
    color?: string,
    colorName?: string,
    variantId?: string
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<void>;
  applyNegotiatedDiscount: (discount: { code: string; discountPercentage: number; min_order_amount?: number; valid_to?: string; description?: string; maxDiscount?: number; product_ids?: string[]; productIds?: string[]; required_products?: { product_id: string; color?: string; color_name?: string }[]; source?: string }) => void;
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
      variantId: item.variant?.variantId || item.variant?.variant_id,
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

      // Fetch backend cart without merging local items (used on page reload)
      fetchCart: async () => {
        const { isSyncing, syncCompleted } = get();
        
        if (isSyncing || syncCompleted) {
          console.log('Cart fetch skipped - already syncing or completed');
          return;
        }
        
        const { isAuthenticated, user } = getAuthState();
        if (!isAuthenticated || !user) return;
        
        set({ isLoading: true, error: null, isSyncing: true });
        
        try {
          const result = await makeCartApiRequest<any>('/api/cart', 'GET');
          
          if (result.ok && result.data) {
            // Backend returns cart (may be empty or have items)
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(result.data);
            get().clearLocalCartStorage();
            set({
              cart: processedCart,
              summary: processedSummary,
              isLoading: false,
              syncCompleted: true,
              lastSyncTimestamp: Date.now(),
              isSyncing: false,
            });
            console.log('✅ Backend cart fetched, localStorage cleared');
          } else if (result.status === 404) {
            // No cart exists for user - clear local and set empty state
            get().clearLocalCartStorage();
            set({
              cart: { id: generateId(), userId: null, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
              isLoading: false,
              syncCompleted: true,
              lastSyncTimestamp: Date.now(),
              isSyncing: false,
            });
            console.log('✅ No backend cart exists, localStorage cleared');
          } else {
            throw new Error(result.error || 'Failed to fetch cart');
          }
        } catch (error) {
          console.error('Error fetching cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Error fetching cart',
            isLoading: false,
            isSyncing: false,
          });
        }
      },

      syncCartWithBackend: async () => {
        const { isSyncing, syncCompleted, cart } = get();
        
        if (isSyncing) {
          console.log('Sync already in progress, skipping');
          return;
        }
        
        // Allow re-sync if backend cart never got created (cart has no items and is not a real cart)
        if (syncCompleted && cart.items.length > 0) {
          console.log('Sync already completed for this session, skipping');
          return;
        }
        
        const { isAuthenticated, user } = getAuthState();
        if (!isAuthenticated || !user) return;

        set({ isLoading: true, error: null, isSyncing: true });
        
        const localCartItems = [...get().cart.items];
        const localCartBelongsToUser = get().cart.userId === user.id;
        const hasLocalItems = localCartItems.length > 0 && !localCartBelongsToUser;

        if (localCartBelongsToUser && localCartItems.length > 0) {
          get().clearLocalCartStorage();
          set((state) => ({
            cart: { ...state.cart, items: [], updatedAt: new Date().toISOString() },
            summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
          }));
        }
        
        try {
          // Step 1: Check if backend cart exists
          const getResult = await makeCartApiRequest<any>('/api/cart', 'GET');
          
          // Step 2: Backend cart exists - use it (don't merge local items to avoid doubling)
          if (getResult.ok && getResult.data && getResult.data.items?.length > 0) {
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(getResult.data);
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
            console.log('✅ Backend cart has items, using backend cart, localStorage cleared');
            return;
          }
          
          // Step 3: Backend cart is empty or doesn't exist - merge local items if any
          if (hasLocalItems) {
            console.log(`Backend cart empty/missing, merging ${localCartItems.length} local items...`);
            const itemsForBackend = localCartItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: { size: item.size, variantId: item.variantId, color: item.color, colorName: item.colorName }
            }));

            const mergeResult = await makeCartApiRequest<any>('/api/cart', 'POST', { items: itemsForBackend });
            
            if (mergeResult.ok && mergeResult.data) {
              const { cart: processedCart, summary: processedSummary } = processBackendCartData(mergeResult.data);
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
              console.log('✅ Local items merged to backend, localStorage cleared');
              return;
            } else {
              throw new Error(mergeResult.error || 'Failed to merge cart');
            }
          }
          
           // No backend cart and no local items - create an empty backend cart
           console.log('No backend cart, creating empty cart for future operations');
           const createResult = await makeCartApiRequest<any>('/api/cart', 'POST', { items: [] });
           
           if (createResult.ok && createResult.data) {
             const { cart: processedCart, summary: processedSummary } = processBackendCartData(createResult.data);
             get().clearLocalCartStorage();
             set({
               cart: processedCart,
               summary: processedSummary,
               isLoading: false,
               syncCompleted: true,
               lastSyncTimestamp: Date.now(),
               isSyncing: false,
             });
             console.log('✅ Empty backend cart created');
           } else {
             // Fallback: set local empty cart but mark sync as NOT completed so it retries
             get().clearLocalCartStorage();
             set({
               cart: { id: generateId(), userId: null, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
               summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
               isLoading: false,
               isSyncing: false,
             });
             console.log('⚠️ Failed to create backend cart, will retry sync on next add');
           }
          
        } catch (error) {
          console.error('Error in syncCartWithBackend:', error);
          // On error, preserve local cart (Requirement 5.1)
          set({ 
            error: error instanceof Error ? error.message : 'Sync failed', 
            isLoading: false, 
            syncRetryCount: (get().syncRetryCount || 0) + 1,
            isSyncing: false,
          });
          console.log('⚠️ Sync failed, localStorage preserved for retry');
        }
      },

      addItem: async (product, quantity, size, color, colorName, variantId) => {
        const selectedVariant = variantId
          ? product.colorVariants?.find((variant) => variant.variantId === variantId)
          : findColorVariant(product, color, colorName);
        const resolvedVariantId = selectedVariant?.variantId;
        const resolvedColor = getCanonicalColor(selectedVariant) || "";
        const resolvedColorName = selectedVariant?.colorName || "";
        const hasConcreteVariant = Boolean(
          quantity > 0 &&
          size?.trim() &&
          resolvedVariantId?.trim() &&
          (resolvedColor.trim() || resolvedColorName.trim())
        );
        if (!hasConcreteVariant) {
          const error = "رنگ مشخص و سایز محصول برای افزودن به سبد الزامی است";
          set({ error, isLoading: false });
          toast.error(error);
          return;
        }
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
                { productId: product.id, quantity, variant: { size, variantId: resolvedVariantId, color: resolvedColor, colorName: resolvedColorName } }
              );
              
              if (!result.ok) {
                throw new Error(result.error || 'Failed to add item to backend cart');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              // Local add logic (remains the same)
              const existingItemIndex = currentLocalCart.items.findIndex(
                item => cartSelectionMatches(item, product.id, size, resolvedColor, resolvedColorName, resolvedVariantId)
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
                  variantId: resolvedVariantId,
                  color: resolvedColor,
                  colorName: resolvedColorName,
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
            // Add to local cart as fallback so item isn't silently lost
            const currentLocalCart = get().cart;
            const existingItemIndex = currentLocalCart.items.findIndex(
              item => cartSelectionMatches(item, product.id, size, resolvedColor, resolvedColorName, resolvedVariantId)
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
                variantId: resolvedVariantId,
                color: resolvedColor,
                colorName: resolvedColorName,
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
        });
      },

      updateItemQuantity: async (productId, quantity, size, color, colorName, variantId) => {
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
                { productId, variant: { size, variantId, color, colorName }, quantity }
              );
              
				if (!result.ok) {
				  if (result.status === 404) {
				    const { cart: currentLocalCart } = get();
				    const updatedItems = currentLocalCart.items.filter(
				      item => !cartSelectionMatches(item, productId, size, color, colorName, variantId)
				    );
				    set({
				      cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() },
				      isLoading: false,
				      error: null,
				    });
				    get().calculateSummary();
				    return;
				  }
				  throw new Error(result.error || 'Failed to update quantity');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              const { cart: currentLocalCart } = get();
              const updatedItems = currentLocalCart.items.map(item => 
                cartSelectionMatches(item, productId, size, color, colorName, variantId)
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

      removeItem: async (productId, size, color, colorName, variantId) => {
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
                ...(variantId && { variantId }),
                ...(color && { variantColor: color }),
                ...(colorName && { variantColorName: colorName })
              });
              const result = await makeCartApiRequest<any>(
                `/api/cart/item?${queryParams.toString()}`,
                'DELETE'
              );
              
				if (!result.ok) {
				  if (result.status === 404) {
				    const { cart: currentLocalCart } = get();
				    const updatedItems = currentLocalCart.items.filter(
				      item => !cartSelectionMatches(item, productId, size, color, colorName, variantId)
				    );
				    set({
				      cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() },
				      isLoading: false,
				      error: null,
				    });
				    get().calculateSummary();
				    return;
				  }
				  throw new Error(result.error || 'Failed to remove item');
              }
              
              // Task 9.3: Use helper for cart state update
              updateCartFromBackend(result.data);
            } else {
              const { cart: currentLocalCart } = get();
              const updatedItems = currentLocalCart.items.filter(
                item => !cartSelectionMatches(item, productId, size, color, colorName, variantId)
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
            // Negotiated coupons only discount the specific color variant(s) they
            // were negotiated for (main + complementary product, any size of that
            // color) — not the whole cart. Admin-issued codes stay cart-wide.
            let discountBase = subtotal;
            if (
              (promoCode.type === "negotiated" || promoCode.type === "cart_recovery") &&
              promoCode.requiredColors &&
              promoCode.requiredColors.length > 0
            ) {
                discountBase = cart.items.reduce((acc, item) => {
                    const matches = promoCode.requiredColors!.some(
                        (rc) => rc.productId === item.productId && colorsOverlap(rc.color, rc.colorName, item.color, item.colorName)
                    );
                    return matches ? acc + item.price * item.quantity : acc;
                }, 0);
            }
            if (promoCode.discountPercentage > 0) {
                const potentialDiscount = (discountBase * promoCode.discountPercentage) / 100;
                if (promoCode.maxDiscount !== undefined && promoCode.maxDiscount > 0) {
                    discountVal = Math.min(potentialDiscount, promoCode.maxDiscount);
                } else {
                    discountVal = potentialDiscount;
                }
            } else if (promoCode.maxDiscount > 0) {
                discountVal = promoCode.maxDiscount;
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

       applyPromoCode: async (code) => {
        const currentSubtotal = get().summary.subtotal;
        try {
          const token = localStorage.getItem('authToken');
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const response = await fetch(`/api/discounts/code/${encodeURIComponent(code)}`, { headers });

          if (!response.ok && response.status !== 404) {
            // Exists as an admin discount code but fails a business rule
            // (expired, maxed out, not eligible) — surface that exact reason
            // rather than masking it with the negotiated-coupon fallback below.
            const err = await response.json().catch(() => ({ message: 'کد تخفیف نامعتبر است' }));
            set({ error: err.message || 'کد تخفیف نامعتبر است', promoCode: { code, isValid: false, errorMessage: err.message || 'نامعتبر', discountPercentage: 0, maxDiscount: 0, expireDate: '', minPurchase: 0 } });
            get().calculateSummary();
            return;
          }

          if (!response.ok) {
            // Not found as an admin discount code — it may be a negotiated/
            // cart-recovery coupon, validated against the items actually in the cart.
            const cartItems = get().cart.items.map((item) => ({
              product_id: item.productId,
              color: item.color,
              color_name: item.colorName,
            }));
            const negotiatedRes = await fetch('/api/coupons/apply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ code, cart_items: cartItems }),
            });

            if (negotiatedRes.ok) {
              const data = await negotiatedRes.json();
              get().applyNegotiatedDiscount(data.discount);
              return;
            }

            const negotiatedErr = await negotiatedRes.json().catch(() => ({ message: 'کد تخفیف نامعتبر است' }));
            set({ error: negotiatedErr.message || 'کد تخفیف نامعتبر است', promoCode: { code, isValid: false, errorMessage: negotiatedErr.message || 'نامعتبر', discountPercentage: 0, maxDiscount: 0, expireDate: '', minPurchase: 0 } });
            get().calculateSummary();
            return;
          }

          const discount = await response.json();
          const discountPercentage = discount.type === 'percentage' ? discount.value : 0;
          const maxDiscount = discount.type === 'fixed' ? discount.value : 0;
          const minPurchase = discount.min_order_amount || 0;

          if (currentSubtotal < minPurchase) {
            set({ error: `حداقل خرید برای این کد ${formatPrice(minPurchase)} تومان است`, promoCode: { code, isValid: false, errorMessage: `حداقل خرید ${formatPrice(minPurchase)}`, discountPercentage, maxDiscount, expireDate: discount.valid_to, minPurchase } });
            get().calculateSummary();
            return;
          }

          set({ promoCode: { code, isValid: true, errorMessage: '', discountPercentage, maxDiscount, expireDate: discount.valid_to, minPurchase, description: discount.type === 'percentage' ? `${discount.value}٪ تخفیف` : `${formatPrice(discount.value)} تومان تخفیف`, type: 'admin' }, error: null });
          // Increment usage count in backend
          fetch('/api/discounts/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }).catch(() => {});
        } catch {
          set({ error: 'خطا در بررسی کد تخفیف', promoCode: { code, isValid: false, errorMessage: 'خطای شبکه', discountPercentage: 0, maxDiscount: 0, expireDate: '', minPurchase: 0 } });
        }
        get().calculateSummary();
      },

      applyNegotiatedDiscount: (discount) => {
        set({
          promoCode: {
            code: discount.code,
            isValid: true,
            discountPercentage: discount.discountPercentage || 0,
            minPurchase: discount.min_order_amount || 0,
            maxDiscount: discount.maxDiscount || 0,
            expireDate: discount.valid_to || "",
            description: discount.description || "کد تخفیف اختصاصی شما",
            errorMessage: "",
            type: discount.source === "cart_recovery" ? "cart_recovery" : "negotiated",
            productIds: discount.product_ids || discount.productIds || [],
            requiredColors: (discount.required_products || []).map((rp) => ({
              productId: rp.product_id,
              color: rp.color,
              colorName: rp.color_name,
            })),
          },
          error: null,
        });
        get().calculateSummary();
        // Mark as used in backend
        fetch('/api/discounts/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: discount.code }),
        }).catch(() => {});
      },

      removePromoCode: () => {
        const { promoCode } = get();
        if (promoCode?.code) {
          // Decrement usage count in backend (fire-and-forget)
          fetch('/api/discounts/deactivate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: promoCode.code }),
          }).catch(() => {});
        }
        set({ promoCode: null, error: null });
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

// ============================================================================
// AUTH SUBSCRIPTION - Handles cart sync on login/logout
// ============================================================================

let authUnsubscribe: (() => void) | null = null;
let isInitialAuthCheck = true; // Tracks first subscription call (page load vs login action)

const initializeAuthSubscription = () => {
  if (authUnsubscribe) return;
  
  try {
    authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
      // First callback after page load - handle rehydration
      if (isInitialAuthCheck) {
        isInitialAuthCheck = false;
        
        // Already authenticated on page load → fetch backend cart (no merge)
        if (state.isAuthenticated && state.user) {
          console.log('Page load: fetching backend cart (no merge)');
          setTimeout(() => useCartStore.getState().fetchCart(), 200);
        }
        return;
      }
      
      // Actual login action → merge local cart with backend
      if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
        console.log('Login: syncing local cart with backend');
        setTimeout(() => useCartStore.getState().syncCartWithBackend(), 200);
        return;
      }
      
      // Logout → clear local cart, preserve backend
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        console.log('Logout: clearing local cart');
        const store = useCartStore.getState();
        store.clearLocalCartStorage();
        useCartStore.setState({
          cart: { id: generateId(), userId: null, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
          promoCode: null,
          error: null,
          isLoading: false,
          isSyncing: false,
          syncCompleted: false,
          lastSyncTimestamp: 0,
        });
      }
    });
  } catch (error) {
    console.error('Error initializing auth subscription:', error);
  }
};

// Initialize after stores are ready
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
