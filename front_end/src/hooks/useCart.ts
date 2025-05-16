import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";
import { Product } from "@/types/product";

export const useCart = () => {
  const {
    cart,
    summary,
    promoCode,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    calculateSummary,
  } = useCartStore();

  useEffect(() => {
    calculateSummary();
  }, [cart.items, calculateSummary]);

  const addToCart = (
    product: Product,
    quantity: number = 1,
    size?: string,
    color?: string
  ) => {
    addItem(product, quantity, size, color);
  };

  const increaseQuantity = (itemId: string) => {
    const item = cart.items.find((item) => item.id === itemId);
    if (item) {
      updateItemQuantity(itemId, item.quantity + 1);
    }
  };

  const decreaseQuantity = (itemId: string) => {
    const item = cart.items.find((item) => item.id === itemId);
    if (item && item.quantity > 1) {
      updateItemQuantity(itemId, item.quantity - 1);
    } else if (item) {
      removeItem(itemId);
    }
  };

  const totalItems = cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return {
    cart,
    summary,
    promoCode,
    totalItems,
    addToCart,
    updateItemQuantity,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
  };
};
