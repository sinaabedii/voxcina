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
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ReturnsPage() {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const returnPolicies = [
    {
      title: "کالای سالم و بدون استفاده",
      description:
        "در صورتی که کالا سالم و بدون استفاده باشد، می‌توانید آن را تا ۷ روز پس از دریافت، بدون دلیل خاصی مرجوع کنید.",
    },
    {
      title: "بسته‌بندی اصلی",
      description:
        "کالای مرجوعی باید در بسته‌بندی اصلی و همراه با تمامی لوازم جانبی، دفترچه راهنما و کارت گارانتی باشد.",
    },
    {
      title: "فاکتور خرید",
      description:
        "برای مرجوع کردن کالا، باید فاکتور خرید را ارائه دهید. بدون فاکتور، امکان بازگشت کالا وجود ندارد.",
    },
    {
      title: "محصولات غیرقابل بازگشت",
      description:
        "برخی کالاها مانند محصولات بهداشتی، مواد غذایی، نرم‌افزارها و محصولاتی که پلمپ آن‌ها باز شده است، قابل بازگشت نیستند.",
    },
  ];

  const returnSteps = [
    {
      title: "ثبت درخواست بازگشت",
      description:
        "ابتدا وارد حساب کاربری خود شوید و در بخش «سفارش‌های من»، گزینه «درخواست بازگشت» را برای سفارش مورد نظر انتخاب کنید.",
      icon: <RefreshCcw className="w-10 h-10" />,
    },
    {
      title: "بسته‌بندی محصول",
      description:
        "محصول را همراه با تمامی لوازم جانبی، در بسته‌بندی اصلی و به صورت صحیح بسته‌بندی کنید.",
      icon: <Package className="w-10 h-10" />,
    },
    {
      title: "ارسال کالا",
      description:
        "پس از تأیید درخواست، کالا را از طریق پست یا پیک به آدرسی که به شما اعلام می‌شود، ارسال کنید.",
      icon: <Clock className="w-10 h-10" />,
    },
    {
      title: "بررسی و تأیید",
      description:
        "پس از دریافت کالا، کارشناسان ما آن را بررسی کرده و در صورت تأیید، مبلغ به حساب شما بازگردانده می‌شود.",
      icon: <CheckCircle className="w-10 h-10" />,
    },
  ];

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
              <span className="relative z-10">شرایط بازگشت کالا</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h1>

            <motion.p
              className="text-xl max-w-3xl mx-auto text-secondary-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              ما تمام تلاش خود را می‌کنیم تا شما از خرید خود راضی باشید، اما اگر
              به هر دلیلی قصد بازگشت کالا را دارید، این صفحه راهنمای شماست.
            </motion.p>

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-voxcina-cream to-transparent dark:from-voxcina-darkBlue/90 dark:to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
            ></motion.div>
          </div>
        </div>

        <section className="py-12 px-4 -mt-8">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft p-6 md:p-8 border-t-4 border-voxcina-blue border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-20 h-20 bg-secondary-100/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 text-center md:text-right">
                    ضمانت رضایت ۷ روزه
                  </h2>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4">
                    ما به کیفیت محصولات خود اطمینان داریم و می‌خواهیم شما نیز با
                    خیال راحت خرید کنید. به همین دلیل، ضمانت بازگشت ۷ روزه را
                    برای تمامی محصولات ارائه می‌دهیم.
                  </p>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300">
                    اگر به هر دلیلی از خرید خود راضی نیستید، می‌توانید تا ۷ روز
                    پس از دریافت کالا، آن را بدون هیچ سوالی مرجوع کنید و وجه خود
                    را دریافت نمایید.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">شرایط بازگشت کالا</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                برای بازگشت کالا لازم است شرایط زیر را رعایت کنید.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {returnPolicies.map((policy, index) => (
                <motion.div
                  key={index}
                  className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="flex items-start relative z-10">
                    <div className="w-10 h-10 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 shadow-soft">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200">
                        {policy.title}
                      </h3>
                      <p className="text-voxcina-blue/70 dark:text-secondary-300">
                        {policy.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">مراحل بازگشت کالا</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                برای بازگشت کالا، مراحل زیر را دنبال کنید.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {returnSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft text-center relative border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium overflow-hidden group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  {index < 3 && (
                    <div className="hidden md:block absolute top-16 left-0 w-full h-0.5 bg-secondary-200/70 dark:bg-voxcina-blue/30 z-0"></div>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm relative z-10">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">سوالات متداول</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  className="mb-6 bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft overflow-hidden border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div
                    className="p-6 cursor-pointer transition-colors hover:bg-secondary-100/30 dark:hover:bg-voxcina-blue/5"
                    onClick={() => toggleAccordion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start">
                        <HelpCircle className="w-6 h-6 text-voxcina-blue dark:text-secondary-300 mt-0.5 ml-3 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200">
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
                      className="border-t border-secondary-200/50 dark:border-voxcina-blue/20 px-6 pb-6 pt-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-voxcina-blue/70 dark:text-secondary-300 mr-9">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              className="text-center mt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-voxcina-blue/70 dark:text-secondary-300">
                سوال دیگری دارید؟
                <Link
                  href="/faq"
                  className="text-voxcina-blue dark:text-secondary-200 hover:text-voxcina-blue/80 dark:hover:text-secondary-300 transition-colors mr-1"
                >
                  به صفحه سوالات متداول مراجعه کنید
                </Link>
                یا
                <Link
                  href="/contact"
                  className="text-voxcina-blue dark:text-secondary-200 hover:text-voxcina-blue/80 dark:hover:text-secondary-300 transition-colors mr-1 ml-1"
                >
                  با ما تماس بگیرید
                </Link>
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-2xl p-8 md:p-12 text-white text-center relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  نیاز به راهنمایی بیشتر دارید؟
                </h2>
                <p className="text-lg mb-8 max-w-2xl mx-auto">
                  کارشناسان ما آماده پاسخگویی به سوالات شما در خصوص بازگشت کالا
                  هستند.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block"
                  >
                    <Link
                      href="/contact"
                      className="inline-block w-full md:w-auto px-6 py-3 bg-white text-voxcina-blue hover:bg-secondary-100 font-medium rounded-xl shadow-medium hover:shadow-strong transition-all"
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
                      href="/customer-dashboard/orders"
                      className="inline-block w-full md:w-auto px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-xl hover:bg-white/10 transition-all"
                    >
                      مشاهده سفارش‌های من
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
