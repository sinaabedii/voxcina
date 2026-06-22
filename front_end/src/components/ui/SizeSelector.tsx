"use client";

import React from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
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
  showClearButton = false,
  onClear,
  className,
}) => {
  const isAvailable = (size: string) => {
    if (!availableSizes) return true;
    return availableSizes.includes(size);
  };

  return (
    <div className={cn("mb-6", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-foreground">{label}</h3>
          <div className="flex items-center gap-4">
            {showSizeGuide && onSizeGuideClick && (
              <button
                type="button"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={onSizeGuideClick}
              >
                راهنمای سایز
              </button>
            )}
            {showClearButton && selectedSize && onClear && (
              <button
                type="button"
                className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center"
                onClick={onClear}
              >
                <X className="h-3 w-3 ml-1" />
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
                "px-4 py-2 border rounded-lg text-sm transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-soft"
                  : available
                    ? "border-border/30 text-foreground hover:border-primary/50"
                    : "border-border/20 text-muted-foreground opacity-60 cursor-not-allowed"
              )}
              onClick={() => available && onSizeChange(isSelected ? undefined : size)}
              whileHover={available ? { y: -2 } : {}}
              whileTap={available ? { scale: 0.97 } : {}}
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
