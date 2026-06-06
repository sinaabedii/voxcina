"use client";

import React from "react";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ColorOption {
  color: string;
  colorName: string;
  swatchImage?: string;
  isAvailable?: boolean;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  selectedColor?: string;
  onColorChange: (color: string | undefined) => void;
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  const lightColors = ['white', 'yellow', 'pink', 'lightblue', 'lightgreen', 'orange', 'cream', 'beige', 'سفید', 'زرد', 'صورتی', 'آبی روشن', 'سبز روشن', 'نارنجی', 'کرم', 'بژ'];
  return lightColors.includes(color.toLowerCase());
};

const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  selectedColor,
  onColorChange,
  label = "رنگ",
  showLabel = true,
  size = "md",
  className,
}) => {
  const sizeClasses = {
    sm: { outer: "w-8 h-8", inner: "w-6 h-6", icon: "h-3 w-3" },
    md: { outer: "w-10 h-10", inner: "w-8 h-8", icon: "h-4 w-4" },
    lg: { outer: "w-12 h-12", inner: "w-10 h-10", icon: "h-5 w-5" },
  };

  const classes = sizeClasses[size];
  const selectedColorObj = colors.find(c => c.color === selectedColor);

  return (
    <div className={cn("mb-6", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-foreground">{label}</h3>
          <span className="text-xs text-muted-foreground">
            {selectedColorObj?.colorName || "لطفاً رنگ را انتخاب کنید"}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {colors.map((colorObj) => {
          const isAvailable = colorObj.isAvailable !== false;
          const isSelected = selectedColor === colorObj.color;

          return (
            <motion.button
              key={colorObj.color}
              type="button"
              className={cn(
                classes.outer,
                "rounded-full flex items-center justify-center transition-all relative overflow-hidden",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2"
                  : isAvailable
                    ? "ring-1 ring-border/30 hover:ring-primary/50"
                    : "ring-1 ring-border/20 opacity-40 cursor-not-allowed"
              )}
              onClick={() => isAvailable && onColorChange(isSelected ? undefined : colorObj.color)}
              title={`${colorObj.colorName}${!isAvailable ? ' (ناموجود)' : ''}`}
              whileHover={isAvailable ? { scale: 1.1 } : {}}
              whileTap={isAvailable ? { scale: 0.9 } : {}}
              disabled={!isAvailable}
            >
              {colorObj.swatchImage ? (
                <img
                  src={colorObj.swatchImage}
                  alt={colorObj.colorName}
                  className={cn(classes.inner, "rounded-full block object-cover")}
                />
              ) : (
                <span
                  className={cn(classes.inner, "rounded-full block")}
                  style={{ backgroundColor: colorObj.color }}
                />
              )}
              {isSelected && (
                <CheckCircle
                  className={cn(classes.icon, "absolute drop-shadow-md")}
                  style={{
                    color: colorObj.swatchImage
                      ? '#fff'
                      : isLightColor(colorObj.color) ? '#000' : '#fff',
                    filter: colorObj.swatchImage
                      ? 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                      : isLightColor(colorObj.color)
                        ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8))'
                        : 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorSelector;
