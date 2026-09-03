import { create } from "zustand";
import { toast } from "react-toastify";
import { useAuthStore } from "./auth-store";
import {
  ShopCollectionView,
  ShopCollectionInput,
  ShopCollectionListResponse,
  ShopCollectionStats,
} from "@/types/shopCollection";
import { ImageItem, getImageOrderInfo } from "@/components/admin/ImageUploader";

/**
 * Admin state for curated product collections (bundles of specific color
 * variants) managed in /admin/collections.
 *
 * The create/update writes carry images, so they go out as multipart
 * FormData (`data` JSON + image files + `imageOrder`), mirroring the product
 * form's image-order convention. Field toggles (is_active) stay JSON-only.
 */

interface ShopCollectionFilters {
  status?: "active" | "inactive" | "";
  search?: string;
}

/** The image side of a save: the uploader state to serialize with the write. */
export interface ShopCollectionImagesPayload {
  images?: ImageItem[];
}

export type ShopCollectionSave = ShopCollectionInput & ShopCollectionImagesPayload;

interface ShopCollectionState {
  collections: ShopCollectionView[];
  stats: ShopCollectionStats | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface ShopCollectionActions {
  fetchCollections: (filters?: ShopCollectionFilters) => Promise<void>;
  createCollection: (input: ShopCollectionSave) => Promise<boolean>;
  updateCollection: (id: string, input: ShopCollectionSave) => Promise<boolean>;
  /** JSON-only patch, e.g. the list page's publish toggle. */
  patchCollection: (id: string, input: Partial<ShopCollectionInput>) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
}

const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${useAuthStore.getState().adminToken || ""}`,
});

/** Pulls the backend's Persian message out of a failed response. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" && data.error ? data.error : fallback;
}

/** Builds the multipart body the backend expects: data JSON + files + order. */
function buildFormData(input: ShopCollectionSave): FormData {
  const { images: imageItems, ...fields } = input;
  const formData = new FormData();
  formData.append("data", JSON.stringify(fields));
  if (imageItems) {
    formData.append("imageOrder", JSON.stringify(getImageOrderInfo(imageItems)));
    for (const item of imageItems) {
      if (!item.isExisting && item.file) formData.append("images", item.file);
    }
  }
  return formData;
}

export const useShopCollectionStore = create<
  ShopCollectionState & ShopCollectionActions
>((set, get) => ({
  collections: [],
  stats: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchCollections: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.search?.trim()) params.set("search", filters.search.trim());

      const query = params.toString();
      const response = await fetch(
        `/api/admin/shop-collections${query ? `?${query}` : ""}`,
        { headers: authHeaders() }
      );
      if (!response.ok) throw new Error("failed");

      const data: ShopCollectionListResponse = await response.json();
      set({ collections: data.collections || [], stats: data.stats || null, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "دریافت کالکشن‌ها با خطا مواجه شد.",
        collections: [],
      });
    }
  },

  createCollection: async (input) => {
    set({ isSaving: true });
    try {
      const response = await fetch("/api/admin/shop-collections", {
        method: "POST",
        headers: authHeaders(),
        body: buildFormData(input),
      });
      if (!response.ok) {
        toast.error(await errorMessage(response, "ثبت کالکشن با خطا مواجه شد"));
        return false;
      }

      const created: ShopCollectionView = await response.json();
      set({
        collections: [...get().collections, created].sort(
          (a, b) => a.display_order - b.display_order
        ),
      });
      toast.success("کالکشن ثبت شد");
      return true;
    } catch {
      toast.error("ثبت کالکشن با خطا مواجه شد");
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  updateCollection: async (id, input) => {
    set({ isSaving: true });
    try {
      const response = await fetch(`/api/admin/shop-collections/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: buildFormData(input),
      });
      if (!response.ok) {
        toast.error(
          await errorMessage(response, "به‌روزرسانی کالکشن با خطا مواجه شد")
        );
        return false;
      }

      const updated: ShopCollectionView = await response.json();
      // Patch in place so the current filter and scroll position hold.
      set({ collections: get().collections.map((c) => (c.id === id ? updated : c)) });
      toast.success("کالکشن به‌روزرسانی شد");
      return true;
    } catch {
      toast.error("به‌روزرسانی کالکشن با خطا مواجه شد");
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  patchCollection: async (id, input) => {
    try {
      const response = await fetch(`/api/admin/shop-collections/${id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        toast.error(await errorMessage(response, "به‌روزرسانی کالکشن با خطا مواجه شد"));
        return false;
      }

      const updated: ShopCollectionView = await response.json();
      set({ collections: get().collections.map((c) => (c.id === id ? updated : c)) });
      return true;
    } catch {
      toast.error("به‌روزرسانی کالکشن با خطا مواجه شد");
      return false;
    }
  },

  deleteCollection: async (id) => {
    set({ isSaving: true });
    try {
      const response = await fetch(`/api/admin/shop-collections/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) {
        toast.error(await errorMessage(response, "حذف کالکشن با خطا مواجه شد"));
        return false;
      }

      set({ collections: get().collections.filter((c) => c.id !== id) });
      toast.success("کالکشن حذف شد");
      return true;
    } catch {
      toast.error("حذف کالکشن با خطا مواجه شد");
      return false;
    } finally {
      set({ isSaving: false });
    }
  },
}));
