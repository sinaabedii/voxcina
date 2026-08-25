"use client";

import { Plus, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  onNewRoom: () => void;
}

/** Who the customer is talking to, and the way out to a fresh fitting room. */
export default function ChatHeader({ onNewRoom }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5 flex-shrink-0 w-full justify-between">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
            <Sparkles className="h-4 w-4 text-voxcina-cream" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-voxcina-blue/10" />
        </div>
        <div>
          <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">ووکسا</span>
          <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 block -mt-0.5">فروشنده هوشمند</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onNewRoom}
        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-voxcina-cream bg-voxcina-blue/90 hover:bg-voxcina-blue rounded-lg shadow-inset-button transition-all"
      >
        <Plus className="h-3 w-3" />
        {' جدید'}
      </button>
    </div>
  );
}
