import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Review } from "@/types/product";
import { generateId } from "@/lib/utils";

interface UserAction {
  reviewId: string;
  action: "like" | "dislike";
}

interface ReviewState {
  /* --- state --- */
  reviews: Review[];
  userActions: UserAction[];

  /* --- CRUD --- */
  addReview: (review: Omit<Review, "id" | "date" | "likes" | "dislikes">) => void;
  updateReview: (id: string, review: Partial<Review>) => void;
  deleteReview: (id: string) => void;

  /* --- selectors --- */
  getReviewsByProductId: (productId: string) => Review[];
  /** Average (0-5) rounded to one decimal, returns 0 when no reviews */
  getAverageRatingByProductId: (productId: string) => number;
  /** Total number of reviews for a product */
  getReviewCountByProductId: (productId: string) => number;

  /* --- like / dislike --- */
  likeReview: (id: string, userId: string) => void;
  dislikeReview: (id: string, userId: string) => void;
  hasUserActedOnReview: (
    reviewId: string,
    userId: string
  ) => "like" | "dislike" | null;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      /* ---------- state ---------- */
      reviews: [],
      userActions: [],

      /* ---------- CRUD ---------- */
      addReview: (reviewData) => {
        const newReview: Review = {
          ...reviewData,
          id: generateId(),
          date: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
        };
        set((s) => ({ reviews: [...s.reviews, newReview] }));
      },

      updateReview: (id, reviewData) => {
        set((s) => ({
          reviews: s.reviews.map((r) =>
            r.id === id ? { ...r, ...reviewData } : r
          ),
        }));
      },

      deleteReview: (id) => {
        set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }));
      },

      /* ---------- selectors ---------- */
      getReviewsByProductId: (productId) =>
        get().reviews.filter((r) => r.productId === productId),

      getAverageRatingByProductId: (productId) => {
        const list = get().reviews.filter((r) => r.productId === productId);
        if (list.length === 0) return 0;
        const avg = list.reduce((sum, r) => sum + r.rating, 0) / list.length;
        // one-decimal rounding (e.g., 4.26 → 4.3)
        return Math.round(avg * 10) / 10;
      },

      getReviewCountByProductId: (productId) =>
        get().reviews.filter((r) => r.productId === productId).length,

      /* ---------- like / dislike ---------- */
      hasUserActedOnReview: (reviewId, userId) => {
        const action = get().userActions.find((a) => a.reviewId === reviewId);
        return action ? action.action : null;
      },

      likeReview: (id, userId) => {
        const { userActions } = get();
        if (userActions.some((a) => a.reviewId === id)) return; // already acted
        set((s) => ({
          userActions: [...s.userActions, { reviewId: id, action: "like" }],
          reviews: s.reviews.map((r) =>
            r.id === id ? { ...r, likes: r.likes + 1 } : r
          ),
        }));
      },

      dislikeReview: (id, userId) => {
        const { userActions } = get();
        if (userActions.some((a) => a.reviewId === id)) return;
        set((s) => ({
          userActions: [...s.userActions, { reviewId: id, action: "dislike" }],
          reviews: s.reviews.map((r) =>
            r.id === id ? { ...r, dislikes: r.dislikes + 1 } : r
          ),
        }));
      },
    }),
    { name: "digi-style-reviews" }
  )
);
