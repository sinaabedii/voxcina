"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  CreditCard,
  Package,
  Phone,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  HelpCircle,
  User,
  Lock,
  Search,
  CreditCard as CardIcon,
  Mail,
  BookOpen,
  Truck,
} from "lucide-react";
import Link from "next/link";

export default function ShoppingGuidePage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  const toggleStep = (index: number) => {
    setActiveStep(activeStep === index ? null : index);
  };

  const toggleQuestion = (index: number) => {
    setActiveQuestion(activeQuestion === index ? null : index);
  };

  const shoppingSteps = [
    {
      title: "ثبت‌نام و ورود به سایت",
      description:
        "برای شروع خرید، ابتدا باید در سایت ثبت‌نام کنید یا به حساب کاربری خود وارد شوید.",
      icon: <User className="w-10 h-10" />,
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
      icon: <Search className="w-10 h-10" />,
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
      icon: <ShoppingCart className="w-10 h-10" />,
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
      icon: <Package className="w-10 h-10" />,
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
      icon: <CreditCard className="w-10 h-10" />,
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
      title: "نظرات سایر کاربران را مطالعه کنید",
      description:
        "بررسی نظرات و امتیازات سایر خریداران می‌تواند اطلاعات ارزشمندی درباره کیفیت و کارایی محصول در اختیار شما قرار دهد.",
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
    {
      title: "از جشنواره‌ها و تخفیف‌های ویژه مطلع شوید",
      description:
        "با عضویت در خبرنامه سایت، از جشنواره‌ها، تخفیف‌های ویژه و محصولات جدید مطلع شوید.",
    },
  ];

  const faqs = [
    {
      question: "آیا برای خرید حتماً باید ثبت‌نام کنم؟",
      answer:
        "بله، برای خرید از سایت نیاز به ثبت‌نام دارید. این کار به ما کمک می‌کند تا بتوانیم سفارش‌های شما را پیگیری کرده و خدمات بهتری ارائه دهیم. همچنین با ثبت‌نام، می‌توانید از امکاناتی مانند پیگیری سفارش، مشاهده سوابق خرید و ذخیره آدرس‌ها بهره‌مند شوید.",
    },
    {
      question: "چگونه می‌توانم وضعیت سفارش خود را پیگیری کنم؟",
      answer:
        "پس از ثبت سفارش، یک کد پیگیری برای شما ارسال می‌شود. با مراجعه به بخش «پیگیری سفارش» در سایت و وارد کردن این کد، می‌توانید از وضعیت سفارش خود مطلع شوید. همچنین می‌توانید با ورود به حساب کاربری خود و مراجعه به بخش «سفارش‌های من»، تمامی سفارش‌های خود را مشاهده و پیگیری کنید.",
    },
    {
      question: "روش‌های پرداخت چیست؟",
      answer:
        "در حال حاضر، امکان پرداخت به صورت آنلاین از طریق درگاه‌های بانکی، پرداخت از طریق کیف پول و پرداخت در محل (در برخی شهرها) فراهم است. برای پرداخت آنلاین، کارت بانکی شما باید دارای رمز دوم باشد.",
    },
    {
      question: "هزینه ارسال چگونه محاسبه می‌شود؟",
      answer:
        "هزینه ارسال بر اساس وزن محصولات، مقصد و روش ارسال انتخابی محاسبه می‌شود. این هزینه در صفحه سبد خرید و قبل از نهایی کردن سفارش به شما نمایش داده می‌شود. برای سفارش‌های بالای 500 هزار تومان، ارسال عادی به سراسر کشور رایگان است.",
    },
    {
      question: "در صورت مشکل در فرآیند خرید چه کنم؟",
      answer:
        "در صورت بروز هرگونه مشکل در فرآیند خرید، می‌توانید با پشتیبانی ما از طریق چت آنلاین، ایمیل یا تماس تلفنی ارتباط برقرار کنید. کارشناسان ما در ساعات کاری 9 صبح تا 6 بعدازظهر آماده پاسخگویی و راهنمایی شما هستند.",
    },
    {
      question: "آیا امکان لغو سفارش وجود دارد؟",
      answer:
        "بله، تا زمانی که سفارش شما وارد مرحله ارسال نشده باشد، امکان لغو آن وجود دارد. برای لغو سفارش، می‌توانید به حساب کاربری خود مراجعه کرده و در بخش «سفارش‌های من»، گزینه لغو سفارش را انتخاب کنید. در صورت پرداخت آنلاین، مبلغ پرداختی حداکثر تا 72 ساعت کاری به حساب شما بازگردانده می‌شود.",
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
            راهنمای خرید
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            با استفاده از این راهنما، می‌توانید به راحتی فرآیند خرید را انجام
            دهید و از خرید آنلاین خود لذت ببرید.
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
              مراحل خرید
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              فرآیند خرید در سایت ما ساده و امن است. مراحل زیر را دنبال کنید تا
              خرید موفقی داشته باشید.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {shoppingSteps.map((step, index) => (
              <motion.div
                key={index}
                className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleStep(index)}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {activeStep === index ? (
                        <ChevronUp className="w-6 h-6 text-indigo-500" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-indigo-500" />
                      )}
                    </div>
                  </div>
                </div>

                {activeStep === index && (
                  <motion.div
                    className="border-t border-gray-200 dark:border-gray-700"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <ul className="space-y-3">
                            {step.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start">
                                <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {detail}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={step.image}
                            alt={step.title}
                            className="w-full h-full object-cover"
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

      <section className="py-16 px-4 bg-indigo-50 dark:bg-indigo-900/20">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              نکات مهم خرید
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              برای داشتن تجربه خرید بهتر و امن‌تر، به نکات زیر توجه کنید.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {shoppingTips.map((tip, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {tip.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mr-11">
                  {tip.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              امنیت و حریم خصوصی
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    امنیت پرداخت
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  تمامی تراکنش‌های مالی در سایت ما با استفاده از پروتکل‌های
                  امنیتی SSL انجام می‌شود. اطلاعات کارت بانکی شما به صورت مستقیم
                  توسط درگاه بانکی دریافت شده و در سیستم‌های ما ذخیره نمی‌شود.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      استفاده از درگاه‌های بانکی معتبر و دارای مجوز
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      رمزنگاری اطلاعات پرداخت با استاندارد SSL
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      عدم ذخیره‌سازی اطلاعات کارت بانکی در سیستم
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    حریم خصوصی
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  ما به حریم خصوصی شما احترام می‌گذاریم و اطلاعات شخصی شما را
                  تنها برای پردازش سفارش و بهبود خدمات استفاده می‌کنیم.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      محافظت از اطلاعات شخصی مطابق با قوانین حفاظت از داده‌ها
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      عدم ارائه اطلاعات به اشخاص ثالث بدون اجازه شما
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      امکان مشاهده و ویرایش اطلاعات شخصی در حساب کاربری
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
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
                className="mb-6 bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleQuestion(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <HelpCircle className="w-6 h-6 text-indigo-500 mt-0.5 ml-3 flex-shrink-0" />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {faq.question}
                      </h3>
                    </div>
                    {activeQuestion === index ? (
                      <ChevronUp className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {activeQuestion === index && (
                  <motion.div
                    className="border-t border-gray-200 dark:border-gray-600 px-6 pb-6 pt-4"
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
              کارشناسان ما آماده پاسخگویی به سوالات شما در تمام مراحل خرید
              هستند.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Mail className="w-5 h-5 ml-2" />
                ارتباط با ما
              </Link>
              <Link
                href="tel:02188776655"
                className="inline-flex items-center px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all"
              >
                <Phone className="w-5 h-5 ml-2" />
                تماس با پشتیبانی
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              مطالب مرتبط
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-600">
                <img
                  src="/api/placeholder/400/200"
                  alt="نحوه ارسال"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    نحوه ارسال
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  با روش‌های مختلف ارسال، زمان‌بندی و هزینه‌های آن آشنا شوید.
                </p>
                <Link
                  href="/shipping"
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                >
                  مطالعه بیشتر
                  <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-600">
                <img
                  src="/api/placeholder/400/200"
                  alt="پیگیری سفارش"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    پیگیری سفارش
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  نحوه پیگیری سفارش و اطلاع از وضعیت آن در هر مرحله را بیاموزید.
                </p>
                <Link
                  href="/tracking"
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                >
                  مطالعه بیشتر
                  <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-600">
                <img
                  src="/api/placeholder/400/200"
                  alt="شرایط بازگشت"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    شرایط بازگشت
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  با شرایط و ضوابط بازگشت کالا و روند استرداد وجه آشنا شوید.
                </p>
                <Link
                  href="/returns"
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                >
                  مطالعه بیشتر
                  <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
