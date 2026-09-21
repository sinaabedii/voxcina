"use client";

import { cn } from "@/lib/utils";

export interface FilterTab<T extends string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  tabs: ReadonlyArray<FilterTab<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}

/**
 * Single-select pill tabs used to filter dashboard lists. Scrolls horizontally
 * on narrow screens instead of wrapping.
 */
export default function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  label,
}: FilterTabsProps<T>) {
  return (
    <div className={cn("overflow-x-auto pb-2", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex min-w-full gap-1 rounded-xl bg-voxcina-cream/30 p-1 dark:bg-voxcina-blue/20 sm:min-w-0"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={cn(
                "min-w-20 whitespace-nowrap rounded-xl px-4 py-2 text-sm transition-all",
                isActive
                  ? "bg-white text-voxcina-blue shadow-soft dark:bg-voxcina-blue/40 dark:text-voxcina-cream"
                  : "text-voxcina-blue/60 hover:bg-white/50 dark:text-voxcina-cream/60 dark:hover:bg-voxcina-blue/30",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
