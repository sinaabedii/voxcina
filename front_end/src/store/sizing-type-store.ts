import { create } from "zustand";
import { toast } from "react-toastify";
import { useAuthStore } from "./auth-store";
import {
  SizingType,
  SizingGenerateResponse,
} from "@/types/sizing-type";

interface SizingTypeState {
  sizingTypes: SizingType[];
  activeSizingType: SizingType | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

interface SizingTypeActions {
  fetchAdminSizingTypes: (adminToken: string) => Promise<SizingType[]>;
  fetchPublicSizingTypes: () => Promise<SizingType[]>;
  getSizingTypeById: (id: string, adminToken?: string) => Promise<SizingType | null>;
  generateSizingResearch: (
    clothingType: string,
    styleNotes?: string,
    adminToken?: string
  ) => Promise<SizingGenerateResponse | null>;
  createSizingType: (formData: FormData, adminToken: string) => Promise<SizingType | null>;
  updateSizingType: (
    id: string,
    formData: FormData,
    adminToken: string
  ) => Promise<SizingType | null>;
  deleteSizingType: (id: string, adminToken: string) => Promise<boolean>;
  setActiveSizingType: (sizingType: SizingType | null) => void;
  clearError: () => void;
}

const resolveToken = (token?: string): string => {
  if (token && token.trim()) return token.trim();
  const storeToken = useAuthStore.getState().adminToken;
  if (storeToken && storeToken.trim()) return storeToken.trim();
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken") || "";
  }
  return "";
};

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return (
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.message === "string" && data.message) ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export const useSizingTypeStore = create<SizingTypeState & SizingTypeActions>(
  (set, get) => ({
    sizingTypes: [],
    activeSizingType: null,
    isLoading: false,
    isGenerating: false,
    error: null,

    setActiveSizingType: (sizingType) => set({ activeSizingType: sizingType }),
    clearError: () => set({ error: null }),

    fetchAdminSizingTypes: async (adminToken: string) => {
      set({ isLoading: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch("/api/admin/sizing-types", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در دریافت لیست انواع سایزبندی"
          );
          throw new Error(msg);
        }

        const data: SizingType[] = await response.json();
        const types = Array.isArray(data) ? data : [];
        set({ sizingTypes: types, isLoading: false });
        return types;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در دریافت لیست انواع سایزبندی";
        set({ error: errorMsg, isLoading: false, sizingTypes: [] });
        return [];
      }
    },

    fetchPublicSizingTypes: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/sizing-types");
        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در دریافت لیست سایزبندی"
          );
          throw new Error(msg);
        }

        const data: SizingType[] = await response.json();
        const types = Array.isArray(data) ? data : [];
        set({ sizingTypes: types, isLoading: false });
        return types;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در دریافت لیست سایزبندی";
        set({ error: errorMsg, isLoading: false, sizingTypes: [] });
        return [];
      }
    },

    getSizingTypeById: async (id: string, adminToken?: string) => {
      set({ isLoading: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch(`/api/admin/sizing-types/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در دریافت اطلاعات سایزبندی"
          );
          throw new Error(msg);
        }

        const data: SizingType = await response.json();
        set({ activeSizingType: data, isLoading: false });
        return data;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در دریافت اطلاعات سایزبندی";
        set({ error: errorMsg, isLoading: false });
        return null;
      }
    },

    generateSizingResearch: async (
      clothingType: string,
      styleNotes?: string,
      adminToken?: string
    ) => {
      set({ isGenerating: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch("/api/admin/sizing-types/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clothing_type: clothingType,
            style_notes: styleNotes || "",
          }),
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در تولید هوشمند راهنمای سایز"
          );
          throw new Error(msg);
        }

        const data: SizingGenerateResponse = await response.json();
        set({ isGenerating: false });
        return data;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در تولید هوشمند راهنمای سایز";
        set({ error: errorMsg, isGenerating: false });
        toast.error(errorMsg);
        return null;
      }
    },

    createSizingType: async (formData: FormData, adminToken: string) => {
      set({ isLoading: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch("/api/admin/sizing-types", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در ایجاد نوع سایزبندی"
          );
          throw new Error(msg);
        }

        const newSizingType: SizingType = await response.json();
        set((state) => ({
          sizingTypes: [...state.sizingTypes, newSizingType],
          isLoading: false,
        }));
        toast.success("نوع سایزبندی با موفقیت ایجاد شد");
        return newSizingType;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در ایجاد نوع سایزبندی";
        set({ error: errorMsg, isLoading: false });
        toast.error(errorMsg);
        return null;
      }
    },

    updateSizingType: async (
      id: string,
      formData: FormData,
      adminToken: string
    ) => {
      set({ isLoading: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch(`/api/admin/sizing-types/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در به‌روزرسانی نوع سایزبندی"
          );
          throw new Error(msg);
        }

        const updatedSizingType: SizingType = await response.json();
        set((state) => ({
          sizingTypes: state.sizingTypes.map((item) =>
            item.id === id ? updatedSizingType : item
          ),
          activeSizingType:
            state.activeSizingType?.id === id
              ? updatedSizingType
              : state.activeSizingType,
          isLoading: false,
        }));
        toast.success("نوع سایزبندی با موفقیت به‌روزرسانی شد");
        return updatedSizingType;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در به‌روزرسانی نوع سایزبندی";
        set({ error: errorMsg, isLoading: false });
        toast.error(errorMsg);
        return null;
      }
    },

    deleteSizingType: async (id: string, adminToken: string) => {
      set({ isLoading: true, error: null });
      const token = resolveToken(adminToken);
      try {
        const response = await fetch(`/api/admin/sizing-types/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const msg = await extractErrorMessage(
            response,
            "خطا در حذف نوع سایزبندی"
          );
          throw new Error(msg);
        }

        set((state) => ({
          sizingTypes: state.sizingTypes.filter((item) => item.id !== id),
          activeSizingType:
            state.activeSizingType?.id === id ? null : state.activeSizingType,
          isLoading: false,
        }));
        toast.success("نوع سایزبندی با موفقیت حذف شد");
        return true;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در حذف نوع سایزبندی";
        set({ error: errorMsg, isLoading: false });
        toast.error(errorMsg);
        return false;
      }
    },
  })
);
