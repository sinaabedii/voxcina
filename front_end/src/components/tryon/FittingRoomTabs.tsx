"use client";

import { Shirt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type FittingRoomTab = "products" | "chat";

interface FittingRoomTabsProps {
  value: FittingRoomTab;
  onChange: (tab: FittingRoomTab) => void;
  productCount: number;
}

/** On phones the garments and the conversation take turns filling the screen. */
export default function FittingRoomTabs({ value, onChange, productCount }: FittingRoomTabsProps) {
  const tabs: { id: FittingRoomTab; label: string; icon: typeof Shirt }[] = [
    { id: "products", label: `محصولات (${productCount})`, icon: Shirt },
    { id: "chat", label: "گفتگو با ووکسا", icon: Sparkles },
  ];

  return (
    <div className="lg:hidden flex-shrink-0 mb-3 flex bg-background rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
            value === tab.id
              ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
              : "text-voxcina-blue/60 dark:text-voxcina-cream/60"
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
