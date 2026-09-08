"use client";

import { cn } from "@/lib/utils";

export type AdminBadgeTone =
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral"
  | "violet";

const TONE_CLASSES: Record<AdminBadgeTone, string> = {
  success:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
  warning:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30",
  info: "bg-voxcina-blue/10 text-voxcina-blue border-voxcina-blue/20 dark:bg-voxcina-blue/20 dark:text-voxcina-cream dark:border-voxcina-blue/30",
  danger:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30",
  neutral:
    "bg-voxcina-cream/60 text-voxcina-blue border-voxcina-cream dark:bg-voxcina-blue/20 dark:text-voxcina-cream/80 dark:border-voxcina-blue/30",
  violet:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30",
};

/**
 * Standard admin status pill. Pick a semantic tone instead of pasting
 * per-status class strings in every page.
 */
export default function AdminBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: AdminBadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
