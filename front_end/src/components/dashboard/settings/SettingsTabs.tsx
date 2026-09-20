"use client";

import { motion } from "framer-motion";
import { ShieldCheck, User } from "lucide-react";
import DashboardCard from "@/components/dashboard/ui/DashboardCard";

export type SettingsTab = "profile" | "security";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "اطلاعات شخصی", icon: User },
  { id: "security", label: "امنیت و رمز عبور", icon: ShieldCheck },
];

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <DashboardCard hover={false} className="sticky top-24 p-0">
      <ul
        role="tablist"
        aria-label="بخش‌های تنظیمات حساب"
        className="divide-y divide-voxcina-cream/70 dark:divide-voxcina-blue/20"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <li key={tab.id}>
              <motion.button
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`settings-panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex w-full items-center px-4 py-3.5 text-right transition-colors ${
                  isActive
                    ? "bg-voxcina-cream/70 font-medium text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 hover:bg-voxcina-cream/40 dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/10"
                }`}
                whileHover={{ x: isActive ? 0 : 4 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              >
                <span
                  className={`ml-3 flex h-10 w-10 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-white shadow-soft dark:bg-voxcina-blue/40"
                      : "bg-voxcina-cream dark:bg-voxcina-blue/20"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isActive
                        ? "text-voxcina-blue dark:text-voxcina-cream"
                        : "text-voxcina-blue/50 dark:text-voxcina-cream/50"
                    }`}
                  />
                </span>
                {tab.label}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
