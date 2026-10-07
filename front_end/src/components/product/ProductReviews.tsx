"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CheckCircle2,
  ImageIcon,
  Star,
  PenLine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Review } from "@/types/product";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { useAuthStore } from "@/store/auth-store";
import { useReviewStore } from "@/store/review-store";
import { cn, toPersianNumber } from "@/lib/utils";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  avgRating: number;
  onAddReview?: (
    review: Omit<Review, "id" | "date" | "likes" | "dislikes">
  ) => void;
}

const INITIAL_VISIBLE_COUNT = 2;

const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  reviews,
  avgRating,
  onAddReview,
}) => {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">(
    "newest"
  );
  const [showOnlyWithImages, setShowOnlyWithImages] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});

  const { isAuthenticated, user } = useAuthStore();
  const { likeReview, dislikeReview, hasUserActedOnReview } = useReviewStore();

  const [newReview, setNewReview] = useState({
    rating: 0,
    title: "",
    comment: "",
    isRecommended: true,
  });

  const [errors, setErrors] = useState({
    rating: "",
    title: "",
    comment: "",
  });

  const getDisplayDate = (r: any) => {
    const ts = r.createdAt || r.created_at || r.date;
    return ts ? new Date(ts).toLocaleDateString("fa-IR") : "";
  };

  const getReviewTimestamp = (r: any) => {
    const ts = r.createdAt || r.created_at || r.date;
    return ts ? new Date(ts).getTime() : 0;
  };

  const filteredReviews = [...reviews]
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return getReviewTimestamp(b) - getReviewTimestamp(a);
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        default:
          return 0;
      }
    })
    .filter(
      (review) =>
        !showOnlyWithImages || (review.images && review.images.length > 0)
    );

  const displayedReviews = showAllReviews
    ? filteredReviews
    : filteredReviews.slice(0, INITIAL_VISIBLE_COUNT);

  const ratingStats = Array.from({ length: 5 }, (_, i) => {
    const count = reviews.filter((review) => review.rating === 5 - i).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { stars: 5 - i, count, percentage };
  });

  const toggleExpandReview = (reviewId: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const handleAddReview = () => {
    const newErrors = {
      rating: newReview.rating === 0 ? "لطفاً امتیاز خود را مشخص کنید" : "",
      title: !newReview.title.trim() ? "لطفاً عنوان نظر را وارد کنید" : "",
      comment: !newReview.comment.trim() ? "لطفاً متن نظر را وارد کنید" : "",
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error)) {
      return;
    }

    if (onAddReview && user) {
      onAddReview({
        productId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        verified: true,
        isRecommended: newReview.isRecommended,
      });

      setNewReview({
        rating: 0,
        title: "",
        comment: "",
        isRecommended: true,
      });

      setIsWritingReview(false);
      toast.success("نظر شما با موفقیت ثبت شد");
    }
  };

  const handleLikeReview = (reviewId: string) => {
    if (!isAuthenticated || !user) {
      toast.info("برای لایک کردن نظرات، لطفاً ابتدا وارد حساب کاربری خود شوید.");
      return;
    }

    if (hasUserActedOnReview(reviewId, user.id)) {
      return;
    }

    likeReview(reviewId, user.id);
  };

  const handleDislikeReview = (reviewId: string) => {
    if (!isAuthenticated || !user) {
      toast.info("برای ثبت نظر، لطفاً ابتدا وارد حساب کاربری خود شوید.");
      return;
    }

    if (hasUserActedOnReview(reviewId, user.id)) {
      return;
    }

    dislikeReview(reviewId, user.id);
  };

  return (
    <div className="rounded-[24px] border border-voxcina-blue/10 bg-voxcina-lightCream/95 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0e223d]/60 sm:rounded-[28px] sm:p-6">
      {/* Header Bar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-voxcina-blue/10 text-voxcina-blue dark:bg-white/10 dark:text-voxcina-cream">
            <MessageCircle className="size-4" />
          </span>
          <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
            نظرات و امتیازها
          </h2>
          <span className="rounded-full border border-voxcina-blue/15 bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-voxcina-blue/80 dark:border-white/15 dark:bg-white/10 dark:text-voxcina-cream/80">
            {toPersianNumber(reviews.length)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              toast.info("برای نوشتن نظر، لطفاً ابتدا وارد حساب کاربری شوید.");
              return;
            }
            setIsWritingReview(!isWritingReview);
          }}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all active:scale-95",
            isWritingReview
              ? "border-voxcina-blue/20 bg-white/80 text-voxcina-blue dark:border-white/20 dark:bg-white/10 dark:text-voxcina-cream"
              : "border-voxcina-blue bg-voxcina-blue text-voxcina-cream hover:bg-voxcina-darkBlue shadow-xs"
          )}
        >
          <PenLine className="size-3.5" />
          {isWritingReview ? "انصراف" : "ثبت نظر"}
        </button>
      </div>

      {/* Compact Score & Distribution Widget */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-voxcina-blue/10 bg-white/70 p-3.5 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-4">
        {/* Score side */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:border-l sm:border-voxcina-blue/10 sm:pl-6 sm:dark:border-white/10">
          <div className="flex items-baseline gap-1 text-2xl font-bold tabular-nums text-voxcina-blue dark:text-white">
            {toPersianNumber(avgRating.toFixed(1))}
            <span className="text-xs font-normal text-muted-foreground">
              / ۵
            </span>
          </div>
          <div className="flex flex-col items-start sm:items-center">
            <StarRating
              initialRating={avgRating}
              readonly
              size="sm"
              className="mb-0.5"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              از {toPersianNumber(reviews.length)} نظر خریداران
            </span>
          </div>
        </div>

        {/* 5-bar mini distribution */}
        <div className="flex-1 space-y-1 sm:max-w-xs">
          {ratingStats.map((stat) => (
            <div key={stat.stars} className="flex items-center gap-2 text-xs">
              <span className="flex w-6 shrink-0 items-center justify-end gap-0.5 font-medium tabular-nums text-voxcina-blue/70 dark:text-voxcina-cream/70">
                {toPersianNumber(stat.stars)}
                <Star className="size-2.5 fill-[#D4B373] text-[#D4B373]" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-voxcina-blue/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[#D4B373] transition-all duration-500"
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
              <span className="w-5 shrink-0 text-left text-xs tabular-nums text-muted-foreground">
                {toPersianNumber(stat.count)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review Form Drawer */}
      <AnimatePresence>
        {isWritingReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-2xl border border-voxcina-blue/15 bg-white p-4 shadow-sm dark:bg-[#0e223d]"
          >
            <h3 className="mb-3 text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
              ثبت نظر جدید
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  امتیاز شما
                </label>
                <StarRating
                  initialRating={newReview.rating}
                  onChange={(rating) => setNewReview({ ...newReview, rating })}
                  size="md"
                />
                {errors.rating && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.rating}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  عنوان نظر
                </label>
                <input
                  type="text"
                  className="voxcina-input h-9 w-full text-xs"
                  placeholder="عنوان خلاصه برای نظر شما..."
                  value={newReview.title}
                  onChange={(e) =>
                    setNewReview({ ...newReview, title: e.target.value })
                  }
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  متن نظر
                </label>
                <textarea
                  className="voxcina-input min-h-[80px] w-full text-xs"
                  placeholder="تجربه خود از کیفیت، سایز و جنس این محصول..."
                  value={newReview.comment}
                  onChange={(e) =>
                    setNewReview({ ...newReview, comment: e.target.value })
                  }
                />
                {errors.comment && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.comment}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  آیا خرید این محصول را پیشنهاد می‌کنید؟
                </label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      className="text-voxcina-blue"
                      checked={newReview.isRecommended === true}
                      onChange={() =>
                        setNewReview({ ...newReview, isRecommended: true })
                      }
                    />
                    <span>بله، پیشنهاد می‌کنم</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      className="text-destructive"
                      checked={newReview.isRecommended === false}
                      onChange={() =>
                        setNewReview({ ...newReview, isRecommended: false })
                      }
                    />
                    <span>خیر</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWritingReview(false)}
                >
                  انصراف
                </Button>
                <Button variant="primary" size="sm" onClick={handleAddReview}>
                  ثبت نظر
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slim Filter / Sort Row */}
      {reviews.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-voxcina-blue/10 pb-2.5 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">ترتیب:</span>
            {(
              [
                { id: "newest", label: "جدیدترین" },
                { id: "highest", label: "بیشترین امتیاز" },
                { id: "lowest", label: "کمترین امتیاز" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                  sortBy === opt.id
                    ? "bg-voxcina-blue text-voxcina-cream dark:bg-white dark:text-voxcina-blue"
                    : "text-voxcina-blue/70 hover:bg-voxcina-blue/10 dark:text-voxcina-cream/70 dark:hover:bg-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80">
            <input
              type="checkbox"
              className="rounded text-voxcina-blue"
              checked={showOnlyWithImages}
              onChange={(e) => setShowOnlyWithImages(e.target.checked)}
            />
            <ImageIcon className="size-3.5 text-muted-foreground" />
            فقط نظرات عکس‌دار
          </label>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-voxcina-blue/10 bg-white/50 py-8 text-center dark:bg-white/[0.02]">
          <MessageCircle className="mx-auto mb-2 size-8 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
          <p className="text-xs font-medium text-foreground">
            هنوز نظری برای این محصول ثبت نشده است.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            اولین نفری باشید که تجربه خود را می‌نویسد!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedReviews.map((review) => {
            const isExpanded = expandedReviews[review.id] || false;
            const isLongComment = review.comment.length > 200;
            const userAction = user
              ? hasUserActedOnReview(review.id, user.id)
              : null;
            const displayName =
              (review.userName as string | undefined) ||
              (review as any).user_name ||
              "کاربر";

            return (
              <div
                key={review.id}
                className="rounded-xl border border-voxcina-blue/10 bg-white/70 p-3 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-3.5"
              >
                {/* User Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {review.userAvatar ? (
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-voxcina-blue/15">
                        <Image
                          src={review.userAvatar}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-voxcina-blue/10 text-xs font-bold text-voxcina-blue dark:bg-white/10 dark:text-voxcina-cream">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold text-foreground">
                      {displayName}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        خریدار
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating
                      initialRating={review.rating}
                      readonly
                      size="sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      {getDisplayDate(review)}
                    </span>
                  </div>
                </div>

                {/* Title & Comment */}
                {review.title && (
                  <h4 className="mt-2 text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                    {review.title}
                  </h4>
                )}

                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  {isLongComment && !isExpanded
                    ? `${review.comment.slice(0, 200)}... `
                    : review.comment}
                  {isLongComment && (
                    <button
                      type="button"
                      className="font-medium text-voxcina-blue hover:underline dark:text-voxcina-cream"
                      onClick={() => toggleExpandReview(review.id)}
                    >
                      {isExpanded ? "نمایش کمتر" : "ادامه مطلب"}
                    </button>
                  )}
                </p>

                {/* Photos */}
                {review.images && review.images.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto py-1 scrollbar-hide">
                    {review.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-voxcina-blue/15"
                      >
                        <Image
                          src={img}
                          alt={`تصویر ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer / Recommends & Likes */}
                <div className="mt-2 flex items-center justify-between border-t border-voxcina-blue/5 pt-2 text-xs dark:border-white/5">
                  <div>
                    {review.isRecommended !== undefined && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          review.isRecommended
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        )}
                      >
                        {review.isRecommended
                          ? "خرید را پیشنهاد می‌کنم"
                          : "پیشنهاد نمی‌کنم"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 transition-colors hover:text-foreground",
                        userAction === "like" && "text-emerald-600 font-bold"
                      )}
                      onClick={() => handleLikeReview(review.id)}
                      title="مفید بود"
                    >
                      <ThumbsUp
                        className="size-3.5"
                        fill={userAction === "like" ? "currentColor" : "none"}
                      />
                      <span className="tabular-nums">
                        {toPersianNumber(review.likes)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 transition-colors hover:text-foreground",
                        userAction === "dislike" && "text-rose-600 font-bold"
                      )}
                      onClick={() => handleDislikeReview(review.id)}
                      title="مفید نبود"
                    >
                      <ThumbsDown
                        className="size-3.5"
                        fill={
                          userAction === "dislike" ? "currentColor" : "none"
                        }
                      />
                      <span className="tabular-nums">
                        {toPersianNumber(review.dislikes)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* View All / Collapse Button */}
          {filteredReviews.length > INITIAL_VISIBLE_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-voxcina-blue/15 bg-white/80 text-xs font-semibold text-voxcina-blue transition-all hover:bg-white active:scale-[0.99] dark:border-white/15 dark:bg-white/10 dark:text-voxcina-cream"
            >
              {showAllReviews ? (
                <>
                  بستن نظرات
                  <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  مشاهده همه {toPersianNumber(filteredReviews.length)} نظر
                  <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
