"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  Search,
  ArrowRight,
  ArrowLeft,
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
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ordered":
        return "text-voxcina-blue bg-secondary-100/70 dark:bg-voxcina-blue/20 dark:text-secondary-200 border border-secondary-200 dark:border-voxcina-blue/30";
      case "paid":
        return "text-voxcina-blue bg-secondary-100/70 dark:bg-voxcina-blue/20 dark:text-secondary-200 border border-secondary-200 dark:border-voxcina-blue/30";
      case "processing":
        return "text-green-600 bg-green-50/70 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800/30";
      case "shipping":
        return "text-voxcina-blue bg-secondary-100/70 dark:bg-voxcina-blue/20 dark:text-secondary-200 border border-secondary-200 dark:border-voxcina-blue/30";
      case "delivered":
        return "text-green-600 bg-green-50/70 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800/30";
      case "canceled":
        return "text-red-600 bg-red-50/70 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800/30";
      default:
        return "text-voxcina-blue/70 bg-secondary-100/50 dark:bg-voxcina-blue/10 dark:text-secondary-300 border border-secondary-200/50 dark:border-voxcina-blue/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ordered":
        return <PackageIcon className="w-5 h-5" />;
      case "paid":
        return <CheckCircle className="w-5 h-5" />;
      case "processing":
        return <CheckCircle className="w-5 h-5" />;
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
    <>
      <Header />

      <div className="min-h-screen bg-voxcina-cream dark:bg-voxcina-darkBlue/90">
        <div className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-64 h-64 bg-white/10 rounded-full -top-20 -left-20 blur-3xl"></div>
            <div className="absolute w-96 h-96 bg-primary-400/10 rounded-full -bottom-40 -right-20 blur-3xl"></div>
          </div>
          <div className="container mx-auto py-20 md:py-28 px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative inline-block mb-6"
            >
              <span className="text-xl text-secondary-200 font-light">
                Voxcina
              </span>
              <div className="w-full h-1 bg-secondary-200/30 mt-1 rounded-full"></div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 relative"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="relative z-10">پیگیری سفارش</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h1>

            <motion.p
              className="text-xl max-w-3xl mx-auto text-secondary-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              با وارد کردن کد پیگیری یا شماره موبایل خود، می‌توانید از وضعیت
              سفارش خود مطلع شوید.
            </motion.p>

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-voxcina-cream to-transparent dark:from-voxcina-darkBlue/90 dark:to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
            ></motion.div>
          </div>
        </div>
        <section className="py-12 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-3xl relative z-10">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft p-8 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200 text-center">
                وضعیت سفارش خود را بررسی کنید
              </h2>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="trackingCode"
                        className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
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
                          className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                          dir="ltr"
                        />
                        <Package className="absolute left-3 top-3.5 text-voxcina-blue/60 dark:text-secondary-300" />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="flex-grow h-px bg-secondary-200/50 dark:bg-voxcina-blue/20"></div>
                      <span className="px-4 text-sm text-voxcina-blue/60 dark:text-secondary-300">
                        یا
                      </span>
                      <div className="flex-grow h-px bg-secondary-200/50 dark:bg-voxcina-blue/20"></div>
                    </div>

                    <div>
                      <label
                        htmlFor="orderPhone"
                        className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
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
                          className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                          dir="ltr"
                        />
                        <Phone className="absolute left-3 top-3.5 text-voxcina-blue/60 dark:text-secondary-300" />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 text-red-700 dark:text-red-400 p-3 rounded-xl">
                        <p className="flex items-center">
                          <AlertTriangle className="w-5 h-5 ml-2 flex-shrink-0" />
                          {error}
                        </p>
                      </div>
                    )}

                    <div>
                      <button
                        type="submit"
                        className="w-full py-3 px-4 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue rounded-xl shadow-soft hover:shadow-medium transition-all flex items-center justify-center"
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
                  <div className="flex justify-between items-center mb-6 border-b border-secondary-200/50 dark:border-voxcina-blue/20 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                        سفارش {demoOrder.id}
                      </h3>
                      <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                        تاریخ سفارش: {demoOrder.date}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium inline-flex items-center ${getStatusColor(
                          demoOrder.currentStatus
                        )}`}
                      >
                        {getStatusIcon(demoOrder.currentStatus)}
                        <span className="mr-1">{demoOrder.statusText}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-5 rounded-xl border border-secondary-200/50 dark:border-voxcina-blue/20">
                      <h4 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-3 flex items-center">
                        <MapPin className="w-5 h-5 ml-2 text-voxcina-blue/70 dark:text-secondary-300" />
                        آدرس تحویل
                      </h4>
                      <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                        {demoOrder.customer}
                        <br />
                        {demoOrder.phone}
                        <br />
                        {demoOrder.address}
                      </p>
                    </div>

                    <div className="bg-secondary-100/50 dark:bg-voxcina-blue/5 p-5 rounded-xl border border-secondary-200/50 dark:border-voxcina-blue/20">
                      <h4 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-3 flex items-center">
                        <Calendar className="w-5 h-5 ml-2 text-voxcina-blue/70 dark:text-secondary-300" />
                        اطلاعات تحویل
                      </h4>
                      <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                        تاریخ تخمینی تحویل: {demoOrder.deliveryDate}
                        <br />
                        روش ارسال: {demoOrder.shippingMethod}
                        <br />
                        کد رهگیری پستی: {demoOrder.trackingCode}
                      </p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-4">
                      وضعیت سفارش
                    </h4>

                    <div className="relative">
                      <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-secondary-200/70 dark:bg-voxcina-blue/20"></div>

                      <div className="space-y-8">
                        {demoOrder.timeline.map((item, index) => (
                          <div
                            key={index}
                            className={`relative flex ${
                              item.pending ? "opacity-50" : ""
                            }`}
                          >
                            <div
                              className={`absolute right-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-voxcina-darkBlue ${
                                index <= 3
                                  ? "bg-voxcina-blue dark:bg-secondary-200"
                                  : "bg-secondary-200/70 dark:bg-voxcina-blue/40"
                              }`}
                            ></div>
                            <div className="mr-12 bg-white/90 dark:bg-voxcina-blue/10 p-5 rounded-xl border border-secondary-200 dark:border-voxcina-blue/20 w-full backdrop-blur-sm shadow-soft">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                                    {getStatusIcon(item.status)}
                                    <span className="mr-2">{item.title}</span>
                                  </h5>
                                  <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300 mt-1">
                                    {item.description}
                                  </p>
                                </div>
                                <span
                                  className={`text-sm ${
                                    item.pending
                                      ? "text-voxcina-blue/60 dark:text-secondary-300/70"
                                      : "text-voxcina-blue/70 dark:text-secondary-300"
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
                    <h4 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-4">
                      اقلام سفارش
                    </h4>

                    <div className="border border-secondary-200 dark:border-voxcina-blue/20 rounded-xl overflow-hidden bg-white/90 dark:bg-voxcina-blue/10 backdrop-blur-sm shadow-soft">
                      <table className="w-full">
                        <thead className="bg-secondary-100/70 dark:bg-voxcina-blue/20">
                          <tr>
                            <th className="py-3 px-4 text-right text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200">
                              محصول
                            </th>
                            <th className="py-3 px-4 text-right text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200">
                              تعداد
                            </th>
                            <th className="py-3 px-4 text-right text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200">
                              قیمت
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-200/50 dark:divide-voxcina-blue/10">
                          {demoOrder.items.map((item, index) => (
                            <tr
                              key={index}
                              className="hover:bg-secondary-100/30 dark:hover:bg-voxcina-blue/5 transition-colors"
                            >
                              <td className="py-4 px-4 text-voxcina-blue dark:text-secondary-200">
                                {item.name}
                              </td>
                              <td className="py-4 px-4 text-voxcina-blue/70 dark:text-secondary-300">
                                {item.quantity}
                              </td>
                              <td className="py-4 px-4 text-voxcina-blue/70 dark:text-secondary-300">
                                {item.price}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-secondary-100/70 dark:bg-voxcina-blue/20">
                          <tr>
                            <td
                              colSpan={2}
                              className="py-3 px-4 text-left text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200"
                            >
                              جمع کل:
                            </td>
                            <td className="py-3 px-4 text-sm font-bold text-voxcina-blue dark:text-secondary-200">
                              {demoOrder.totalPrice}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-secondary-200/50 dark:border-voxcina-blue/20">
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-voxcina-blue dark:text-secondary-300 font-medium hover:text-voxcina-blue/80 dark:hover:text-secondary-200 transition-colors"
                    >
                      <ArrowRight className="w-5 h-5 inline ml-1" />
                      بازگشت به جستجو
                    </button>

                    <Link
                      href={`/contact?orderid=${demoOrder.id}`}
                      className="px-4 py-2 bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 font-medium rounded-xl hover:bg-voxcina-blue/15 dark:hover:bg-voxcina-blue/30 transition-colors border border-voxcina-blue/20 dark:border-voxcina-blue/30"
                    >
                      پشتیبانی سفارش
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>
        <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">راهنمای پیگیری سفارش</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                برای پیگیری سفارش خود می‌توانید از یکی از روش‌های زیر استفاده
                کنید.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Package className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  استفاده از کد پیگیری
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  کد پیگیری سفارش خود را که به صورت DGS-XXXXX است و در ایمیل
                  تاییدیه سفارش برای شما ارسال شده وارد کنید.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Phone className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  استفاده از شماره موبایل
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  شماره موبایلی که هنگام ثبت سفارش استفاده کرده‌اید را وارد کنید
                  تا لیست سفارش‌های اخیر خود را مشاهده کنید.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <User className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  مشاهده از حساب کاربری
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  با ورود به حساب کاربری خود و مراجعه به بخش «سفارش‌های من»
                  می‌توانید تمامی سفارش‌های خود را مشاهده کنید.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">وضعیت‌های سفارش</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
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
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "ordered"
                    )}`}
                  >
                    {getStatusIcon("ordered")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      سفارش ثبت شده
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      سفارش شما با موفقیت ثبت شده و در انتظار پرداخت است. در
                      صورت انتخاب پرداخت در محل، وضعیت به مرحله بعد می‌رود.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "paid"
                    )}`}
                  >
                    {getStatusIcon("paid")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      پرداخت شده
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      پرداخت شما با موفقیت انجام شده و سفارش تأیید شده است. تیم
                      ما در حال بررسی و آماده‌سازی سفارش است.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "processing"
                    )}`}
                  >
                    {getStatusIcon("processing")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      در حال آماده‌سازی
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      سفارش شما در حال آماده‌سازی و بسته‌بندی است. این مرحله
                      بسته به تعداد و نوع محصولات، ممکن است چند ساعت تا یک روز
                      کاری طول بکشد.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "shipping"
                    )}`}
                  >
                    {getStatusIcon("shipping")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      در حال ارسال
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      سفارش شما به شرکت پستی تحویل داده شده و در مسیر ارسال است.
                      در این مرحله، کد رهگیری پستی برای شما ارسال می‌شود.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "delivered"
                    )}`}
                  >
                    {getStatusIcon("delivered")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      تحویل داده شده
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      سفارش شما با موفقیت تحویل داده شده است. امیدواریم از خرید
                      خود راضی باشید!
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-medium transition-all duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="flex items-start mb-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 ${getStatusColor(
                      "canceled"
                    )}`}
                  >
                    {getStatusIcon("canceled")}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
                      لغو شده
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm">
                      سفارش شما به دلایلی لغو شده است. در صورت پرداخت آنلاین،
                      مبلغ پرداختی به حساب شما بازگردانده می‌شود.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
        <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Truck className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  پیگیری پستی
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 text-center relative z-10">
                  پس از ارسال سفارش، کد رهگیری پستی برای شما ارسال می‌شود که
                  می‌توانید وضعیت مرسوله خود را در سایت شرکت پستی پیگیری کنید.
                </p>

                <div className="text-center relative z-10">
                  <Link
                    href="https://tracking.post.ir"
                    target="_blank"
                    className="text-voxcina-blue dark:text-secondary-300 font-medium hover:text-voxcina-blue/80 dark:hover:text-secondary-200 transition-colors inline-flex items-center"
                  >
                    سایت پیگیری مرسولات پستی
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <BarChart4 className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  آمار تحویل
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 text-center relative z-10">
                  ۹۵٪ از سفارش‌های ما در زمان تعیین شده تحویل داده می‌شوند. در
                  صورت تأخیر در تحویل سفارش، هزینه ارسال به شما بازگردانده
                  می‌شود.
                </p>

                <div className="text-center relative z-10">
                  <Link
                    href="/shipping"
                    className="text-voxcina-blue dark:text-secondary-300 font-medium hover:text-voxcina-blue/80 dark:hover:text-secondary-200 transition-colors inline-flex items-center"
                  >
                    اطلاعات بیشتر درباره ارسال
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Shield className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold mb-3 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  ضمانت تحویل سالم
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 text-center relative z-10">
                  تمامی محصولات ما با بسته‌بندی استاندارد و مطمئن ارسال می‌شوند
                  و در صورت آسیب دیدن کالا در حین حمل، امکان مرجوع کردن آن وجود
                  دارد.
                </p>

                <div className="text-center relative z-10">
                  <Link
                    href="/returns"
                    className="text-voxcina-blue dark:text-secondary-300 font-medium hover:text-voxcina-blue/80 dark:hover:text-secondary-200 transition-colors inline-flex items-center"
                  >
                    شرایط مرجوعی کالا
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-medium p-8 text-center border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-32 -mr-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mb-32 -ml-32"></div>

              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200">
                  نیاز به کمک دارید؟
                </h2>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-8 max-w-2xl mx-auto">
                  در صورت نیاز به راهنمایی بیشتر یا هرگونه سوال درباره سفارش
                  خود، می‌توانید با پشتیبانی ما تماس بگیرید.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block"
                  >
                    <Link
                      href="/contact"
                      className="inline-block w-full md:w-auto px-6 py-3 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue font-medium rounded-xl shadow-soft hover:shadow-medium transition-all"
                    >
                      تماس با پشتیبانی
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block"
                  >
                    <Link
                      href="/faq"
                      className="inline-block w-full md:w-auto px-6 py-3 bg-secondary-100/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-300 font-medium rounded-xl hover:bg-secondary-200/70 dark:hover:bg-voxcina-blue/30 transition-colors border border-secondary-200/50 dark:border-voxcina-blue/20"
                    >
                      سوالات متداول
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
