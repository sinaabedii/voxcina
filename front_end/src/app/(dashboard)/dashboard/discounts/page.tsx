"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Tag, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { VoucherCard } from "@/components/discounts/VoucherCard";
import { UserVoucher } from "@/types/discount";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

type FilterTab = "all" | "negotiated" | "targeted";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function DiscountsPage() {
  useProtectedRoute({ requiredAuth: true, requiredRole: "customer" });

  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/users/vouchers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("خطا در دریافت تخفیف‌ها");
      }
      const data = await res.json();
      setVouchers(data);
    } catch {
      setError("خطا در بارگذاری تخفیف‌های شما");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "همه", icon: <Ticket className="w-4 h-4" /> },
    {
      key: "targeted",
      label: "کدهای تخفیف",
      icon: <Tag className="w-4 h-4" />,
    },
    {
      key: "negotiated",
      label: "کوپن‌های مذاکره‌ای",
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  const filtered =
    activeTab === "all"
      ? vouchers
      : vouchers.filter((v) => v.type === activeTab);

  const negotiatedCount = vouchers.filter(
    (v) => v.type === "negotiated"
  ).length;
  const targetedCount = vouchers.filter((v) => v.type === "targeted").length;

  return (
    <div className="container py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-l from-voxcina-blue to-voxcina-darkBlue dark:from-secondary-200 dark:to-voxcina-cream bg-clip-text text-transparent">
            تخفیف‌های من
          </h1>
        </div>
        <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60 text-sm mt-1">
          کدهای تخفیف اختصاصی و کوپن‌های اتاق پرو شما
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-6"
      >
        <div className="inline-flex items-center bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl p-1 gap-1">
          {tabs.map((tab) => {
            const count =
              tab.key === "negotiated"
                ? negotiatedCount
                : tab.key === "targeted"
                ? targetedCount
                : vouchers.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-voxcina-blue/40 text-voxcina-blue dark:text-voxcina-cream shadow-sm"
                    : "text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/30"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream"
                      : "bg-voxcina-blue/5 dark:bg-voxcina-cream/5 text-voxcina-blue/40 dark:text-voxcina-cream/40"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <Card
              key={i}
              className="overflow-hidden border-2 border-voxcina-cream/50 dark:border-voxcina-blue/20"
            >
              <div className="h-20 bg-gradient-to-l from-voxcina-cream/50 to-voxcina-cream/30 dark:from-voxcina-blue/20 dark:to-voxcina-blue/10 animate-pulse" />
              <div className="p-5 space-y-4">
                <div className="h-10 bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl animate-pulse" />
                <div className="h-8 bg-secondary-50 dark:bg-voxcina-blue/10 rounded-lg animate-pulse w-1/3" />
                <div className="flex gap-3">
                  <div className="w-20 h-16 bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl animate-pulse" />
                  <div className="w-20 h-16 bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <Card className="p-8 text-center border-2 border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              خطا در بارگذاری
            </h3>
            <p className="text-sm text-red-500/80 dark:text-red-400/80 mb-4">
              {error}
            </p>
            <button
              onClick={fetchVouchers}
              className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              تلاش مجدد
            </button>
          </Card>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md mx-auto"
        >
          <Card className="p-10 text-center border-2 border-voxcina-cream/50 dark:border-voxcina-blue/20">
            <div className="w-16 h-16 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex items-center justify-center mx-auto mb-5">
              <Ticket className="w-8 h-8 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
            </div>
            <h3 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-2">
              {activeTab === "all"
                ? "تخفیفی ندارید"
                : activeTab === "negotiated"
                ? "کوپن مذاکره‌ای ندارید"
                : "کد تخفیفی ندارید"}
            </h3>
            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed">
              {activeTab === "negotiated"
                ? "با استفاده از اتاق پرو مجازی و مذاکره با فروشنده، می‌توانید کد تخفیف اختصاصی دریافت کنید."
                : activeTab === "targeted"
                ? "کدهای تخفیف ویژه برای شما به زودی فعال خواهد شد."
                : "در حال حاضر هیچ تخفیف فعالی برای شما وجود ندارد. با استفاده از اتاق پرو مجازی می‌توانید کد تخفیف دریافت کنید."}
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filtered.map((voucher, index) => (
            <VoucherCard key={voucher.id} voucher={voucher} index={index} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
