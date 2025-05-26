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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { formatPrice, formatDate } from "@/lib/utils";

type OrderStatus = "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    orders,
    isLoading,
    error,
    fetchOrders,
    pagination,
    setCurrentOrder,
  } = useOrderStore();

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
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
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
      case "processing":
        return <TruckIcon className="w-4 h-4 ml-1" />;
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);

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
          className="rounded-lg"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {startPage > 1 && (
            <>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} className="rounded-lg">1</Button>
                {startPage > 2 && <span className="px-2">...</span>}
            </>
        )}
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={pagination.currentPage === page ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
            className="rounded-lg"
          >
            {page}
          </Button>
        ))}
        {endPage < pagination.totalPages && (
            <>
                {endPage < pagination.totalPages -1 && <span className="px-2">...</span>}
                <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.totalPages)} className="rounded-lg">
                    {pagination.totalPages}
                </Button>
            </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="rounded-lg"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };


  return (
    <div className="container py-8 md:py-12">
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          سفارش‌های من
        </h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی شماره سفارش..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="inline-flex bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 min-w-full sm:min-w-0">
          {(["all", "pending", "processing", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[]).map((status) => (
            <button
              key={status}
              className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 whitespace-nowrap ${
                activeTab === status
                  ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
              }`}
              onClick={() => setActiveTab(status)}
            >
              {status === "all" ? "همه" : 
               status === "pending" ? "در انتظار پرداخت" :
               status === "processing" ? "در حال پردازش" :
               status === "shipped" ? "ارسال شده" :
               status === "delivered" ? "تحویل شده" :
               status === "cancelled" ? "لغو شده" :
               "مردود شده"}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading && filteredOrders.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
                <div className="flex flex-col items-center">
                  <div className="relative w-12 h-12 mb-4">
                    <div className="absolute top-0 right-0 w-full h-full border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-ping"></div>
                    <div className="absolute top-0 right-0 w-full h-full border-4 border-t-indigo-500 dark:border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    در حال بارگذاری سفارش‌ها...
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : error ? (
           <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center min-h-[200px]">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-800/30 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">خطا در بارگذاری سفارش‌ها</h3>
                <p className="text-muted-foreground mb-6">
                  {error}
                </p>
                 <Button
                      variant="primary"
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      onClick={() => {
                        const filters: Record<string, any> = {};
                        if (activeTab !== "all") filters.status = activeTab;
                        if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
                        fetchOrders(1, 10, filters);
                      }}
                    >
                      تلاش مجدد
                  </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredOrders.length > 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        شماره سفارش
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        تاریخ
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        وضعیت
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        تعداد کل محصولات
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        مبلغ کل
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => (
                      <motion.tr
                        key={order.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="p-4 font-medium text-indigo-600 dark:text-indigo-400">{order.order_number}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar className="w-4 h-4 ml-2 text-gray-400" />
                          {order.jalali_created_at || formatDate(order.created_at)}
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
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                           {order.items.reduce((acc, item) => acc + item.quantity, 0)} محصول
                        </td>
                        <td className="p-4 font-bold">{formatPrice(order.total_amount)} تومان</td>
                        <td className="p-4 text-left">
                          <div className="flex gap-2 justify-end">
                            {order.tracking_code && (
                              <button
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-blue-500 dark:text-blue-400 group relative"
                                title="کد رهگیری"
                              >
                                <TruckIcon className="h-5 w-5" />
                                <span className="absolute bottom-full mb-2 right-1/2 transform translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  {order.tracking_code}
                                </span>
                              </button>
                            )}

                            <button
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                              title="دانلود فاکتور"
                              onClick={() => alert(`دانلود فاکتور برای سفارش ${order.order_number}`)}
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <Link href={`/dashboard/orders/${order.id}`} legacyBehavior>
                              <a
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-indigo-500 dark:text-indigo-400"
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
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 flex flex-col sm:flex-row justify-center sm:justify-between items-center">
                {pagination && pagination.totalOrders > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-0">
                    نمایش {(pagination.currentPage - 1) * pagination.pageSize + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalOrders)} از {pagination.totalOrders} سفارش
                    </span>
                )}
                {renderPagination()}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center min-h-[200px]">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">سفارشی یافت نشد</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || activeTab !== "all"
                    ? "هیچ سفارشی با این مشخصات پیدا نشد. فیلترها را تغییر دهید یا جستجو را پاک کنید."
                    : "شما هنوز هیچ سفارشی ثبت نکرده‌اید."}
                </p>
                <div className="flex gap-3 justify-center">
                  {(searchQuery || activeTab !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                      }}
                    >
                      پاک کردن فیلترها
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="border border-indigo-100 dark:border-indigo-900/30 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 pb-3">
              <CardTitle className="text-lg font-bold text-indigo-700 dark:text-indigo-400 flex items-center">
                <Package className="w-5 h-5 ml-2" />
                راهنمای پیگیری سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-amber-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-amber-600 dark:text-amber-400">در انتظار پرداخت:</strong> سفارش شما ثبت شده و منتظر پرداخت است.
                  </span>
                </li>
                 <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-sky-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-sky-600 dark:text-sky-400">در حال پردازش:</strong> پرداخت شما موفق بوده و سفارش در حال آماده سازی است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-blue-600 dark:text-blue-400">ارسال شده:</strong> سفارش شما آماده و در مسیر ارسال است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-green-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-green-600 dark:text-green-400">تحویل شده:</strong> سفارش شما با موفقیت تحویل داده شده است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-red-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-red-600 dark:text-red-400">لغو شده/مردود شده:</strong> سفارش شما به دلایلی لغو یا مردود شده است.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-purple-100 dark:border-purple-900/30 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 pb-3">
              <CardTitle className="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center">
                <TruckIcon className="w-5 h-5 ml-2" />
                اطلاعات ارسال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm mb-4">
                برای پیگیری وضعیت ارسال سفارش خود، می‌توانید از کد رهگیری پستی استفاده نمایید که در صورت وجود، در کنار سفارش نمایش داده می‌شود.
              </p>
              <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded-lg ml-3">
                  <TruckIcon className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-700 dark:text-purple-400">پیگیری مرسولات پستی</h4>
                  <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                    کد رهگیری را در قسمت جزئیات سفارش یا کنار آن می‌توانید مشاهده کنید.
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
