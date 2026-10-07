"use client";

import { Loader2 } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";

interface ProductCartButtonProps {
  total: number;
  isAdding: boolean;
  onClick: () => void;
  label?: string;
  tabIndex?: number;
  className?: string;
}

/** A single purchase action: the total and the action stay in one tap target. */
export default function ProductCartButton({
  total,
  isAdding,
  onClick,
  label = "افزودن به سبد خرید",
  tabIndex,
  className,
}: ProductCartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAdding}
      aria-busy={isAdding}
      tabIndex={tabIndex}
      className={cn(
        "group relative flex min-h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-full border border-white/80 bg-gradient-to-r from-[#FAF6EE] via-voxcina-cream to-[#ECE3D5] px-5 py-3 text-voxcina-blue shadow-[0_10px_25px_-5px_rgba(230,198,135,0.45),0_4px_10px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] transition-all duration-300 hover:from-white hover:to-voxcina-cream hover:shadow-[0_14px_30px_-5px_rgba(230,198,135,0.6),0_6px_14px_rgba(0,0,0,0.15)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-voxcina-cream disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none",
        className
      )}
    >
      {/* Specular glass reflection sheen across top half of pill */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" aria-hidden="true" />

      <span className="relative z-10 flex flex-1 items-center justify-center gap-2 text-sm font-bold sm:text-base">
        {isAdding && <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {isAdding ? "در حال افزودن…" : label}
      </span>
      <span className="relative z-10 flex shrink-0 items-baseline gap-1.5 border-r border-voxcina-blue/20 pr-4">
        <span className="text-sm font-bold tabular-nums sm:text-base">{toPersianNumber(total.toLocaleString("en-US"))}</span>
        <span className="text-xs">تومان</span>
      </span>
    </button>
  );
}
