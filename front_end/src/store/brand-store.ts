import { create } from "zustand";
import { Brand } from "@/types/brand";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

interface BrandState {
  brands: Brand[];
  activeBrand: Brand | null;
  isLoading: boolean;
  error: string | null;
  fetchBrands: () => Promise<void>;
  fetchBrandById: (id: string) => Promise<void>;
  createBrand: (brandData: FormData) => Promise<Brand | null>;
  updateBrand: (id: string, brandData: FormData) => Promise<Brand | null>;
  deleteBrand: (id: string) => Promise<boolean>;
}

export const useBrandStore = create<BrandState>()((set, get) => ({
  brands: [],
  activeBrand: null,
  isLoading: false,
  error: null,

  fetchBrands: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/brands");
      if (!response.ok) throw new Error("Failed to fetch brands");
      const data = await response.json();
      const brands = Array.isArray(data)
        ? data.map((b) => ({
            ...b,
            productsCount: b.productsCount ?? 0,
            featuredProduct: b.featuredProduct ?? undefined,
          }))
        : [];
      set({ brands, isLoading: false });
    } catch (error) {
      set({ brands: [], error: "خطا در دریافت برندها", isLoading: false });
      toast.error("خطا در دریافت برندها");
    }
  },

  fetchBrandById: async (id: string) => {
    set({ isLoading: true, error: null, activeBrand: null });
    try {
      const response = await fetch(`/api/brands/${id}`);
      if (!response.ok) throw new Error("Failed to fetch brand");
      const brand = await response.json();
      set({ activeBrand: brand, isLoading: false });
    } catch (error) {
      set({ error: "برند یافت نشد", isLoading: false });
      toast.error("برند یافت نشد");
    }
  },

  createBrand: async (brandData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: brandData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create brand");
      }
      const newBrand = await response.json();
      set((state) => ({ brands: [...state.brands, newBrand], isLoading: false }));
      toast.success("برند با موفقیت اضافه شد");
      return newBrand;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "خطا در افزودن برند", isLoading: false });
      toast.error(error instanceof Error ? error.message : "خطا در افزودن برند");
      return null;
    }
  },

  updateBrand: async (id: string, brandData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/brands/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: brandData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update brand");
      }
      const updatedBrand = await response.json();
      set((state) => ({
        brands: state.brands.map((b) => (b.id === id ? updatedBrand : b)),
        activeBrand: state.activeBrand?.id === id ? updatedBrand : state.activeBrand,
        isLoading: false,
      }));
      toast.success("برند با موفقیت به‌روزرسانی شد");
      return updatedBrand;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "خطا در به‌روزرسانی برند", isLoading: false });
      toast.error(error instanceof Error ? error.message : "خطا در به‌روزرسانی برند");
      return null;
    }
  },

  deleteBrand: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/brands/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete brand");
      }
      set((state) => ({
        brands: state.brands.filter((b) => b.id !== id),
        activeBrand: state.activeBrand?.id === id ? null : state.activeBrand,
        isLoading: false,
      }));
      toast.success("برند با موفقیت حذف شد");
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "خطا در حذف برند", isLoading: false });
      toast.error(error instanceof Error ? error.message : "خطا در حذف برند");
      return false;
    }
  },
})); 