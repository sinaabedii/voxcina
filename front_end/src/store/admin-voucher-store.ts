import { create } from "zustand";
import {
  AdminVoucher,
  AdminVoucherStats,
  AdminVoucherFilters,
  AdminVoucherPagination,
} from "@/types/admin-voucher";

interface AdminVoucherState {
  vouchers: AdminVoucher[];
  stats: AdminVoucherStats | null;
  pagination: AdminVoucherPagination | null;
  isLoading: boolean;
  error: string | null;
}

interface AdminVoucherActions {
  fetchAdminVouchers: (page?: number, limit?: number, filters?: AdminVoucherFilters) => Promise<void>;
}

export const useAdminVoucherStore = create<AdminVoucherState & AdminVoucherActions>()((set) => ({
  vouchers: [],
  stats: null,
  pagination: null,
  isLoading: false,
  error: null,

  fetchAdminVouchers: async (page = 1, limit = 20, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters as Record<string, string>),
      });
      const response = await fetch(`/api/admin/vouchers?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Failed to fetch vouchers" }));
        throw new Error(errData.message || "Failed to fetch vouchers");
      }

      const data = await response.json();
      set({
        vouchers: data.vouchers || [],
        pagination: data.pagination || null,
        stats: data.stats || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching admin vouchers:", error);
      set({
        error: error instanceof Error ? error.message : "خطا در دریافت کدهای تخفیف",
        isLoading: false,
        vouchers: [],
      });
    }
  },
}));
