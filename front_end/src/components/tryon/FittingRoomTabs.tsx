"use client";

import { Shirt, Sparkles } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";

export type FittingRoomTab = "products" | "chat";

interface FittingRoomTabsProps {
  value: FittingRoomTab;
  onChange: (tab: FittingRoomTab) => void;
  productCount: number;
  unreadCount?: number;
}

/** On mobile screens, garments and the conversation take turns filling the viewport. */
export default function FittingRoomTabs({
  value,
  onChange,
  productCount,
  unreadCount = 0,
}: FittingRoomTabsProps) {
  const tabs = [
    {
      id: "products" as const,
      label: "لباس‌های انتخابی",
      badge: toPersianNumber(productCount),
      icon: Shirt,
    },
    {
      id: "chat" as const,
      label: "گفتگو با ووکسا",
      badge: unreadCount > 0 ? toPersianNumber(unreadCount) : undefined,
      icon: Sparkles,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="تب‌های اتاق پرو"
      className="lg:hidden flex-shrink-0 mb-3 flex bg-secondary-200/80 dark:bg-voxcina-blue/20 rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 p-1 shadow-soft"
    >
      {tabs.map((tab) => {
        const isSelected = value === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 relative",
              isSelected
                ? "bg-voxcina-blue text-voxcina-cream dark:bg-voxcina-cream dark:text-voxcina-blue shadow-inset-button font-bold"
                : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold",
                  isSelected
                    ? "bg-white/20 dark:bg-black/20 text-current"
                    : "bg-secondary-300 dark:bg-voxcina-blue/40 text-voxcina-blue dark:text-voxcina-cream"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
