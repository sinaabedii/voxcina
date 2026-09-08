"use client";

import { motion } from "framer-motion";
import { User, ShieldCheck } from "lucide-react";

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
    <div className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 sticky top-24 p-0 overflow-hidden">
      <ul className="divide-y divide-secondary-100 dark:divide-voxcina-darkBlue/20">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <li key={tab.id}>
              <motion.button
                className={`w-full flex items-center px-4 py-3.5 text-right ${isActive ? "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 font-medium" : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/10"}`}
                onClick={() => onTabChange(tab.id)}
                whileHover={{ x: isActive ? 0 : 5 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${isActive ? "bg-white dark:bg-voxcina-blue/40 shadow-soft" : "bg-secondary-100 dark:bg-voxcina-blue/20"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-voxcina-blue dark:text-secondary-200" : "text-voxcina-blue/50 dark:text-secondary-300"}`} />
                </div>
                {tab.label}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
