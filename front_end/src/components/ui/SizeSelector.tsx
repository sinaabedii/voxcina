"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  sizes: string[];
  selectedSize?: string;
  onSizeChange: (size: string | undefined) => void;
  availableSizes?: string[];
  label?: string;
  showLabel?: boolean;
  showSizeGuide?: boolean;
  onSizeGuideClick?: () => void;
  sizeGuideLabel?: string;
  showSizeRecommendation?: boolean;
  onSizeRecommendationClick?: () => void;
  showClearButton?: boolean;
  onClear?: () => void;
  className?: string;
}

const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes,
  selectedSize,
  onSizeChange,
  availableSizes,
  label = "سایز",
  showLabel = true,
  showSizeGuide = false,
  onSizeGuideClick,
  sizeGuideLabel = "راهنمای سایز",
  showSizeRecommendation = false,
  onSizeRecommendationClick,
  showClearButton = false,
  onClear,
  className,
}) => {
  // framer-motion animations ignore the CSS `motion-reduce:` escape hatch, so
  // the hover lift/tap squash are switched off for users who opt out federally.
  const reduceMotion = useReducedMotion();
  const isAvailable = (size: string) => {
    if (!availableSizes) return true;
    return availableSizes.includes(size);
  };

  return (
    <div className={cn("mb-6", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-medium text-foreground">{label}</h2>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {showSizeRecommendation && onSizeRecommendationClick && (
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none sm:px-3"
                onClick={onSizeRecommendationClick}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                سایز مناسب من
              </button>
            )}
            {showSizeGuide && onSizeGuideClick && (
              <button
                type="button"
                className="flex min-h-11 items-center rounded-lg px-1 text-xs text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none"
                onClick={onSizeGuideClick}
              >
                {sizeGuideLabel}
              </button>
            )}
            {/* The caller decides when clearing is meaningful (size, colour, or
                both); this row only refuses an entry point it cannot act on. */}
            {showClearButton && onClear && (
              <button
                type="button"
                className="flex min-h-11 items-center rounded-lg px-2 text-xs text-destructive transition-colors hover:text-destructive/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 motion-reduce:transition-none"
                onClick={onClear}
              >
                <X className="h-3 w-3 ml-1" aria-hidden="true" />
                حذف انتخاب
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const available = isAvailable(size);
          const isSelected = selectedSize === size;

          return (
            <motion.button
              key={size}
              type="button"
              className={cn(
                "min-h-11 px-4 py-2 border rounded-lg text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-soft"
                  : available
                    ? "border-border/30 text-foreground hover:border-primary/50 hover:bg-primary/5"
                    : "border-border/20 text-muted-foreground opacity-60 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              onClick={() => available && onSizeChange(isSelected ? undefined : size)}
              data-size-option={size}
              whileHover={available && !reduceMotion ? { y: -2 } : undefined}
              whileTap={available && !reduceMotion ? { scale: 0.97 } : undefined}
              disabled={!available}
            >
              {size}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelector;
