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
} from "lucide-react";
import { Review } from "@/types/product";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { useAuthStore } from "@/store/auth-store";
import { useReviewStore } from "@/store/review-store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  avgRating: number;
  onAddReview?: (
    review: Omit<Review, "id" | "date" | "likes" | "dislikes">
  ) => void;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  reviews,
  avgRating,
  onAddReview,
}) => {
  const [isWritingReview, setIsWritingReview] = useState(false);
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

  const sortedReviews = [...reviews]
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
    }
  };

  const handleLikeReview = (reviewId: string) => {
    if (!isAuthenticated || !user) {
      alert("برای لایک کردن نظرات، لطفاً ابتدا وارد حساب کاربری خود شوید.");
      return;
    }

    if (hasUserActedOnReview(reviewId, user.id)) {
      return;
    }

    likeReview(reviewId, user.id);
  };

  const handleDislikeReview = (reviewId: string) => {
    if (!isAuthenticated || !user) {
      alert("برای دیسلایک کردن نظرات، لطفاً ابتدا وارد حساب کاربری خود شوید.");
      return;
    }

    if (hasUserActedOnReview(reviewId, user.id)) {
      return;
    }

    dislikeReview(reviewId, user.id);
  };

  return (
    <div className="mt-10 pt-10 border-t border-border/10 animate-fadeIn">
      <h2 className="text-2xl font-bold mb-6 text-primary flex items-center">
        <MessageCircle className="h-6 w-6 ml-2" />
        نظرات و امتیازها
      </h2>

      <div className="bg-secondary/30 p-6 rounded-xl mb-8 shadow-soft border border-border/5">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="text-center md:border-l md:border-border/10 md:pl-8">
            <div className="text-4xl font-bold mb-2 text-primary flex justify-center items-baseline">
              {avgRating.toFixed(1)}
              <span className="text-lg text-muted-foreground mr-1">از 5</span>
            </div>
            <StarRating
              initialRating={avgRating}
              readonly
              size="lg"
              className="justify-center mb-2"
            />
            <div className="text-sm text-muted-foreground">
              از {reviews.length} نظر
            </div>
          </div>

          <div className="flex-grow">
            <h3 className="text-lg font-medium mb-4 text-primary">توزیع امتیازها</h3>
            <div className="space-y-3">
              {ratingStats.map((stat) => (
                <div key={stat.stars} className="flex items-center">
                  <div className="w-16 text-sm flex items-center">
                    <Star className="text-warning fill-warning h-4 w-4 ml-1" />
                    {stat.stars}
                  </div>
                  <div className="flex-grow mx-4 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full transition-all duration-500"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-right">{stat.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isWritingReview ? (
        <div className="mb-8">
          <Button
            variant="primary"
            onClick={() => setIsWritingReview(true)}
            disabled={!isAuthenticated}
            className="shadow-soft hover:shadow-medium"
          >
            <PenLine className="ml-2 h-4 w-4" />
            نوشتن نظر
          </Button>
          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground mt-2">
              برای نوشتن نظر، لطفاً ابتدا وارد حساب کاربری خود شوید.
            </p>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="voxcina-card p-6 mb-8"
        >
          <h3 className="text-lg font-medium mb-4 text-primary border-r-2 border-primary pr-2">نظر خود را بنویسید</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                امتیاز شما
              </label>
              <StarRating
                initialRating={newReview.rating}
                onChange={(rating) => setNewReview({ ...newReview, rating })}
                size="lg"
              />
              {errors.rating && (
                <p className="text-xs text-destructive mt-1 animate-fadeIn">{errors.rating}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                عنوان نظر
              </label>
              <input
                type="text"
                className="voxcina-input w-full"
                placeholder="یک عنوان مختصر برای نظر خود بنویسید"
                value={newReview.title}
                onChange={(e) =>
                  setNewReview({ ...newReview, title: e.target.value })
                }
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1 animate-fadeIn">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">متن نظر</label>
              <textarea
                className="voxcina-input w-full min-h-[120px] transition-all duration-200"
                placeholder="تجربه خود از این محصول را به اشتراک بگذارید..."
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview({ ...newReview, comment: e.target.value })
                }
              />
              {errors.comment && (
                <p className="text-xs text-destructive mt-1 animate-fadeIn">
                  {errors.comment}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                آیا این محصول را پیشنهاد می‌کنید؟
              </label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    className="ml-2 text-primary focus:ring-primary/50"
                    checked={newReview.isRecommended === true}
                    onChange={() =>
                      setNewReview({ ...newReview, isRecommended: true })
                    }
                  />
                  <span className="group-hover:text-primary transition-colors duration-200">بله</span>
                </label>
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    className="ml-2 text-destructive focus:ring-destructive/50"
                    checked={newReview.isRecommended === false}
                    onChange={() =>
                      setNewReview({ ...newReview, isRecommended: false })
                    }
                  />
                  <span className="group-hover:text-destructive transition-colors duration-200">خیر</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button
                variant="outline"
                onClick={() => setIsWritingReview(false)}
                className="hover:bg-secondary"
              >
                انصراف
              </Button>
              <Button variant="primary" onClick={handleAddReview}>
                ثبت نظر
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {reviews.length > 0 && (
        <div className="flex flex-wrap justify-between items-center mb-6 bg-secondary/20 p-3 rounded-lg">
          <div className="flex items-center mb-2 sm:mb-0">
            <label className="text-sm ml-2 text-foreground">مرتب‌سازی:</label>
            <select
              className="voxcina-input py-1 px-2 text-sm border-border/20"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">جدیدترین</option>
              <option value="highest">بیشترین امتیاز</option>
              <option value="lowest">کمترین امتیاز</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-with-images"
              className="ml-2 text-primary rounded focus:ring-primary/30"
              checked={showOnlyWithImages}
              onChange={(e) => setShowOnlyWithImages(e.target.checked)}
            />
            <label
              htmlFor="show-with-images"
              className="text-sm flex items-center cursor-pointer hover:text-primary transition-colors duration-200"
            >
              <ImageIcon className="ml-1 w-4 h-4" />
              فقط نظرات دارای تصویر
            </label>
          </div>
        </div>
      )}

      {sortedReviews.length === 0 ? (
        <div className="text-center py-10 bg-secondary/20 rounded-xl border border-border/10 shadow-soft">
          <MessageCircle className="mx-auto h-12 w-12 text-primary/50 mb-2" />
          <p className="text-foreground">
            هنوز نظری برای این محصول ثبت نشده است.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            اولین نفری باشید که نظر می‌دهد!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedReviews.map((review) => {
            const isExpanded = expandedReviews[review.id] || false;
            const isLongComment = review.comment.length > 300;

            const userAction = user
              ? hasUserActedOnReview(review.id, user.id)
              : null;

            return (
              <motion.div 
                key={review.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="voxcina-card p-4"
              >
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    {(() => {
                      const displayName = (review.userName as string | undefined) || (review as any).user_name || "?";
                      return review.userAvatar ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 shadow-soft border border-border/10">
                          <Image
                            src={review.userAvatar}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ml-3 shadow-soft">
                          {displayName[0].toUpperCase()}
                        </div>
                      );
                    })()}
                    <div>
                      <div className="font-medium flex items-center text-foreground">
                        {((review.userName as string | undefined) || (review as any).user_name || "کاربر")}
                        {review.verified && (
                          <CheckCircle2 className="text-success w-4 h-4 mr-1" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getDisplayDate(review)}
                      </div>
                    </div>
                  </div>
                  <StarRating
                    initialRating={review.rating}
                    readonly
                    size="sm"
                  />
                </div>

                <h4 className="font-medium mt-4 text-primary">{review.title}</h4>

                <div className="mt-2 text-foreground">
                  {isLongComment && !isExpanded ? (
                    <>
                      {review.comment.slice(0, 300)}...
                      <button
                        className="text-primary text-sm mr-1 hover:text-primary/80 hover:underline transition-colors duration-200"
                        onClick={() => toggleExpandReview(review.id)}
                      >
                        ادامه مطلب
                      </button>
                    </>
                  ) : (
                    <>
                      {review.comment}
                      {isLongComment && isExpanded && (
                        <button
                          className="text-primary text-sm block mt-2 hover:text-primary/80 hover:underline transition-colors duration-200"
                          onClick={() => toggleExpandReview(review.id)}
                        >
                          نمایش کمتر
                        </button>
                      )}
                    </>
                  )}
                </div>

                {review.images && review.images.length > 0 && (
                  <div className="mt-4 flex space-x-2 space-x-reverse overflow-x-auto py-2 custom-scrollbar">
                    {review.images.map((img, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        className="relative w-20 h-20 flex-shrink-0"
                      >
                        <Image
                          src={img}
                          alt={`تصویر ${index + 1}`}
                          fill
                          className="object-cover rounded-md border border-border/10 shadow-soft"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {review.isRecommended !== undefined && (
                  <div
                    className={cn(
                      "mt-4 text-sm font-medium px-2 py-1 rounded-md inline-flex items-center",
                      review.isRecommended 
                        ? "text-success bg-success/10" 
                        : "text-destructive bg-destructive/10"
                    )}
                  >
                    {review.isRecommended
                      ? "پیشنهاد می‌کنم"
                      : "پیشنهاد نمی‌کنم"}
                  </div>
                )}

                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <motion.button
                    whileHover={isAuthenticated && !userAction ? { scale: 1.1 } : {}}
                    whileTap={isAuthenticated && !userAction ? { scale: 0.95 } : {}}
                    className={cn(
                      "flex items-center hover:text-foreground ml-4 transition-all duration-200",
                      isAuthenticated && !userAction && "cursor-pointer",
                      userAction === "like" && "text-success",
                      !isAuthenticated && "opacity-75 cursor-not-allowed"
                    )}
                    onClick={() => handleLikeReview(review.id)}
                    disabled={!isAuthenticated || !!userAction}
                    title={
                      userAction ? "شما قبلاً این نظر را ارزیابی کرده‌اید" : ""
                    }
                  >
                    <ThumbsUp
                      className="w-4 h-4 ml-1"
                      fill={userAction === "like" ? "currentColor" : "none"}
                    />
                    <span>{review.likes}</span>
                  </motion.button>
                  <motion.button
                    whileHover={isAuthenticated && !userAction ? { scale: 1.1 } : {}}
                    whileTap={isAuthenticated && !userAction ? { scale: 0.95 } : {}}
                    className={cn(
                      "flex items-center hover:text-foreground transition-all duration-200",
                      isAuthenticated && !userAction && "cursor-pointer",
                      userAction === "dislike" && "text-destructive",
                      !isAuthenticated && "opacity-75 cursor-not-allowed"
                    )}
                    onClick={() => handleDislikeReview(review.id)}
                    disabled={!isAuthenticated || !!userAction}
                    title={
                      userAction ? "شما قبلاً این نظر را ارزیابی کرده‌اید" : ""
                    }
                  >
                    <ThumbsDown
                      className="w-4 h-4 ml-1"
                      fill={userAction === "dislike" ? "currentColor" : "none"}
                    />
                    <span>{review.dislikes}</span>
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;