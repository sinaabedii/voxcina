"use client";

import { RotateCcw, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  onNewRoom: () => void;
}

/** Who the customer is talking to, and the way out to a fresh fitting room. */
export default function ChatHeader({ onNewRoom }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 mb-2 border-b border-secondary-300 dark:border-voxcina-blue/25 flex-shrink-0 w-full">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-voxcina-blue dark:bg-voxcina-cream text-voxcina-cream dark:text-voxcina-blue flex items-center justify-center shadow-inset-button">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
              ووکسا
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary-200 dark:bg-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
              آنلاین
            </span>
          </div>
          <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 block">
            استایلیست و مشاور مد هوشمند وکسینا
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewRoom}
        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:text-voxcina-blue dark:hover:text-voxcina-cream bg-secondary-200/80 hover:bg-secondary-300/80 dark:bg-voxcina-blue/30 dark:hover:bg-voxcina-blue/50 rounded-xl transition-all"
        title="شروع یک اتاق پرو جدید"
      >
        <RotateCcw className="h-3 w-3" />
        <span>اتاق جدید</span>
      </button>
    </div>
  );
}
