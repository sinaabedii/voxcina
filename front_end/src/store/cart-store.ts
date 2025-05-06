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

  syncCartWithBackend: () => Promise<void>;
  addItem: (
    product: Product,
    quantity: number,
    size?: string,
    color?: string
  ) => Promise<void>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => void;
  removePromoCode: () => void;
  calculateSummary: () => void;
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

      syncCartWithBackend: async () => {
        const { cart } = get();
        const { user, isAuthenticated } = useAuthStore.getState();

        if (!isAuthenticated || !user) {
          return; // No need to sync if user is not authenticated
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
            if (data.cart && data.cart.items && data.cart.items.length > 0) {
              const backendItems = data.cart.items;
              const localItems = cart.items;
              
              const mergedItems = [...localItems];
              backendItems.forEach((backendItem: CartItem) => {
                const existingIndex = mergedItems.findIndex(
                  item => item.productId === backendItem.productId && 
                         item.size === backendItem.size && 
                         item.color === backendItem.color
                );
                
                if (existingIndex === -1) {
                  mergedItems.push(backendItem);
                }
              });

              set({
                cart: {
                  ...data.cart,
                  items: mergedItems,
                  updatedAt: new Date().toISOString(),
                },
                summary: data.summary,
                isLoading: false,
              });
            } else {
              // If backend cart is empty or data is incomplete, post local cart.
              await fetch('/api/cart', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ items: cart.items }),
              });
            }
          } else {
            // If fetching cart failed (e.g. 404), post local cart to create it.
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ items: cart.items }),
            });
          }
        } catch (error) {
          console.error('Error syncing cart:', error);
          set({ error: 'Failed to sync cart with backend', isLoading: false });
        } finally {
          set({ isLoading: false });
          get().calculateSummary();
        }
      },

      addItem: async (product, quantity, size, color) => {
        const { cart } = get();
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
                size,
                color,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to add item to cart');
            }

            const data = await response.json();
            set({
              cart: data.cart,
              summary: data.summary,
              isLoading: false,
            });
          } else {
            const existingItemIndex = cart.items.findIndex(
              (item) =>
                item.productId === product.id &&
                item.size === size &&
                item.color === color
            );

            let updatedItems;
            if (existingItemIndex > -1) {
              updatedItems = cart.items.map((item, index) =>
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
              updatedItems = [...cart.items, newItem];
            }

            set({
              cart: {
                ...cart,
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

      updateItemQuantity: async (itemId, quantity) => {
        const { cart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();

        set({ isLoading: true, error: null });
        try {
          if (isAuthenticated && user) {
            const response = await fetch('/api/cart', {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({ itemId, quantity }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to update item quantity');
            }

            const data = await response.json();
            set({
              cart: data.cart,
              summary: data.summary,
              isLoading: false,
            });
          } else {
            const updatedItems = cart.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            );
            set({
              cart: {
                ...cart,
                items: updatedItems,
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update quantity',
            isLoading: false,
          });
        } finally {
          get().calculateSummary();
        }
      },

      removeItem: async (itemId) => {
        const { cart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();

        set({ isLoading: true, error: null });
        try {
          if (isAuthenticated && user) {
            const response = await fetch(`/api/cart/${itemId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to remove item from cart');
            }

            const data = await response.json();
            set({
              cart: data.cart,
              summary: data.summary,
              isLoading: false,
            });
          } else {
            const updatedItems = cart.items.filter((item) => item.id !== itemId);
            set({
              cart: {
                ...cart,
                items: updatedItems,
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove item',
            isLoading: false,
          });
        } finally {
          get().calculateSummary();
        }
      },

      clearCart: async () => {
        const { cart } = get();
        const { isAuthenticated, user } = useAuthStore.getState();

        set({ isLoading: true, error: null });
        try {
          if (isAuthenticated && user) {
            const response = await fetch('/api/cart', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to clear cart');
            }

            const data = await response.json();
            set({
              cart: data.cart,
              summary: data.summary,
              promoCode: null,
              isLoading: false,
            });
          } else {
            set({
              cart: {
                ...cart,
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
        } finally {
          get().calculateSummary();
        }
      },

      applyPromoCode: (code) => {
        const { cart } = get();
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const foundPromo = validPromoCodes.find(
          (promo) => promo.code.toUpperCase() === code.toUpperCase()
        );

        if (foundPromo) {
          const isExpired =
            foundPromo.expireDate &&
            new Date(foundPromo.expireDate) < new Date();

          const meetsMinPurchase = subtotal >= foundPromo.minPurchase;

          if (isExpired) {
            set({
              promoCode: {
                ...foundPromo,
                isValid: false,
                errorMessage: "کد تخفیف منقضی شده است",
              },
            });
          } else if (!meetsMinPurchase) {
            set({
              promoCode: {
                ...foundPromo,
                isValid: false,
                errorMessage: `حداقل خرید برای استفاده از این کد ${formatPrice(
                  foundPromo.minPurchase
                )} است`,
              },
            });
          } else {
            set({
              promoCode: {
                ...foundPromo,
                isValid: true,
                errorMessage: undefined,
              },
            });
          }
        } else {
          set({
            promoCode: {
              code,
              discountPercentage: 0,
              minPurchase: 0,
              maxDiscount: 0,
              isValid: false,
              errorMessage: "کد تخفیف نامعتبر است",
            },
          });
        }

        get().calculateSummary();
      },

      removePromoCode: () => {
        set({ promoCode: null });
        get().calculateSummary();
      },

      calculateSummary: () => {
        const { cart, promoCode } = get();

        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const tax = subtotal * 0.09;
        const shipping = cart.items.length > 0 ? 150000 : 0;
        let discount = 0;
        if (promoCode && promoCode.isValid) {
          discount = subtotal * (promoCode.discountPercentage / 100);
          if (promoCode.maxDiscount > 0 && discount > promoCode.maxDiscount) {
            discount = promoCode.maxDiscount;
          }
        }
        const total = subtotal + tax + shipping - discount;

        set({
          summary: {
            subtotal,
            shipping,
            tax,
            discount,
            total,
          },
        });
      },
    }),
    {
      name: "digi-style-cart",
    }
  )
);

// Subscribe to auth state changes, ensuring it runs after initial module loading.
if (typeof window !== 'undefined') { // Ensure this only runs in the browser environment
  setTimeout(() => {
    // Get the initial isAuthenticated state to compare against future changes
    let previousIsAuthenticated: boolean = useAuthStore.getState().isAuthenticated;

    useAuthStore.subscribe(async (state: AuthStore) => { // Subscribing to the whole state
      const currentIsAuthenticated = state.isAuthenticated;

      if (currentIsAuthenticated && !previousIsAuthenticated) {
        // User just logged in
        console.log("Auth Store: User logged in, cart store will sync.");
        try {
          await useCartStore.getState().syncCartWithBackend();
        } catch (error) {
          console.error("Error syncing cart after login:", error);
        }
      } else if (!currentIsAuthenticated && previousIsAuthenticated) {
        // User just logged out
        console.log("Auth Store: User logged out, cart store will clear.");
        try {
          await useCartStore.getState().clearCart();
        } catch (error) {
          console.error("Error clearing cart after logout:", error);
        }
      }
      // Update previousIsAuthenticated for the next comparison
      previousIsAuthenticated = currentIsAuthenticated;
    });
  }, 0);
}
