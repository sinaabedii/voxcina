"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";
import {
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  Tags,
  DollarSign,
  Star,
  Plus,
  Search,
  Filter,
  FileText,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("all");
  const [showWelcome, setShowWelcome] = useState(true);
  const [statsData, setStatsData] = useState({
    totalProducts: 254,
    totalUsers: 1457,
    totalOrders: 328,
    pendingOrders: 42,
    totalSales: 245000000, // 245,000,000 تومان
    activeDiscounts: 8,
    totalCategories: 32,
    totalBrands: 18,
    pendingReviews: 24,
  });

  const orders = [
    {
      id: "ORD-10235",
      date: "۱۴۰۲/۱۰/۲۱",
      customer: "آرش محمدی",
      status: "pending",
      statusText: "در انتظار تایید",
      amount: 3850000,
    },
    {
      id: "ORD-10234",
      date: "۱۴۰۲/۱۰/۲۱",
      customer: "سارا احمدی",
      status: "processing",
      statusText: "در حال پردازش",
      amount: 1240000,
    },
    {
      id: "ORD-10233",
      date: "۱۴۰۲/۱۰/۲۰",
      customer: "محمد علیزاده",
      status: "shipping",
      statusText: "در حال ارسال",
      amount: 5670000,
    },
    {
      id: "ORD-10232",
      date: "۱۴۰۲/۱۰/۲۰",
      customer: "مریم کریمی",
      status: "delivered",
      statusText: "تحویل شده",
      amount: 2980000,
    },
    {
      id: "ORD-10231",
      date: "۱۴۰۲/۱۰/۱۹",
      customer: "رضا جعفری",
      status: "delivered",
      statusText: "تحویل شده",
      amount: 1750000,
    },
  ];

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((order) => {
          if (activeTab === "pending") return order.status === "pending";
          if (activeTab === "processing") return order.status === "processing";
          if (activeTab === "shipping") return order.status === "shipping";
          if (activeTab === "delivered") return order.status === "delivered";
          return true;
        });

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
      transition: { type: "spring", stiffness: 300, damping: 30 },
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
      case "pending":
        return "bg-red-100 text-voxcina-blue dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/30";
      default:
        return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
    }
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">پنل مدیریت</span>
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
            className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue p-6 rounded-2xl border border-voxcina-cream/10 dark:border-voxcina-blue/20 shadow-sm backdrop-blur-sm text-white"
            animate={{
              boxShadow: [
                "0 4px 12px rgba(26, 60, 105, 0.2)",
                "0 4px 20px rgba(26, 60, 105, 0.3)",
                "0 4px 12px rgba(26, 60, 105, 0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">
                  سلام {user?.name || "مدیر عزیز"}!
                </h2>
                <p className="text-white/90">
                  به پنل مدیریت فروشگاه خوش آمدید. از اینجا می‌توانید فروشگاه، محصولات، سفارش‌ها و سایر بخش‌ها را مدیریت کنید.
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
                    className="rounded-xl border-white/20 text-white hover:bg-white/10"
                  >
                    مشاهده راهنما
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl bg-white hover:bg-voxcina-cream text-voxcina-blue shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    افزودن محصول جدید
                  </Button>
                </motion.div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-white/70 hover:text-white transition-colors"
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
          <BarChart3 className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
          آمار کلی
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <Package className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  محصولات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{statsData.totalProducts}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    محصول در فروشگاه
                  </p>
                  <Link href="/admin/products">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
                  <Users className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  کاربران
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{statsData.totalUsers}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    کاربر ثبت شده
                  </p>
                  <Link href="/admin/users">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
                  سفارش‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{statsData.totalOrders}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    {statsData.pendingOrders} سفارش در انتظار تایید
                  </p>
                  <Link href="/admin/orders">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
                  <DollarSign className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  فروش کل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">
                  {formatPrice(statsData.totalSales)}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    ارزش کل فروش
                  </p>
                  <Link href="/admin/analytics">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
                  <Tags className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  دسته‌بندی‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{statsData.totalCategories}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    دسته‌بندی فعال
                  </p>
                  <Link href="/admin/categories">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
                  <Star className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  نظرات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{statsData.pendingReviews}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    نظر در انتظار تایید
                  </p>
                  <Link href="/admin/reviews">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                    </div>
                  </Link>
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
        <motion.div
          variants={itemVariants}
          className="flex justify-between items-center mb-4"
        >
          <h2 className="text-xl font-semibold flex items-center text-voxcina-blue dark:text-voxcina-cream">
            <Clock className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
            سفارش‌های اخیر
          </h2>
          <div className="flex items-center gap-2">
            <div className="bg-voxcina-cream/50 dark:bg-voxcina-blue/20 rounded-xl p-1 flex shadow-inner-soft backdrop-blur-sm">
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-voxcina-blue/40 shadow-sm text-voxcina-blue dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
                }`}
                onClick={() => setActiveTab("all")}
              >
                همه
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  activeTab === "pending"
                    ? "bg-white dark:bg-voxcina-blue/40 shadow-sm text-voxcina-blue dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
                }`}
                onClick={() => setActiveTab("pending")}
              >
                در انتظار
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  activeTab === "processing"
                    ? "bg-white dark:bg-voxcina-blue/40 shadow-sm text-voxcina-blue dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
                }`}
                onClick={() => setActiveTab("processing")}
              >
                در حال پردازش
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  activeTab === "delivered"
                    ? "bg-white dark:bg-voxcina-blue/40 shadow-sm text-voxcina-blue dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
                }`}
                onClick={() => setActiveTab("delivered")}
              >
                تحویل شده
              </button>
            </div>
            <Link href="/admin/orders">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                مشاهده همه
              </Button>
            </Link>
          </div>
        </motion.div>

        {filteredOrders.length > 0 ? (
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
                        مشتری
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
                    {filteredOrders.map((order, index) => (
                      <motion.tr
                        key={order.id}
                        className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(244, 241, 236, 0.3)' }}
                      >
                        <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">{order.id}</td>
                        <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.date}
                        </td>
                        <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.customer}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.statusText}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
                          {formatPrice(order.amount)}
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
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                  هیچ سفارشی با این وضعیت وجود ندارد
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                >
                  نمایش همه سفارش‌ها
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="col-span-1"
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                <Plus className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                اقدامات سریع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/products/add">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    <Package className="w-4 h-4 ml-2" />
                    افزودن محصول
                  </Button>
                </Link>
                <Link href="/admin/categories/add">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    <Tags className="w-4 h-4 ml-2" />
                    افزودن دسته‌بندی
                  </Button>
                </Link>
                <Link href="/admin/discounts/add">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    <DollarSign className="w-4 h-4 ml-2" />
                    ایجاد تخفیف
                  </Button>
                </Link>
                <Link href="/admin/pages/add">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    ایجاد صفحه
                  </Button>
                </Link>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">جستجوی سریع</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                  </div>
                  <input
                    type="text"
                    className="bg-voxcina-cream/30 dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                    placeholder="جستجوی محصول، سفارش یا کاربر..."
                  />
                </div>
                <div className="flex items-center justify-end mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                  >
                    <Filter className="w-4 h-4 ml-1" />
                    فیلترهای پیشرفته
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-1"
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                <Calendar className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                آمار هفتگی
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                onClick={() => window.location.href = '/admin/analytics'}
              >
                گزارش کامل
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80">بازدید</h3>
                    <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70 text-sm">4,251</span>
                  </div>
                  <div className="w-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-full h-2.5">
                    <div className="bg-voxcina-blue dark:bg-voxcina-cream/80 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80">سفارش‌ها</h3>
                    <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70 text-sm">152</span>
                  </div>
                  <div className="w-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-full h-2.5">
                    <div className="bg-green-500 dark:bg-green-400 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80">نرخ تبدیل</h3>
                    <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70 text-sm">3.6%</span>
                  </div>
                  <div className="w-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-full h-2.5">
                    <div className="bg-amber-500 dark:bg-amber-400 h-2.5 rounded-full" style={{ width: '36%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80">میانگین سبد خرید</h3>
                    <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70 text-sm">{formatPrice(1850000)}</span>
                  </div>
                  <div className="w-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-full h-2.5">
                    <div className="bg-voxcina-blue/70 dark:bg-voxcina-cream/70 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}

// Helper component for Link
interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const Link = ({ href, children, className = "" }: LinkProps) => {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}; 