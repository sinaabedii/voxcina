import { create } from "zustand";
import { ShippingMethod, ShippingQuoteParams } from "@/services/shipping/types";

interface ShippingState {
  shippingMethods: ShippingMethod[];
  selectedMethod: ShippingMethod | null;
  isLoading: boolean;
  error: string | null;
  fetchShippingQuotes: (params: ShippingQuoteParams) => Promise<void>;
  selectMethod: (method: ShippingMethod) => void;
  clearMethods: () => void;
}

export const useShippingStore = create<ShippingState>((set) => ({
  shippingMethods: [],
  selectedMethod: null,
  isLoading: false,
  error: null,

  /**
   * Fetches shipping quotes from the Postex API
   * Requirements: 7.1, 7.2, 7.3
   */
  fetchShippingQuotes: async (params: ShippingQuoteParams) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/postex/shipping/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "خطا در دریافت روش‌های ارسال");
      }

      const data = await res.json();
      set({ 
        shippingMethods: data.methods || [], 
        isLoading: false,
        // Auto-select the first (cheapest) method if available
        selectedMethod: data.methods?.[0] || null,
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "خطا در دریافت روش‌های ارسال";
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Selects a shipping method
   */
  selectMethod: (method: ShippingMethod) => {
    set({ selectedMethod: method });
  },

  /**
   * Clears all shipping methods and resets state
   */
  clearMethods: () => {
    set({ 
      shippingMethods: [], 
      selectedMethod: null, 
      error: null 
    });
  },
}));
