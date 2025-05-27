"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCcw,
  Package,
  CheckCircle,
  Clock,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ReturnsPage() {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const faqs = [
    {
      question: "هزینه ارسال کالای مرجوعی به عهده چه کسی است؟",
      answer:
        "هزینه ارسال کالای مرجوعی در شرایط عادی به عهده مشتری است. اما در صورتی که کالا دارای ایراد فنی یا آسیب دیدگی باشد، هزینه ارسال توسط فروشگاه پرداخت می‌شود.",
    },
    {
      question: "چقدر طول می‌کشد تا پول من بازگردانده شود؟",
      answer:
        "پس از تأیید کالای مرجوعی توسط کارشناسان ما، مبلغ پرداختی شما حداکثر تا ۷۲ ساعت کاری به حساب یا کیف پول شما بازگردانده می‌شود. بازگشت وجه به کارت بانکی بسته به بانک صادرکننده ممکن است تا ۷۲ ساعت طول بکشد.",
    },
    {
      question: "آیا می‌توانم کالا را با محصول دیگری تعویض کنم؟",
      answer:
        "بله، امکان تعویض کالا با محصول دیگر وجود دارد. برای این کار می‌توانید در حساب کاربری خود در بخش «سفارش‌های من»، گزینه «درخواست تعویض» را انتخاب کرده و محصول جایگزین را مشخص کنید. در صورت اختلاف قیمت، مابه‌التفاوت دریافت یا پرداخت می‌شود.",
    },
    {
      question:
        "اگر کالا توسط شخص دیگری خریداری شده باشد، آیا می‌توانم آن را مرجوع کنم؟",
      answer:
        "بله، اما برای مرجوع کردن کالایی که توسط شخص دیگری خریداری شده است، نیاز به فاکتور خرید و رضایت‌نامه کتبی خریدار اصلی دارید. در غیر این صورت، فقط خریدار اصلی می‌تواند درخواست مرجوعی ثبت کند.",
    },
    {
      question: "در صورت دریافت کالای آسیب‌دیده چه کنم؟",
      answer:
        "در صورت دریافت کالای آسیب‌دیده، لطفاً در اسرع وقت (حداکثر تا ۲۴ ساعت پس از دریافت) با پشتیبانی ما تماس بگیرید. تصاویری از کالا و بسته‌بندی آسیب‌دیده تهیه کنید و از طریق حساب کاربری خود درخواست مرجوعی ثبت نمایید. در این شرایط، هزینه ارسال به عهده فروشگاه خواهد بود.",
    },
    {
      question: "آیا محصولات تخفیف‌دار هم قابل بازگشت هستند؟",
      answer:
        "بله، محصولات تخفیف‌دار نیز مشمول شرایط بازگشت می‌شوند، مگر اینکه در زمان خرید به‌صورت مشخص عنوان شده باشد که کالای مورد نظر غیرقابل بازگشت است. محصولات حراج ویژه ممکن است شرایط بازگشت متفاوتی داشته باشند که در صفحه محصول ذکر می‌شود.",
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
                    <span className="block">بازگشت</span>
                    <span className="block text-voxcina-blue relative">
                      کالا
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
                      رضایت{" "}
                    </span>
                    شما
                    <span className="text-voxcina-blue font-semibold">
                      {" "}
                      اولویت{" "}
                    </span>
                    ماست
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

        <section className="py-8 sm:py-12 px-4 -mt-8">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-t-4 border-voxcina-blue border border-voxcina-blue/10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-voxcina-blue dark:text-white text-center md:text-right">
                    ضمانت رضایت ۷ روزه
                  </h2>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mb-3 sm:mb-4">
                    ما به کیفیت محصولات خود اطمینان داریم و می‌خواهیم شما نیز با
                    خیال راحت خرید کنید. به همین دلیل، ضمانت بازگشت ۷ روزه را
                    برای تمامی محصولات ارائه می‌دهیم.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300">
                    اگر به هر دلیلی از خرید خود راضی نیستید، می‌توانید تا ۷ روز
                    پس از دریافت کالا، آن را بدون هیچ سوالی مرجوع کنید و وجه خود
                    را دریافت نمایید.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                شرایط بازگشت کالا
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
                  className="mb-4 sm:mb-6 bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10 transition-all duration-500 hover:bg-white/80 dark:hover:bg-voxcina-blue/10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div
                    className="p-4 sm:p-6 cursor-pointer transition-colors hover:bg-white/20 dark:hover:bg-voxcina-blue/10"
                    onClick={() => toggleAccordion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start">
                        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-voxcina-blue dark:text-secondary-300 mt-0.5 ml-2 sm:ml-3 flex-shrink-0" />
                        <h3 className="text-base sm:text-lg font-bold text-voxcina-blue dark:text-white">
                          {faq.question}
                        </h3>
                      </div>
                      {activeAccordion === index ? (
                        <ChevronUp className="w-5 h-5 text-voxcina-blue dark:text-secondary-300 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-voxcina-blue dark:text-secondary-300 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {activeAccordion === index && (
                    <motion.div
                      className="border-t border-voxcina-blue/10 dark:border-voxcina-blue/20 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mr-7 sm:mr-9">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
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
        {/* بخش شرایط بازگشت */}
