"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCcw,
  Package,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto py-24 px-4 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            شرایط بازگشت کالا
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ما تمام تلاش خود را می‌کنیم تا شما از خرید خود راضی باشید، اما اگر
            به هر دلیلی قصد بازگشت کالا را دارید، این صفحه راهنمای شماست.
          </motion.p>
        </div>
      </div>

      <section className="py-12 px-4 -mt-8">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8 border-t-4 border-indigo-500"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white text-center md:text-right">
                  ضمانت رضایت ۷ روزه
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  ما به کیفیت محصولات خود اطمینان داریم و می‌خواهیم شما نیز با
                  خیال راحت خرید کنید. به همین دلیل، ضمانت بازگشت ۷ روزه را برای
                  تمامی محصولات ارائه می‌دهیم.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  اگر به هر دلیلی از خرید خود راضی نیستید، می‌توانید تا ۷ روز پس
                  از دریافت کالا، آن را بدون هیچ سوالی مرجوع کنید و وجه خود را
                  دریافت نمایید.
                </p>
              </div>
            </div>
          </motion.div>
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
              شرایط بازگشت کالا
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              برای بازگشت کالا لازم است شرایط زیر را رعایت کنید.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {returnPolicies.map((policy, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                      {policy.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {policy.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              محصولات غیرقابل بازگشت
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-700 rounded-xl shadow-md p-6 md:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-start mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  برخی محصولات به دلایل بهداشتی یا امنیتی قابل بازگشت نیستند:
                </h3>
              </div>
            </div>

            <ul className="space-y-4 mr-16">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>محصولات بهداشتی و آرایشی</strong> که پلمپ آن‌ها باز
                  شده باشد، به دلایل بهداشتی قابل بازگشت نیستند.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>محصولات غذایی، نوشیدنی و دارویی</strong> به دلایل
                  بهداشتی و سلامتی قابل بازگشت نیستند.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>نرم‌افزارها، بازی‌ها و محتوای دیجیتال</strong> که
                  لایسنس آن‌ها فعال شده یا بسته‌بندی آن‌ها باز شده باشد، قابل
                  بازگشت نیستند.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>لباس‌های زیر، جوراب و محصولات مشابه</strong> که
                  بسته‌بندی آن‌ها باز شده باشد، به دلایل بهداشتی قابل بازگشت
                  نیستند.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>محصولات سفارشی‌سازی شده</strong> که طبق درخواست مشتری
                  تولید شده‌اند، قابل بازگشت نیستند.
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-400 flex items-start">
                <AlertTriangle className="w-5 h-5 ml-2 mt-0.5 flex-shrink-0" />
                <span>
                  توجه: در صورتی که این محصولات دارای ایراد فنی یا آسیب‌دیدگی از
                  قبل باشند، امکان بازگشت یا تعویض آن‌ها وجود دارد. در این
                  موارد، لطفاً با پشتیبانی ما تماس بگیرید.
                </span>
              </p>
            </div>
          </motion.div>
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
              مراحل بازگشت کالا
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              برای بازگشت کالا، مراحل زیر را دنبال کنید.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {returnSteps.map((step, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {index < 3 && (
                  <div className="hidden md:block absolute top-16 left-0 w-full h-0.5 bg-indigo-200 dark:bg-indigo-800 z-0"></div>
                )}
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
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
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              روش‌های بازگشت وجه
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    روش پرداخت
                  </th>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    روش بازگشت وجه
                  </th>
                  <th className="py-4 px-6 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    زمان تقریبی
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-4 px-6 text-gray-900 dark:text-white">
                    پرداخت آنلاین (کارت بانکی)
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    بازگشت به کارت
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    ۲ تا ۷ روز کاری
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-4 px-6 text-gray-900 dark:text-white">
                    کیف پول
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    بازگشت به کیف پول
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    آنی
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-4 px-6 text-gray-900 dark:text-white">
                    پرداخت در محل
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    واریز به حساب بانکی
                  </td>
                  <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                    ۲ تا ۳ روز کاری
                  </td>
                </tr>
              </tbody>
            </table>
          </motion.div>
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
                className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleAccordion(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <HelpCircle className="w-6 h-6 text-indigo-500 mt-0.5 ml-3 flex-shrink-0" />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {faq.question}
                      </h3>
                    </div>
                    {activeAccordion === index ? (
                      <ChevronUp className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {activeAccordion === index && (
                  <motion.div
                    className="border-t border-gray-200 dark:border-gray-700 px-6 pb-6 pt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-gray-700 dark:text-gray-300 mr-9">
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-white">
              دانلود فایل کامل شرایط بازگشت کالا
            </h2>
            <p className="text-lg mb-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              برای دسترسی به جزئیات کامل شرایط و ضوابط بازگشت کالا، می‌توانید
              فایل زیر را دانلود کنید.
            </p>
            <Link
              href="/downloads/return-policy.pdf"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              دانلود شرایط بازگشت کالا
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              نیاز به راهنمایی بیشتر دارید؟
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              کارشناسان ما آماده پاسخگویی به سوالات شما در خصوص بازگشت کالا
              هستند.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                تماس با پشتیبانی
              </Link>
              <Link
                href="/customer-dashboard/orders"
                className="inline-flex items-center px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all"
              >
                مشاهده سفارش‌های من
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
