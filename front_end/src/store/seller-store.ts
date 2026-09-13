"use client";

import { create } from "zustand";
import { toast } from "react-toastify";

import { localStorageManager } from "@/lib/local-storage-manager";
import type { SellerPanel } from "@/types/seller";

/**
 * The seller panel's data.
 *
 * There is one endpoint behind this store, not several: the panel has no
 * meaningful partial state — a code without its numbers is not worth rendering
 * — so it loads whole and reloads whole after a code is minted.
 */
interface SellerStore {
  panel: SellerPanel | null;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  fetchPanel: () => Promise<void>;
  /** Mints a code. Both halves are sent so the API can reject a bad split. */
  createVoucher: (discountPercent: number, sellerSharePercent: number) => Promise<boolean>;
}

function authHeaders(): HeadersInit {
  const token = localStorageManager.getAccessToken();
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

export const useSellerStore = create<SellerStore>((set, get) => ({
  panel: null,
  isLoading: false,
  isCreating: false,
  error: null,

  fetchPanel: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/seller/overview", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        const message = await readError(response, "خطا در دریافت اطلاعات پنل فروشنده");
        set({ isLoading: false, error: message });
        return;
      }
      const panel: SellerPanel = await response.json();
      set({ panel, isLoading: false, error: null });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  createVoucher: async (discountPercent, sellerSharePercent) => {
    set({ isCreating: true, error: null });
    try {
      const response = await fetch("/api/seller/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          discount_percent: discountPercent,
          seller_share_percent: sellerSharePercent,
        }),
      });
      if (!response.ok) {
        const message = await readError(response, "خطا در ساخت کد تخفیف");
        set({ isCreating: false, error: message });
        toast.error(message);
        return false;
      }
      set({ isCreating: false });
      toast.success("کد تخفیف جدید ساخته شد");
      // Reload rather than splice the new code in: the server decides the code
      // text, the validity window and the active-code budget, and a locally
      // invented row would disagree with all three.
      await get().fetchPanel();
      return true;
    } catch (err) {
      const message = (err as Error).message;
      set({ isCreating: false, error: message });
      toast.error(message);
      return false;
    }
  },
}));
