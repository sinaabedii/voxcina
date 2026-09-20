"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageLoading } from "@/components/ui/Loading";
import { useAuthStore } from "@/store/auth-store";
import ProfileSection from "@/components/dashboard/ProfileSection";
import SecuritySection from "@/components/dashboard/settings/SecuritySection";
import SettingsTabs, { type SettingsTab } from "@/components/dashboard/settings/SettingsTabs";
import PageTitle from "@/components/dashboard/ui/PageTitle";
import { fadeSlideVariants } from "@/lib/motion";

export default function SettingsPage() {
  const { user, getProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(!user);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .catch(() => {
        // Errors are surfaced by the auth store toast.
      })
      .finally(() => {
        if (!cancelled) setIsProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getProfile]);

  return (
    <div className="container mx-auto px-4 py-8 transition-all duration-500 ease-in-out md:px-8 md:py-12">
      <PageTitle title="تنظیمات حساب کاربری" className="mb-8" />

      {isProfileLoading ? (
        <PageLoading text="در حال بارگذاری تنظیمات..." />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <div
            className="md:col-span-3"
            role="tabpanel"
            id={`settings-panel-${activeTab}`}
            aria-labelledby={`settings-tab-${activeTab}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={fadeSlideVariants}
              >
                {activeTab === "profile" ? <ProfileSection /> : <SecuritySection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
