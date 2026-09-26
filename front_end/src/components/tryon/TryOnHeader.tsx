"use client";

import { motion } from "framer-motion";
import { Sparkles, Shirt } from "lucide-react";
import { toPersianNumber } from "@/lib/utils";

interface TryOnHeaderProps {
  eligibleCount: number;
}

export default function TryOnHeader({ eligibleCount }: TryOnHeaderProps) {
  return (
    <motion.div
      className="mb-4 flex-shrink-0"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-voxcina-blue dark:bg-voxcina-cream/10 text-voxcina-cream dark:text-voxcina-cream flex items-center justify-center shadow-inset-button flex-shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse-soft" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-voxcina-blue dark:text-voxcina-cream tracking-tight">
                اتاق پرو مجازی و استایلینگ
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream border border-voxcina-blue/15 dark:border-voxcina-cream/15">
                هوش مصنوعی وکسینا
              </span>
            </div>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-0.5">
              لباس‌های انتخابی را روی عکس خود امتحان کنید و با ووکسا در انتخاب استایل مناسب مشورت کنید
            </p>
          </div>
        </div>

        {eligibleCount > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary-200/70 dark:bg-voxcina-blue/20 border border-secondary-300 dark:border-voxcina-blue/30 text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80">
            <Shirt className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream" />
            <span>{toPersianNumber(eligibleCount)} لباس آماده پرو در سبد</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
