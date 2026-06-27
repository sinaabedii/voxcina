import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";
import { Product } from "@/types/product";

export const useCart = () => {
  const {
    cart,
    summary,
    promoCode,
    addItem,
    updateItemQuantity: storeUpdateItemQuantity,
    removeItem: storeRemoveItem,
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
    color?: string,
    colorName?: string
  ) => {
    addItem(product, quantity, size, color, colorName);
  };

  // Update item quantity using productId, size, color (new data structure)
  const updateItemQuantity = (
    productId: string,
    quantity: number,
    size?: string,
    color?: string
  ) => {
    storeUpdateItemQuantity(productId, quantity, size, color);
  };

  // Increase quantity by finding item by id, then using productId/size/color
  const increaseQuantity = (itemId: string) => {
    const item = cart.items.find((item) => item.id === itemId);
    if (item) {
      storeUpdateItemQuantity(item.productId, item.quantity + 1, item.size, item.color);
    }
  };

  // Decrease quantity by finding item by id, then using productId/size/color
  const decreaseQuantity = (itemId: string) => {
    const item = cart.items.find((item) => item.id === itemId);
    if (item && item.quantity > 1) {
      storeUpdateItemQuantity(item.productId, item.quantity - 1, item.size, item.color);
    } else if (item) {
      storeRemoveItem(item.productId, item.size, item.color);
    }
  };

  // Remove item by id - finds item and uses productId/size/color
  const removeItem = (itemId: string) => {
    const item = cart.items.find((item) => item.id === itemId);
    if (item) {
      storeRemoveItem(item.productId, item.size, item.color);
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
