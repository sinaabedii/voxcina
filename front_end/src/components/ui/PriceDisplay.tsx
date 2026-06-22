"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  showDiscount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  showDiscount = true,
  size = "md",
  className,
}) => {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? getDiscountPercentage(originalPrice, price)
    : 0;

  const sizeClasses = {
    sm: {
      price: "text-lg",
      original: "text-sm",
      badge: "text-xs px-1.5 py-0.5",
    },
    md: {
      price: "text-2xl",
      original: "text-lg",
      badge: "text-xs px-2 py-1",
    },
    lg: {
      price: "text-3xl",
      original: "text-xl",
      badge: "text-sm px-2.5 py-1",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("font-bold text-foreground", classes.price)}>
        {formatPrice(price)}
      </span>

      {hasDiscount && (
        <span
          className={cn(
            "text-muted-foreground line-through",
            classes.original
          )}
        >
          {formatPrice(originalPrice)}
        </span>
      )}

      {hasDiscount && showDiscount && (
        <span
          className={cn(
            "bg-destructive/10 text-destructive rounded-lg font-medium",
            classes.badge
          )}
        >
          {discountPercent}٪ تخفیف
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
