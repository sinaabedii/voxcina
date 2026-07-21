import { create } from "zustand";
import { BlogPost, BlogPipelineRun, BlogBlock, BlogMedia, GenerationBrief } from "@/types/blog";

interface BlogAdminState {
  // State
  currentRun: BlogPipelineRun | null;
  currentPost: BlogPost | null;
  currentMedia: BlogMedia[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createRun: (brief: GenerationBrief) => Promise<BlogPipelineRun | null>;
  fetchRun: (runID: string) => Promise<BlogPipelineRun | null>;
  deleteRun: (runID: string) => Promise<boolean>;
  triggerResearch: (runID: string) => Promise<boolean>;
  approveResearch: (runID: string) => Promise<boolean>;
  triggerWriting: (runID: string) => Promise<boolean>;
  approveContent: (runID: string) => Promise<boolean>;
  triggerPrompts: (runID: string) => Promise<boolean>;
  approvePrompts: (runID: string) => Promise<boolean>;
  updateBlocks: (postID: string, blocks: BlogBlock[]) => Promise<boolean>;
  finalizeContent: (postID: string) => Promise<boolean>;
  uploadMedia: (postID: string, slot: string, file: File, alt: string) => Promise<BlogMedia | null>;
  deleteMedia: (mediaID: string) => Promise<boolean>;
  publishPost: (postID: string) => Promise<boolean>;
  unpublishPost: (postID: string) => Promise<boolean>;
  archivePost: (postID: string) => Promise<boolean>;
  restorePost: (postID: string) => Promise<boolean>;
}

export const useBlogAdminStore = create<BlogAdminState>((set, get) => ({
  currentRun: null,
  currentPost: null,
  currentMedia: [],
  isLoading: false,
  error: null,

  createRun: async (brief: GenerationBrief) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/blog-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(brief),
      });

      if (!res.ok) {
        throw new Error("Failed to create run");
      }

      const run: BlogPipelineRun = await res.json();
      set({ currentRun: run, isLoading: false });
      return run;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در ایجاد کارگاه",
        isLoading: false,
      });
      return null;
    }
  },

  fetchRun: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch run");
      }

      const data = await res.json();
      const run: BlogPipelineRun = { ...data.run, executions: data.executions, sources: data.sources };
      const media: BlogMedia[] = Array.isArray(data.media) ? data.media : [];
      set({ currentRun: run, currentPost: data.run.post_id ? data.post : null, currentMedia: media, isLoading: false });
      return run;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در دریافت کارگاه",
        isLoading: false,
      });
      return null;
    }
  },

  deleteRun: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete run");
      }

      set({ currentRun: null, isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در حذف کارگاه",
        isLoading: false,
      });
      return false;
    }
  },

  triggerResearch: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/research`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to trigger research");
      }

      await get().fetchRun(runID);
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در شروع تحقیقات",
        isLoading: false,
      });
      return false;
    }
  },

  approveResearch: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve research");
      }

      await get().fetchRun(runID);
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در تایید تحقیقات",
        isLoading: false,
      });
      return false;
    }
  },

  triggerWriting: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/write`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to trigger writing");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در شروع نگارش",
        isLoading: false,
      });
      return false;
    }
  },

  approveContent: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to approve content");
      }

      await get().fetchRun(runID);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در تایید محتوا",
        isLoading: false,
      });
      return false;
    }
  },

  triggerPrompts: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to trigger prompts");
      }

      await get().fetchRun(runID);
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در شروع تولید پرامپت",
        isLoading: false,
      });
      return false;
    }
  },

  approvePrompts: async (runID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${runID}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to approve prompts");
      }

      await get().fetchRun(runID);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در تایید پرامپت",
        isLoading: false,
      });
      return false;
    }
  },

  updateBlocks: async (postID: string, blocks: BlogBlock[]) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/blocks`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocks }),
      });

      if (!res.ok) {
        throw new Error("Failed to update blocks");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در بروزرسانی بلوکها",
        isLoading: false,
      });
      return false;
    }
  },

  finalizeContent: async (postID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/finalize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to finalize content");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در نهایی کردن محتوا",
        isLoading: false,
      });
      return false;
    }
  },

  uploadMedia: async (postID: string, slot: string, file: File, alt: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", file);
      formData.append("alt", alt);

      const res = await fetch(`/api/admin/blog-posts/${postID}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload media");
      }

      const media: BlogMedia = await res.json();
      set((state) => ({ currentMedia: [...state.currentMedia, media], isLoading: false }));
      return media;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در آپلود رسانه",
        isLoading: false,
      });
      return null;
    }
  },

  deleteMedia: async (mediaID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-media/${mediaID}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete media");
      }

      set((state) => ({ currentMedia: state.currentMedia.filter((m) => m.id !== mediaID), isLoading: false }));
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در حذف رسانه",
        isLoading: false,
      });
      return false;
    }
  },

  publishPost: async (postID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to publish post");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در انتشار مقاله",
        isLoading: false,
      });
      return false;
    }
  },

  unpublishPost: async (postID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/unpublish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to unpublish post");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در غیرانتشار مقاله",
        isLoading: false,
      });
      return false;
    }
  },

  archivePost: async (postID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/archive`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to archive post");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در بایگانی مقاله",
        isLoading: false,
      });
      return false;
    }
  },

  restorePost: async (postID: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-posts/${postID}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to restore post");
      }

      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در بازیابی مقاله",
        isLoading: false,
      });
      return false;
    }
  },
}));
