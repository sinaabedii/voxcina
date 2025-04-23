"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StarRatingProps {
  initialRating?: number;
  totalStars?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  initialRating = 0,
  totalStars = 5,
  onChange,
  readonly = false,
  size = "md",
  className,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (newRating: number) => {
    if (readonly) return;

    setRating(newRating);
    if (onChange) {
      onChange(newRating);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (readonly) return;
    setHoverRating(starIndex);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverRating
          ? starValue <= hoverRating
          : starValue <= rating;

        return (
          <motion.div
            key={index}
            whileHover={{ scale: readonly ? 1 : 1.2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Star
              className={cn(
                starSizes[size],
                "transition-all",
                isFilled
                  ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                  : "text-gray-300 dark:text-gray-600",
                !readonly && "cursor-pointer"
              )}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
            />
          </motion.div>
        );
      })}
      {!readonly && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
          {hoverRating > 0 ? hoverRating : rating} از {totalStars}
        </span>
      )}
    </div>
  );
};

export default StarRating;
