"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  TruckIcon,
  Clock,
  ArrowRight,
  Calendar,
  Download,
  CreditCard,
  MapPin,
  Phone,
  ChevronLeft,
  User,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  Copy,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import Image from "next/image";

interface OrderDetailsParams {
  id: string;
}
export default function OrderDetailsPage({
  params,
}: {
  params: OrderDetailsParams;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [copied, setCopied] = useState(false);

  const orderId = params?.id || "DGS-10002";
  const orderDetails = {
    id: "DGS-10002",
    date: "۱۴۰۲/۰۹/۰۲",
    status: "shipping",
    statusText: "در حال ارسال",
    amount: "۱,۸۰۰,۰۰۰",
    discount: "۲۰۰,۰۰۰",
    shippingCost: "۵۰,۰۰۰",
    totalAmount: "۱,۶۵۰,۰۰۰",
    trackingCode: "TRKP-76543210",
    paymentMethod: "پرداخت آنلاین (درگاه ملت)",
    paymentDate: "۱۴۰۲/۰۹/۰۲",
    paymentStatus: "پرداخت شده",
    shippingMethod: "ارسال سریع (پست پیشتاز)",
    estimatedDeliveryDate: "۱۴۰۲/۰۹/۰۵",
    products: [
      {
        id: "P1001",
        title: "هدفون بی‌سیم سونی WH-1000XM4",
        image: "/api/placeholder/120/120",
        price: "۱,۲۰۰,۰۰۰",
        quantity: 1,
        color: "مشکی",
        warranty: "۱۸ ماه گارانتی",
        discount: "۱۰٪",
      },
      {
        id: "P1002",
        title: "کیف محافظ هدفون سونی",
        image: "/api/placeholder/120/120",
        price: "۶۰۰,۰۰۰",
        quantity: 1,
        color: "خاکستری",
        warranty: "گارانتی اصالت و سلامت فیزیکی",
        discount: "۱۵٪",
      },
    ],
    customer: {
      name: "محمد احمدی",
      phone: "۰۹۱۲۳۴۵۶۷۸۹",
      address: "تهران، خیابان ولیعصر، کوچه نیلوفر، پلاک ۲۳، واحد ۵",
      postalCode: "۱۴۳۴۵۶۷۸۹۰",
    },
    timeline: [
      {
        date: "۱۴۰۲/۰۹/۰۲ - ۱۰:۳۰",
        title: "ثبت سفارش",
        description: "سفارش شما با موفقیت ثبت شد.",
        status: "completed",
      },
      {
        date: "۱۴۰۲/۰۹/۰۲ - ۱۰:۳۵",
        title: "پرداخت",
        description: "پرداخت سفارش با موفقیت انجام شد.",
        status: "completed",
      },
      {
        date: "۱۴۰۲/۰۹/۰۳ - ۰۹:۱۵",
        title: "آماده‌سازی",
        description: "سفارش شما در حال آماده‌سازی است.",
        status: "completed",
      },
      {
        date: "۱۴۰۲/۰۹/۰۴ - ۱۴:۲۰",
        title: "ارسال",
        description: "سفارش شما تحویل پست داده شد.",
        status: "completed",
      },
      {
        date: "تخمینی: ۱۴۰۲/۰۹/۰۵",
        title: "تحویل",
        description: "زمان تخمینی تحویل سفارش به شما.",
        status: "pending",
      },
    ],
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-voxcina-blue dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
      case "shipping":
        return "bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-300 border border-voxcina-blue/20 dark:border-voxcina-blue/30";
      case "pending":
        return "bg-amber-100 text-voxcina-blue dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30";
      case "cancelled":
        return "bg-red-100 text-voxcina-blue dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/30";
      default:
        return "bg-secondary-100 text-voxcina-blue dark:bg-secondary-800/20 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-800/30";
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center mb-4 sm:mb-0">
          <Link href="/dashboard/orders">
            <motion.div
              className="w-10 h-10 bg-secondary-100 dark:bg-voxcina-blue/20 rounded-xl flex items-center justify-center ml-3 text-voxcina-blue dark:text-secondary-200 shadow-soft hover:bg-secondary-200 dark:hover:bg-voxcina-blue/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              role="button"
              aria-label="بازگشت به لیست سفارش‌ها"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-secondary-200 relative">
            <span className="relative z-10">جزئیات سفارش</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
          </h1>
        </div>

        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              <Download className="w-4 h-4 ml-2" />
              دانلود فاکتور
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {orderDetails.status === "shipping" && (
              <Button
                variant="primary"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
              >
                <TruckIcon className="w-4 h-4 ml-2" />
                پیگیری مرسوله
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`order-details-${isLoading}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {isLoading ? (
            <motion.div variants={itemVariants}>
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                <CardContent className="p-8 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      <Package className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
                    </div>
                    <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
                      در حال بارگذاری جزئیات سفارش...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              <motion.div variants={itemVariants} className="mb-6">
                <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-5 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 rounded-2xl bg-secondary-100/50 dark:bg-voxcina-blue/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>
                        <div className="relative z-10 mb-4 md:mb-0">
                          <div className="flex items-center mb-2">
                            <span className="font-bold text-voxcina-blue dark:text-secondary-200 ml-2">
                              شماره سفارش:
                            </span>
                            <span className="text-voxcina-blue/70 dark:text-secondary-300">
                              {orderDetails.id}
                            </span>
                            <motion.button
                              className="text-voxcina-blue/60 dark:text-secondary-300/60 hover:text-voxcina-blue dark:hover:text-secondary-300 mr-2 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => copyToClipboard(orderDetails.id)}
                              title={copied ? "کپی شد!" : "کپی"}
                            >
                              <Copy className="w-4 h-4" />
                            </motion.button>
                          </div>
                          <div className="flex items-center mb-2">
                            <Calendar className="w-4 h-4 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                            <span className="font-bold text-voxcina-blue dark:text-secondary-200 ml-2">
                              تاریخ ثبت:
                            </span>
                            <span className="text-voxcina-blue/70 dark:text-secondary-300">
                              {orderDetails.date}
                            </span>
                          </div>
                          {orderDetails.trackingCode && (
                            <div className="flex items-center">
                              <TruckIcon className="w-4 h-4 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                              <span className="font-bold text-voxcina-blue dark:text-secondary-200 ml-2">
                                کد رهگیری:
                              </span>
                              <div className="inline-flex items-center">
                                <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                  {orderDetails.trackingCode}
                                </span>
                                <motion.button
                                  className="text-voxcina-blue/60 dark:text-secondary-300/60 hover:text-voxcina-blue dark:hover:text-secondary-300 mr-2 transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    copyToClipboard(orderDetails.trackingCode)
                                  }
                                  title={copied ? "کپی شد!" : "کپی"}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-end">
                            <span
                              className={`px-4 py-2 rounded-xl text-sm flex items-center ${getStatusStyle(
                                orderDetails.status
                              )}`}
                            >
                              {getStatusIcon(orderDetails.status)}
                              {orderDetails.statusText}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-secondary-100/50 dark:bg-voxcina-blue/5 p-4 md:p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>
                        <div className="relative z-10">
                          <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-4">
                            صورتحساب
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                مجموع:
                              </span>
                              <span className="text-voxcina-blue dark:text-secondary-200">
                                {orderDetails.amount} تومان
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                تخفیف:
                              </span>
                              <span className="text-voxcina-blue dark:text-secondary-200">
                                - {orderDetails.discount} تومان
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                هزینه ارسال:
                              </span>
                              <span className="text-voxcina-blue dark:text-secondary-200">
                                {orderDetails.shippingCost} تومان
                              </span>
                            </div>
                            <div className="border-t border-secondary-200 dark:border-voxcina-blue/20 pt-2 mt-2">
                              <div className="flex justify-between font-bold">
                                <span className="text-voxcina-blue dark:text-secondary-200">
                                  مبلغ کل:
                                </span>
                                <span className="text-voxcina-blue dark:text-secondary-200">
                                  {orderDetails.totalAmount} تومان
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants} className="mb-6">
                <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-secondary-100 dark:scrollbar-thumb-voxcina-blue/30 dark:scrollbar-track-voxcina-darkBlue/20">
                  <div className="inline-flex bg-secondary-100 dark:bg-voxcina-darkBlue/20 rounded-xl p-1 min-w-full sm:min-w-0 shadow-inner-soft backdrop-blur-sm">
                    <motion.button
                      className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
                        activeTab === "products"
                          ? "bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200"
                          : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10"
                      }`}
                      onClick={() => setActiveTab("products")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 ml-1" />
                        محصولات
                      </div>
                    </motion.button>
                    <motion.button
                      className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
                        activeTab === "shipping"
                          ? "bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200"
                          : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10"
                      }`}
                      onClick={() => setActiveTab("shipping")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center">
                        <TruckIcon className="w-4 h-4 ml-1" />
                        اطلاعات ارسال
                      </div>
                    </motion.button>
                    <motion.button
                      className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
                        activeTab === "payment"
                          ? "bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200"
                          : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10"
                      }`}
                      onClick={() => setActiveTab("payment")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center">
                        <CreditCard className="w-4 h-4 ml-1" />
                        اطلاعات پرداخت
                      </div>
                    </motion.button>
                    <motion.button
                      className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
                        activeTab === "timeline"
                          ? "bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200"
                          : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10"
                      }`}
                      onClick={() => setActiveTab("timeline")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center">
                        <Clock className="w-4 h-4 ml-1" />
                        زمان‌بندی
                      </div>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
              <AnimatePresence mode="wait">
                {activeTab === "products" && (
                  <motion.div
                    key="products-tab"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                      <CardHeader className="border-b border-secondary-200/70 dark:border-voxcina-darkBlue/30 bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 py-4">
                        <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                          محصولات سفارش
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-secondary-100 dark:scrollbar-thumb-voxcina-blue/30 dark:scrollbar-track-voxcina-darkBlue/20">
                          <table className="w-full">
                            <thead className="bg-secondary-100/50 dark:bg-voxcina-darkBlue/20">
                              <tr>
                                <th className="text-right px-6 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  محصول
                                </th>
                                <th className="text-right px-4 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  رنگ
                                </th>
                                <th className="text-right px-4 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  گارانتی
                                </th>
                                <th className="text-right px-4 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  تعداد
                                </th>
                                <th className="text-right px-4 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  قیمت واحد
                                </th>
                                <th className="text-right px-6 py-3 text-voxcina-blue/80 dark:text-secondary-300 font-medium text-sm">
                                  تخفیف
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderDetails.products.map((product, index) => (
                                <tr
                                  key={product.id}
                                  className={`border-b last:border-b-0 border-secondary-200/30 dark:border-voxcina-darkBlue/20 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/5 transition-colors`}
                                >
                                  <td className="py-4 px-6">
                                    <div className="flex items-center">
                                      <div className="w-16 h-16 rounded-xl overflow-hidden ml-3 bg-secondary-100 dark:bg-voxcina-blue/20 shadow-soft relative">
                                        <img
                                          src={product.image}
                                          alt={product.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-1">
                                          {product.title}
                                        </h4>
                                        <p className="text-xs text-voxcina-blue/60 dark:text-secondary-300/80">
                                          کد: {product.id}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-voxcina-blue/70 dark:text-secondary-300">
                                    {product.color}
                                  </td>
                                  <td className="py-4 px-4 text-voxcina-blue/70 dark:text-secondary-300">
                                    {product.warranty}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="bg-secondary-100 dark:bg-voxcina-blue/20 w-8 h-8 rounded-lg flex items-center justify-center text-voxcina-blue dark:text-secondary-300 font-medium">
                                      {product.quantity}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 font-medium text-voxcina-blue dark:text-secondary-200">
                                    {product.price} تومان
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg px-2 py-1">
                                      {product.discount}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-secondary-200/70 dark:border-voxcina-darkBlue/30 p-4 bg-secondary-100/50 dark:bg-voxcina-darkBlue/20 flex justify-between items-center">
                        <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                          تعداد محصولات: {orderDetails.products.length}
                        </span>
                        <span className="text-sm font-medium text-voxcina-blue dark:text-secondary-200">
                          مجموع: {orderDetails.amount} تومان
                        </span>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}
                {activeTab === "shipping" && (
                  <motion.div
                    key="shipping-tab"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                      <CardHeader className="border-b border-secondary-200/70 dark:border-voxcina-darkBlue/30 bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 py-4">
                        <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                          اطلاعات ارسال
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-5 rounded-2xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>
                            <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-4 relative z-10">
                              اطلاعات گیرنده
                            </h3>

                            <div className="flex items-start relative z-10">
                              <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                  نام و نام خانوادگی
                                </div>
                                <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                  {orderDetails.customer.name}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start relative z-10">
                              <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                  شماره تماس
                                </div>
                                <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                  {orderDetails.customer.phone}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start relative z-10">
                              <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                  آدرس تحویل
                                </div>
                                <div className="text-voxcina-blue dark:text-secondary-200">
                                  {orderDetails.customer.address}
                                </div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mt-1">
                                  کد پستی: {orderDetails.customer.postalCode}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-5 rounded-2xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>
                            <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-4 relative z-10">
                              جزئیات ارسال
                            </h3>

                            <div className="flex items-start relative z-10">
                              <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                <TruckIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                  روش ارسال
                                </div>
                                <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                  {orderDetails.shippingMethod}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start relative z-10">
                              <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                  زمان تخمینی تحویل
                                </div>
                                <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                  {orderDetails.estimatedDeliveryDate}
                                </div>
                              </div>
                            </div>

                            {orderDetails.trackingCode && (
                              <div className="flex items-start relative z-10">
                                <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="flex-grow">
                                  <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                    کد رهگیری مرسوله
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                      {orderDetails.trackingCode}
                                    </div>
                                    <motion.button
                                      className="text-voxcina-blue/60 dark:text-secondary-300/60 hover:text-voxcina-blue dark:hover:text-secondary-300 transition-colors"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() =>
                                        copyToClipboard(
                                          orderDetails.trackingCode
                                        )
                                      }
                                      title={copied ? "کپی شد!" : "کپی"}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <motion.div
                              className="mt-5"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                variant="outline"
                                className="w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                              >
                                <TruckIcon className="w-4 h-4 ml-2" />
                                رهگیری مرسوله
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {activeTab === "payment" && (
                  <motion.div
                    key="payment-tab"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                      <CardHeader className="border-b border-secondary-200/70 dark:border-voxcina-darkBlue/30 bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 py-4">
                        <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                          اطلاعات پرداخت
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-5 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                              <div className="flex items-start">
                                <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                  <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                    روش پرداخت
                                  </div>
                                  <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                    {orderDetails.paymentMethod}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start">
                                <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                  <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                    تاریخ پرداخت
                                  </div>
                                  <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                    {orderDetails.paymentDate}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-start">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft border border-green-200 dark:border-green-800/30">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                    وضعیت پرداخت
                                  </div>
                                  <div className="text-green-600 dark:text-green-400 font-medium">
                                    {orderDetails.paymentStatus}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start">
                                <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                                  <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm text-voxcina-blue/60 dark:text-secondary-300/80 mb-1">
                                    مبلغ پرداخت شده
                                  </div>
                                  <div className="text-voxcina-blue dark:text-secondary-200 font-medium">
                                    {orderDetails.totalAmount} تومان
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 p-4 bg-white/80 dark:bg-voxcina-blue/10 rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft relative z-10">
                            <h4 className="text-base font-bold text-voxcina-blue dark:text-secondary-200 mb-3 flex items-center">
                              <AlertCircle className="w-5 h-5 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                              نکات مهم
                            </h4>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-start">
                                <div className="w-4 h-4 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center mt-1 ml-2 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-voxcina-blue dark:bg-secondary-300"></span>
                                </div>
                                <span className="text-voxcina-blue/80 dark:text-secondary-300">
                                  رسید پرداخت به صورت خودکار از طریق پیامک و
                                  ایمیل برای شما ارسال شده است.
                                </span>
                              </li>
                              <li className="flex items-start">
                                <div className="w-4 h-4 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center mt-1 ml-2 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-voxcina-blue dark:bg-secondary-300"></span>
                                </div>
                                <span className="text-voxcina-blue/80 dark:text-secondary-300">
                                  در صورت هرگونه سوال یا ابهام در خصوص پرداخت،
                                  می‌توانید با پشتیبانی تماس بگیرید.
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-secondary-200/70 dark:border-voxcina-darkBlue/30 p-4 bg-secondary-100/50 dark:bg-voxcina-darkBlue/20 flex justify-end">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                          >
                            <Download className="w-4 h-4 ml-2" />
                            دانلود فاکتور
                          </Button>
                        </motion.div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}
                {activeTab === "timeline" && (
                  <motion.div
                    key="timeline-tab"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                      <CardHeader className="border-b border-secondary-200/70 dark:border-voxcina-darkBlue/30 bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 py-4">
                        <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                          زمان‌بندی سفارش
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="relative">
                          <div className="absolute top-0 right-5 bottom-0 w-0.5 bg-secondary-200 dark:bg-voxcina-blue/20"></div>

                          <div className="space-y-8">
                            {orderDetails.timeline.map((item, index) => (
                              <div key={index} className="relative z-10">
                                <div className="flex">
                                  <div className="relative mr-5">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center mr-5 shadow-soft ${
                                        item.status === "completed"
                                          ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30"
                                          : "bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 border border-secondary-200 dark:border-voxcina-blue/30"
                                      }`}
                                    >
                                      {item.status === "completed" ? (
                                        <CheckCircle className="w-5 h-5" />
                                      ) : (
                                        <Clock className="w-5 h-5" />
                                      )}
                                    </div>
                                    <div className="absolute top-0 right-10 h-full w-5 flex items-center">
                                      <ChevronLeft className="w-5 h-5 text-secondary-300 dark:text-voxcina-blue/40" />
                                    </div>
                                  </div>

                                  <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-4 rounded-2xl flex-grow relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-10 -mr-10"></div>

                                    <div className="relative z-10">
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                                        <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                                          {item.title}
                                        </h3>
                                        <span className="text-sm text-voxcina-blue/60 dark:text-secondary-300 bg-white/80 dark:bg-voxcina-blue/10 px-3 py-1 rounded-lg shadow-soft inline-flex items-center mt-2 md:mt-0">
                                          <Calendar className="w-4 h-4 ml-1" />
                                          {item.date}
                                        </span>
                                      </div>
                                      <p className="text-voxcina-blue/70 dark:text-secondary-300">
                                        {item.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-secondary-200/70 dark:border-voxcina-darkBlue/30 p-4 bg-secondary-100/50 dark:bg-voxcina-darkBlue/20">
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400 ml-2"></div>
                            <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                              تکمیل شده
                            </span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-voxcina-blue/60 dark:bg-secondary-300 ml-2"></div>
                            <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                              در انتظار
                            </span>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="flex justify-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Link href="/orders">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              بازگشت به لیست سفارش‌ها
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
