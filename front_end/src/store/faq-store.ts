import { create } from "zustand";
import { Faq } from "@/types/faq";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

interface FaqState {
  faqs: Faq[];
  isLoading: boolean;
  error: string | null;
  fetchFaqs: () => Promise<void>;
  createFaq: (faq: Omit<Faq, "id" | "created_at" | "updated_at">) => Promise<Faq | null>;
  updateFaq: (id: string, faq: Partial<Faq>) => Promise<Faq | null>;
  deleteFaq: (id: string) => Promise<boolean>;
}

export const useFaqStore = create<FaqState>()((set, get) => ({
  faqs: [],
  isLoading: false,
  error: null,

  fetchFaqs: async () => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      const response = await fetch("/api/admin/faqs", {
        headers: {
          Authorization: adminToken ? `Bearer ${adminToken}` : "",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch FAQs");
      }
      const data: Faq[] = await response.json();
      set({ faqs: data, isLoading: false });
    } catch (error) {
      const message = "خطا در دریافت سوالات متداول";
      set({ faqs: [], error: message, isLoading: false });
      toast.error(message);
    }
  },

  createFaq: async (faqInput) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      if (!adminToken) {
        throw new Error("Admin token is missing");
      }

      const payload = {
        question: faqInput.question,
        answer: faqInput.answer,
        category: faqInput.category ?? "",
        is_active: faqInput.is_active ?? true,
        order: faqInput.order ?? 0,
      };

      const response = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create FAQ");
      }

      const created: Faq = await response.json();
      set((state) => ({ faqs: [...state.faqs, created], isLoading: false }));
      toast.success("سوال متداول با موفقیت اضافه شد");
      return created;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در افزودن سوال متداول";
      set({ error: message, isLoading: false });
      toast.error(message);
      return null;
    }
  },

  updateFaq: async (id, faqInput) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      if (!adminToken) {
        throw new Error("Admin token is missing");
      }

      const payload = {
        question: faqInput.question,
        answer: faqInput.answer,
        category: faqInput.category ?? "",
        is_active: faqInput.is_active ?? true,
        order: faqInput.order ?? 0,
      };

      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update FAQ");
      }

      const updated: Faq = await response.json();
      set((state) => ({
        faqs: state.faqs.map((f) => (f.id === id ? updated : f)),
        isLoading: false,
      }));
      toast.success("سوال متداول با موفقیت به‌روزرسانی شد");
      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در به‌روزرسانی سوال متداول";
      set({ error: message, isLoading: false });
      toast.error(message);
      return null;
    }
  },

  deleteFaq: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { adminToken } = useAuthStore.getState();
      if (!adminToken) {
        throw new Error("Admin token is missing");
      }

      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete FAQ");
      }

      set((state) => ({
        faqs: state.faqs.filter((f) => f.id !== id),
        isLoading: false,
      }));
      toast.success("سوال متداول با موفقیت حذف شد");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در حذف سوال متداول";
      set({ error: message, isLoading: false });
      toast.error(message);
      return false;
    }
  },
}));
