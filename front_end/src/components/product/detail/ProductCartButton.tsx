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
        "flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-voxcina-cream px-5 py-3 text-voxcina-blue transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-voxcina-cream disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none",
        className
      )}
    >
      <span className="flex flex-1 items-center justify-center gap-2 text-xs font-bold sm:text-sm">
        {isAdding && <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {isAdding ? "در حال افزودن…" : label}
      </span>
      <span className="flex shrink-0 items-baseline gap-1.5 border-r border-voxcina-blue/25 pr-4">
        <span className="text-sm font-bold tabular-nums">{toPersianNumber(total.toLocaleString("en-US"))}</span>
        <span className="text-[10px]">تومان</span>
      </span>
    </button>
  );
}
