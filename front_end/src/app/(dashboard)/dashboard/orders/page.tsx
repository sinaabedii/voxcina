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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const allOrders = [
    {
      id: "DGS-10001",
      date: "۱۴۰۲/۰۸/۱۵",
      status: "delivered",
      statusText: "تحویل شده",
      amount: "۲,۵۰۰,۰۰۰",
      products: 3,
      trackingCode: "TRKP-87654321",
    },
    {
      id: "DGS-10002",
      date: "۱۴۰۲/۰۹/۰۲",
      status: "shipping",
      statusText: "در حال ارسال",
      amount: "۱,۸۰۰,۰۰۰",
      products: 2,
      trackingCode: "TRKP-76543210",
    },
    {
      id: "DGS-10003",
      date: "۱۴۰۲/۰۹/۲۰",
      status: "pending",
      statusText: "در انتظار پرداخت",
      amount: "۳,۲۰۰,۰۰۰",
      products: 4,
      trackingCode: null,
    },
    {
      id: "DGS-10004",
      date: "۱۴۰۲/۱۰/۰۵",
      status: "delivered",
      statusText: "تحویل شده",
      amount: "۴,۱۰۰,۰۰۰",
      products: 5,
      trackingCode: "TRKP-65432109",
    },
    {
      id: "DGS-10005",
      date: "۱۴۰۲/۱۰/۱۸",
      status: "cancelled",
      statusText: "لغو شده",
      amount: "۱,۳۰۰,۰۰۰",
      products: 1,
      trackingCode: null,
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const filteredOrders = allOrders
    .filter((order) => {
      if (activeTab === "all") return true;
      if (activeTab === "delivered") return order.status === "delivered";
      if (activeTab === "shipping") return order.status === "shipping";
      if (activeTab === "pending") return order.status === "pending";
      if (activeTab === "cancelled") return order.status === "cancelled";
      return true;
    })
    .filter((order) => {
      if (!searchQuery) return true;
      return (
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.statusText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "shipping":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <Package className="w-4 h-4 ml-1" />;
      case "shipping":
        return <TruckIcon className="w-4 h-4 ml-1" />;
      case "pending":
        return <Clock className="w-4 h-4 ml-1" />;
      case "cancelled":
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
              placeholder="جستجوی سفارش..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center rounded-xl"
          >
            <Filter className="w-4 h-4 ml-2" />
            فیلتر پیشرفته
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="inline-flex bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 min-w-full sm:min-w-0">
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === "all"
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
            onClick={() => setActiveTab("all")}
          >
            همه
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === "pending"
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            در انتظار
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === "shipping"
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
            onClick={() => setActiveTab("shipping")}
          >
            در حال ارسال
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === "delivered"
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
            onClick={() => setActiveTab("delivered")}
          >
            تحویل شده
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === "cancelled"
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
            onClick={() => setActiveTab("cancelled")}
          >
            لغو شده
          </button>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading ? (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 flex items-center justify-center">
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
                        تعداد
                      </th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">
                        مبلغ
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
                        <td className="p-4 font-medium">{order.id}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar className="w-4 h-4 ml-2 text-gray-400" />
                          {order.date}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs flex items-center inline-flex ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {getStatusIcon(order.status)}
                            {order.statusText}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {order.products} محصول
                        </td>
                        <td className="p-4 font-bold">{order.amount} تومان</td>
                        <td className="p-4 text-left">
                          <div className="flex gap-2 justify-end">
                            {order.trackingCode && (
                              <button
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-blue-500 dark:text-blue-400 group relative"
                                title="کد رهگیری"
                              >
                                <TruckIcon className="h-5 w-5" />
                                <span className="absolute bottom-full mb-2 right-1/2 transform translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  {order.trackingCode}
                                </span>
                              </button>
                            )}

                            <button
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                              title="فاکتور"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <Link href={`/orders${order.id}`}>
                              <button
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-indigo-500 dark:text-indigo-400"
                                title="جزئیات"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                نمایش {filteredOrders.length} سفارش از {allOrders.length} سفارش
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">سفارشی یافت نشد</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "هیچ سفارشی با این مشخصات پیدا نشد"
                    : "هیچ سفارشی با این وضعیت وجود ندارد"}
                </p>
                <div className="flex gap-3 justify-center">
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                    >
                      پاک کردن جستجو
                    </Button>
                  )}
                  {activeTab !== "all" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      onClick={() => setActiveTab("all")}
                    >
                      نمایش همه سفارش‌ها
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
                    <strong className="text-amber-600 dark:text-amber-400">
                      در انتظار پرداخت:
                    </strong>{" "}
                    سفارش شما ثبت شده و منتظر پرداخت است.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 ml-2 flex-shrink-0"></span>
                  <span>
                    <strong className="text-blue-600 dark:text-blue-400">
                      در حال ارسال:
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
                      لغو شده:
                    </strong>{" "}
                    سفارش شما به دلایلی لغو شده است.
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
                برای پیگیری وضعیت ارسال سفارش خود، می‌توانید از کد رهگیری پستی
                استفاده نمایید.
              </p>
              <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded-lg ml-3">
                  <TruckIcon className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-700 dark:text-purple-400">
                    پیگیری مرسولات پستی
                  </h4>
                  <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                    کد رهگیری را در قسمت جزئیات سفارش می‌توانید مشاهده کنید
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
