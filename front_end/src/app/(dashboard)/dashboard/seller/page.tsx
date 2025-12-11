"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useStoreStore } from "@/store/store-store";
import { useAuthStore } from "@/store/auth-store";

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { sellerDashboard, fetchSellerDashboard, isLoading, myStore } = useStoreStore();

  useEffect(() => {
    if (user?.role !== "seller") {
      router.push("/dashboard/become-seller");
      return;
    }
    fetchSellerDashboard();
  }, [user]);

  if (isLoading || !sellerDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const stats = [
    {
      title: "محصولات فعال",
      value: sellerDashboard.activeProducts,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: "کل سفارشات",
      value: sellerDashboard.totalOrders,
      icon: ShoppingCart,
      color: "bg-green-500",
    },
    {
      title: "سفارشات در انتظار",
      value: sellerDashboard.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "درآمد خالص",
      value: `${sellerDashboard.netRevenue.toLocaleString()} تومان`,
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            تایید شده
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-4 h-4" />
            در انتظار تایید
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            رد شده
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              {myStore?.logo ? (
                <img
                  src={myStore.logo}
                  alt={myStore.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Store className="w-8 h-8" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{myStore?.name}</h1>
              <p className="text-white/80">{myStore?.email}</p>
            </div>
          </div>
          <div className="text-left">
            {getStatusBadge(myStore?.status || "pending")}
            {myStore?.is_verified && (
              <span className="block mt-2 text-sm text-white/80">
                ✓ فروشگاه تایید شده
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
          دسترسی سریع
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push("/dashboard/seller/products")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors text-center"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
              مدیریت محصولات
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/seller/orders")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors text-center"
          >
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
              سفارشات
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/seller/store")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors text-center"
          >
            <Store className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
              تنظیمات فروشگاه
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/seller/products?action=add")}
            className="p-4 rounded-xl border border-dashed border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-center"
          >
            <span className="w-8 h-8 mx-auto mb-2 text-green-500 text-3xl block">+</span>
            <span className="text-sm text-green-600 dark:text-green-400">
              افزودن محصول
            </span>
          </button>
        </div>
      </motion.div>

      {/* Commission Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">
              کمیسیون فروش
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              کمیسیون فعلی شما: {sellerDashboard.commissionRate}% از هر فروش
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
