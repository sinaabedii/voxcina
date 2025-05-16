import { useDashboardStore } from "@/store/dashboard-store";
import { useCartStore } from "@/store/cart-store";
import { useProductStore } from "@/store/product-store";

export const api = {
  getProducts: async () => {
    return useProductStore.getState().fetchProducts();
  },
  getProductById: async (id: string) => {
    return useProductStore.getState().fetchProductById(id);
  },

  addToCart: async (productId: string, quantity: number, options: any) => {
    const { products } = useProductStore.getState();
    const product = products.find((p) => p.id === productId);
    if (product) {
      useCartStore
        .getState()
        .addItem(product, quantity, options.size, options.color);
    }
    return { success: true };
  },

  createOrder: async (cartItems: any[], addressId: string) => {
    const { addresses } = useDashboardStore.getState();
    const address = addresses.find((a) => a.id === addressId);

    if (!address) {
      throw new Error("آدرس پیدا نشد");
    }

    const items = cartItems.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const orderId = useDashboardStore.getState().createOrder(items, address);
    useCartStore.getState().clearCart();

    return { orderId };
  },

  getAddresses: async () => {
    return useDashboardStore.getState().addresses;
  },
  addAddress: async (address: any) => {
    useDashboardStore.getState().addAddress(address);
    return { success: true };
  },

  getFavorites: async () => {
    const { favorites } = useDashboardStore.getState();
    const { products } = useProductStore.getState();

    return products.filter((product) =>
      favorites.some((fav) => fav.productId === product.id)
    );
  },
  toggleFavorite: async (productId: string) => {
    const { isFavorite, addToFavorites, removeFromFavorites } =
      useDashboardStore.getState();

    if (isFavorite(productId)) {
      removeFromFavorites(productId);
      return { isFavorite: false };
    } else {
      addToFavorites(productId);
      return { isFavorite: true };
    }
  },
};
