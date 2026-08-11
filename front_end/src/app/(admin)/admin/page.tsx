"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  Package,
  Users,
  ShoppingCart,
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
import { XCircle } from "lucide-react";

export default function AdminDashboardPage() {
  const { user, adminToken } = useAuthStore();
  const { dashboardStats, fetchDashboardStats } = useDashboardStore();
  const { fetchRecentOrders } = useOrderStore();
  const [activeTab, setActiveTab] = useState("all");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (adminToken) {
      fetchDashboardStats(adminToken);
      
      // Fetch recent orders
      const loadRecentOrders = async () => {
        setIsLoading(true);
        setOrdersError(null);
        try {
          const orders = await fetchRecentOrders(5); // Fetch 5 recent orders
          setRecentOrders(orders || []); // Ensure we always have an array
        } catch (error) {
          console.error("Failed to fetch recent orders:", error);
          setOrdersError("خطا در بارگذاری سفارش‌های اخیر");
          setRecentOrders([]); // Set empty array on error
        } finally {
          setIsLoading(false);
        }
      };
      
      loadRecentOrders();
    }
  }, [adminToken, fetchDashboardStats, fetchRecentOrders]);

  const filteredOrders =
    activeTab === "all"
      ? recentOrders
      : recentOrders.filter((order) => {
          if (activeTab === "pending") return order.status === "pending";
          if (activeTab === "processing") return order.status === "processing";
          if (activeTab === "shipping") return order.status === "shipped";
          if (activeTab === "delivered") return order.status === "delivered";
          return true;
        });

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
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
      case "pending":
        return "bg-red-100 text-voxcina-blue dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/30";
      default:
        return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
    }
  };

  // Helper function to get tab label in Persian
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case "pending":
        return "در انتظار";
      case "processing":
        return "در حال پردازش";
      case "shipping":
        return "در حال ارسال";
      case "delivered":
        return "تحویل شده";
      default:
        return "";
    }
  };

  if (!dashboardStats) {
    return (
      <div className="py-8 md:py-12 flex items-center justify-center min-h-[40vh]">
        <div className="text-lg text-voxcina-blue dark:text-voxcina-cream">در حال بارگذاری آمار...</div>
      </div>
    );
  }

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
                <Link href="/admin/products">
                  <div className="text-2xl font-bold">{dashboardStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">مدیریت محصولات</p>
                </Link>
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
                  <FileText className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                  اسلایدر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin/sliders">
                  <div className="text-2xl font-bold">{dashboardStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">مدیریت اسلایدر</p>
                </Link>
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
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{dashboardStats.totalUsers}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    کاربر ثبت شده
                  </p>
                  <Link href="/admin/users" aria-label="مدیریت کاربران">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                      <span className="sr-only">مدیریت کاربران</span>
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
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{dashboardStats.totalOrders}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    {dashboardStats.pendingOrders} سفارش در انتظار تایید
                  </p>
                  <Link href="/admin/orders" aria-label="مدیریت سفارش‌ها">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                      <span className="sr-only">مدیریت سفارش‌ها</span>
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
                  {formatPrice(dashboardStats.totalSales)}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    ارزش فروش‌های موفق
                  </p>
                  <Link href="/admin/orders" aria-label="مدیریت سفارش‌ها">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                      <span className="sr-only">مدیریت سفارش‌ها</span>
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
                  <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 ml-2" />
                  فروش‌های ناموفق
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500 dark:text-red-400">
                  {formatPrice(dashboardStats.totalSalesFailed)}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-red-500/70 dark:text-red-400/70 mt-1">
                    ارزش فروش‌های در انتظار/ناموفق
                  </p>
                  <Link href="/admin/orders" aria-label="مدیریت سفارش‌ها">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                      <ChevronRight className="h-5 w-5 text-red-500 dark:text-red-400" />
                      <span className="sr-only">مدیریت سفارش‌ها</span>
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
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{dashboardStats.totalCategories}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    دسته‌بندی فعال
                  </p>
                  <Link href="/admin/categories" aria-label="مدیریت دسته‌بندی‌ها">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                      <span className="sr-only">مدیریت دسته‌بندی‌ها</span>
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
                <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{dashboardStats.pendingReviews}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    نظر در انتظار تایید
                  </p>
                  <Link href="/admin/reviews" aria-label="مدیریت نظرات">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                      <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
                      <span className="sr-only">مدیریت نظرات</span>
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
          className="flex justify-between items-center mb-6"
        >
          <h2 className="text-xl font-semibold flex items-center text-voxcina-blue dark:text-voxcina-cream">
            <Clock className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
            سفارشهای اخیر
          </h2>
          <Link href="/admin/orders">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              مشاهده همه
            </Button>
          </Link>
        </motion.div>

        {/* Enhanced Filter Tabs with better styling */}
        <motion.div 
          variants={itemVariants}
          className="mb-6"
        >
          <div className="bg-white/70 dark:bg-voxcina-blue/10 backdrop-blur-sm rounded-2xl p-2 border border-voxcina-cream/50 dark:border-voxcina-blue/20 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === "all"
                    ? "bg-voxcina-blue text-white shadow-lg shadow-voxcina-blue/20 dark:bg-voxcina-cream dark:text-voxcina-blue dark:shadow-voxcina-cream/20"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/20 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === "pending"
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                }`}
              >
                در انتظار
              </button>
              <button
                onClick={() => setActiveTab("processing")}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === "processing"
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                در حال پردازش
              </button>
              <button
                onClick={() => setActiveTab("shipping")}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === "shipping"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                در حال ارسال
              </button>
              <button
                onClick={() => setActiveTab("delivered")}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                  activeTab === "delivered"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                }`}
              >
                تحویل شده
              </button>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center"
          >
            <Card className="border border-voxcina-cream/60 dark:border-voxcina-blue/30 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-white/95 to-voxcina-cream/20 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 p-12 max-w-lg mx-auto relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-cream/5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="text-center relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 mb-4 mx-auto">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20 border-t-voxcina-blue dark:border-t-voxcina-cream"></div>
                </div>
                <p className="text-lg text-voxcina-blue dark:text-voxcina-cream font-medium">در حال بارگذاری سفارش‌ها...</p>
                <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-2">لطفا صبر کنید</p>
              </div>
            </Card>
          </motion.div>
        ) : ordersError ? (
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center"
          >
            <Card className="border border-red-200/60 dark:border-red-800/40 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-red-50/95 to-red-100/20 dark:from-red-900/15 dark:to-red-900/5 p-12 max-w-lg mx-auto relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 dark:bg-red-900/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200/40 dark:bg-red-800/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              {/* Icon with enhanced styling */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-red-100/50 to-red-200/50 dark:from-red-900/20 dark:to-red-800/20 mb-6 mx-auto shadow-inner">
                <div className="w-20 h-20 rounded-full bg-white/80 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                </div>
              </div>
              
              {/* Content with better typography */}
              <div className="text-center relative z-10">
                <h3 className="text-xl font-bold mb-3 text-red-700 dark:text-red-400">
                  خطا در بارگذاری
                </h3>
                <p className="text-red-600/70 dark:text-red-400/70 mb-8 leading-relaxed">
                  {ordersError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="rounded-xl border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <AlertCircle className="w-4 h-4 ml-2" />
                  تلاش مجدد
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : filteredOrders.length === 0 ? (
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center"
          >
            <Card className="border border-voxcina-cream/60 dark:border-voxcina-blue/30 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-white/95 to-voxcina-cream/20 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 p-12 max-w-lg mx-auto relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-cream/5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              {/* Icon with enhanced styling */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-voxcina-blue/10 to-voxcina-blue/20 dark:from-voxcina-cream/10 dark:to-voxcina-cream/20 mb-6 mx-auto shadow-inner">
                <div className="w-20 h-20 rounded-full bg-white/80 dark:bg-voxcina-blue/20 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                </div>
              </div>
              
              {/* Content with better typography */}
              <div className="text-center relative z-10">
                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-voxcina-cream">
                  {activeTab === "all" ? "هیچ سفارشی یافت نشد" : `هیچ سفارش ${getTabLabel(activeTab)}ی یافت نشد`}
                </h3>
                <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-8 leading-relaxed">
                  {activeTab === "all" 
                    ? "هنوز هیچ سفارشی در سیستم ثبت نشده است. سفارش‌های جدید به محض دریافت در اینجا نمایش داده خواهند شد."
                    : `در حال حاضر هیچ سفارشی با وضعیت ${getTabLabel(activeTab)} وجود ندارد.`
                  }
                </p>
                
                {/* Action buttons with improved styling */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {activeTab !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("all")}
                      className="rounded-xl border-voxcina-blue/30 text-voxcina-blue dark:border-voxcina-blue/40 dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      نمایش همه سفارش‌ها
                    </Button>
                  )}
                  {activeTab === "all" && (
                    <Link href="/admin/orders">
                      <Button
                        variant="primary"
                        size="sm"
                        className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        مدیریت سفارش‌ها
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
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
                        <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">
                          {order.order_number || 'نامشخص'}
                        </td>
                        <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.jalali_created_at || 'نامشخص'}
                        </td>
                        <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.user_id || 'نامشخص'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(order.status || 'pending')}`}
                          >
                            {order.status_text || 'نامشخص'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
                          {formatPrice(order.total_amount || 0)} تومان
                        </td>
                        <td className="p-4 text-left">
                          <motion.button 
                            className="p-2 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/30 rounded-full transition-colors text-voxcina-blue/60 dark:text-voxcina-cream/60"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              // Add navigation to order details
                              console.log('Navigate to order:', order.id);
                            }}
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
                <Bot className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                گفتگوهای هوش مصنوعی
              </CardTitle>
              <Link href="/admin/ai-chats">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                >
                  مشاهده گفتگوها
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="rounded-2xl bg-voxcina-cream/35 p-5 dark:bg-voxcina-blue/20">
                  <p className="text-sm leading-7 text-voxcina-blue/75 dark:text-voxcina-cream/75">
                    گفتگوهای اتاق پرو مجازی را بررسی کنید؛ اطلاعات کاربر، تعداد پیام‌ها، پاسخ‌های هوش مصنوعی و نتایج تصویری پرو در یک صفحه در دسترس است.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  <div className="rounded-xl border border-voxcina-cream/70 p-3 dark:border-voxcina-blue/30">متن گفتگو</div>
                  <div className="rounded-xl border border-voxcina-cream/70 p-3 dark:border-voxcina-blue/30">اطلاعات کاربر</div>
                  <div className="rounded-xl border border-voxcina-cream/70 p-3 dark:border-voxcina-blue/30">نتایج پرو</div>
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
