"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EligibilityNoticeProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Replaces the inline amber warning in checkout/page.tsx. Same wording, calmer styling. */
export default function EligibilityNotice({
  title = "لطفا آدرس تحویل را انتخاب کنید",
  description = "برای ادامه فرآیند خرید، لازم است یک آدرس تحویل انتخاب نمایید.",
  className,
}: EligibilityNoticeProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm",
        "dark:border-amber-800/50 dark:bg-amber-900/20",
        "animate-fade-in",
        className
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
        <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
      </span>
      <div className="min-w-0">
        <h3 className="font-medium text-amber-800 dark:text-amber-400">{title}</h3>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">{description}</p>
      </div>
    </div>
  );
}
