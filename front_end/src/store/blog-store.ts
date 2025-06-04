import { create } from "zustand";
import { BlogPost } from "@/types/blog";
import { useAuthStore } from "./auth-store";

interface BlogState {
  posts: BlogPost[];
  isLoading: boolean;
  error: string | null;
  activePost: BlogPost | null;
  categories: string[];
  tags: string[];

  // Actions
  fetchPosts: () => Promise<void>;
  fetchPostBySlug: (slug: string) => Promise<BlogPost | null>;
  reloadPosts: () => Promise<void>; // helper to force re-fetch

  // Admin actions
  createBlog: (data: Partial<BlogPost>) => Promise<BlogPost | null>;
  updateBlog: (id: string, data: Partial<BlogPost>) => Promise<BlogPost | null>;
  deleteBlog: (id: string) => Promise<boolean>;
}

export const useBlogStore = create<BlogState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  activePost: null,
  categories: [],
  tags: [],

  fetchPosts: async () => {
    // avoid duplicate fetch
    if (get().posts.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/blog-posts");
      if (!res.ok) {
        throw new Error("Failed to fetch blog posts");
      }

      // The backend returns a paginated response: { data: BlogPost[], total, ... }
      const json = await res.json();
      const posts: BlogPost[] = Array.isArray(json) ? json : json.data;

      const categories = Array.from(new Set(posts.map((p) => p.category))).sort();
      const tags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

      set({ posts, categories, tags, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در دریافت مقالات.",
        isLoading: false,
      });
    }
  },

  reloadPosts: async () => {
    // clear then fetch again
    set({ posts: [] });
    await get().fetchPosts();
  },

  fetchPostBySlug: async (slug: string) => {
    set({ isLoading: true, error: null, activePost: null });
    try {
      const res = await fetch(`/api/blog-posts/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          set({ error: "مقاله یافت نشد.", isLoading: false });
          return null;
        }
        throw new Error("Failed to fetch blog post");
      }
      const post: BlogPost = await res.json();

      // update activePost but also update posts cache if not exists.
      const existing = get().posts.find((p) => p.id === post.id);
      if (!existing) {
        set((state) => ({ posts: [...state.posts, post] }));
      }

      set({ activePost: post, isLoading: false });
      return post;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "خطا در دریافت مقاله.",
        isLoading: false,
      });
      return null;
    }
  },

  createBlog: async (data: Partial<BlogPost>) => {
    const { adminToken } = useAuthStore.getState();
    if (!adminToken) {
      return null;
    }
    try {
      const res = await fetch("/api/admin/blog-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create blog post");
      }
      const post: BlogPost = await res.json();
      set((state) => ({ posts: [post, ...state.posts] }));
      return post;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  updateBlog: async (id: string, data: Partial<BlogPost>) => {
    const { adminToken } = useAuthStore.getState();
    if (!adminToken) return null;
    try {
      const res = await fetch(`/api/admin/blog-posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update blog post");
      const updated: BlogPost = await res.json();
      set((state) => ({
        posts: state.posts.map((p) => (p.id === id || p._id === id ? updated : p)),
        activePost: state.activePost?.id === id ? updated : state.activePost,
      }));
      return updated;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  deleteBlog: async (id: string) => {
    const { adminToken } = useAuthStore.getState();
    if (!adminToken) return false;
    try {
      const res = await fetch(`/api/admin/blog-posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      set((state) => ({ posts: state.posts.filter((p) => p.id !== id && p._id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
})); 