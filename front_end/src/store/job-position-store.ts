import { create } from "zustand";
import { toast } from "react-toastify";
import {
  JobPosition,
  JobPositionInput,
  JobPositionListResponse,
  JobPositionStats,
} from "@/types/career";

/**
 * Admin state for the job openings advertised on /careers.
 *
 * Kept separate from the careers inbox store: postings and applications are
 * different resources with different lifetimes, and the inbox holds applicant
 * personal data this list has no business carrying around.
 */

interface JobPositionFilters {
  status?: "active" | "inactive" | "";
  search?: string;
}

interface JobPositionState {
  positions: JobPosition[];
  stats: JobPositionStats | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface JobPositionActions {
  fetchPositions: (filters?: JobPositionFilters) => Promise<void>;
  createPosition: (input: JobPositionInput) => Promise<boolean>;
  updatePosition: (id: string, input: JobPositionInput) => Promise<boolean>;
  deletePosition: (id: string) => Promise<boolean>;
}

const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${
    typeof window === "undefined" ? "" : localStorage.getItem("authToken")
  }`,
});

/** Pulls the backend's Persian message out of a failed response, falling back
 *  to a generic one when the body is not the expected JSON. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" && data.error ? data.error : fallback;
}

export const useJobPositionStore = create<JobPositionState & JobPositionActions>(
  (set, get) => ({
    positions: [],
    stats: null,
    isLoading: false,
    isSaving: false,
    error: null,

    fetchPositions: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.search?.trim()) params.set("search", filters.search.trim());

        const query = params.toString();
        const response = await fetch(
          `/api/admin/job-positions${query ? `?${query}` : ""}`,
          { headers: authHeaders() }
        );
        if (!response.ok) throw new Error("failed");

        const data: JobPositionListResponse = await response.json();
        set({
          positions: data.positions || [],
          stats: data.stats || null,
          isLoading: false,
        });
      } catch {
        set({
          isLoading: false,
          error: "دریافت موقعیت‌های شغلی با خطا مواجه شد.",
          positions: [],
        });
      }
    },

    createPosition: async (input) => {
      set({ isSaving: true });
      try {
        const response = await fetch("/api/admin/job-positions", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          toast.error(await errorMessage(response, "ثبت موقعیت شغلی با خطا مواجه شد"));
          return false;
        }

        const created: JobPosition = await response.json();
        // Placed by display order, exactly where the listing query would put it.
        set({
          positions: [...get().positions, created].sort(
            (a, b) => a.display_order - b.display_order
          ),
        });
        toast.success("موقعیت شغلی ثبت شد");
        return true;
      } catch {
        toast.error("ثبت موقعیت شغلی با خطا مواجه شد");
        return false;
      } finally {
        set({ isSaving: false });
      }
    },

    updatePosition: async (id, input) => {
      set({ isSaving: true });
      try {
        const response = await fetch(`/api/admin/job-positions/${id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          toast.error(
            await errorMessage(response, "به‌روزرسانی موقعیت شغلی با خطا مواجه شد")
          );
          return false;
        }

        const updated: JobPosition = await response.json();
        // Patch in place so the current filter and scroll position hold. The
        // update response carries application_count as 0 (it is computed only
        // for the listing), so the count already on screen is kept.
        set({
          positions: get()
            .positions.map((item) =>
              item.id === id
                ? { ...updated, application_count: item.application_count }
                : item
            )
            .sort((a, b) => a.display_order - b.display_order),
        });
        toast.success("موقعیت شغلی به‌روزرسانی شد");
        return true;
      } catch {
        toast.error("به‌روزرسانی موقعیت شغلی با خطا مواجه شد");
        return false;
      } finally {
        set({ isSaving: false });
      }
    },

    deletePosition: async (id) => {
      set({ isSaving: true });
      try {
        const response = await fetch(`/api/admin/job-positions/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!response.ok) {
          toast.error(await errorMessage(response, "حذف موقعیت شغلی با خطا مواجه شد"));
          return false;
        }

        set({ positions: get().positions.filter((item) => item.id !== id) });
        toast.success("موقعیت شغلی حذف شد");
        return true;
      } catch {
        toast.error("حذف موقعیت شغلی با خطا مواجه شد");
        return false;
      } finally {
        set({ isSaving: false });
      }
    },
  })
);
