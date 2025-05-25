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
}

// Helper function to transform backend cart items to frontend structure if needed
const transformBackendCartItemProduct = (backendProduct: any): Product => {
  // Ensure all properties from backendProduct are spread, then specifically handle id and images.
  // This assumes backendProduct is a superset or matches most of Product type from @/types/product
  // and ProductResponse from cart.go which should contain: Name, Description, Price, Image, ID.
  return {
    ...(backendProduct as Omit<Product, 'id' | 'images'>), // Spread all other properties, assuming they match
    id: backendProduct.id || backendProduct.ID, // Handle potential casing difference for id
    name: backendProduct.name || backendProduct.Name, // Handle potential casing for name
    description: backendProduct.description || backendProduct.Description, // Handle potential casing for description
    price: backendProduct.price || backendProduct.Price, // Handle potential casing for price
    images: backendProduct.image ? [backendProduct.image] : (backendProduct.images || []),
    // Add other mandatory Product fields with defaults if not in backendProduct
    // For example, if Product requires originalPrice and it might not be in backendProduct:
    // originalPrice: backendProduct.originalPrice || backendProduct.Price || 0,
    // category: backendProduct.category || { id: 'unknown', name: 'Unknown' },
    // brand: backendProduct.brand || { id: 'unknown', name: 'Unknown' },
    // stock: backendProduct.stock !== undefined ? backendProduct.stock : 0,
    // ratings: backendProduct.ratings || 0,
    // reviews: backendProduct.reviews || [],
    // variants: backendProduct.variants || [],
    // isFeatured: backendProduct.isFeatured || false,
    // isNew: backendProduct.isNew || false,
    // discount: backendProduct.discount || null,
    // slug: backendProduct.slug || (backendProduct.name || backendProduct.Name || 'product').toLowerCase().replace(/\s+/g, '-'),
  } as Product; // Assert as Product to satisfy the return type
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
  }));

  return {
    cart: {
      id: backendCartData.id || generateId(), // Use backend cart ID or generate a new one
      userId: backendCartData.userId || null,
      items: processedItems,
      createdAt: backendCartData.createdAt || new Date().toISOString(),
      updatedAt: backendCartData.updatedAt || new Date().toISOString(),
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
        const { isAuthenticated, user } = useAuthStore.getState();
        if (!isAuthenticated || !user) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          });

          if (response.ok) { // Backend cart exists for the user
            const rawBackendCart = await response.json();
            const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawBackendCart);
            set({
              cart: processedCart,
              summary: processedSummary,
              isLoading: false,
              syncRetryCount: 0,
            });
          } else if (response.status === 404) { // No backend cart for this user, try to create one with local items
            console.log('No cart on backend, attempting to POST local items.');
            const localCartItems = get().cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: { size: item.size, color: item.color }
            }));

            if (localCartItems.length > 0) {
              const postResponse = await fetch('/api/cart', { // POST local items to create cart
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                body: JSON.stringify({ items: localCartItems })
              });

              if (postResponse.ok) {
                // Assume POST returns the newly created cart with items and summary
                const rawNewCart = await postResponse.json();
                const { cart: processedCart, summary: processedSummary } = processBackendCartData(rawNewCart);
                set({
                  cart: processedCart,
                  summary: processedSummary,
                  isLoading: false,
                  syncRetryCount: 0,
                });
                console.log('Local cart items successfully POSTed and cart updated from response.');
              } else {
                // POST failed to create cart or return it properly
                const errorData = await postResponse.json().catch(() => ({ message: 'Failed to POST local cart and parse error response' }));
                console.error('Error POSTing local cart items:', errorData.message || postResponse.statusText);
                set({ 
                  error: `Failed to send local cart to backend: ${errorData.message || postResponse.statusText}`,
                  isLoading: false 
                });
                // Optional: try a fresh sync again as a fallback, but be cautious of loops
                // get().syncCartWithBackend(); 
              }
            } else {
              // No local items to POST, so the cart remains (or becomes) empty
              console.log('Local cart is empty, no items to POST.');
              // If backend also confirmed no cart (404), then an empty cart state is correct here.
              // Ensure a clean empty state is set if not already.
              const { cart: emptyCart, summary: emptySummary } = processBackendCartData({ items: [], summary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 } });
              set({ cart: emptyCart, summary: emptySummary, isLoading: false });
            }
          } else {
            // Other non-404 error from GET /api/cart
            const errorData = await response.json().catch(() => ({ message: 'Failed to sync and parse error'}));
            throw new Error(errorData.message || 'Failed to sync cart with backend');
          }
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
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
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
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
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
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
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
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });
        try {
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
        const taxRate = 0.09; // 9% tax
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
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        cart: state.cart,
        // summary is also persisted, so it will be rehydrated
        summary: state.summary, 
        promoCode: state.promoCode,
      }),
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) {
          console.error("Error rehydrating cart state:", error);
          // Fallback to initial state calculation if rehydration fails
          useCartStore.getState().calculateSummary();
          return;
        }
        if (hydratedState) {
          console.log("Cart state rehydrated successfully");
          // Ensure persisted cart items are properly structured for Product type if needed
          // This is a good place for potential data migration if Product type changes
          if (hydratedState.cart && Array.isArray(hydratedState.cart.items)) {
            hydratedState.cart.items = hydratedState.cart.items.map(item => ({
                ...item,
                product: item.product ? transformBackendCartItemProduct(item.product) : undefined as unknown as Product,
            }));
            // Directly update the store with potentially transformed items from rehydration
            // Note: `set` here might be tricky due to `persist` middleware. 
            // It's generally safer to trigger an action that uses `set`.
            // However, for rehydration, this initial setup based on hydrated state is common.
            useCartStore.setState({ cart: hydratedState.cart, summary: hydratedState.summary, promoCode: hydratedState.promoCode });
          }

          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && authState.user) {
            console.log("User is authenticated, queueing backend cart sync after rehydration.");
            useCartStore.getState().syncCartWithBackend();
          } else {
            // If not authenticated, recalculate summary based on rehydrated local cart
            // This ensures summary is correct if it wasn't persisted or changed format
            useCartStore.getState().calculateSummary();
          }
        } else {
            // If hydratedState is null (e.g. nothing in storage or version mismatch), calculate summary for initial empty cart.
            console.log("No persisted cart state found or rehydration returned null, using initial state.");
            useCartStore.getState().calculateSummary();
        }
      },
    }
  )
);

const authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
  if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
    console.log('User logged in, syncing cart with backend.');
    useCartStore.getState().syncCartWithBackend();
  } else if (!state.isAuthenticated && prevState.isAuthenticated) {
    console.log('User logged out, cart remains local.');
    // Optionally, clear the cart or parts of it, or re-calculate summary if needed.
    // For now, local cart persists, and summary should already be correct or will be on next action.
    useCartStore.getState().calculateSummary(); // Recalculate summary for the local cart
  }
});

// Optional: Cleanup subscription when the module is unloaded (e.g., in a test environment or on app exit)
// This is more relevant for React components, but good practice for long-lived stores.
// useCartStore.getState().cleanupSubscriptions = () => {
//   authUnsubscribe();
// };
