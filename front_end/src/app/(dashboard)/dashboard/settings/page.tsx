"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import ProfileSection from "@/components/dashboard/ProfileSection";
import SecuritySection from "@/components/dashboard/settings/SecuritySection";
import SettingsTabs, { type SettingsTab } from "@/components/dashboard/settings/SettingsTabs";
import FeedbackBanner from "@/components/dashboard/ui/FeedbackBanner";
import { fadeSlideVariants } from "@/lib/motion";

function PageTitle() {
  return (
    <motion.div className="flex justify-between items-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-secondary-200 relative">
        <span className="relative z-10">تنظیمات حساب کاربری</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40" />
      </h1>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[300px] flex items-center justify-center">
      <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/60 dark:bg-voxcina-blue/10 w-full md:max-w-md mx-auto">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft" />
              <div className="absolute inset-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              <User className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
            </div>
            <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">در حال بارگذاری تنظیمات...</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { getProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      await getProfile();
    } catch {
      // handled by auth store toast
    }
  }, [getProfile]);

  useEffect(() => {
    loadProfile();
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  // auto-clear banners
  useEffect(() => {
    if (!successMessage) return;
    const id = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(id);
  }, [successMessage]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <motion.div key="profile" initial="hidden" animate="visible" exit="exit" variants={fadeSlideVariants}>
            <ProfileSection />
          </motion.div>
        );
      case "security":
        return (
          <motion.div key="security" initial="hidden" animate="visible" exit="exit" variants={fadeSlideVariants}>
            <SecuritySection onSuccess={setSuccessMessage} onError={setErrorMessage} />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <PageTitle />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div>
          <AnimatePresence>
            {successMessage && <FeedbackBanner type="success" message={successMessage} />}
            {errorMessage && <FeedbackBanner type="error" message={errorMessage} />}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="md:col-span-3">
              <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
