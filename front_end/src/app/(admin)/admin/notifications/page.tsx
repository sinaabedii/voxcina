"use client";

import { useState } from "react";
import ComposePanel from "./_components/ComposePanel";
import CampaignsPanel from "./_components/CampaignsPanel";
import TemplatesPanel from "./_components/TemplatesPanel";
import { AdminPageHeader } from "@/components/admin/ui";
import { Bell, Megaphone, Send, FileText } from "lucide-react";

/**
 * Notifications admin — compose + audience preview, campaign history, and the
 * copy templates the event-driven notifications render from.
 *
 * One route because the three are one job: staff write the copy (templates),
 * point it at people (compose, with the count shown before the send), and then
 * watch the funnel (history). The Go side is admin-only; the sidebar already
 * hides this from the staff role.
 */

const TABS = [
  {
    id: "compose" as const,
    label: "ارسال",
    icon: Send,
    description: "نوشتن اعلان، انتخاب مخاطبان و دیدن تعداد آن‌ها پیش از ارسال",
  },
  {
    id: "campaigns" as const,
    label: "کمپین‌ها",
    icon: Megaphone,
    description: "تاریخچه ارسال‌ها با قیف مخاطب ← فن‌اوت ← پوش ← تحویل ← خوانده‌شده",
  },
  {
    id: "templates" as const,
    label: "قالب‌ها",
    icon: FileText,
    description: "متن اعلان‌های خودکار (سفارش، پرداخت، تیکت و …) — بدون نیاز به دیپلوی تغییر می‌کند",
  },
];

type TabId = (typeof TABS)[number]["id"];

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("compose");
  const [refreshKey, setRefreshKey] = useState(0);
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div>
      <AdminPageHeader
        title="اعلان‌ها"
        subtitle={active.description}
        icon={<Bell className="h-6 w-6" />}
      />

      <div
        role="tablist"
        aria-label="بخش‌های اعلان‌ها"
        className="flex w-full max-w-md rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/20 p-1 mb-4"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`notifications-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`notifications-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 ${
              activeTab === tab.id
                ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                : "text-voxcina-blue/60 hover:bg-voxcina-cream/50 dark:text-voxcina-cream/60 dark:hover:bg-voxcina-blue/30"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`notifications-panel-${activeTab}`}
        aria-labelledby={`notifications-tab-${activeTab}`}
      >
        {activeTab === "compose" && (
          <ComposePanel onSent={() => setRefreshKey((key) => key + 1)} />
        )}
        {activeTab === "campaigns" && <CampaignsPanel refreshKey={refreshKey} />}
        {activeTab === "templates" && <TemplatesPanel />}
      </div>
    </div>
  );
}
