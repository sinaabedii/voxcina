"use client";

import { motion } from "framer-motion";
import { Loader2, Shirt, Sparkles } from "lucide-react";
import { itemVariants } from "@/lib/tryon-motion";
import { cn } from "@/lib/utils";

interface TryOnActionButtonProps {
  /** Name of the garment waiting to be tried on, when one is selected. */
  productName?: string;
  processing: boolean;
  disabled: boolean;
  hasPhoto?: boolean;
  hasSelection?: boolean;
  onClick: () => void;
}

/** The button that sends the selected garment and the photo off to be rendered. */
export default function TryOnActionButton({
  productName,
  processing,
  disabled,
  hasPhoto = true,
  hasSelection = true,
  onClick,
}: TryOnActionButtonProps) {
  let label = "پرو لباس روی عکس من";
  if (processing) {
    label = "در حال پردازش با هوش مصنوعی...";
  } else if (!hasPhoto) {
    label = "ابتدا عکس خود را آپلود کنید";
  } else if (!hasSelection || !productName) {
    label = "یک لباس را از لیست انتخاب کنید";
  } else {
    label = `پرو مجازی — ${productName}`;
  }

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group shadow-soft",
        disabled
          ? "bg-secondary-300/60 dark:bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40 border border-secondary-300 dark:border-voxcina-blue/30 cursor-not-allowed shadow-none"
          : "bg-voxcina-blue text-voxcina-cream dark:bg-voxcina-cream dark:text-voxcina-blue shadow-inset-button hover:opacity-95 active:scale-[0.99] hover:shadow-medium"
      )}
    >
      {processing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-current" />
          <span>{label}</span>
          <span className="text-[10px] opacity-75 hidden sm:inline">(حدود ۳۰ ثانیه)</span>
        </>
      ) : (
        <>
          {!disabled ? (
            <Sparkles className="h-4 w-4 animate-pulse-soft text-amber-300 dark:text-amber-600" />
          ) : (
            <Shirt className="h-4 w-4 opacity-50" />
          )}
          <span className="truncate max-w-[280px]">{label}</span>
        </>
      )}
    </motion.button>
  );
}
