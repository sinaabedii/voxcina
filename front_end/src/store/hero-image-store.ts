import { create } from "zustand";
import { HeroImage } from "@/types/hero-image";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

/**
 * Tells the public homepage to drop its cached hero-images fetch.
 *
 * The homepage reads hero images through an ISR-cached fetch (see
 * `HeroSection.tsx` / `CACHE_TIMES.HERO_IMAGES`); without this, a change made
 * here (e.g. disabling a hero design) can take minutes to show up publicly,
 * looking like the toggle silently did nothing. Best-effort: the admin write
 * itself already succeeded, so a failure here shouldn't surface as an error.
 */
function revalidateHeroCache() {
  fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags: ["hero-images", "home"] }),
  }).catch(() => {});
}

interface HeroImageState {
  heroImages: HeroImage[];
  activeHeroImage: HeroImage | null;
  isLoading: boolean;
  error: string | null;
  fetchHeroImages: (deviceType?: "desktop" | "mobile") => Promise<void>;
  fetchHeroImageById: (id: string) => Promise<void>;
  createHeroImage: (formData: FormData) => Promise<HeroImage | null>;
  updateHeroImage: (id: string, formData: FormData) => Promise<HeroImage | null>;
  deleteHeroImage: (id: string) => Promise<boolean>;
}

export const useHeroImageStore = create<HeroImageState>()((set, get) => ({
  heroImages: [],
  activeHeroImage: null,
  isLoading: false,
  error: null,

  fetchHeroImages: async (deviceType?: "desktop" | "mobile") => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      let url = "/api/admin/hero-images";
      if (deviceType) {
        url += `?device=${deviceType}`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch hero images");
      const data = await response.json();
      // Ensure heroImages is always an array
      const images = Array.isArray(data.heroImages) ? data.heroImages : 
                     Array.isArray(data) ? data : [];
      set({ heroImages: images, isLoading: false });
    } catch (error) {
      set({ heroImages: [], error: "خطا در دریافت تصاویر هیرو", isLoading: false });
      toast.error("خطا در دریافت تصاویر هیرو");
    }
  },

  fetchHeroImageById: async (id: string) => {
    set({ isLoading: true, error: null, activeHeroImage: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/admin/hero-images/${id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch hero image");
      const heroImage = await response.json();
      set({ activeHeroImage: heroImage, isLoading: false });
    } catch (error) {
      set({ error: "تصویر هیرو یافت نشد", isLoading: false });
      toast.error("تصویر هیرو یافت نشد");
    }
  },

  createHeroImage: async (formData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/admin/hero-images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create hero image");
      }
      const newHeroImage = await response.json();
      set((state) => ({
        heroImages: [...state.heroImages, newHeroImage].sort(
          (a, b) => a.displayOrder - b.displayOrder
        ),
        isLoading: false,
      }));
      revalidateHeroCache();
      toast.success("تصویر هیرو با موفقیت اضافه شد");
      return newHeroImage;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "خطا در افزودن تصویر هیرو";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return null;
    }
  },

  updateHeroImage: async (id: string, formData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/admin/hero-images/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update hero image");
      }
      const updatedHeroImage = await response.json();
      set((state) => ({
        heroImages: state.heroImages
          .map((h) => (h.id === id ? { ...h, ...updatedHeroImage } : h))
          .sort((a, b) => a.displayOrder - b.displayOrder),
        activeHeroImage:
          state.activeHeroImage?.id === id
            ? { ...state.activeHeroImage, ...updatedHeroImage }
            : state.activeHeroImage,
        isLoading: false,
      }));
      revalidateHeroCache();
      toast.success("تصویر هیرو با موفقیت به‌روزرسانی شد");
      return updatedHeroImage;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "خطا در به‌روزرسانی تصویر هیرو";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return null;
    }
  },

  deleteHeroImage: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/admin/hero-images/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete hero image");
      }
      set((state) => ({
        heroImages: state.heroImages.filter((h) => h.id !== id),
        activeHeroImage:
          state.activeHeroImage?.id === id ? null : state.activeHeroImage,
        isLoading: false,
      }));
      revalidateHeroCache();
      toast.success("تصویر هیرو با موفقیت حذف شد");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "خطا در حذف تصویر هیرو";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return false;
    }
  },
}));
