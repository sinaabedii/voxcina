"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  CreditCard,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  User,
  Lock,
  Search,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ShoppingGuidePage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const toggleStep = (index: number) => {
    setActiveStep(activeStep === index ? null : index);
  };

  const shoppingSteps = [
    {
      title: "ثبت‌نام و ورود به سایت",
      description:
        "برای شروع خرید، ابتدا باید در سایت ثبت‌نام کنید یا به حساب کاربری خود وارد شوید.",
      icon: <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />,
      details: [
        "روی گزینه «ورود/ثبت‌نام» در بالای سایت کلیک کنید.",
        "در صورتی که قبلاً ثبت‌نام کرده‌اید، مشخصات ورود خود را وارد کنید.",
        "اگر کاربر جدید هستید، گزینه «ثبت‌نام» را انتخاب کرده و فرم را تکمیل کنید.",
        "پس از تکمیل ثبت‌نام، یک ایمیل تأییدیه برای شما ارسال می‌شود.",
        "با کلیک روی لینک تأییدیه، حساب کاربری شما فعال می‌شود.",
      ],
      image: "/api/placeholder/600/300",
    },
    {
      title: "جستجو و انتخاب محصول",
      description: "محصول مورد نظر خود را جستجو کرده و به سبد خرید اضافه کنید.",
      icon: <Search className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />,
      details: [
        "از نوار جستجو در بالای سایت برای یافتن محصول مورد نظر استفاده کنید.",
        "می‌توانید از دسته‌بندی‌های محصولات نیز برای مرور کالاها استفاده کنید.",
        "با کلیک روی محصول، به صفحه جزئیات آن هدایت می‌شوید.",
        "در صفحه محصول، می‌توانید مشخصات، تصاویر و نظرات کاربران را مشاهده کنید.",
        "تعداد مورد نظر را انتخاب کرده و روی دکمه «افزودن به سبد خرید» کلیک کنید.",
      ],
      image: "/api/placeholder/600/300",
    },
    {
      title: "بررسی سبد خرید",
      description: "محتویات سبد خرید خود را بررسی و در صورت نیاز ویرایش کنید.",
      icon: <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />,
      details: [
        "پس از افزودن محصول به سبد خرید، می‌توانید با کلیک روی آیکون سبد خرید، محتویات آن را مشاهده کنید.",
        "در این صفحه می‌توانید تعداد محصولات را تغییر دهید یا آنها را حذف کنید.",
        "در صورت داشتن کد تخفیف، می‌توانید آن را در این مرحله وارد کنید.",
        "سیستم به صورت خودکار هزینه محصولات، تخفیف و مالیات را محاسبه می‌کند.",
        "پس از اطمینان از صحت سفارش، روی دکمه «ادامه فرآیند خرید» کلیک کنید.",
      ],
      image: "/api/placeholder/600/300",
    },
    {
      title: "ثبت اطلاعات ارسال",
      description: "آدرس و روش ارسال سفارش خود را مشخص کنید.",
      icon: <Package className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />,
      details: [
        "در این مرحله، آدرس محل تحویل سفارش را وارد یا از آدرس‌های ذخیره شده قبلی انتخاب کنید.",
        "روش ارسال مورد نظر خود (ارسال عادی، سریع یا تحویل حضوری) را انتخاب کنید.",
        "هزینه ارسال بر اساس وزن محصولات، مقصد و روش ارسال انتخابی محاسبه می‌شود.",
        "در صورت تمایل، می‌توانید یادداشتی برای سفارش خود اضافه کنید.",
        "پس از تکمیل اطلاعات، روی دکمه «ادامه به پرداخت» کلیک کنید.",
      ],
      image: "/api/placeholder/600/300",
    },
    {
      title: "پرداخت و تکمیل سفارش",
      description: "روش پرداخت را انتخاب کرده و سفارش خود را نهایی کنید.",
      icon: <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10" />,
      details: [
        "روش پرداخت مورد نظر (کارت بانکی، کیف پول یا پرداخت در محل) را انتخاب کنید.",
        "در صورت انتخاب پرداخت آنلاین، به درگاه بانکی هدایت می‌شوید.",
        "اطلاعات کارت بانکی خود را وارد کرده و پرداخت را تکمیل کنید.",
        "پس از تأیید پرداخت، به صفحه تأیید سفارش هدایت می‌شوید.",
        "یک ایمیل و پیامک تأییدیه حاوی جزئیات سفارش و کد پیگیری برای شما ارسال می‌شود.",
      ],
      image: "/api/placeholder/600/300",
    },
  ];

  const shoppingTips = [
    {
      title: "پیش از خرید مشخصات فنی را بررسی کنید",
      description:
        "همیشه قبل از خرید، مشخصات فنی محصول را به دقت مطالعه کنید تا از تناسب آن با نیازهای خود اطمینان حاصل کنید.",
    },
    {
      title: "از رمز عبور قوی استفاده کنید",
      description:
        "برای امنیت حساب کاربری خود، از رمز عبور قوی شامل ترکیبی از حروف، اعداد و نشانه‌ها استفاده کنید.",
    },
    {
      title: "اطلاعات حساب کاربری خود را به‌روز نگه دارید",
      description:
        "همیشه اطلاعات تماس و آدرس خود را در حساب کاربری به‌روز نگه دارید تا در فرآیند سفارش با مشکل مواجه نشوید.",
    },
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-voxcina-cream dark:bg-voxcina-darkBlue/90">
        {/* هدر نوآورانه با لایه‌های عمق */}
        <div className="relative overflow-hidden bg-transparent">
          {/* شکل‌های هندسی پس‌زمینه */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute -top-32 -right-32 w-64 h-64 border border-voxcina-blue/10 rounded-full"
            />
            <motion.div
              animate={{ 
                rotate: [360, 0],
                x: [0, 20, 0],
                y: [0, -10, 0]
              }}
              transition={{ 
                duration: 15, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-darkBlue/20 transform rotate-45"
            />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 md:py-24 lg:py-32 max-w-7xl">
            <div className="max-w-5xl mx-auto">
              
              {/* بخش متن با طراحی نامتقارن */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 items-center">
                
                {/* ستون سمت راست - متن */}
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
                    <span className="block">راهنمای</span>
                    <span className="block text-voxcina-blue relative">
                      خرید
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
                    <span className="text-voxcina-blue font-semibold"> خرید </span>
                    آسان و
                    <span className="text-voxcina-blue font-semibold"> امن </span>
                    می‌شود
                  </motion.p>
                </div>

                {/* ستون سمت چپ - عنصر بصری */}
                <div className="lg:col-span-5 order-1 lg:order-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="relative"
                  >
                    {/* دایره اصلی */}
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 mx-auto">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-voxcina-blue/30"
                      />
                      
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 sm:inset-3 md:inset-4 rounded-full border border-voxcina-blue/50"
                      />
                      
                      {/* مرکز */}
                      <div className="absolute inset-8 sm:inset-10 md:inset-12 lg:inset-14 xl:inset-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue rounded-full flex items-center justify-center shadow-2xl">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360]
                          }}
                          transition={{ 
                            duration: 8, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white"
                        >
                          V
                        </motion.div>
                      </div>

                      {/* نقاط اطراف */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: "easeInOut"
                          }}
                          className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-voxcina-blue rounded-full"
                          style={{
                            top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                            left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>

              </div>
            </div>
          </div>

          {/* خط جداکننده انیمیت شده */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 1.2 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-voxcina-blue/30 to-transparent origin-center"
          />
        </div>

        {/* بخش مراحل خرید */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                مراحل خرید
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                فرآیند خرید در سایت ما ساده و امن است. مراحل زیر را دنبال کنید
                تا خرید موفقی داشته باشید.
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto">
              {shoppingSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="mb-4 sm:mb-6 bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div
                    className="p-4 sm:p-6 cursor-pointer relative"
                    onClick={() => toggleStep(index)}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                    <div className="flex items-center relative z-10">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center ml-3 sm:ml-4 flex-shrink-0 shadow-lg">
                        {step.icon}
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-voxcina-blue dark:text-white">
                          {index + 1}. {step.title}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mt-1">
                          {step.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {activeStep === index ? (
                          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-voxcina-blue dark:text-secondary-200" />
                        ) : (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-voxcina-blue dark:text-secondary-200" />
                        )}
                      </div>
                    </div>
                  </div>

                  {activeStep === index && (
                    <motion.div
                      className="border-t border-voxcina-blue/10 dark:border-voxcina-blue/20"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <ul className="space-y-2 sm:space-y-3">
                              {step.details.map((detail, idx) => (
                                <li key={idx} className="flex items-start">
                                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                                    {detail}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-white/70 dark:bg-voxcina-blue/5 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
                            <img
                              src={step.image}
                              alt={step.title}
                              className="w-full h-32 sm:h-40 md:h-48 object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* بخش نکات مهم خرید */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-transparent relative">
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
                نکات مهم خرید
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                برای داشتن تجربه خرید بهتر و امن‌تر، به نکات زیر توجه کنید.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
              {shoppingTips.map((tip, index) => (
                <motion.div
                  key={index}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10 group relative overflow-hidden hover:scale-105"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="flex items-start mb-3 sm:mb-4 relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-lg sm:rounded-xl flex items-center justify-center ml-2 sm:ml-3 flex-shrink-0 shadow-lg">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-voxcina-blue dark:text-white">
                      {tip.title}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mr-10 sm:mr-12 relative z-10">
                    {tip.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* بخش امنیت و حریم خصوصی */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-5xl relative z-10 px-4">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                امنیت و حریم خصوصی
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
            </motion.div>

            <motion.div
              className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10 relative"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 sm:-mt-24 md:-mt-32 -mr-16 sm:-mr-24 md:-mr-32"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mb-16 sm:-mb-24 md:-mb-32 -ml-16 sm:-ml-24 md:-ml-32"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 relative z-10">
                <div>
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center ml-3 sm:ml-4 flex-shrink-0 shadow-lg">
                      <Lock className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-voxcina-blue dark:text-white">
                      امنیت پرداخت
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mb-3 sm:mb-4">
                    تمامی تراکنش‌های مالی در سایت ما با استفاده از پروتکل‌های
                    امنیتی SSL انجام می‌شود. اطلاعات کارت بانکی شما به صورت
                    مستقیم توسط درگاه بانکی دریافت شده و در سیستم‌های ما ذخیره
                    نمی‌شود.
                  </p>
                  <ul className="space-y-2 sm:space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        استفاده از درگاه‌های بانکی معتبر و دارای مجوز
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        رمزنگاری اطلاعات پرداخت با استاندارد SSL
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        عدم ذخیره‌سازی اطلاعات کارت بانکی در سیستم
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-secondary-600 to-secondary-400 text-white rounded-xl sm:rounded-2xl flex items-center justify-center ml-3 sm:ml-4 flex-shrink-0 shadow-lg">
                      <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-voxcina-blue dark:text-white">
                      حریم خصوصی
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mb-3 sm:mb-4">
                    ما به حریم خصوصی شما احترام می‌گذاریم و اطلاعات شخصی شما را
                    تنها برای پردازش سفارش و بهبود خدمات استفاده می‌کنیم.
                  </p>
                  <ul className="space-y-2 sm:space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        محافظت از اطلاعات شخصی مطابق با قوانین حفاظت از داده‌ها
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        عدم ارائه اطلاعات به اشخاص ثالث بدون اجازه شما
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-secondary-300">
                        امکان مشاهده و ویرایش اطلاعات شخصی در حساب کاربری
                      </span>
                    </li>
                  </ul>
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