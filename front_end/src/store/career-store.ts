import { create } from "zustand";
import { toast } from "react-toastify";
import {
  CareerSubmission,
  CareerSubmissionListResponse,
  CareerSubmissionPagination,
  CareerSubmissionStats,
  CareerSubmissionStatus,
  CareerSubmissionType,
} from "@/types/career";

/**
 * Admin state for the careers inbox.
 *
 * Deliberately not persisted: every row holds an applicant's name, phone and
 * email, and that has no business sitting in localStorage after the admin
 * closes the tab.
 */

interface CareerFilters {
  type?: CareerSubmissionType | "";
  status?: CareerSubmissionStatus | "";
  search?: string;
  page?: number;
}

interface CareerState {
  submissions: CareerSubmission[];
  stats: CareerSubmissionStats | null;
  pagination: CareerSubmissionPagination | null;
  isLoading: boolean;
  error: string | null;
  downloadingId: string | null;
}

interface CareerActions {
  fetchSubmissions: (filters?: CareerFilters) => Promise<void>;
  updateSubmission: (
    id: string,
    changes: { status?: CareerSubmissionStatus; admin_note?: string }
  ) => Promise<boolean>;
  deleteSubmission: (id: string) => Promise<boolean>;
  downloadResume: (submission: CareerSubmission) => Promise<void>;
}

const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${
    typeof window === "undefined" ? "" : localStorage.getItem("authToken")
  }`,
});

/** Reads the filename the backend put in Content-Disposition, preferring the
 *  RFC 5987 form so Persian filenames survive. */
function filenameFromResponse(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") || "";

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // Malformed encoding: fall through to the plain parameter.
    }
  }

  const plain = disposition.match(/filename="([^"]+)"/i);
  if (plain?.[1]) return plain[1];

  return fallback;
}

export const useCareerStore = create<CareerState & CareerActions>((set, get) => ({
  submissions: [],
  stats: null,
  pagination: null,
  isLoading: false,
  error: null,
  downloadingId: null,

  fetchSubmissions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set("page", String(filters.page ?? 1));
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.search?.trim()) params.set("search", filters.search.trim());

      const response = await fetch(
        `/api/admin/career-submissions?${params.toString()}`,
        { headers: authHeaders() }
      );
      if (!response.ok) throw new Error("failed");

      const data: CareerSubmissionListResponse = await response.json();
      set({
        submissions: data.submissions || [],
        stats: data.stats || null,
        pagination: data.pagination || null,
        isLoading: false,
      });
    } catch {
      set({
        isLoading: false,
        error: "دریافت درخواست‌ها با خطا مواجه شد.",
        submissions: [],
      });
    }
  },

  updateSubmission: async (id, changes) => {
    try {
      const response = await fetch(`/api/admin/career-submissions/${id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error("failed");

      const updated: CareerSubmission = await response.json();
      // Patch in place so the current filter, page and scroll position hold.
      set({
        submissions: get().submissions.map((item) =>
          item.id === id ? updated : item
        ),
      });
      toast.success("وضعیت درخواست به‌روزرسانی شد");
      return true;
    } catch {
      toast.error("به‌روزرسانی درخواست با خطا مواجه شد");
      return false;
    }
  },

  deleteSubmission: async (id) => {
    try {
      const response = await fetch(`/api/admin/career-submissions/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("failed");

      set({
        submissions: get().submissions.filter((item) => item.id !== id),
      });
      toast.success("درخواست و رزومه آن حذف شد");
      return true;
    } catch {
      toast.error("حذف درخواست با خطا مواجه شد");
      return false;
    }
  },

  downloadResume: async (submission) => {
    // A plain <a href> cannot reach this endpoint: it is admin-only and the
    // token lives in localStorage, not a cookie. So fetch it and hand the blob
    // to a synthetic link.
    set({ downloadingId: submission.id });
    try {
      const response = await fetch(
        `/api/admin/career-submissions/${submission.id}/resume`,
        { headers: authHeaders() }
      );
      if (!response.ok) throw new Error("failed");

      const blob = await response.blob();
      const filename = filenameFromResponse(
        response,
        `${submission.reference_code || "resume"}.pdf`
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("دانلود رزومه با خطا مواجه شد");
    } finally {
      set({ downloadingId: null });
    }
  },
}));
