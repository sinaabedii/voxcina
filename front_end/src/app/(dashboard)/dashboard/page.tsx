"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Package,
  MapPin,
  Calendar,
  Clock,
  ChevronLeft,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/store/dashboard-store";
import RecentOrders from "@/components/dashboard/RecentOrders";
import ProfileSection from "@/components/dashboard/ProfileSection";

export default function DashboardPage() {
  const { user, getProfile, isLoading: userLoading } = useAuthStore();
  const { orders, fetchUserOrders } = useDashboardStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        await getProfile();
        await fetchUserOrders();
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === "pending" || o.status === "processing" || o.status === "shipping").length,
    completedOrders: orders.filter(o => o.status === "delivered").length,
    savedAddresses: user?.addresses?.length || 0,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 9000);

    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  if (loading || userLoading) {
    return <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 text-center text-lg">در حال بارگذاری...</div>;
  }

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">داشبورد شخصی</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      {showWelcome && (
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="bg-gradient-to-r from-voxcina-cream to-voxcina-lightCream dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-4 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm backdrop-blur-sm"
            animate={{
              boxShadow: [
                "0 4px 12px rgba(26, 60, 105, 0.1)",
                "0 4px 20px rgba(26, 60, 105, 0.15)",
                "0 4px 12px rgba(26, 60, 105, 0.1)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1 text-voxcina-blue dark:text-voxcina-cream">
                  سلام {user?.name?.split(" ")[0] || "کاربر"} عزیز!
                </h2>
                <p className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/90">
                  به داشبورد شخصی خود خوش آمدید. از اینجا میتوانید سفارشها،
                  آدرسها و تنظیمات حساب خود را مدیریت کنید.
                </p>
                <motion.div
                  className="flex gap-2 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    مشاهده سفارشها
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    خرید جدید
                  </Button>
                </motion.div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-x"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        </motion.section>
      )}

      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ProfileSection />
      </motion.section>

      <motion.section
        className="mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          className="text-xl font-semibold mb-4 flex items-center text-voxcina-blue dark:text-voxcina-cream"
          variants={itemVariants}
        >
          <BadgeCheck className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
          آمار کلی
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Link href="/dashboard/orders" className="block" aria-label="مشاهده سفارشها">
              <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 hover:border-voxcina-blue/20 dark:hover:border-voxcina-cream/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                    <Package className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                    سفارشها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{stats.totalOrders}</div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                      {stats.pendingOrders} سفارش در انتظار ارسال
                    </p>
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Link href="/dashboard/addresses" className="block" aria-label="مدیریت آدرسها">
              <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 hover:border-voxcina-blue/20 dark:hover:border-voxcina-cream/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                    <MapPin className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                    آدرسها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{stats.savedAddresses}</div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                      آدرس ذخیره شده
                    </p>
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Link href="/dashboard/orders?status=delivered" className="block" aria-label="مشاهده سفارشهای تحویل شده">
              <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 hover:border-voxcina-blue/20 dark:hover:border-voxcina-cream/20 cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                    <Calendar className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                    تحویل شدهها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">
                    {stats.completedOrders}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                      سفارش تکمیل شده
                    </p>
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-4">
          <h2 className="text-xl font-semibold flex items-center text-voxcina-blue dark:text-voxcina-cream">
            <Clock className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
            سفارشهای اخیر
          </h2>
        </motion.div>

        <motion.div variants={itemVariants}>
          <RecentOrders orders={orders} />
        </motion.div>
      </motion.section>

    </div>
  );
}
