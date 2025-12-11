import { create } from "zustand";
import { toast } from "react-toastify";
import {
  Store,
  StoreRegistrationData,
  StoreUpdateData,
  SellerDashboardData,
  StoreListResponse,
  CanBecomeSellerResponse,
} from "@/types/store";
import { Product } from "@/types/product";

interface StoreState {
  // Public store browsing
  stores: Store[];
  currentStore: Store | null;
  storeProducts: Product[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    totalPages: number;
    currentPage: number;
    totalStores: number;
  };

  // Seller's own store
  myStore: Store | null;
  sellerDashboard: SellerDashboardData | null;
  canBecomeSeller: boolean | null;

  // Actions - Public
  fetchStores: (page?: number, limit?: number) => Promise<void>;
  fetchStoreById: (idOrSlug: string) => Promise<Store>;
  fetchStoreProducts: (idOrSlug: string, page?: number) => Promise<void>;

  // Actions - Seller
  checkCanBecomeSeller: () => Promise<CanBecomeSellerResponse>;
  registerStore: (data: StoreRegistrationData) => Promise<Store>;
  fetchMyStore: () => Promise<Store>;
  updateMyStore: (data: StoreUpdateData) => Promise<Store>;
  fetchSellerDashboard: () => Promise<SellerDashboardData>;

  // Actions - Admin
  fetchAllStoresAdmin: (page?: number, status?: string) => Promise<StoreListResponse>;
  updateStoreStatus: (storeId: string, status: string, isVerified?: boolean) => Promise<Store>;
}

const getAuthHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  currentStore: null,
  storeProducts: [],
  isLoading: false,
  error: null,
  pagination: {
    totalPages: 1,
    currentPage: 1,
    totalStores: 0,
  },
  myStore: null,
  sellerDashboard: null,
  canBecomeSeller: null,

  // Fetch public stores list
  fetchStores: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/stores?page=${page}&limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت فروشگاه‌ها");
      }

      set({
        stores: data.data || [],
        pagination: data.pagination || { totalPages: 1, currentPage: page, totalStores: 0 },
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
    }
  },

  // Fetch single store by ID or slug
  fetchStoreById: async (idOrSlug: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/stores/${idOrSlug}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فروشگاه یافت نشد");
      }

      set({ currentStore: data, isLoading: false });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Fetch products of a store
  fetchStoreProducts: async (idOrSlug: string, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/stores/${idOrSlug}/products?page=${page}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت محصولات فروشگاه");
      }

      set({ storeProducts: data.data || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
    }
  },

  // Check if current user can become a seller
  checkCanBecomeSeller: async () => {
    try {
      const response = await fetch("/api/users/can-become-seller", {
        headers: getAuthHeader(),
      });
      const data: CanBecomeSellerResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "خطا در بررسی وضعیت");
      }

      set({ canBecomeSeller: data.can_become_seller });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      toast.error(message);
      throw error;
    }
  },

  // Register a new store
  registerStore: async (data: StoreRegistrationData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("phone", data.phone);
      formData.append("email", data.email);
      formData.append("province", data.province);
      formData.append("city", data.city);
      formData.append("address", data.address);
      formData.append("postal_code", data.postal_code);
      formData.append("bank_name", data.bank_name);
      formData.append("account_number", data.account_number);
      formData.append("iban", data.iban);
      formData.append("account_holder", data.account_holder);

      if (data.logo) {
        formData.append("logo", data.logo);
      }
      if (data.banner) {
        formData.append("banner", data.banner);
      }

      const response = await fetch("/api/stores/register", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطا در ثبت فروشگاه");
      }

      set({ myStore: result, isLoading: false, canBecomeSeller: false });
      toast.success("فروشگاه شما با موفقیت ثبت شد! در انتظار تایید ادمین");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Fetch seller's own store
  fetchMyStore: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/seller/store", {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فروشگاه یافت نشد");
      }

      set({ myStore: data, isLoading: false });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Update seller's store
  updateMyStore: async (data: StoreUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/seller/store", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطا در به‌روزرسانی فروشگاه");
      }

      set({ myStore: result, isLoading: false });
      toast.success("فروشگاه با موفقیت به‌روزرسانی شد");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Fetch seller dashboard data
  fetchSellerDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/seller/dashboard", {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت داشبورد");
      }

      set({ sellerDashboard: data, myStore: data.store, isLoading: false });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Admin: Fetch all stores
  fetchAllStoresAdmin: async (page = 1, status?: string) => {
    set({ isLoading: true, error: null });
    try {
      let url = `/api/admin/stores?page=${page}`;
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت فروشگاه‌ها");
      }

      set({
        stores: data.data || [],
        pagination: data.pagination || { totalPages: 1, currentPage: page, totalStores: 0 },
        isLoading: false,
      });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  // Admin: Update store status
  updateStoreStatus: async (storeId: string, status: string, isVerified?: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const body: { status: string; is_verified?: boolean } = { status };
      if (isVerified !== undefined) {
        body.is_verified = isVerified;
      }

      const response = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطا در به‌روزرسانی وضعیت فروشگاه");
      }

      // Update the store in the list
      set((state) => ({
        stores: state.stores.map((s) => (s.id === storeId ? data : s)),
        isLoading: false,
      }));

      toast.success("وضعیت فروشگاه به‌روزرسانی شد");
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ناشناخته";
      set({ isLoading: false, error: message });
      toast.error(message);
      throw error;
    }
  },
}));
