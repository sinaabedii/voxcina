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
        const { cart } = get();
        const { user, isAuthenticated } = useAuthStore.getState();

        if (isAuthenticated && user) {
          // No need to set cart.userId here, it should come from backend or be set on login
        }

        if (!isAuthenticated || !user) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/cart', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json(); 
            if (!data || typeof data !== 'object') { 
              throw new Error('Invalid cart data structure from API (data is not an object)');
            }
             // Ensure data.items is an array, even if empty. Backend should ideally ensure this.
            if (!Array.isArray(data.items)) {
                data.items = []; 
            }
            
            // Assuming the backend response (data) is the new Cart object
            set({
                cart: data, 
                summary: data.summary || { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }, // Use backend summary or default
                isLoading: false,
                syncRetryCount: 0,
            });

          } else {
            // Handle non-ok responses, e.g., 404 could mean no cart exists, try to create one.
            if (response.status === 404) {
                console.log('No cart found on backend, attempting to create one with local items.');
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ items: get().cart.items }), 
                  });
                  // After POSTing, call sync again to get the canonical state from backend
                  // This creates a small loop but ensures consistency.
                  get().syncCartWithBackend(); 
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to sync and parse error response' }));
                throw new Error(errorData.message || 'Failed to sync cart with backend (non-OK response)');
            }
          }
        } catch (error) {
          console.error('Error syncing cart:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error syncing cart', 
            isLoading: false,
            syncRetryCount: (get().syncRetryCount || 0) + 1
          });
          if ((get().syncRetryCount || 0) < 3) {
            setTimeout(() => get().syncCartWithBackend(), 2000);
          }
        } finally {
          set({ isLoading: false });
          get().calculateSummary();
        }
      },

      addItem: async (product, quantity, size, color) => {
        const { cart: currentLocalCart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();

        set({ isLoading: true, error: null });
        try {
          if (isAuthenticated && user) {
            const response = await fetch('/api/cart', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                productId: product.id,
                quantity,
                variant: { size, color },
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to add item to cart');
            }

            const data = await response.json(); 
            set({
              cart: data, 
              summary: data.summary,
              isLoading: false,
            });
          } else {
            const existingItemIndex = currentLocalCart.items.findIndex(
              (item) =>
                item.productId === product.id &&
                item.size === size &&
                item.color === color
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
              cart: {
                ...currentLocalCart,
                items: updatedItems,
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add item',
            isLoading: false,
          });
        } finally {
          get().calculateSummary();
        }
      },

      updateItemQuantity: async (productId, quantity, size, color) => {
        const { cart: currentLocalCart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated && user) {
            const response = await fetch('/api/cart/item', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              },
              body: JSON.stringify({
                productId,
                variant: { size, color },
                quantity,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to update item quantity');
            }
            const data = await response.json(); 
            set({ 
              cart: data, 
              summary: data.summary, 
              isLoading: false 
            });

          } else {
            const updatedItems = currentLocalCart.items.map((item) =>
              item.productId === productId && item.size === size && item.color === color
                ? { ...item, quantity }
                : item
            ).filter(item => item.quantity > 0);

            set({
              cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update quantity',
            isLoading: false,
          });
        }
        get().calculateSummary();
      },

      removeItem: async (productId, size, color) => {
        const { cart: currentLocalCart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated && user) {
            const queryParams = new URLSearchParams({
              productId,
              ...(size && { variantSize: size }),
              ...(color && { variantColor: color }),
            });
            const response = await fetch(`/api/cart/item?${queryParams.toString()}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to remove item from cart');
            }
            const data = await response.json(); 
            set({ 
              cart: data, 
              summary: data.summary, 
              isLoading: false 
            });

          } else {
            const updatedItems = currentLocalCart.items.filter(
              (item) => !(item.productId === productId && item.size === size && item.color === color)
            );
            set({
              cart: { ...currentLocalCart, items: updatedItems, updatedAt: new Date().toISOString() },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove item',
            isLoading: false,
          });
        }
        get().calculateSummary();
      },

      clearCart: async () => {
        const { cart: currentLocalCart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated && user) {
            const response = await fetch('/api/cart', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to clear cart on backend');
            }
            const data = await response.json(); 
            set({
              cart: data, 
              summary: data.summary, 
              promoCode: null,
              isLoading: false,
            });

          } else {
            set({
              cart: {
                ...currentLocalCart,
                items: [],
                updatedAt: new Date().toISOString(),
              },
              promoCode: null,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to clear cart',
            isLoading: false,
          });
        }
        get().calculateSummary();
      },

      applyPromoCode: (code) => {
        const { cart } = get();
        const promo = validPromoCodes.find((p) => p.code === code);

        if (promo) {
          const now = new Date();
          const expiry = new Date(promo.expireDate);
          const subtotal = get().summary.subtotal; 

          if (now > expiry) {
            set({ error: "کد تخفیف منقضی شده است" });
            return;
          }
          if (subtotal < promo.minPurchase) {
            set({ error: `حداقل خرید برای این کد ${formatPrice(promo.minPurchase)} تومان است` });
            return;
          }

          set({ promoCode: { ...promo, isValid: true, errorMessage: '' }, error: null });
        } else {
          set({ error: "کد تخفیف نامعتبر است" });
        }
        get().calculateSummary();
      },

      removePromoCode: () => {
        set({ promoCode: null });
        get().calculateSummary();
      },

      calculateSummary: () => {
        const { cart, promoCode } = get();
        if (!cart || !cart.items) { // Added !cart.items check
          set({
            summary: {
              subtotal: 0,
              shipping: 0,
              tax: 0,
              discount: 0,
              total: 0,
            },
          });
          return;
        }
        let subtotal = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        
        let discountVal = 0; // Renamed to avoid conflict with discount in summary
        if (promoCode && promoCode.isValid) {
            const potentialDiscount = (subtotal * promoCode.discountPercentage) / 100;
            if (promoCode.maxDiscount > 0) {
                discountVal = Math.min(potentialDiscount, promoCode.maxDiscount);
            } else {
                discountVal = potentialDiscount;
            }
        }
        
        discountVal = Math.min(subtotal, discountVal);
        const subtotalAfterDiscount = subtotal - discountVal; 

        const taxRate = 0.09; 
        const tax = subtotalAfterDiscount * taxRate;
        const shipping = subtotalAfterDiscount > 500000 ? 0 : 35000; 

        const total = subtotalAfterDiscount + tax + shipping;

        set({
          summary: {
            subtotal: cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0), 
            shipping,
            tax,
            discount: discountVal, // Use the calculated discountVal
            total,
          },
        });
      },

      cleanupSubscriptions: () => {
        // If you have any subscriptions (e.g., to auth changes), clean them up here.
        // For example, if useAuthStore.subscribe returns an unsubscribe function:
        // const unsubscribe = useAuthStore.subscribe(...);
        // Store `unsubscribe` and call it here.
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        cart: state.cart,
        summary: state.summary,
        promoCode: state.promoCode,
      }),
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) {
          console.error("Failed to rehydrate cart state:", error);
          return;
        }
        if (hydratedState) {
          console.log("Cart state rehydrated successfully");
          // Actions like syncCartWithBackend and calculateSummary are part of the store,
          // not typically part of the persisted (hydrated) state if not explicitly partialized.
          // We should call them from the store instance `get()`.
          
          // Ensure the cart structure is what we expect after rehydration
          // If hydratedState.cart is missing or not an object, the initial state will be used by Zustand.
          // If hydratedState.cart.items is not an array, calculateSummary might fail.
          if (hydratedState.cart && !Array.isArray(hydratedState.cart.items)) {
            // This is a safeguard, ideally the persisted state is always correct or migrations handle it.
            console.warn('Rehydrated cart items is not an array, resetting to empty array.');
            // This direct mutation of hydratedState might not be ideal.
            // It might be better to rely on initial state or a migration if this happens.
            // For now, we let calculateSummary handle it with its null/undefined checks.
          }

          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && authState.user) {
            console.log("User is authenticated, queueing backend cart sync after rehydration.");
            useCartStore.getState().syncCartWithBackend();
          } else {
            // If not authenticated, still ensure summary is calculated based on whatever was rehydrated.
            useCartStore.getState().calculateSummary();
          }
        } else {
            // If hydratedState is null (e.g. nothing in storage), calculate summary for initial empty cart.
            useCartStore.getState().calculateSummary();
        }
      },
    }
  )
);

let unsubscribeFromAuth: (() => void) | null = null;

if (typeof window !== 'undefined') {
    unsubscribeFromAuth = useAuthStore.subscribe((state, prevState) => {
        const cartStoreState = useCartStore.getState();
        if (state.isAuthenticated && !prevState.isAuthenticated && state.user) {
            console.log("User authenticated, syncing cart with backend.");
            cartStoreState.syncCartWithBackend();
        } else if (!state.isAuthenticated && prevState.isAuthenticated) {
            console.log("User logged out, potentially clear local user-specific cart data or re-sync for anonymous user.");
            // When user logs out, we might want to clear the userId from the local cart copy
            // and recalculate summary, but not necessarily clear all items if we want to persist guest cart.
            const currentCart = cartStoreState.cart;
            if (currentCart) { // Check if cart exists
                useCartStore.setState({ 
                    cart: { ...currentCart, userId: null, updatedAt: new Date().toISOString() } 
                });
            }
            cartStoreState.calculateSummary(); 
        }
    });
}

export const unsubscribeFromAuthChanges = () => {
    if (unsubscribeFromAuth) {
        unsubscribeFromAuth();
    }
};
