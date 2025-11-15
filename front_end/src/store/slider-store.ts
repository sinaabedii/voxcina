import { create } from "zustand";
import { Slider } from "@/types/slider";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

interface SliderState {
  sliders: Slider[];
  activeSlider: Slider | null;
  isLoading: boolean;
  error: string | null;
  fetchSliders: () => Promise<void>;
  fetchSliderById: (id: string) => Promise<void>;
  createSlider: (sliderData: Omit<Slider, "id">) => Promise<Slider | null>;
  updateSlider: (id: string, sliderData: Partial<Slider>) => Promise<Slider | null>;
  deleteSlider: (id: string) => Promise<boolean>;
}

export const useSliderStore = create<SliderState>()((set, get) => ({
  sliders: [],
  activeSlider: null,
  isLoading: false,
  error: null,

  fetchSliders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/sliders");
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

  createSlider: async (sliderData: Omit<Slider, "id">) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/sliders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(sliderData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create slider");
      }
      const newSlider = await response.json();
      set((state) => ({ sliders: [...state.sliders, newSlider], isLoading: false }));
      toast.success("اسلایدر با موفقیت اضافه شد");
      return newSlider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در افزودن اسلایدر";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return null;
    }
  },

  updateSlider: async (id: string, sliderData: Partial<Slider>) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch(`/api/sliders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(sliderData),
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
      const response = await fetch(`/api/sliders/${id}`, {
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
      toast.success("اسلایدر با موفقیت حذف شد");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در حذف اسلایدر";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return false;
    }
  },
})); 