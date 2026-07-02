"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Package,
  MapPin,
  ShoppingCart,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";

export default function DashboardPage() {
  const { user, getProfile, isLoading: userLoading } = useAuthStore();
  const { cart, syncCartWithBackend, isLoading: cartLoading } = useCartStore();
  const { orders, fetchUserOrders } = useDashboardStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        await getProfile();
        await fetchUserOrders();
        await syncCartWithBackend();
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
    cartItems: cart.items.length,
  };

  const recentOrders = [...orders]
    .sort((a: any, b: any) => {
      const da = new Date(a.created_at || a.createdAt || a.date || 0).getTime();
      const db = new Date(b.created_at || b.createdAt || b.date || 0).getTime();
      return db - da;
    })
    .slice(0, 5);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-voxcina-blue dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
      case "shipping":
        return "bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream border border-voxcina-blue/20 dark:border-voxcina-blue/30";
      case "processing":
        return "bg-amber-100 text-voxcina-blue dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30";
      default:
        return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
    }
  };

  if (loading || userLoading || cartLoading) {
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
            className="bg-gradient-to-r from-voxcina-cream to-voxcina-lightCream dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-6 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm backdrop-blur-sm"
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
                <h2 className="text-xl font-bold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  سلام {user?.name || "کاربر عزیز"}!
                </h2>
                <p className="text-voxcina-blue/80 dark:text-voxcina-cream/90">
                  به داشبورد شخصی خود خوش آمدید. از اینجا می‌توانید سفارش‌ها،
                  آدرس‌ها و تنظیمات حساب خود را مدیریت کنید.
                </p>
                <motion.div
                  className="flex gap-2 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    مشاهده سفارش‌ها
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <Package className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  سفارش‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{stats.totalOrders}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    {stats.pendingOrders} سفارش در انتظار ارسال
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                    <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <MapPin className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  آدرس‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{stats.savedAddresses}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    آدرس ذخیره شده
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                    <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <ShoppingCart className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  سبد خرید
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{stats.cartItems}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    محصول در سبد خرید
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                    <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <Calendar className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  تحویل شده‌ها
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
                    <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
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

        {recentOrders.length > 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
                <table className="w-full">
                  <thead className="bg-voxcina-cream/50 dark:bg-voxcina-blue/20">
                    <tr>
                      <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                        شماره سفارش
                      </th>
                      <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                        تاریخ
                      </th>
                      <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                        وضعیت
                      </th>
                      <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                        مبلغ
                      </th>
                      <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                     {recentOrders.map((order, index) => (
                      <motion.tr
                        key={order.id}
                        className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(244, 241, 236, 0.3)' }}
                      >
                        <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">{order.order_number || order.id}</td>
                        <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.jalali_created_at || order.jalaliCreatedAt || order.date || order.created_at || order.createdAt}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status_text || order.statusText}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
                          {formatPrice(order.total_amount ?? order.totalAmount ?? order.total ?? 0)} تومان
                        </td>
                        <td className="p-4 text-left">
                          <motion.button 
                            className="p-2 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/30 rounded-full transition-colors text-voxcina-blue/60 dark:text-voxcina-cream/60"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                  <AlertCircle className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">سفارشی یافت نشد</h3>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  هنوز هیچ سفارشی ثبت نکرده‌اید
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, boxShadow: "0 10px 25px rgba(26, 60, 105, 0.2)" }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-white border-0 shadow-md overflow-hidden rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2">
                    از تخفیف‌های ویژه بهره‌مند شوید!
                  </h3>
                  <p className="text-white/80 mb-4">
                    با تکمیل اطلاعات پروفایل خود، از تخفیف‌های اختصاصی استفاده
                    کنید.
                  </p>
                  <Button
                    className="bg-white text-voxcina-blue hover:bg-voxcina-cream rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                    size="sm"
                  >
                    تکمیل پروفایل
                  </Button>
                </div>
                <div className="hidden md:block">
                  <svg
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-20"
                  >
                    <path
                      d="M21.41 11.58L12.41 2.58C12.05 2.22 11.55 2 11 2H4C2.9 2 2 2.9 2 4V11C2 11.55 2.22 12.05 2.59 12.42L11.59 21.42C11.95 21.78 12.45 22 13 22C13.55 22 14.05 21.78 14.41 21.41L21.41 14.41C21.78 14.05 22 13.55 22 13C22 12.45 21.77 11.94 21.41 11.58ZM13 20.01L4 11V4H11V3.99L20 12.99L13 20.01Z"
                      fill="currentColor"
                    />
                    <path
                      d="M6.5 8C7.33 8 8 7.33 8 6.5C8 5.67 7.33 5 6.5 5C5.67 5 5 5.67 5 6.5C5 7.33 5.67 8 6.5 8Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}