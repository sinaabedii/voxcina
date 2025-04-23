"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  Search,
  ArrowRight,
  CheckCircle,
  Clock,
  X,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  BarChart4,
  Package as PackageIcon,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";

export default function OrderTrackingPage() {
  const [trackingCode, setTrackingCode] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demoOrder = {
    id: "DGS-10002",
    date: "۱۴۰۲/۰۹/۰۲",
    currentStatus: "shipping",
    statusText: "در حال ارسال",
    trackingCode: "TRKP-76543210",
    customer: "علی محمدی",
    phone: "09123456789",
    address: "تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۲۴۵، واحد ۱۲",
    deliveryDate: "۱۴۰۲/۰۹/۰۴",
    items: [
      {
        name: "گوشی موبایل سامسونگ مدل Galaxy S23",
        quantity: 1,
        price: "۳۵,۰۰۰,۰۰۰ تومان",
      },
      {
        name: "قاب محافظ گوشی",
        quantity: 1,
        price: "۸۵۰,۰۰۰ تومان",
      },
    ],
    shippingMethod: "ارسال سریع",
    paymentMethod: "پرداخت آنلاین",
    totalPrice: "۳۵,۸۵۰,۰۰۰ تومان",
    timeline: [
      {
        status: "ordered",
        title: "سفارش ثبت شد",
        date: "۱۴۰۲/۰۹/۰۲ - ۱۰:۲۵",
        description: "سفارش شما با موفقیت ثبت شد و در انتظار پرداخت است.",
      },
      {
        status: "paid",
        title: "پرداخت انجام شد",
        date: "۱۴۰۲/۰۹/۰۲ - ۱۰:۳۰",
        description: "پرداخت شما با موفقیت انجام شد و سفارش شما تأیید شد.",
      },
      {
        status: "processing",
        title: "در حال آماده‌سازی",
        date: "۱۴۰۲/۰۹/۰۲ - ۱۴:۱۵",
        description: "سفارش شما در حال آماده‌سازی و بسته‌بندی است.",
      },
      {
        status: "shipping",
        title: "در حال ارسال",
        date: "۱۴۰۲/۰۹/۰۳ - ۰۹:۴۵",
        description:
          "سفارش شما به شرکت پستی تحویل داده شد و در مسیر ارسال است.",
      },
      {
        status: "delivered",
        title: "تحویل داده شده",
        date: "در انتظار تحویل",
        description: "سفارش هنوز تحویل نشده است.",
        pending: true,
      },
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!trackingCode && !orderPhone) {
      setError("لطفاً کد پیگیری یا شماره موبایل را وارد کنید.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 1500);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ordered":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
      case "paid":
        return "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "processing":
        return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "shipping":
        return "text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
      case "delivered":
        return "text-green-500 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "canceled":
        return "text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ordered":
        return <PackageIcon className="w-5 h-5" />;
      case "paid":
        return <CheckCircle className="w-5 h-5" />;
      case "processing":
        return <Clock className="w-5 h-5" />;
      case "shipping":
        return <Truck className="w-5 h-5" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5" />;
      case "canceled":
        return <X className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto py-24 px-4 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            پیگیری سفارش
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            با وارد کردن کد پیگیری یا شماره موبایل خود، می‌توانید از وضعیت سفارش
            خود مطلع شوید.
          </motion.p>
        </div>
      </div>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
              وضعیت سفارش خود را بررسی کنید
            </h2>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="trackingCode"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      کد پیگیری سفارش
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="trackingCode"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="مثال: DGS-10002"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        dir="ltr"
                      />
                      <Package className="absolute left-3 top-3.5 text-gray-400" />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
                    <span className="px-4 text-sm text-gray-500 dark:text-gray-400">
                      یا
                    </span>
                    <div className="flex-grow h-px bg-gray-200 dark:bg-gray-700"></div>
                  </div>

                  <div>
                    <label
                      htmlFor="orderPhone"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      شماره موبایل ثبت شده در سفارش
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="orderPhone"
                        value={orderPhone}
                        onChange={(e) => setOrderPhone(e.target.value)}
                        placeholder="09123456789"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        dir="ltr"
                      />
                      <Phone className="absolute left-3 top-3.5 text-gray-400" />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg">
                      <p className="flex items-center">
                        <AlertTriangle className="w-5 h-5 ml-2 flex-shrink-0" />
                        {error}
                      </p>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                          در حال جستجو...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5 ml-2" />
                          جستجوی سفارش
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      سفارش {demoOrder.id}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      تاریخ سفارش: {demoOrder.date}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${getStatusColor(
                        demoOrder.currentStatus
                      )}`}
                    >
                      {getStatusIcon(demoOrder.currentStatus)}
                      <span className="mr-1">{demoOrder.statusText}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                      <MapPin className="w-5 h-5 ml-2 text-indigo-500" />
                      آدرس تحویل
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {demoOrder.customer}
                      <br />
                      {demoOrder.phone}
                      <br />
                      {demoOrder.address}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                      <Calendar className="w-5 h-5 ml-2 text-indigo-500" />
                      اطلاعات تحویل
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      تاریخ تخمینی تحویل: {demoOrder.deliveryDate}
                      <br />
                      روش ارسال: {demoOrder.shippingMethod}
                      <br />
                      کد رهگیری پستی: {demoOrder.trackingCode}
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    وضعیت سفارش
                  </h4>

                  <div className="relative">
                    <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                    <div className="space-y-8">
                      {demoOrder.timeline.map((item, index) => (
                        <div
                          key={index}
                          className={`relative flex ${
                            item.pending ? "opacity-50" : ""
                          }`}
                        >
                          <div
                            className={`absolute right-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(
                              item.status
                            )}`}
                          ></div>
                          <div className="mr-12 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-gray-900 dark:text-white flex items-center">
                                  {getStatusIcon(item.status)}
                                  <span className="mr-2">{item.title}</span>
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {item.description}
                                </p>
                              </div>
                              <span
                                className={`text-sm ${
                                  item.pending
                                    ? "text-orange-500 dark:text-orange-400"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {item.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    اقلام سفارش
                  </h4>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="py-3 px-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                            محصول
                          </th>
                          <th className="py-3 px-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                            قیمت
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {demoOrder.items.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-4 px-4 text-gray-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                              {item.quantity}
                            </td>
                            <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                              {item.price}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td
                            colSpan={2}
                            className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            جمع کل:
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">
                            {demoOrder.totalPrice}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-indigo-600 dark:text-indigo-400 font-medium"
                  >
                    <ArrowRight className="w-5 h-5 inline ml-1" />
                    بازگشت به جستجو
                  </button>

                  <Link
                    href={`/contact?orderid=${demoOrder.id}`}
                    className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg"
                  >
                    پشتیبانی سفارش
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              راهنمای پیگیری سفارش
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              برای پیگیری سفارش خود می‌توانید از یکی از روش‌های زیر استفاده
              کنید.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                استفاده از کد پیگیری
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                کد پیگیری سفارش خود را که به صورت DGS-XXXXX است و در ایمیل
                تاییدیه سفارش برای شما ارسال شده وارد کنید.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                استفاده از شماره موبایل
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                شماره موبایلی که هنگام ثبت سفارش استفاده کرده‌اید را وارد کنید
                تا لیست سفارش‌های اخیر خود را مشاهده کنید.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <User className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                مشاهده از حساب کاربری
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                با ورود به حساب کاربری خود و مراجعه به بخش "سفارش‌های من"
                می‌توانید تمامی سفارش‌های خود را مشاهده کنید.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              وضعیت‌های سفارش
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              سفارش شما در فرآیند پردازش و تحویل، از وضعیت‌های مختلفی عبور
              می‌کند.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "ordered"
                  )}`}
                >
                  {getStatusIcon("ordered")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    سفارش ثبت شده
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    سفارش شما با موفقیت ثبت شده و در انتظار پرداخت است. در صورت
                    انتخاب پرداخت در محل، وضعیت به مرحله بعد می‌رود.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "paid"
                  )}`}
                >
                  {getStatusIcon("paid")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    پرداخت شده
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    پرداخت شما با موفقیت انجام شده و سفارش تأیید شده است. تیم ما
                    در حال بررسی و آماده‌سازی سفارش است.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "processing"
                  )}`}
                >
                  {getStatusIcon("processing")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    در حال آماده‌سازی
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    سفارش شما در حال آماده‌سازی و بسته‌بندی است. این مرحله بسته
                    به تعداد و نوع محصولات، ممکن است چند ساعت تا یک روز کاری طول
                    بکشد.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "shipping"
                  )}`}
                >
                  {getStatusIcon("shipping")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    در حال ارسال
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    سفارش شما به شرکت پستی تحویل داده شده و در مسیر ارسال است.
                    در این مرحله، کد رهگیری پستی برای شما ارسال می‌شود.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "delivered"
                  )}`}
                >
                  {getStatusIcon("delivered")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    تحویل داده شده
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    سفارش شما با موفقیت تحویل داده شده است. امیدواریم از خرید
                    خود راضی باشید!
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="flex items-start mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                    "canceled"
                  )}`}
                >
                  {getStatusIcon("canceled")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    لغو شده
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    سفارش شما به دلایلی لغو شده است. در صورت پرداخت آنلاین، مبلغ
                    پرداختی به حساب شما بازگردانده می‌شود.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-indigo-50 dark:bg-indigo-900/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                پیگیری پستی
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                پس از ارسال سفارش، کد رهگیری پستی برای شما ارسال می‌شود که
                می‌توانید وضعیت مرسوله خود را در سایت شرکت پستی پیگیری کنید.
              </p>
              <Link
                href="https://tracking.post.ir"
                target="_blank"
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
              >
                سایت پیگیری مرسولات پستی
                <ArrowRight className="w-4 h-4 mr-1" />
              </Link>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <BarChart4 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                آمار تحویل
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                ۹۵٪ از سفارش‌های ما در زمان تعیین شده تحویل داده می‌شوند. در
                صورت تأخیر در تحویل سفارش، هزینه ارسال به شما بازگردانده می‌شود.
              </p>
              <Link
                href="/shipping"
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
              >
                اطلاعات بیشتر درباره ارسال
                <ArrowRight className="w-4 h-4 mr-1" />
              </Link>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                ضمانت تحویل سالم
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                تمامی محصولات ما با بسته‌بندی استاندارد و مطمئن ارسال می‌شوند و
                در صورت آسیب دیدن کالا در حین حمل، امکان مرجوع کردن آن وجود
                دارد.
              </p>
              <Link
                href="/returns"
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
              >
                شرایط مرجوعی کالا
                <ArrowRight className="w-4 h-4 mr-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              نیاز به کمک دارید؟
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              در صورت نیاز به راهنمایی بیشتر یا هرگونه سوال درباره سفارش خود،
              می‌توانید با پشتیبانی ما تماس بگیرید.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                تماس با پشتیبانی
              </Link>
              <Link
                href="/faq"
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                سوالات متداول
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
