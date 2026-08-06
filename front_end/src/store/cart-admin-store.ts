import { create } from "zustand";
import { toast } from "react-toastify";
import { useAuthStore } from "./auth-store";
import { AdminCart, AdminCartStats } from "@/types/cart-admin";

interface CartAdminPagination {
  currentPage: number;
  totalPages: number;
  totalCarts: number;
  pageSize: number;
}

interface CartAdminState {
  carts: AdminCart[];
  stats: AdminCartStats | null;
  pagination: CartAdminPagination | null;
  isLoading: boolean;
  error: string | null;
}

interface CartAdminActions {
  fetchAdminCarts: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;
}

const initialState: CartAdminState = {
  carts: [],
  stats: null,
  pagination: null,
  isLoading: false,
  error: null,
};

export const useCartAdminStore = create<CartAdminState & CartAdminActions>()((set, get) => ({
  ...initialState,

  fetchAdminCarts: async (page = 1, limit = 10, filters = {}) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      set({ error: "User not authenticated", isLoading: false, carts: [], pagination: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
      const response = await fetch(`/api/admin/carts?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch carts" }));
        throw new Error(errorData.message || "Failed to fetch carts");
      }

      const data = await response.json();
      set({
        carts: data.carts || [],
        pagination: data.pagination || { currentPage: page, totalPages: 1, totalCarts: (data.carts || []).length, pageSize: limit },
        stats: data.stats || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching admin carts:", error);
      set({
        error: error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
        carts: [],
        pagination: null,
      });
    }
  },

  deleteCart: async (cartId: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      const err = "User not authenticated";
      set({ error: err, isLoading: false });
      toast.error(err);
      return;
    }
    try {
      const response = await fetch(`/api/admin/carts/${cartId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Failed to delete cart" }));
        throw new Error(errData.message || "Failed to delete cart");
      }
      set((state) => ({
        carts: state.carts.filter((c) => c.id !== cartId),
      }));
      toast.success("سبد خرید غیرفعال شد");
    } catch (error) {
      console.error(`Error deleting cart ${cartId}:`, error);
      toast.error(error instanceof Error ? error.message : "خطا در حذف سبد خرید");
    }
  },
}));
