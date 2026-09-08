"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  ChevronLeft,
  AlertCircle,
  Tags,
  DollarSign,
  Star,
  Plus,
  Search,
  Filter,
  FileText,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminBadge,
  AdminBadgeTone,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminStatCard,
  AdminInput,
} from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

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

  const getStatusTone = (status: string): AdminBadgeTone => {
    switch (status) {
      case "delivered":
        return "success";
      case "shipping":
      case "shipped":
        return "info";
      case "processing":
        return "success";
      case "pending":
        return "danger";
      default:
        return "neutral";
    }
  };

  // Helper function to get tab label in Persian
  const TAB_LABELS: Record<string, string> = {
    pending: "در انتظار",
    processing: "در حال پردازش",
    shipping: "در حال ارسال",
    delivered: "تحویل شده",
  };
  const getTabLabel = (tab: string) => TAB_LABELS[tab] ?? "";
  const QuickLinkButton = ({
    href,
    icon,
    children,
  }: {
    href: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <Link href={href}>
      <Button variant="outline" className="w-full justify-start rounded-xl">
        <span className="ml-2 inline-flex [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        {children}
      </Button>
    </Link>
  );  if (!dashboardStats) {
    return (
      <div>
        <AdminPageHeader title="پنل مدیریت" />
        <AdminLoading message="در حال بارگذاری آمار..." />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="پنل مدیریت" />

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
            <AdminStatCard
              icon={Package}
              label="محصولات"
              value={dashboardStats.totalProducts}
              href="/admin/products"
              hint="مدیریت محصولات"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={FileText}
              label="اسلایدر"
              value={dashboardStats.totalProducts}
              href="/admin/sliders"
              hint="مدیریت اسلایدر"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={Users}
              label="کاربران"
              value={dashboardStats.totalUsers}
              href="/admin/users"
              hint="کاربر ثبت شده"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={ShoppingCart}
              label="سفارش‌ها"
              value={dashboardStats.totalOrders}
              href="/admin/orders"
              hint={`${dashboardStats.pendingOrders} سفارش در انتظار تایید`}
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={DollarSign}
              tone="green"
              label="فروش کل"
              value={formatPrice(dashboardStats.totalSales)}
              href="/admin/orders"
              hint="ارزش فروش‌های موفق"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={XCircle}
              tone="red"
              label="فروش‌های ناموفق"
              value={formatPrice(dashboardStats.totalSalesFailed)}
              href="/admin/orders"
              hint="ارزش فروش‌های در انتظار/ناموفق"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={Tags}
              label="دسته‌بندی‌ها"
              value={dashboardStats.totalCategories}
              href="/admin/categories"
              hint="دسته‌بندی فعال"
            />
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <AdminStatCard
              icon={Star}
              label="نظرات"
              value={dashboardStats.pendingReviews}
              href="/admin/reviews"
              hint="نظر در انتظار تایید"
            />
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
          <AdminLoading message="در حال بارگذاری سفارش‌ها..." />
        ) : ordersError ? (
          <AdminError message={ordersError} onRetry={() => window.location.reload()} />
        ) : filteredOrders.length === 0 ? (
          <AdminEmpty
            icon={ShoppingCart}
            title={activeTab === "all" ? "هیچ سفارشی یافت نشد" : `هیچ سفارش ${getTabLabel(activeTab)}ی یافت نشد`}
            description={
              activeTab === "all"
                ? "هنوز هیچ سفارشی در سیستم ثبت نشده است. سفارش‌های جدید به محض دریافت در اینجا نمایش داده خواهند شد."
                : `در حال حاضر هیچ سفارشی با وضعیت ${getTabLabel(activeTab)} وجود ندارد.`
            }
            action={
              activeTab !== "all" ? (
                <Button variant="outline" size="sm" onClick={() => setActiveTab("all")} className="rounded-xl">
                  نمایش همه سفارش‌ها
                </Button>
              ) : (
                <Link href="/admin/orders">
                  <Button variant="primary" size="sm" className="rounded-xl">
                    <Plus className="w-4 h-4 ml-2" />
                    مدیریت سفارش‌ها
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <AdminTable
            head={
              <>
                <AdminTh>شماره سفارش</AdminTh>
                <AdminTh>تاریخ</AdminTh>
                <AdminTh>مشتری</AdminTh>
                <AdminTh>وضعیت</AdminTh>
                <AdminTh>مبلغ</AdminTh>
                <AdminTh />
              </>
            }
          >
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors">
                <AdminTd className="font-medium">
                  {order.order_number || "نامشخص"}
                </AdminTd>
                <AdminTd>
                  {order.jalali_created_at || "نامشخص"}
                </AdminTd>
                <AdminTd>
                  {order.user_id || "نامشخص"}
                </AdminTd>
                <AdminTd>
                  <AdminBadge tone={getStatusTone(order.status || "pending")}>
                    {order.status_text || "نامشخص"}
                  </AdminBadge>
                </AdminTd>
                <AdminTd className="font-bold">
                  {formatPrice(order.total_amount || 0)} تومان
                </AdminTd>
                <AdminTd className="text-left">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    aria-label="مشاهده جزئیات سفارش"
                    className="inline-flex p-2 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/30 rounded-full transition-colors text-voxcina-blue/60 dark:text-voxcina-cream/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </AdminTable>
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
                <QuickLinkButton href="/admin/products/add" icon={<Package />}>
                  افزودن محصول
                </QuickLinkButton>
                <QuickLinkButton href="/admin/categories/add" icon={<Tags />}>
                  افزودن دسته‌بندی
                </QuickLinkButton>
                <QuickLinkButton href="/admin/discounts/add" icon={<DollarSign />}>
                  ایجاد تخفیف
                </QuickLinkButton>
                <QuickLinkButton href="/admin/pages/add" icon={<FileText />}>
                  ایجاد صفحه
                </QuickLinkButton>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">جستجوی سریع</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                  </div>
                  <AdminInput
                    type="text"
                    className="pr-10 p-2.5"
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
