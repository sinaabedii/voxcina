"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Package,
  Filter,
  Search,
  FileText,
  TruckIcon,
  Clock,
  AlertCircle,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { formatPrice, formatDate } from "@/lib/utils";
import { downloadInvoice } from "@/components/OrderInvoice";

type OrderStatus =
  | "all"
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { orders, isLoading, error, fetchOrders, pagination, setCurrentOrder } =
    useOrderStore();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    const filters: Record<string, any> = {};
    if (activeTab !== "all") {
      filters.status = activeTab;
    }
    if (debouncedSearchQuery) {
      filters.search = debouncedSearchQuery;
    }
    fetchOrders(pagination?.currentPage || 1, 10, filters);
  }, [activeTab, debouncedSearchQuery, fetchOrders, pagination?.currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      const filters: Record<string, any> = {};
      if (activeTab !== "all") {
        filters.status = activeTab;
      }
      if (debouncedSearchQuery) {
        filters.search = debouncedSearchQuery;
      }
      fetchOrders(newPage, 10, filters);
    }
  };

  const filteredOrders = orders;

  const getStatusStyle = (status: Order["status"] | string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "processing":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      case "cancelled":
      case "refunded":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: Order["status"] | string) => {
    switch (status) {
      case "delivered":
        return <Package className="w-4 h-4 ml-1" />;
      case "shipped":
        return <TruckIcon className="w-4 h-4 ml-1" />;
      case "processing":
        return <CheckCircle className="w-4 h-4 ml-1" />;
      case "pending":
        return <Clock className="w-4 h-4 ml-1" />;
      case "cancelled":
      case "refunded":
        return <AlertCircle className="w-4 h-4 ml-1" />;
      default:
        return null;
    }
  };

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

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxPagesToShow / 2)
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxPagesToShow - 1
    );

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              1
            </Button>
            {startPage > 2 && (
              <span className="px-2 text-voxcina-blue/50 dark:text-voxcina-cream/50">
                ...
              </span>
            )}
          </>
        )}
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={pagination.currentPage === page ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
            className={`rounded-xl ${
              pagination.currentPage === page
                ? "bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
                : "border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            }`}
          >
            {page}
          </Button>
        ))}
        {endPage < pagination.totalPages && (
          <>
            {endPage < pagination.totalPages - 1 && (
              <span className="px-2 text-voxcina-blue/50 dark:text-voxcina-cream/50">
                ...
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              {pagination.totalPages}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  // Show error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="container py-8 md:py-12 mx-auto px-4 md:px-8">
        <Card className="border border-red-200 dark:border-red-800/30 shadow-soft rounded-2xl bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">
              خطا در بارگذاری سفارش‌ها
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button
              variant="primary"
              onClick={() => {
                const filters: Record<string, any> = {};
                if (activeTab !== "all") filters.status = activeTab;
                if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
                fetchOrders(1, 10, filters);
              }}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0 text-voxcina-blue dark:text-voxcina-cream relative">
          <span className="relative z-10">سفارش‌های من</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی شماره سفارش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-voxcina-cream/50 dark:border-voxcina-blue/50 bg-white dark:bg-voxcina-blue/30 focus:outline-none focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50"
          />
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
        </div>
      </motion.div>

      <motion.div
        className="mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="inline-flex bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl p-1 min-w-full sm:min-w-0">
          {(
            [
              "all",
              "pending",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "refunded",
            ] as OrderStatus[]
          ).map((status) => (
            <button
              key={status}
              className={`px-4 py-2 text-sm rounded-xl transition-all min-w-20 whitespace-nowrap ${
                activeTab === status
                  ? "bg-white dark:bg-voxcina-blue/40 shadow-soft text-voxcina-blue dark:text-voxcina-cream"
                  : "text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
              }`}
              onClick={() => setActiveTab(status)}
            >
              {status === "all"
                ? "همه"
                : status === "pending"
                ? "در انتظار پرداخت"
                : status === "processing"
                ? "در حال پردازش"
                : status === "shipped"
                ? "ارسال شده"
                : status === "delivered"
                ? "تحویل شده"
                : status === "cancelled"
                ? "لغو شده"
                : "مردود شده"}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading && filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-[300px] flex items-center justify-center"
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/60 dark:bg-voxcina-blue/10 w-full md:max-w-md mx-auto">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream dark:border-voxcina-blue/30 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <Package className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                </div>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                  در حال بارگذاری سفارش‌ها...
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : filteredOrders.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20">
                  <tr>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      شماره سفارش
                    </th>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      تاریخ
                    </th>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      وضعیت
                    </th>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      تعداد کل محصولات
                    </th>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      مبلغ کل
                    </th>
                    <th className="text-right p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-voxcina-blue/5 divide-y divide-voxcina-cream/30 dark:divide-voxcina-blue/20">
                  {filteredOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      className="hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/10 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">
                        {order.order_number}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 flex items-center">
                        <Calendar className="w-4 h-4 ml-2 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                        {order.jalali_created_at ||
                          formatDate(order.created_at)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs items-center inline-flex ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status_text}
                        </span>
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        {order.items.reduce(
                          (acc, item) => acc + item.quantity,
                          0
                        )}{" "}
                        محصول
                      </td>
                      <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
                        {formatPrice(order.total_amount)} تومان
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex gap-2 justify-end">
                          {order.tracking_code && (
                            <button
                              className="p-1 hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue dark:text-voxcina-cream group relative"
                              title="کد رهگیری"
                            >
                              <TruckIcon className="h-5 w-5" />
                              <span className="absolute bottom-full mb-2 right-1/2 transform translate-x-1/2 bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {order.tracking_code}
                              </span>
                            </button>
                          )}

                          <button
                            className="p-1 hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue/60 dark:text-voxcina-cream/60"
                            title="دانلود فاکتور"
                            onClick={() => downloadInvoice(order)}
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            legacyBehavior
                          >
                            <a
                              className="p-1 hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue dark:text-voxcina-cream"
                              title="جزئیات سفارش"
                              onClick={() => setCurrentOrder(order)}
                            >
                              <FileText className="h-5 w-5" />
                            </a>
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-4 flex flex-col sm:flex-row justify-center sm:justify-between items-center">
              {pagination && pagination.totalOrders > 0 && (
                <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 sm:mb-0">
                  نمایش {(pagination.currentPage - 1) * pagination.pageSize + 1}{" "}
                  -{" "}
                  {Math.min(
                    pagination.currentPage * pagination.pageSize,
                    pagination.totalOrders
                  )}{" "}
                  از {pagination.totalOrders} سفارش
                </span>
              )}
              {renderPagination()}
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-voxcina-cream to-voxcina-cream/50 dark:from-voxcina-blue/20 dark:to-voxcina-blue/10 mb-6 shadow-soft">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 2,
                  }}
                >
                  <Package className="h-10 w-10 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-voxcina-blue dark:text-voxcina-cream">
                سفارشی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-8 max-w-md mx-auto">
                {searchQuery || activeTab !== "all"
                  ? "هیچ سفارشی با این مشخصات پیدا نشد. فیلترها را تغییر دهید یا جستجو را پاک کنید."
                  : "شما هنوز هیچ سفارشی ثبت نکرده‌اید."}
              </p>
              <div className="flex gap-3 justify-center">
                {(searchQuery || activeTab !== "all") && (
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                      }}
                      className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                    >
                      پاک کردن فیلترها
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 shadow-soft hover:shadow-medium transition-shadow overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardHeader className="bg-gradient-to-r from-voxcina-cream/50 to-voxcina-cream/30 dark:from-voxcina-blue/30 dark:to-voxcina-blue/20 pb-3">
              <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream flex items-center">
                <Package className="w-5 h-5 ml-2" />
                راهنمای پیگیری سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-amber-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      در انتظار پرداخت:
                    </strong>{" "}
                    سفارش شما ثبت شده و منتظر پرداخت است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-sky-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-sky-600 dark:text-sky-400">
                      در حال پردازش:
                    </strong>{" "}
                    پرداخت شما موفق بوده و سفارش در حال آماده سازی است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-blue-600 dark:text-blue-400">
                      ارسال شده:
                    </strong>{" "}
                    سفارش شما آماده و در مسیر ارسال است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-green-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-green-600 dark:text-green-400">
                      تحویل شده:
                    </strong>{" "}
                    سفارش شما با موفقیت تحویل داده شده است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-red-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-red-600 dark:text-red-400">
                      لغو شده/مردود شده:
                    </strong>{" "}
                    سفارش شما به دلایلی لغو یا مردود شده است.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 shadow-soft hover:shadow-medium transition-shadow overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardHeader className="bg-gradient-to-r from-voxcina-cream/50 to-voxcina-cream/30 dark:from-voxcina-blue/30 dark:to-voxcina-blue/20 pb-3">
              <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream flex items-center">
                <TruckIcon className="w-5 h-5 ml-2" />
                اطلاعات ارسال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm mb-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                برای پیگیری وضعیت ارسال سفارش خود، می‌توانید از کد رهگیری پستی
                استفاده نمایید که در صورت وجود، در کنار سفارش نمایش داده می‌شود.
              </p>
              <div className="flex items-center bg-voxcina-cream/30 dark:bg-voxcina-blue/30 p-3 rounded-xl">
                <div className="bg-voxcina-cream/50 dark:bg-voxcina-blue/40 p-2 rounded-xl ml-3">
                  <TruckIcon className="w-6 h-6 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
                <div>
                  <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                    پیگیری مرسولات پستی
                  </h4>
                  <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                    کد رهگیری را در قسمت جزئیات سفارش یا کنار آن می‌توانید
                    مشاهده کنید.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
