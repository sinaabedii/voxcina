import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Cart, CartSummary, PromoCode } from "@/types/cart";
import { Product } from "@/types/product";
import { generateId, formatPrice } from "@/lib/utils";
import { useAuthStore, type AuthStore } from "./auth-store";

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

      syncCartWithBackend: async () => {
        try {
          const { isAuthenticated, user } = useAuthStore.getState();
          if (!isAuthenticated || !user) return;
        } catch (error) {
          console.error('Error accessing auth store in syncCartWithBackend:', error);
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const localCartItems = get().cart.items;
          const hasLocalItems = localCartItems.length > 0;
          
          // First, always fetch the existing backend cart
          const response = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          });

          let backendCart = null;
          let needsItemAddition = false;

          if (response.ok) {
            // Backend cart exists
            backendCart = await response.json();
            console.log('Found existing backend cart with', backendCart.items?.length || 0, 'items');
            
            if (hasLocalItems) {
              // ✅ Use merge endpoint - send ALL local items to POST /api/cart
              // Backend will intelligently merge: increment quantities for duplicates, add new items
              console.log(`Merging ${localCartItems.length} local items with existing backend cart...`);
              
              const localCartItemsForBackend = localCartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                variant: { size: item.size, color: item.color }
              }));

              try {
                const mergeResponse = await fetch('/api/cart', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  },
                  body: JSON.stringify({ items: localCartItemsForBackend })
                });

                if (mergeResponse.ok) {
                  // Backend has merged carts, get the final result
                  backendCart = await mergeResponse.json();
                  console.log('✅ Cart merge completed - backend cart now has', backendCart.items?.length || 0, 'items');
                  needsItemAddition = false; // Already have final merged cart
                } else {
                  const errorData = await mergeResponse.json().catch(() => ({ message: 'Failed to merge carts' }));
                  console.warn('Failed to merge carts:', errorData.message);
                  // Fall through to use existing backend cart
                }
              } catch (mergeError) {
                console.warn('Error during cart merge:', mergeError);
                // Fall through to use existing backend cart
              }
            }
          } else if (response.status === 404) {
            // No backend cart exists
            if (hasLocalItems) {
              console.log('No backend cart found, creating new cart with local items...');
              const localCartItemsForBackend = localCartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                variant: { size: item.size, color: item.color }
              }));

              const postResponse = await fetch('/api/cart', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                body: JSON.stringify({ items: localCartItemsForBackend })
              });

              if (postResponse.ok) {
                const rawNewCart = await postResponse.json();
                const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawNewCart);
                set({
                  cart: processedCart,
                  summary: processedSummary,
                  isLoading: false,
                  syncRetryCount: 0,
                });
                console.log('New backend cart created with local items.');
                return; // Exit early since we have our final cart
              } else {
                const errorData = await postResponse.json().catch(() => ({ message: 'Failed to create cart' }));
                throw new Error(errorData.message || 'Failed to create backend cart');
              }
            } else {
              // No local items and no backend cart - create an empty cart on backend
              console.log('No local items and no backend cart, creating new empty cart on backend...');
              const postResponse = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                body: JSON.stringify({ items: [] }) // Send empty items array
              });

              if (postResponse.ok) {
                const rawNewCart = await postResponse.json();
                const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawNewCart);
                set({
                  cart: processedCart,
                  summary: processedSummary,
                  isLoading: false,
                  syncRetryCount: 0,
                });
                console.log('New empty backend cart created.');
                return; // Exit early
              } else {
                const errorData = await postResponse.json().catch(() => ({ message: 'Failed to create empty cart' }));
                throw new Error(errorData.message || 'Failed to create empty backend cart');
              }
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Failed to get backend cart'}));
            // Handle specific backend error for empty cart
            if (
              errorData.message === 'Active cart is empty for user' ||
              errorData.error === 'Active cart is empty for user'
            ) {
              // Set empty cart and summary
              const { cart: emptyCart, summary: emptySummary } = processBackendCartData({ items: [], summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 } });
              set({ cart: emptyCart, summary: emptySummary, isLoading: false });
              return; // Exit early
            }
            throw new Error(errorData.message || errorData.error || 'Failed to get backend cart');
          }
          
          // If we added items, fetch the updated cart; otherwise use the existing backend cart
          if (needsItemAddition) {
            console.log('Fetching updated backend cart after adding items...');
            const updatedResponse = await fetch('/api/cart', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (updatedResponse.ok) {
              backendCart = await updatedResponse.json();
            } else {
              console.warn('Failed to fetch updated cart, using previous backend cart state');
            }
          }
          
          // Process and set the final cart state
          const { cart: processedCart, summary: processedSummary } = processBackendCartData(backendCart);
          set({
            cart: processedCart,
            summary: processedSummary,
            isLoading: false,
            syncRetryCount: 0,
          });
          
          console.log('Cart sync completed successfully - backend cart now has', processedCart.items.length, 'items');
          
        } catch (error) {
          console.error('Error in syncCartWithBackend:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred while syncing cart', 
            isLoading: false, 
            syncRetryCount: (get().syncRetryCount || 0) + 1 
          });
        }
      },

      addItem: async (product, quantity, size, color) => {
        const { cart: currentLocalCart } = get();
        set({ isLoading: true, error: null });
        try {
          let isAuthenticated = false;
          let user = null;
          
          try {
            const authState = useAuthStore.getState();
            isAuthenticated = authState.isAuthenticated;
            user = authState.user;
          } catch (error) {
            console.error('Error accessing auth store in addItem:', error);
            // Continue with local logic if auth store is not available
          }

          if (isAuthenticated && user) {
            // When authenticated, add item to backend cart via POST /api/cart/item
            const response = await fetch('/api/cart/item', { // <-- UPDATED ENDPOINT
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
              body: JSON.stringify({ productId: product.id, quantity, variant: { size, color } })
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to add item and parse error'}));
                 throw new Error(errorData.message || 'Failed to add item to backend cart');
            }
            const rawBackendCart = await response.json();
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
            set({ cart: processedCart, summary: processedSummary, isLoading: false });
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
            set({error: error instanceof Error ? error.message : 'Error adding item', isLoading: false}); 
        } 
      },

      updateItemQuantity: async (productId, quantity, size, color) => {
        set({ isLoading: true, error: null });
        try {
          let isAuthenticated = false;
          let user = null;
          
          try {
            const authState = useAuthStore.getState();
            isAuthenticated = authState.isAuthenticated;
            user = authState.user;
          } catch (error) {
            console.error('Error accessing auth store in updateItemQuantity:', error);
            // Continue with local logic if auth store is not available
          }

          if (isAuthenticated && user) {
            const response = await fetch('/api/cart/item', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
              body: JSON.stringify({ productId, variant: { size, color }, quantity })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update and parse error'}));
                throw new Error(errorData.message || 'Failed to update quantity');
            }
            const rawBackendCart = await response.json();
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
            set({ cart: processedCart, summary: processedSummary, isLoading: false });
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
            set({error: error instanceof Error ? error.message : 'Error updating qty', isLoading: false}); 
        }
      },

      removeItem: async (productId, size, color) => {
        set({ isLoading: true, error: null });
        try {
          let isAuthenticated = false;
          let user = null;
          
          try {
            const authState = useAuthStore.getState();
            isAuthenticated = authState.isAuthenticated;
            user = authState.user;
          } catch (error) {
            console.error('Error accessing auth store in removeItem:', error);
            // Continue with local logic if auth store is not available
          }

          if (isAuthenticated && user) {
            const queryParams = new URLSearchParams({ productId, ...(size && { variantSize: size }), ...(color && { variantColor: color }) });
            const response = await fetch(`/api/cart/item?${queryParams.toString()}`, { 
                method: 'DELETE', 
                headers: {'Authorization': `Bearer ${localStorage.getItem('authToken')}`}
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to remove and parse error'}));
                throw new Error(errorData.message || 'Failed to remove item');
            }
            const rawBackendCart = await response.json();
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
            set({ cart: processedCart, summary: processedSummary, isLoading: false });
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
            set({error: error instanceof Error ? error.message : 'Error removing item', isLoading: false}); 
        }
      },
      
      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          let isAuthenticated = false;
          let user = null;
          
          try {
            const authState = useAuthStore.getState();
            isAuthenticated = authState.isAuthenticated;
            user = authState.user;
          } catch (error) {
            console.error('Error accessing auth store in clearCart:', error);
            // Continue with local logic if auth store is not available
          }

          if (isAuthenticated && user) {
            const response = await fetch('/api/cart', { 
                method: 'DELETE', 
                headers: {'Authorization': `Bearer ${localStorage.getItem('authToken')}`}
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to clear cart and parse error'}));
                throw new Error(errorData.message || 'Failed to clear cart on backend');
            }
            const rawBackendCart = await response.json(); // Expecting empty cart structure { items: [], summary: {...} }
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
            set({ cart: processedCart, summary: processedSummary, promoCode: null, isLoading: false });
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
            set({error: error instanceof Error ? error.message : 'Error clearing cart', isLoading: false}); 
        }
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
      partialize: (state) => ({
        cart: state.cart,
        // summary is also persisted, so it will be rehydrated
        summary: state.summary, 
        promoCode: state.promoCode,
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
                
                // Safely update the store
                useCartStore.setState({ 
                  cart: hydratedState.cart, 
                  summary: hydratedState.summary || { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }, 
                  promoCode: hydratedState.promoCode 
                });
              }

              useCartStore.getState().calculateSummary();
            } catch (rehydrationError) {
              console.error('Error during cart rehydration processing:', rehydrationError);
            }
          }, 0);

        } else {
            // If hydratedState is null (e.g. nothing in storage or version mismatch), calculate summary for initial empty cart.
            console.log("No persisted cart state found or rehydration returned null, using initial state.");
            setTimeout(() => {
              try {
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
          });
          console.log('✅ Local cart cleared from localStorage, backend cart preserved for next login');
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
