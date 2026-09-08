"use client";

import Link from "next/link";
import { ChevronLeft, Loader2, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type AdminStatTone = "default" | "amber" | "green" | "blue" | "red" | "violet";

const TONE: Record<AdminStatTone, { card: string; label: string; value: string; icon: string }> = {
  default: {
    card: "border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10",
    label: "text-voxcina-blue/70 dark:text-voxcina-cream/70",
    value: "text-voxcina-blue dark:text-voxcina-cream",
    icon: "bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream",
  },
  amber: {
    card: "border-amber-200 dark:border-amber-800/30 bg-amber-50/90 dark:bg-amber-900/10",
    label: "text-amber-700 dark:text-amber-400",
    value: "text-amber-800 dark:text-amber-300",
    icon: "bg-amber-200/50 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400",
  },
  green: {
    card: "border-green-200 dark:border-green-800/30 bg-green-50/90 dark:bg-green-900/10",
    label: "text-green-700 dark:text-green-400",
    value: "text-green-800 dark:text-green-300",
    icon: "bg-green-200/50 dark:bg-green-800/30 text-green-700 dark:text-green-400",
  },
  blue: {
    card: "border-blue-200 dark:border-blue-800/30 bg-blue-50/90 dark:bg-blue-900/10",
    label: "text-blue-700 dark:text-blue-400",
    value: "text-blue-800 dark:text-blue-300",
    icon: "bg-blue-200/50 dark:bg-blue-800/30 text-blue-700 dark:text-blue-400",
  },
  red: {
    card: "border-red-200 dark:border-red-800/30 bg-red-50/90 dark:bg-red-900/10",
    label: "text-red-700 dark:text-red-400",
    value: "text-red-800 dark:text-red-300",
    icon: "bg-red-200/50 dark:bg-red-800/30 text-red-700 dark:text-red-400",
  },
  violet: {
    card: "border-purple-200 dark:border-purple-800/30 bg-purple-50/90 dark:bg-purple-900/10",
    label: "text-purple-700 dark:text-purple-400",
    value: "text-purple-800 dark:text-purple-300",
    icon: "bg-purple-200/50 dark:bg-purple-800/30 text-purple-700 dark:text-purple-400",
  },
};

/**
 * Standard admin statistic card: icon tile + label + value.
 */
export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  isLoading = false,
  href,
  hint,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: AdminStatTone;
  isLoading?: boolean;
  /** Makes the whole card a link with a chevron affordance. */
  href?: string;
  hint?: string;
  className?: string;
}) {
  const t = TONE[tone];
  const body = (
    <CardContent className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("text-sm", t.label)}>{label}</p>
          <p className={cn("text-2xl font-bold mt-1", t.value)}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
          </p>
          {hint && <p className={cn("text-xs mt-1 opacity-70", t.label)}>{hint}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {href && <ChevronLeft className={cn("h-5 w-5 opacity-50")} />}
          <div className={cn("p-3 rounded-xl", t.icon)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className="block h-full">
        <Card className={cn("border shadow-sm hover:shadow-md rounded-2xl h-full transition-all", t.card, className)}>
          {body}
        </Card>
      </Link>
    );
  }
  return (
    <Card className={cn("border shadow-sm rounded-2xl", t.card, className)}>
      {body}
    </Card>
  );
}
