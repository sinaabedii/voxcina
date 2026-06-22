"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  BadgeCheck,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ShippingClient() {
  const shippingMethods = [
    {
      id: "express",
      title: "ارسال سریع",
      description: "ارسال در کمتر از ۲۴ ساعت به تهران و مراکز استان‌ها",
      icon: (
        <Truck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />
      ),
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
      icon: (
        <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />
      ),
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
      icon: (
        <MapPin className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />
      ),
      time: "آماده سازی در ۶ ساعت",
      price: "رایگان",
      features: [
        "بدون هزینه ارسال",
        "امکان بررسی محصول قبل از دریافت",
        "فقط در شعب تهران",
      ],
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
    <>
      <Header />
      <div className="min-h-screen max-w-6xl mx-auto dark:bg-voxcina-darkBlue/90">
        <div className="relative overflow-hidden bg-transparent">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-32 -right-32 w-64 h-64 border border-voxcina-blue/10 rounded-full"
            />
            <motion.div
              animate={{
                rotate: [360, 0],
                x: [0, 20, 0],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-darkBlue/20 transform rotate-45"
            />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 md:py-24 lg:py-32 max-w-7xl">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 items-center">
                <div className="lg:col-span-7 order-2 lg:order-1">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <span className="inline-block text-xs sm:text-sm text-voxcina-blue/70 dark:text-secondary-200/70 font-medium tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6 relative">
                      <span className="relative z-10">Voxcina</span>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="absolute bottom-0 left-0 h-px bg-voxcina-blue/50"
                      />
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold text-voxcina-darkBlue dark:text-white mb-4 sm:mb-6 md:mb-8 leading-none"
                  >
                    <span className="block">ارسال</span>
                    <span className="block text-voxcina-blue relative">
                      سفارش
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: 1 }}
                        className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-1 sm:h-2 bg-voxcina-blue/20 origin-left"
                      />
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-secondary-200/80 leading-relaxed max-w-2xl"
                  >
                    جایی که
                    <span className="text-voxcina-blue font-semibold">
                      {" "}
                      سرعت{" "}
                    </span>
                    با
                    <span className="text-voxcina-blue font-semibold">
                      {" "}
                      امنیت{" "}
                    </span>
                    ترکیب می‌شود
                  </motion.p>
                </div>

                <div className="lg:col-span-5 order-1 lg:order-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="relative"
                  >
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 mx-auto">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 30,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-voxcina-blue/30"
                      />

                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 25,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-2 sm:inset-3 md:inset-4 rounded-full border border-voxcina-blue/50"
                      />

                      <div className="absolute inset-8 sm:inset-10 md:inset-12 lg:inset-14 xl:inset-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue rounded-full flex items-center justify-center shadow-2xl">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360],
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white"
                        >
                          V
                        </motion.div>
                      </div>

                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: "easeInOut",
                          }}
                          className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-voxcina-blue rounded-full"
                          style={{
                            top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                            left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 1.2 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-voxcina-blue/30 to-transparent origin-center"
          />
        </div>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                روش‌های ارسال
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                با توجه به نیاز خود، می‌توانید یکی از روش‌های زیر را برای دریافت
                سفارش خود انتخاب کنید.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
              {shippingMethods.map((method, index) => (
                <motion.div
                  key={method.id}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10 group relative hover:scale-105"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="p-4 sm:p-6 relative z-10">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                      {method.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-voxcina-blue dark:text-white">
                      {method.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mb-4">
                      {method.description}
                    </p>

                    <div className="flex items-center justify-between mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-voxcina-blue/10 dark:border-voxcina-blue/20">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2" />
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300">
                          زمان تحویل:
                        </span>
                      </div>
                      <span className="text-sm sm:text-base font-medium text-voxcina-blue dark:text-secondary-200">
                        {method.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300">
                        هزینه ارسال:
                      </span>
                      <span className="text-sm sm:text-base font-bold text-voxcina-blue dark:text-secondary-200">
                        {method.price}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {method.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
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

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="absolute top-0 left-0 w-full h-full">
            <motion.div
              animate={{ x: [0, 50, 0], y: [0, -25, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-10 sm:top-20 right-10 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 border border-voxcina-blue/5 rounded-full"
            />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                فرآیند ارسال سفارش
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                سفارش شما از لحظه ثبت تا تحویل، مراحل زیر را طی می‌کند.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {[
                {
                  title: "ثبت سفارش",
                  description:
                    "سفارش شما ثبت شده و به سیستم انبار ارسال می‌شود.",
                  icon: (
                    <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  ),
                },
                {
                  title: "آماده‌سازی سفارش",
                  description:
                    "محصولات سفارش شما در انبار جمع‌آوری و بسته‌بندی می‌شوند.",
                  icon: (
                    <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  ),
                },
                {
                  title: "ارسال سفارش",
                  description:
                    "سفارش شما به شرکت پستی یا پیک تحویل داده می‌شود.",
                  icon: (
                    <Truck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  ),
                },
                {
                  title: "تحویل سفارش",
                  description: "سفارش به آدرس شما تحویل داده می‌شود.",
                  icon: (
                    <MapPin className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  ),
                },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg text-center relative border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10 overflow-hidden group hover:scale-105"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-12 sm:top-16 left-0 w-full h-0.5 bg-voxcina-blue/20 z-0"></div>
                  )}
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                    {step.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-voxcina-blue dark:text-white relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300 relative z-10">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                سوالات متداول
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  className="mb-4 sm:mb-6 bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10 group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="p-4 sm:p-6 relative">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                    <div className="flex items-start relative z-10">
                      <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-voxcina-blue dark:text-secondary-300 mt-1 ml-2 sm:ml-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-voxcina-blue dark:text-white mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
