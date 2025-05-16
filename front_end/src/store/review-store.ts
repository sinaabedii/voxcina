import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Review } from "@/types/product";
import { generateId } from "@/lib/utils";

interface UserAction {
  reviewId: string;
  action: "like" | "dislike";
}

interface ReviewState {
  reviews: Review[];
  userActions: UserAction[];
  addReview: (
    review: Omit<Review, "id" | "date" | "likes" | "dislikes">
  ) => void;
  updateReview: (id: string, review: Partial<Review>) => void;
  deleteReview: (id: string) => void;
  getReviewsByProductId: (productId: string) => Review[];
  likeReview: (id: string, userId: string) => void;
  dislikeReview: (id: string, userId: string) => void;
  hasUserActedOnReview: (
    reviewId: string,
    userId: string
  ) => "like" | "dislike" | null;
}

const demoReviews: Review[] = [
  {
    id: "1",
    productId: "1",
    userId: "user1",
    userName: "علی محمدی",
    rating: 5,
    title: "خرید عالی و محصول باکیفیت",
    comment:
      "من این محصول رو چند روز پیش خریدم و واقعاً از کیفیتش راضی هستم. جنس پارچه عالیه و دوخت تمیزی داره. سایز هم کاملاً مناسب بود و با سایز استاندارد مطابقت داشت. پیشنهاد می‌کنم حتماً تهیه کنید.",
    date: "2025-03-15T10:30:00Z",
    likes: 12,
    dislikes: 2,
    verified: true,
    isRecommended: true,
  },
  {
    id: "2",
    productId: "1",
    userId: "user2",
    userName: "سارا احمدی",
    rating: 4,
    title: "کیفیت خوب با قیمت مناسب",
    comment:
      "محصول خوبی بود. کیفیت پارچه مناسب و قیمتش به نسبت بازار خوبه. فقط یک ایراد کوچک داشت که اونم اینه که یکم آستین‌هاش کوتاه‌تر از چیزی بود که انتظار داشتم. در کل راضی هستم و پیشنهاد می‌کنم.",
    date: "2025-03-10T14:45:00Z",
    likes: 8,
    dislikes: 1,
    userAvatar: "/images/avatars/user2.jpg",
    verified: true,
    isRecommended: true,
  },
  {
    id: "3",
    productId: "1",
    userId: "user3",
    userName: "محمد رضایی",
    rating: 3,
    title: "کیفیت متوسط",
    comment:
      "در کل محصول بدی نیست اما انتظار کیفیت بهتری داشتم. بعد از دو بار شستشو کمی رنگش رفت و این یکم ناامیدکننده بود. قیمتش نسبت به کیفیتش زیاده و فکر می‌کنم میشه محصول بهتری با این قیمت پیدا کرد.",
    date: "2025-02-25T09:15:00Z",
    likes: 4,
    dislikes: 3,
    verified: false,
    isRecommended: false,
  },
  {
    id: "4",
    productId: "2",
    userId: "user4",
    userName: "زهرا کریمی",
    rating: 5,
    title: "فوق‌العاده زیبا و باکیفیت",
    comment:
      "واقعاً از خریدم راضی هستم. هم طراحی زیبایی داره و هم کیفیت ساخت بالایی. مطابق با عکس‌ها بود و سایزش هم دقیقاً مناسب. بسته‌بندی هم مرتب بود و به موقع به دستم رسید.",
    date: "2025-03-20T16:20:00Z",
    likes: 15,
    dislikes: 0,
    userAvatar: "/images/avatars/user4.jpg",
    verified: true,
    images: ["/images/reviews/review-1.jpg", "/images/reviews/review-2.jpg"],
    isRecommended: true,
  },
  {
    id: "5",
    productId: "3",
    userId: "user5",
    userName: "رضا حسینی",
    rating: 2,
    title: "کیفیت پایین",
    comment:
      "متأسفانه اصلاً از خریدم راضی نیستم. کیفیت پایینی داره و اصلاً با عکس‌های سایت مطابقت نداشت. سایز هم کوچکتر از حد معمول بود. پیشنهاد نمی‌کنم خرید کنید.",
    date: "2025-03-05T11:10:00Z",
    likes: 7,
    dislikes: 5,
    verified: true,
    isRecommended: false,
  },
];

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      reviews: demoReviews,
      userActions: [],

      addReview: (reviewData) => {
        const newReview: Review = {
          ...reviewData,
          id: generateId(),
          date: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
        };

        set((state) => ({
          reviews: [...state.reviews, newReview],
        }));
      },

      updateReview: (id, reviewData) => {
        set((state) => ({
          reviews: state.reviews.map((review) =>
            review.id === id ? { ...review, ...reviewData } : review
          ),
        }));
      },

      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== id),
        }));
      },

      getReviewsByProductId: (productId) => {
        return get().reviews.filter((review) => review.productId === productId);
      },

      hasUserActedOnReview: (reviewId, userId) => {
        const action = get().userActions.find(
          (action) => action.reviewId === reviewId
        );

        return action ? action.action : null;
      },

      likeReview: (id, userId) => {
        const { reviews, userActions } = get();

        const existingAction = userActions.find(
          (action) => action.reviewId === id
        );

        if (existingAction) {
          return;
        }

        set((state) => ({
          userActions: [...state.userActions, { reviewId: id, action: "like" }],
          reviews: state.reviews.map((review) =>
            review.id === id ? { ...review, likes: review.likes + 1 } : review
          ),
        }));
      },

      dislikeReview: (id, userId) => {
        const { reviews, userActions } = get();

        const existingAction = userActions.find(
          (action) => action.reviewId === id
        );

        if (existingAction) {
          return;
        }

        set((state) => ({
          userActions: [
            ...state.userActions,
            { reviewId: id, action: "dislike" },
          ],
          reviews: state.reviews.map((review) =>
            review.id === id
              ? { ...review, dislikes: review.dislikes + 1 }
              : review
          ),
        }));
      },
    }),
    {
      name: "digi-style-reviews",
    }
  )
);
