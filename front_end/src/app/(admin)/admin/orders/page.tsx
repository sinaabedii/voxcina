"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar,
  User,
  Eye,
  Download,
  XCircle,
  CheckCircle,
  TruckIcon,
  X,
  SlidersHorizontal,
  DollarSign,
  Package,
  Loader2,
  CreditCard,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useOrderStore } from '@/store/order-store';
import { AdminOrderFilters } from "@/types/order";

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(searchParams.get("payment_status") || "all");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");

  // Connect to admin orders store
  const { orders, fetchAdminOrders, deleteOrder, updateOrderStatusAdmin, pagination, isLoading, orderStats, fetchOrderStats } = useOrderStore();

  // Build filters object from current state
  const buildFilters = useCallback((): AdminOrderFilters => {
    const filters: AdminOrderFilters = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (paymentStatusFilter !== "all") filters.payment_status = paymentStatusFilter;
    if (searchTerm) filters.search = searchTerm;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (sortBy !== "newest") filters.sort_by = sortBy as AdminOrderFilters['sort_by'];
    return filters;
  }, [statusFilter, paymentStatusFilter, searchTerm, dateFrom, dateTo, sortBy]);

  // Update URL params when filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentStatusFilter !== "all") params.set("payment_status", paymentStatusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (sortBy !== "newest") params.set("sort_by", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());
    
    const queryString = params.toString();
    router.replace(`/admin/orders${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router, searchTerm, statusFilter, paymentStatusFilter, dateFrom, dateTo, sortBy, currentPage]);

  // Fetch admin orders on filter or page change
  useEffect(() => {
    const filters = buildFilters();
    fetchAdminOrders(currentPage, 10, filters);
    updateUrlParams();
  }, [currentPage, statusFilter, paymentStatusFilter, searchTerm, dateFrom, dateTo, sortBy, fetchAdminOrders, buildFilters, updateUrlParams]);

  // Fetch order stats when filters change (excluding pagination)
  useEffect(() => {
    const filters = buildFilters();
    fetchOrderStats(filters);
  }, [statusFilter, paymentStatusFilter, dateFrom, dateTo, fetchOrderStats, buildFilters]);

  // Handle pagination
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= (pagination?.totalPages || 1)) {
      setCurrentPage(pageNumber);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const currentOrders = orders;

  // Helper function to get status style
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
      case "cancelled":
        return "bg-gray-100 text-voxcina-blue dark:bg-gray-900/20 dark:text-gray-400 border border-gray-200 dark:border-gray-800/30";
      default:
        return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت سفارش‌ها</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <div className="flex gap-2">
          <a href="/admin/orders/export">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              <Download className="w-4 h-4 ml-1" />
              خروجی اکسل
            </Button>
          </a>
        </div>
      </motion.div>

      {/* Statistics Summary Section */}
      <motion.div
        className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">کل سفارش‌ها</p>
                  <p className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (orderStats?.total_orders || 0).toLocaleString('fa-IR')}
                  </p>
                </div>
                <div className="p-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl">
                  <Package className="w-6 h-6 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-amber-200 dark:border-amber-800/30 shadow-sm rounded-2xl backdrop-blur-sm bg-amber-50/90 dark:bg-amber-900/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">در انتظار</p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (orderStats?.pending_orders || 0).toLocaleString('fa-IR')}
                  </p>
                </div>
                <div className="p-3 bg-amber-200/50 dark:bg-amber-800/30 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-green-200 dark:border-green-800/30 shadow-sm rounded-2xl backdrop-blur-sm bg-green-50/90 dark:bg-green-900/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">درآمد کل</p>
                  <p className="text-xl font-bold text-green-800 dark:text-green-300">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatPrice(orderStats?.total_revenue || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-200/50 dark:bg-green-800/30 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-700 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-blue-200 dark:border-blue-800/30 shadow-sm rounded-2xl backdrop-blur-sm bg-blue-50/90 dark:bg-blue-900/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">سفارش‌های امروز</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (orderStats?.today_orders || 0).toLocaleString('fa-IR')}
                  </p>
                </div>
                <div className="p-3 bg-blue-200/50 dark:bg-blue-800/30 rounded-xl">
                  <Calendar className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        className="mb-6 flex flex-col md:flex-row md:items-center gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder="جستجو شماره سفارش، نام مشتری یا ایمیل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="md:w-auto w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <SlidersHorizontal className="w-4 h-4 ml-1" />
          فیلترها
        </Button>
      </motion.div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          variants={itemVariants}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Order Status Filter */}
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    وضعیت سفارش
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="pending">در انتظار تایید</option>
                    <option value="processing">در حال پردازش</option>
                    <option value="shipped">ارسال شده</option>
                    <option value="delivered">تحویل شده</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2 flex items-center">
                    <CreditCard className="w-4 h-4 ml-1" />
                    وضعیت پرداخت
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={paymentStatusFilter}
                    onChange={(e) => {
                      setPaymentStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="pending">در انتظار پرداخت</option>
                    <option value="paid">پرداخت شده</option>
                    <option value="failed">ناموفق</option>
                    <option value="refunded">بازگشت وجه</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    مرتب‌سازی
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="newest">جدیدترین</option>
                    <option value="oldest">قدیمی‌ترین</option>
                    <option value="amount_asc">مبلغ (کم به زیاد)</option>
                    <option value="amount_desc">مبلغ (زیاد به کم)</option>
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    از تاریخ
                  </h3>
                  <input
                    type="date"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Date To */}
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    تا تاریخ
                  </h3>
                  <input
                    type="date"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                  onClick={clearFilters}
                >
                  <X className="w-4 h-4 ml-1" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Orders List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {currentOrders.length > 0 ? (
          <div className="space-y-4">
            {currentOrders.map((order, index) => (
              <motion.div
                key={order.id}
                variants={itemVariants}
                className="transition-all duration-300"
              >
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      {/* Order Header */}
                      <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="flex items-center ml-4 min-w-[120px]">
                            <ShoppingCart className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                            <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {order.order_number}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            <Calendar className="w-4 h-4 ml-1" />
                            <span>{order.jalali_created_at}</span>
                            <span className="mx-1">|</span>
                            <Clock className="w-4 h-4 ml-1" />
                            <span>{new Date(order.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status_text}
                          </span>
                          <a
                            href={`/admin/orders/${order.id}`}
                            className="mr-3 flex items-center text-sm text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream transition-colors"
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            <span>مشاهده جزئیات</span>
                          </a>
                        </div>
                      </div>

                      {/* Order Body */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 flex items-center">
                            <User className="w-4 h-4 ml-1" />
                            اطلاعات مشتری
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-voxcina-blue dark:text-voxcina-cream">
                              <span className="font-medium">{(order.shipping_address as any).first_name} {(order.shipping_address as any).last_name}</span>
                              <span className="text-xs mr-1 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                                ({order.user_id})
                              </span>
                            </p>
                            <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {(order.shipping_address as any).phone_number}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 flex items-center">
                            <ShoppingCart className="w-4 h-4 ml-1" />
                            اطلاعات سفارش
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                              <span>تعداد اقلام:</span>
                              <span className="font-medium">{order.items.length} محصول</span>
                            </p>
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                              <span>مبلغ کل:</span>
                              <span className="font-medium">
                                {formatPrice(order.total_amount)}
                              </span>
                            </p>
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                              <span>روش پرداخت:</span>
                              <span>{order.payment_status}</span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2">
                            آدرس ارسال
                          </h3>
                          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            {(order.shipping_address as any).address || `${order.shipping_address.city} ${order.shipping_address.state}`}
                          </p>
                        </div>
                      </div>

                      {/* Order Actions */}
                      <div className="p-3 bg-voxcina-cream/10 dark:bg-voxcina-blue/10 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end space-x-2 space-x-reverse">
                        {order.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-xl"
                            onClick={() =>
                              updateOrderStatusAdmin(order.id, "cancelled")
                            }
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            لغو سفارش
                          </Button>
                        )}
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() =>
                              updateOrderStatusAdmin(order.id, "processing")
                            }
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تایید سفارش
                          </Button>
                        )}
                        {order.status === "processing" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() => updateOrderStatusAdmin(order.id, "shipped")}
                          >
                            <TruckIcon className="w-4 h-4 ml-1" />
                            ارسال سفارش
                          </Button>
                        )}
                        {order.status === "shipped" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() => updateOrderStatusAdmin(order.id, "delivered")}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تحویل شده
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <ShoppingCart className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                سفارشی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ سفارشی با فیلترهای انتخاب شده یافت نشد
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن فیلترها
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/30 rounded-xl p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === 1
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <Button
                    key={number}
                    variant={currentPage === number ? "primary" : "ghost"}
                    size="sm"
                    className={`rounded-lg ${
                      currentPage === number
                        ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                        : "text-voxcina-blue dark:text-voxcina-cream"
                    }`}
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === pagination.totalPages
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
} 