import { create } from "zustand";
import { ShippingMethod } from "@/types/shipping";

interface ShippingState {
  shippingMethods: ShippingMethod[];
  isLoading: boolean;
  error: string | null;
  fetchShippingMethods: () => Promise<void>;
}

export const useShippingStore = create<ShippingState>((set) => ({
  shippingMethods: [],
  isLoading: false,
  error: null,
  fetchShippingMethods: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/shipping-methods");
      if (!res.ok) throw new Error("Failed to fetch shipping methods");
      const data = await res.json();
      set({ shippingMethods: data.methods, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || "خطا در دریافت روش‌های ارسال", isLoading: false });
    }
  },
})); 