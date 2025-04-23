"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import { Review } from "@/types/product";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { useAuthStore } from "@/store/auth-store";
import { useReviewStore } from "@/store/review-store";
import { cn } from "@/lib/utils";

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

  const sortedReviews = [...reviews]
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
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
    <div className="mt-10 pt-10 border-t">
      <h2 className="text-2xl font-bold mb-6">نظرات و امتیازها</h2>

      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="text-center md:border-l md:pl-8">
            <div className="text-4xl font-bold mb-2">
              {avgRating.toFixed(1)}
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
            <h3 className="text-lg font-medium mb-4">توزیع امتیازها</h3>
            <div className="space-y-2">
              {ratingStats.map((stat) => (
                <div key={stat.stars} className="flex items-center">
                  <div className="w-16 text-sm">{stat.stars} ستاره</div>
                  <div className="flex-grow mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
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
          >
            <MessageCircle className="ml-2 h-4 w-4" />
            نوشتن نظر
          </Button>
          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground mt-2">
              برای نوشتن نظر، لطفاً ابتدا وارد حساب کاربری خود شوید.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">نظر خود را بنویسید</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                امتیاز شما
              </label>
              <StarRating
                initialRating={newReview.rating}
                onChange={(rating) => setNewReview({ ...newReview, rating })}
                size="lg"
              />
              {errors.rating && (
                <p className="text-xs text-destructive mt-1">{errors.rating}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                عنوان نظر
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-input px-3 py-2"
                placeholder="یک عنوان مختصر برای نظر خود بنویسید"
                value={newReview.title}
                onChange={(e) =>
                  setNewReview({ ...newReview, title: e.target.value })
                }
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">متن نظر</label>
              <textarea
                className="w-full rounded-md border border-input px-3 py-2 min-h-[100px]"
                placeholder="تجربه خود از این محصول را به اشتراک بگذارید..."
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview({ ...newReview, comment: e.target.value })
                }
              />
              {errors.comment && (
                <p className="text-xs text-destructive mt-1">
                  {errors.comment}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                آیا این محصول را پیشنهاد می‌کنید؟
              </label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="ml-2"
                    checked={newReview.isRecommended === true}
                    onChange={() =>
                      setNewReview({ ...newReview, isRecommended: true })
                    }
                  />
                  بله
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="ml-2"
                    checked={newReview.isRecommended === false}
                    onChange={() =>
                      setNewReview({ ...newReview, isRecommended: false })
                    }
                  />
                  خیر
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button
                variant="outline"
                onClick={() => setIsWritingReview(false)}
              >
                انصراف
              </Button>
              <Button variant="primary" onClick={handleAddReview}>
                ثبت نظر
              </Button>
            </div>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div className="flex items-center mb-2 sm:mb-0">
            <label className="text-sm ml-2">مرتب‌سازی:</label>
            <select
              className="border rounded-md py-1 px-2 text-sm"
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
              className="ml-2"
              checked={showOnlyWithImages}
              onChange={(e) => setShowOnlyWithImages(e.target.checked)}
            />
            <label
              htmlFor="show-with-images"
              className="text-sm flex items-center"
            >
              <ImageIcon className="ml-1 w-4 h-4" />
              فقط نظرات دارای تصویر
            </label>
          </div>
        </div>
      )}

      {sortedReviews.length === 0 ? (
        <div className="text-center py-10 bg-muted/20 rounded-lg">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
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
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    {review.userAvatar ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={review.userAvatar}
                          alt={review.userName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ml-3">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium flex items-center">
                        {review.userName}
                        {review.verified && (
                          <CheckCircle2 className="text-green-500 w-4 h-4 mr-1" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(review.date).toLocaleDateString("fa-IR")}
                      </div>
                    </div>
                  </div>
                  <StarRating
                    initialRating={review.rating}
                    readonly
                    size="sm"
                  />
                </div>

                <h4 className="font-medium mt-4">{review.title}</h4>

                <div className="mt-2 text-gray-700">
                  {isLongComment && !isExpanded ? (
                    <>
                      {review.comment.slice(0, 300)}...
                      <button
                        className="text-primary text-sm mr-1 hover:underline"
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
                          className="text-primary text-sm block mt-2 hover:underline"
                          onClick={() => toggleExpandReview(review.id)}
                        >
                          نمایش کمتر
                        </button>
                      )}
                    </>
                  )}
                </div>

                {review.images && review.images.length > 0 && (
                  <div className="mt-4 flex space-x-2 space-x-reverse overflow-x-auto py-2">
                    {review.images.map((img, index) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 flex-shrink-0"
                      >
                        <Image
                          src={img}
                          alt={`تصویر ${index + 1}`}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {review.isRecommended !== undefined && (
                  <div
                    className={cn(
                      "mt-4 text-sm",
                      review.isRecommended ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {review.isRecommended
                      ? "پیشنهاد می‌کنم"
                      : "پیشنهاد نمی‌کنم"}
                  </div>
                )}

                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <button
                    className={cn(
                      "flex items-center hover:text-foreground ml-4 transition-colors",
                      isAuthenticated && !userAction && "cursor-pointer",
                      userAction === "like" && "text-green-600",
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
                  </button>
                  <button
                    className={cn(
                      "flex items-center hover:text-foreground transition-colors",
                      isAuthenticated && !userAction && "cursor-pointer",
                      userAction === "dislike" && "text-red-600",
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
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
