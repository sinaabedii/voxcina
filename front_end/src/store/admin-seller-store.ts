"use client";

import { create } from "zustand";

import { localStorageManager } from "@/lib/local-storage-manager";
import { useAuthStore } from "@/store/auth-store";
import type { AdminSellersResponse, SellerPanel } from "@/types/seller";

/**
 * The admin's view of sellers: the table of every partner, and one partner's
 * full detail.
 *
 * The detail is served by the same Go builder the seller's own panel uses, so
 * what an admin reads here is literally what the partner sees.
 */
interface AdminSellerStore {
  list: AdminSellersResponse | null;
  detail: SellerPanel | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  fetchSellers: (params?: { search?: string; sortBy?: string }) => Promise<void>;
  fetchSeller: (sellerId: string) => Promise<void>;
  clearDetail: () => void;
}

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().adminToken || localStorageManager.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export const useAdminSellerStore = create<AdminSellerStore>((set) => ({
  list: null,
  detail: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  fetchSellers: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.sortBy) query.set("sort_by", params.sortBy);
      const suffix = query.toString() ? `?${query}` : "";

      const response = await fetch(`/api/admin/sellers${suffix}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        set({ isLoading: false, error: await readError(response, "خطا در دریافت فروشندگان") });
        return;
      }
      set({ list: await response.json(), isLoading: false, error: null });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  fetchSeller: async (sellerId) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        set({
          isLoadingDetail: false,
          error: await readError(response, "خطا در دریافت اطلاعات فروشنده"),
        });
        return;
      }
      set({ detail: await response.json(), isLoadingDetail: false, error: null });
    } catch (err) {
      set({ isLoadingDetail: false, error: (err as Error).message });
    }
  },

  clearDetail: () => set({ detail: null }),
}));
