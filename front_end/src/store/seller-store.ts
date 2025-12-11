import { create } from "zustand";
import { toast } from "react-toastify";
import { Product } from "@/types/product";

interface SellerOrder {
  id: string;
  order_number: string;
  items: Array<{
    product_id: string;
    variant: { size: string; color: string };
    quantity: number;
    price_at_purchase: number;
    store_id: string;
    store_name: string;
  }>;
  total_amount: number;
  status: string;
  status_text: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface SellerProductsState {
  products: Product[];
  orders: SellerOrder[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    totalPages: number;
    currentPage: number;
    totalProducts: number;
  };
  ordersPagination: {
    totalPages: number;
    currentPage: number;
    totalOrders: number;
  };

  // Product actions
  fetchSellerProducts: (page?: number) => Promise<void>;
  addProduct: (productData: FormData) => Promise<Product>;
  updateProduct: (productId: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;

  // Order actions
  fetchSellerOrders: (page?: number, status?: string) => Promise<void>;
}

const getAuthHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useSellerStore = create<SellerProductsState>((set) => ({
  products: [],
  orders: [],
  isLoading: false,
  error: null,
  pagination: {
    totalPages: 1,
    currentPage: 1,
    totalProducts: 0,
  },
  ordersPagination: {
    totalPages: 1,
    currentPage: 1,
    totalOrders: 0,
  },

  // Fetch seller's products
  fetchSellerProducts: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/seller/products?page=${page}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت محصولات");
      }

      set({
        products: data.data || [],
        pagination: data.pagination || { totalPages: 1, currentPage: page, totalProducts: 0 },
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
    }
  },

  // Add a new product
  addProduct: async (productData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/seller/products", {
        method: "POST",
        headers: getAuthHeader(),
        body: productData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در افزودن محصول");
      }

      set((state) => ({
        products: [data, ...state.products],
        isLoading: false,
      }));

      toast.success("محصول با موفقیت اضافه شد");
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Update a product
  updateProduct: async (productId: string, data: Partial<Product>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطا در به‌روزرسانی محصول");
      }

      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? result : p)),
        isLoading: false,
      }));

      toast.success("محصول با موفقیت به‌روزرسانی شد");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Delete a product
  deleteProduct: async (productId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "خطا در حذف محصول");
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
        isLoading: false,
      }));

      toast.success("محصول با موفقیت حذف شد");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Fetch seller's orders
  fetchSellerOrders: async (page = 1, status?: string) => {
    set({ isLoading: true, error: null });
    try {
      let url = `/api/seller/orders?page=${page}`;
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت سفارشات");
      }

      set({
        orders: data.data || [],
        ordersPagination: data.pagination || { totalPages: 1, currentPage: page, totalOrders: 0 },
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
    }
  },
}));
