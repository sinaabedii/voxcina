import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Cart, CartSummary, PromoCode } from "@/types/cart";
import { Product } from "@/types/product";
import { generateId, formatPrice } from "@/lib/utils";

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

  addItem: (
    product: Product,
    quantity: number,
    size?: string,
    color?: string
  ) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
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

      addItem: (product, quantity, size, color) => {
        const { cart } = get();
        const existingItemIndex = cart.items.findIndex(
          (item) =>
            item.productId === product.id &&
            item.size === size &&
            item.color === color
        );

        if (existingItemIndex > -1) {
          const newItems = [...cart.items];
          newItems[existingItemIndex].quantity += quantity;

          set({
            cart: {
              ...cart,
              items: newItems,
              updatedAt: new Date().toISOString(),
            },
          });
        } else {
          const newItem: CartItem = {
            id: generateId(),
            productId: product.id,
            product,
            quantity,
            size,
            color,
            price: product.price,
          };

          set({
            cart: {
              ...cart,
              items: [...cart.items, newItem],
              updatedAt: new Date().toISOString(),
            },
          });
        }

        get().calculateSummary();
      },

      updateItemQuantity: (itemId, quantity) => {
        const { cart } = get();
        const itemIndex = cart.items.findIndex((item) => item.id === itemId);

        if (itemIndex > -1) {
          const newItems = [...cart.items];
          newItems[itemIndex].quantity = quantity;

          set({
            cart: {
              ...cart,
              items: newItems,
              updatedAt: new Date().toISOString(),
            },
          });

          get().calculateSummary();
        }
      },

      removeItem: (itemId) => {
        const { cart } = get();

        set({
          cart: {
            ...cart,
            items: cart.items.filter((item) => item.id !== itemId),
            updatedAt: new Date().toISOString(),
          },
        });

        get().calculateSummary();
      },

      clearCart: () => {
        set({
          cart: {
            id: generateId(),
            userId: null,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          promoCode: null,
        });

        get().calculateSummary();
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
