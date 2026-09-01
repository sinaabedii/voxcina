"use client";

import { useState } from "react";
import { Briefcase, Inbox } from "lucide-react";
import SubmissionsPanel from "./_components/SubmissionsPanel";
import PositionsPanel from "./_components/PositionsPanel";

/**
 * Careers admin — the inbox of incoming requests and the openings that feed
 * the public page, side by side.
 *
 * They live under one route because they are two halves of the same job: an
 * admin publishes a position and then works through what it brings in. Each
 * panel owns its own store, filters and paging, so switching tabs never makes
 * the other one refetch.
 */

const TABS = [
  {
    id: "submissions" as const,
    label: "درخواست‌ها",
    icon: Inbox,
    description:
      "درخواست‌های ثبت‌شده از صفحه «همکاری با ما» — مشاهده اطلاعات و دانلود رزومه",
  },
  {
    id: "positions" as const,
    label: "موقعیت‌های شغلی",
    icon: Briefcase,
    description:
      "موقعیت‌های باز که در صفحه «همکاری با ما» نمایش داده می‌شوند و متقاضی یکی از آن‌ها را انتخاب می‌کند",
  },
];

type TabId = (typeof TABS)[number]["id"];

export default function AdminCareersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("submissions");
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
          <Briefcase className="h-6 w-6" />
          همکاری و استخدام
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {active.description}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="بخش‌های همکاری و استخدام"
        className="flex w-full max-w-md rounded-xl border border-border bg-background p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`careers-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`careers-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Only the visible panel is mounted: each fetches on mount, and there is
          no reason to load the openings while the admin is reading the inbox. */}
      <div
        role="tabpanel"
        id={`careers-panel-${activeTab}`}
        aria-labelledby={`careers-tab-${activeTab}`}
      >
        {activeTab === "submissions" ? <SubmissionsPanel /> : <PositionsPanel />}
      </div>
    </div>
  );
}
