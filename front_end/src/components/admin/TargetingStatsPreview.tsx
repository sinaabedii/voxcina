"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Smartphone,
  ShoppingCart,
  UserX,
  UserPlus,
  BarChart3,
  Loader2,
  Target,
} from "lucide-react";
import { UserTargetingStats } from "@/types/discount";

interface TargetingStatsPreviewProps {
  stats: UserTargetingStats | null;
  filteredCount?: number;
  isLoading?: boolean;
  showFilteredCount?: boolean;
}

const TargetingStatsPreview: React.FC<TargetingStatsPreviewProps> = ({
  stats,
  filteredCount,
  isLoading = false,
  showFilteredCount = true,
}) => {
  if (isLoading) {
    return (
      <div className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-xl bg-white/90 dark:bg-voxcina-blue/10 p-4">
        <div className="flex items-center justify-center gap-2 text-voxcina-blue/60 dark:text-voxcina-cream/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">در حال بارگذاری آمار...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-xl bg-white/90 dark:bg-voxcina-blue/10 p-4">
        <div className="text-center text-voxcina-blue/60 dark:text-voxcina-cream/60 text-sm">
          آماری برای نمایش وجود ندارد
        </div>
      </div>
    );
  }

  const reachPercentage =
    stats.totalUsers > 0 && filteredCount !== undefined
      ? Math.round((filteredCount / stats.totalUsers) * 100)
      : 0;

  const statItems = [
    {
      icon: Users,
      label: "کل کاربران",
      value: stats.totalUsers,
      color: "text-voxcina-blue dark:text-voxcina-cream",
      bgColor: "bg-voxcina-blue/10 dark:bg-voxcina-blue/20",
    },
    {
      icon: Smartphone,
      label: "کاربران اپلیکیشن",
      value: stats.mobileAppUsers,
      percentage: stats.totalUsers > 0 
        ? Math.round((stats.mobileAppUsers / stats.totalUsers) * 100) 
        : 0,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      icon: ShoppingCart,
      label: "با سابقه خرید",
      value: stats.usersWithOrders,
      percentage: stats.totalUsers > 0 
        ? Math.round((stats.usersWithOrders / stats.totalUsers) * 100) 
        : 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      icon: UserPlus,
      label: "خریداران جدید",
      value: stats.firstTimeBuyers,
      percentage: stats.totalUsers > 0 
        ? Math.round((stats.firstTimeBuyers / stats.totalUsers) * 100) 
        : 0,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      icon: UserX,
      label: "غیرفعال (۳۰ روز)",
      value: stats.inactiveUsers,
      percentage: stats.totalUsers > 0 
        ? Math.round((stats.inactiveUsers / stats.totalUsers) * 100) 
        : 0,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-xl bg-white/90 dark:bg-voxcina-blue/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
        <BarChart3 className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
        <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
          پیش‌نمایش آماری
        </span>
      </div>

      {/* Filtered Count - Main Highlight */}
      {showFilteredCount && filteredCount !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-gradient-to-r from-voxcina-blue/5 to-voxcina-blue/10 dark:from-voxcina-blue/20 dark:to-voxcina-blue/30 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-voxcina-blue/10 dark:bg-voxcina-blue/30">
                <Target className="w-6 h-6 text-voxcina-blue dark:text-voxcina-cream" />
              </div>
              <div>
                <div className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  تعداد کاربران هدف
                </div>
                <div className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                  {filteredCount.toLocaleString("fa-IR")}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                درصد پوشش
              </div>
              <div className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                {reachPercentage}%
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${reachPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-voxcina-blue dark:bg-voxcina-cream rounded-full"
            />
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center p-3 rounded-lg bg-voxcina-cream/20 dark:bg-voxcina-blue/20"
            >
              <div className={`p-2 rounded-lg ${item.bgColor} mb-2`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className={`text-lg font-bold ${item.color}`}>
                {item.value.toLocaleString("fa-IR")}
              </div>
              <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 text-center">
                {item.label}
              </div>
              {item.percentage !== undefined && (
                <div className="text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40">
                  ({item.percentage}%)
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TargetingStatsPreview;
