import { create } from "zustand";
import { Slider } from "@/types/slider";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

/**
 * Tells the public homepage to drop its cached sliders fetch.
 *
 * The homepage reads sliders through an ISR-cached fetch (`page.tsx` /
 * `CACHE_TIMES.SLIDERS`); without this, a slide created or published here can
 * take minutes to appear publicly, looking like the save silently did nothing.
 * Best-effort: the admin write already succeeded, so a failure here shouldn't
 * surface as an error. Mirrors `revalidateHeroCache` in hero-image-store.
 */
function revalidateSliderCache() {
  fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags: ["sliders", "home"] }),
  }).catch(() => {});
}

interface SliderState {
  sliders: Slider[];
  activeSlider: Slider | null;
  isLoading: boolean;
  error: string | null;
  fetchSliders: () => Promise<void>;
  fetchSliderById: (id: string) => Promise<void>;
  /** Writes are multipart so the slide's background image can ride along. */
  createSlider: (formData: FormData) => Promise<Slider | null>;
  updateSlider: (id: string, formData: FormData) => Promise<Slider | null>;
  deleteSlider: (id: string) => Promise<boolean>;
  reorderSliders: (items: { id: string; order: number }[]) => Promise<boolean>;
}

export const useSliderStore = create<SliderState>()((set, get) => ({
  sliders: [],
  activeSlider: null,
  isLoading: false,
  error: null,

  fetchSliders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Admin list: the public /api/sliders hides unpublished and
      // out-of-schedule slides, so managing drafts needs the unfiltered view.
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/admin/sliders", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sliders");
      const sliders = await response.json();
      set({ sliders, isLoading: false });
    } catch (error) {
      set({ sliders: [], error: "خطا در دریافت اسلایدرها", isLoading: false });
      toast.error("خطا در دریافت اسلایدرها");
    }
  },

  fetchSliderById: async (id: string) => {
    set({ isLoading: true, error: null, activeSlider: null });
    try {
      const response = await fetch(`/api/sliders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch slider");
      const slider = await response.json();
      set({ activeSlider: slider, isLoading: false });
    } catch (error) {
      set({ error: "اسلایدر یافت نشد", isLoading: false });
      toast.error("اسلایدر یافت نشد");
    }
  },

  createSlider: async (formData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      // No Content-Type header: the browser must set the multipart boundary.
      const response = await fetch("/api/admin/sliders", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create slider");
      }
      const newSlider = await response.json();
      set((state) => ({ sliders: [...state.sliders, newSlider], isLoading: false }));
      revalidateSliderCache();
      toast.success("اسلایدر با موفقیت اضافه شد");
      return newSlider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در افزودن اسلایدر";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return null;
    }
  },

  updateSlider: async (id: string, formData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/admin/sliders/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update slider");
      }
      const updatedSlider = await response.json();
      set((state) => ({
        sliders: state.sliders.map((s) => (s.id === id ? { ...s, ...updatedSlider } : s)),
        activeSlider: state.activeSlider?.id === id ? { ...state.activeSlider, ...updatedSlider } : state.activeSlider,
        isLoading: false,
      }));
      revalidateSliderCache();
      toast.success("اسلایدر با موفقیت به‌روزرسانی شد");
      return updatedSlider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در به‌روزرسانی اسلایدر";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return null;
    }
  },

  deleteSlider: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/admin/sliders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete slider");
      }
      set((state) => ({
        sliders: state.sliders.filter((s) => s.id !== id),
        activeSlider: state.activeSlider?.id === id ? null : state.activeSlider,
        isLoading: false,
      }));
      revalidateSliderCache();
      toast.success("اسلایدر با موفقیت حذف شد");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در حذف اسلایدر";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return false;
    }
  },

  reorderSliders: async (items: { id: string; order: number }[]) => {
    // Optimistic: the list re-sorts under the cursor immediately, and a failure
    // re-fetches to snap back to whatever the server actually holds.
    const previous = get().sliders;
    const orderById = new Map(items.map((item) => [item.id, item.order]));
    set({
      sliders: [...previous]
        .map((s) => (orderById.has(s.id!) ? { ...s, order: orderById.get(s.id!) } : s))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    });

    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/admin/sliders/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(items),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reorder sliders");
      }
      revalidateSliderCache();
      return true;
    } catch (error) {
      set({ sliders: previous });
      const errorMessage = error instanceof Error ? error.message : "خطا در تغییر ترتیب";
      toast.error(errorMessage);
      return false;
    }
  },
})); 