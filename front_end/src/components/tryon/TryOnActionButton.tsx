"use client";

import { motion } from "framer-motion";
import { RefreshCw, Shirt } from "lucide-react";
import { itemVariants } from "@/lib/tryon-motion";
import { cn } from "@/lib/utils";

interface TryOnActionButtonProps {
  /** Name of the garment waiting to be tried on, when one is selected. */
  productName?: string;
  processing: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** The button that sends the selected garment and the photo off to be rendered. */
export default function TryOnActionButton({
  productName,
  processing,
  disabled,
  onClick,
}: TryOnActionButtonProps) {
  return (
    <motion.button
      type="button"
      variants={itemVariants}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300",
        disabled
          ? "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/30 dark:text-voxcina-cream/30 cursor-not-allowed"
          : "bg-voxcina-blue text-voxcina-cream shadow-inset-button hover:opacity-90 active:opacity-80"
      )}
    >
      {processing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          در حال پرو...
        </>
      ) : (
        <>
          <Shirt className="h-4 w-4" />
          {productName ? `پرو کن — ${productName}` : "ابتدا یک لباس انتخاب کنید"}
        </>
      )}
    </motion.button>
  );
}
