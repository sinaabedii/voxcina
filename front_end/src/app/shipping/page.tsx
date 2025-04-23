"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  ShieldCheck,
  BadgeCheck,
  BadgeInfo,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function ShippingPage() {
  const shippingMethods = [
    {
      id: "express",
      title: "ارسال سریع",
      description: "ارسال در کمتر از ۲۴ ساعت به تهران و مراکز استان‌ها",
      icon: <Truck className="w-10 h-10" />,
      time: "۲۴ ساعته",
      price: "از ۳۵,۰۰۰ تومان",
      features: [
        "تحویل ظرف ۲۴ ساعت",
        "پیگیری آنلاین سفارش",
        "هزینه بالاتر نسبت به سایر روش‌ها",
      ],
    },
    {
      id: "standard",
      title: "ارسال عادی",
      description: "ارسال بین ۲ تا ۴ روز کاری به سراسر کشور",
      icon: <Package className="w-10 h-10" />,
      time: "۲ تا ۴ روز کاری",
      price: "از ۲۰,۰۰۰ تومان",
      features: [
        "مقرون به صرفه‌ترین روش ارسال",
        "پیگیری آنلاین سفارش",
        "ارسال به تمام نقاط کشور",
      ],
    },
    {
      id: "inshop",
      title: "تحویل حضوری",
      description: "دریافت سفارش از شعب فروشگاه در تهران",
      icon: <MapPin className="w-10 h-10" />,
      time: "آماده سازی در ۶ ساعت",
      price: "رایگان",
      features: [
        "بدون هزینه ارسال",
        "امکان بررسی محصول قبل از دریافت",
        "فقط در شعب تهران",
      ],
    },
  ];

  const coverageAreas = [
    {
      region: "تهران",
      expressTime: "۲۴ ساعت",
      standardTime: "۱ تا ۲ روز کاری",
    },
    {
      region: "مراکز استان‌ها",
      expressTime: "۲۴ تا ۴۸ ساعت",
      standardTime: "۲ تا ۴ روز کاری",
    },
    {
      region: "سایر شهرها",
      expressTime: "۴۸ تا ۷۲ ساعت",
      standardTime: "۳ تا ۵ روز کاری",
    },
    {
      region: "مناطق دورافتاده",
      expressTime: "تا ۹۶ ساعت",
      standardTime: "۵ تا ۷ روز کاری",
    },
  ];

  const faqs = [
    {
      question: "هزینه ارسال برای سفارش‌های بالای چه مبلغی رایگان است؟",
      answer:
        "هزینه ارسال برای سفارش‌های بالای ۵۰۰,۰۰۰ تومان به صورت عادی و برای سفارش‌های بالای ۱,۰۰۰,۰۰۰ تومان به صورت سریع رایگان است.",
    },
    {
      question: "آیا امکان انتخاب ساعت دقیق تحویل وجود دارد؟",
      answer:
        "در حال حاضر امکان انتخاب ساعت دقیق تحویل وجود ندارد، اما برای ارسال‌های سریع، بازه زمانی صبح (۹ تا ۱۳) یا عصر (۱۳ تا ۱۸) قابل انتخاب است.",
    },
    {
      question: "آیا هزینه ارسال برای محصولات حجیم متفاوت است؟",
      answer:
        "بله، هزینه ارسال برای محصولات حجیم و سنگین (بیش از ۵ کیلوگرم) متفاوت است و در زمان ثبت سفارش محاسبه و نمایش داده می‌شود.",
    },
    {
      question: "در صورت عدم دریافت سفارش در زمان تعیین شده چه باید کرد؟",
      answer:
        'در صورت تاخیر در تحویل سفارش، می‌توانید از طریق بخش "پیگیری سفارش" در حساب کاربری خود یا تماس با پشتیبانی به شماره ۰۲۱-۸۸۷۷۶۶۵۵، وضعیت سفارش خود را پیگیری کنید.',
    },
  ];

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
            نحوه ارسال سفارش‌ها
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ما تمام تلاش خود را می‌کنیم تا سفارش شما را در سریع‌ترین زمان ممکن و
            با بهترین کیفیت به دست شما برسانیم.
          </motion.p>
        </div>
      </div>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              روش‌های ارسال
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              با توجه به نیاز خود، می‌توانید یکی از روش‌های زیر را برای دریافت
              سفارش خود انتخاب کنید.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {shippingMethods.map((method, index) => (
              <motion.div
                key={method.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <div className="p-6">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                    {method.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                    {method.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {method.description}
                  </p>

                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-500 ml-2" />
                      <span className="text-gray-700 dark:text-gray-300">
                        زمان تحویل:
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {method.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <span className="text-gray-700 dark:text-gray-300">
                      هزینه ارسال:
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {method.price}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {method.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              مناطق تحت پوشش
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              زمان‌بندی تخمینی تحویل سفارش در مناطق مختلف کشور به شرح زیر است.
            </p>
          </motion.div>

          <motion.div
            className="max-w-4xl mx-auto bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    منطقه
                  </th>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    زمان تحویل سریع
                  </th>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    زمان تحویل عادی
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {coverageAreas.map((area, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/70"
                  >
                    <td className="py-4 px-6 text-gray-900 dark:text-white">
                      {area.region}
                    </td>
                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                      {area.expressTime}
                    </td>
                    <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                      {area.standardTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.p
            className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            * زمان‌های ارائه شده تخمینی هستند و ممکن است در شرایط خاص (مانند
            تعطیلات رسمی، شرایط آب و هوایی نامساعد و...) تغییر کنند.
          </motion.p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              فرآیند ارسال سفارش
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              سفارش شما از لحظه ثبت تا تحویل، مراحل زیر را طی می‌کند.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                title: "ثبت سفارش",
                description: "سفارش شما ثبت شده و به سیستم انبار ارسال می‌شود.",
                icon: <BadgeCheck className="w-8 h-8" />,
                color:
                  "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
              },
              {
                title: "آماده‌سازی سفارش",
                description:
                  "محصولات سفارش شما در انبار جمع‌آوری و بسته‌بندی می‌شوند.",
                icon: <Package className="w-8 h-8" />,
                color:
                  "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
              },
              {
                title: "ارسال سفارش",
                description: "سفارش شما به شرکت پستی یا پیک تحویل داده می‌شود.",
                icon: <Truck className="w-8 h-8" />,
                color:
                  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
              },
              {
                title: "تحویل سفارش",
                description: "سفارش به آدرس شما تحویل داده می‌شود.",
                icon: <MapPin className="w-8 h-8" />,
                color:
                  "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {index < 3 && (
                  <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-indigo-200 dark:bg-indigo-800 z-0"></div>
                )}
                <div
                  className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 relative z-10`}
                >
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              تضمین‌های ما
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                بسته‌بندی امن
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                تمامی محصولات با بسته‌بندی استاندارد و مقاوم ارسال می‌شوند تا از
                سلامت کالا در طول مسیر اطمینان حاصل شود.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                تحویل به موقع
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                در صورت تاخیر در تحویل سفارش (بیش از زمان تعیین شده)، هزینه
                ارسال به شما بازگردانده می‌شود.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <BadgeInfo className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                پیگیری آنلاین
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                با استفاده از کد رهگیری پیامک شده، می‌توانید در هر لحظه از وضعیت
                سفارش خود مطلع شوید.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              سوالات متداول
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-5">
                  <div className="flex items-start">
                    <HelpCircle className="w-5 h-5 text-indigo-500 mt-1 ml-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="text-gray-600 dark:text-gray-400">
              سوال دیگری دارید؟
              <Link
                href="/faq"
                className="text-indigo-600 dark:text-indigo-400 hover:underline mr-1"
              >
                به صفحه سوالات متداول مراجعه کنید
              </Link>
              یا
              <Link
                href="/contact"
                className="text-indigo-600 dark:text-indigo-400 hover:underline mr-1 ml-1"
              >
                با ما تماس بگیرید
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-indigo-50 dark:bg-indigo-900/20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              پیگیری سفارش
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              برای پیگیری وضعیت سفارش خود می‌توانید از کد رهگیری پیامک شده
              استفاده کنید یا به صفحه پیگیری سفارش مراجعه نمایید.
            </p>
            <Link
              href="/tracking"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Truck className="w-5 h-5 ml-2" />
              پیگیری سفارش
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
