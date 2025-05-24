"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Users,
  TrendingUp,
  Award,
  Upload,
  Send,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function CareersPage() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    message: "",
    resume: null,
    acceptTerms: false,
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target;
    const { name } = target;

    if (target.type === "checkbox" && target instanceof HTMLInputElement) {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else if (target.type === "file" && target instanceof HTMLInputElement) {
      if (target.files && target.files[0]) {
        setFormData((prev) => ({
          ...prev,
          [name]: target.files ? target.files[0] : null,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: target.value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted:", formData);

    setTimeout(() => {
      setFormSubmitted(true);

      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        businessType: "",
        message: "",
        resume: null,
        acceptTerms: false,
      });

      setTimeout(() => {
        setFormSubmitted(false);
      }, 5000);
    }, 1000);
  };

  const suppliers = [
    {
      title: "تأمین‌کنندگان محصولات",
      description:
        "اگر تولیدکننده یا وارد کننده محصولات با کیفیت هستید، ما مشتاق همکاری با شما هستیم. ما به دنبال شرکای تجاری هستیم که محصولات با کیفیت و قیمت مناسب ارائه می‌دهند.",
      benefits: [
        "دسترسی به بازار گسترده مشتریان",
        "همکاری بلندمدت و پایدار",
        "پرداخت به موقع و منظم",
        "امکان معرفی برند شما در پلتفرم ما",
      ],
    },
    {
      title: "خدمات لجستیک و حمل و نقل",
      description:
        "شرکت‌های ارائه دهنده خدمات لجستیک، حمل و نقل و انبارداری می‌توانند با ما همکاری کنند. ما به دنبال شرکای لجستیکی هستیم که خدمات با کیفیت و به موقع ارائه می‌دهند.",
      benefits: [
        "حجم بالای سفارشات روزانه",
        "همکاری منظم و مستمر",
        "پرداخت به موقع و منظم",
        "امکان رشد همزمان با گسترش کسب و کار ما",
      ],
    },
    {
      title: "خدمات فناوری و نرم‌افزاری",
      description:
        "اگر شرکت فناوری یا استارتاپی هستید که خدمات نرم‌افزاری، هوش مصنوعی، تحلیل داده یا فناوری‌های مرتبط با تجارت الکترونیک ارائه می‌دهید، ما از همکاری با شما استقبال می‌کنیم.",
      benefits: [
        "فرصت اجرای پروژه‌های بزرگ و مقیاس‌پذیر",
        "دسترسی به داده‌های ارزشمند برای بهبود فناوری‌ها",
        "امکان همکاری بلندمدت و استراتژیک",
        "معرفی و تبلیغ خدمات شما در پلتفرم ما",
      ],
    },
  ];

  return (
    <>
      <Header />

      <div className="min-h-screen bg-voxcina-cream dark:bg-voxcina-darkBlue/90">
        <div className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-40 -left-40 blur-3xl"></div>
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
              <span className="relative z-10">همکاری با ما</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h1>

            <motion.p
              className="text-xl max-w-3xl mx-auto text-secondary-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              ما به دنبال برقراری روابط پایدار و سودمند با شرکا، تأمین‌کنندگان و
              متخصصان حوزه‌های مختلف هستیم.
            </motion.p>

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-voxcina-cream to-transparent dark:from-voxcina-darkBlue/90 dark:to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
            ></motion.div>
          </div>
        </div>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">چرا با ما همکاری کنید؟</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Users className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  بازار بزرگ
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  ما با داشتن بیش از ۵۰۰ هزار کاربر فعال ماهانه، بازار بزرگی
                  برای محصولات و خدمات شما فراهم می‌کنیم.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <TrendingUp className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  رشد مداوم
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  کسب و کار ما هر سال بیش از ۳۰٪ رشد می‌کند و این فرصت رشد
                  مناسبی برای شرکای تجاری ما ایجاد می‌کند.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Award className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  برند معتبر
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  همکاری با برند ما که به عنوان یکی از ۱۰ شرکت برتر در حوزه خود
                  شناخته می‌شود، اعتبار کسب و کار شما را افزایش می‌دهد.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">انواع همکاری</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 overflow-hidden backdrop-blur-sm max-w-5xl mx-auto">
              <div className="flex flex-wrap overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-secondary-100 dark:scrollbar-thumb-voxcina-blue/30 dark:scrollbar-track-voxcina-darkBlue/20">
                <motion.button
                  className={`px-6 py-4 font-medium text-sm transition-colors ${
                    activeTab === "suppliers"
                      ? "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 border-b-2 border-voxcina-blue"
                      : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/5"
                  }`}
                  onClick={() => setActiveTab("suppliers")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  تأمین‌کنندگان و شرکای تجاری
                </motion.button>
                <motion.button
                  className={`px-6 py-4 font-medium text-sm transition-colors ${
                    activeTab === "careers"
                      ? "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 border-b-2 border-voxcina-blue"
                      : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/5"
                  }`}
                  onClick={() => setActiveTab("careers")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  فرصت‌های شغلی و استخدام
                </motion.button>
              </div>

              <div className="p-6 md:p-8">
                {activeTab === "suppliers" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                      <span className="relative z-10">
                        همکاری با تأمین‌کنندگان و شرکای تجاری
                      </span>
                      <span className="absolute bottom-1 left-0 w-full h-2 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-30"></span>
                    </h3>
                    <p className="text-voxcina-blue/80 dark:text-secondary-300 mb-8">
                      ما به دنبال ایجاد روابط تجاری پایدار و سودمند با
                      تأمین‌کنندگان، تولیدکنندگان و ارائه‌دهندگان خدمات هستیم.
                      اگر محصولات یا خدمات باکیفیتی ارائه می‌دهید، از همکاری با
                      شما استقبال می‌کنیم.
                    </p>

                    <div className="space-y-8">
                      {suppliers.map((item, index) => (
                        <motion.div
                          key={index}
                          className="border-b border-secondary-100 dark:border-voxcina-darkBlue/20 pb-8 last:border-0 last:pb-0"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                          <h4 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200">
                            {item.title}
                          </h4>
                          <p className="text-voxcina-blue/80 dark:text-secondary-300 mb-4">
                            {item.description}
                          </p>
                          <h5 className="text-lg font-medium mb-2 text-voxcina-blue dark:text-secondary-200">
                            مزایای همکاری:
                          </h5>
                          <ul className="space-y-2">
                            {item.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start">
                                <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                                <span className="text-voxcina-blue/80 dark:text-secondary-300">
                                  {benefit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "careers" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                      <span className="relative z-10">
                        فرصت‌های شغلی و استخدام
                      </span>
                      <span className="absolute bottom-1 left-0 w-full h-2 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-30"></span>
                    </h3>
                    <p className="text-voxcina-blue/80 dark:text-secondary-300 mb-8">
                      ما به دنبال جذب افراد با استعداد، خلاق و متعهد در حوزه‌های
                      مختلف هستیم. اگر به دنبال محیط کاری پویا، چالش‌برانگیز و
                      فرصت‌های رشد حرفه‌ای هستید، به تیم ما بپیوندید.
                    </p>

                    <h4 className="text-xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
                      مزایای کار در شرکت ما:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          محیط کاری پویا و دوستانه
                        </span>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          فرصت‌های یادگیری و رشد حرفه‌ای
                        </span>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          حقوق و مزایای رقابتی
                        </span>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          بیمه‌های تکمیلی و خدمات رفاهی
                        </span>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          همکاری با یک تیم متخصص و حرفه‌ای
                        </span>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-blue/80 ml-2 mt-0.5 flex-shrink-0" />
                        <span className="text-voxcina-blue/80 dark:text-secondary-300">
                          انعطاف‌پذیری در ساعات کاری
                        </span>
                      </div>
                    </div>

                    <div className="bg-secondary-100/50 dark:bg-voxcina-blue/10 rounded-xl p-6 mb-6 shadow-inner-soft border border-secondary-200/50 dark:border-voxcina-darkBlue/20">
                      <h4 className="text-lg font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
                        موقعیت‌های شغلی فعلی:
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <div className="w-8 h-8 bg-secondary-200/70 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                          </div>
                          <div>
                            <h5 className="font-medium text-voxcina-blue dark:text-secondary-200">
                              مدیر محصول
                            </h5>
                            <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                              تمام وقت - تهران
                            </p>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <div className="w-8 h-8 bg-secondary-200/70 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                          </div>
                          <div>
                            <h5 className="font-medium text-voxcina-blue dark:text-secondary-200">
                              توسعه‌دهنده فرانت‌اند
                            </h5>
                            <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                              تمام وقت/دورکاری - تهران
                            </p>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <div className="w-8 h-8 bg-secondary-200/70 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                          </div>
                          <div>
                            <h5 className="font-medium text-voxcina-blue dark:text-secondary-200">
                              متخصص بازاریابی دیجیتال
                            </h5>
                            <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                              تمام وقت - تهران
                            </p>
                          </div>
                        </li>
                      </ul>
                      <div className="mt-6">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="inline-block"
                        >
                          <Link
                            href="/jobs"
                            className="inline-flex items-center text-voxcina-blue dark:text-secondary-200 hover:text-voxcina-darkBlue dark:hover:text-white font-medium"
                          >
                            <span className="border-b border-dashed border-voxcina-blue/30 dark:border-secondary-200/30 hover:border-voxcina-blue dark:hover:border-secondary-200 transition-colors pb-0.5">
                              مشاهده همه فرصت‌های شغلی
                            </span>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="mr-1"
                            >
                              <path
                                d="M8.5 3.5L5 7.00001L8.5 10.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
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
                <span className="relative z-10">
                  {activeTab === "suppliers"
                    ? "درخواست همکاری تجاری"
                    : "ارسال رزومه"}
                </span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                {activeTab === "suppliers"
                  ? "برای آغاز همکاری، لطفاً فرم زیر را تکمیل کنید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت."
                  : "برای پیوستن به تیم ما، لطفاً رزومه خود را از طریق فرم زیر ارسال کنید."}
              </p>
            </motion.div>

            <motion.div
              className="max-w-3xl mx-auto bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {formSubmitted && (
                <motion.div
                  className="p-4 bg-green-100/90 dark:bg-green-900/20 text-voxcina-blue dark:text-green-400 flex items-start border-b border-green-200 dark:border-green-800/30"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle2 className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  <p>
                    {activeTab === "suppliers"
                      ? "درخواست همکاری شما با موفقیت ثبت شد. کارشناسان ما به زودی با شما تماس خواهند گرفت."
                      : "رزومه شما با موفقیت ارسال شد. در صورت تناسب با موقعیت‌های موجود، با شما تماس خواهیم گرفت."}
                  </p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTab === "suppliers" && (
                    <div className="md:col-span-2">
                      <label
                        htmlFor="companyName"
                        className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                      >
                        نام شرکت <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
                        placeholder="نام شرکت یا کسب و کار خود را وارد کنید"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                    >
                      نام و نام خانوادگی <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
                      placeholder="نام و نام خانوادگی خود را وارد کنید"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                    >
                      ایمیل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
                      placeholder="example@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                    >
                      شماره تماس <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
                      placeholder="09123456789"
                      required
                    />
                  </div>

                  {activeTab === "suppliers" ? (
                    <div>
                      <label
                        htmlFor="businessType"
                        className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                      >
                        نوع کسب و کار <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="businessType"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft appearance-none"
                        required
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231A3C69' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "left 1rem center",
                          backgroundSize: "1rem",
                        }}
                      >
                        <option value="">انتخاب کنید</option>
                        <option value="product">
                          تولیدکننده/تأمین‌کننده محصول
                        </option>
                        <option value="logistics">
                          خدمات لجستیک و حمل و نقل
                        </option>
                        <option value="technology">
                          خدمات فناوری و نرم‌افزاری
                        </option>
                        <option value="other">سایر</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="businessType"
                        className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                      >
                        موقعیت شغلی مورد نظر{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="businessType"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft appearance-none"
                        required
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231A3C69' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "left 1rem center",
                          backgroundSize: "1rem",
                        }}
                      >
                        <option value="">انتخاب کنید</option>
                        <option value="product-manager">مدیر محصول</option>
                        <option value="frontend">توسعه‌دهنده فرانت‌اند</option>
                        <option value="marketing">
                          متخصص بازاریابی دیجیتال
                        </option>
                        <option value="other">سایر</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                  >
                    {activeTab === "suppliers"
                      ? "توضیحات تکمیلی"
                      : "درباره خودتان"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
                    placeholder={
                      activeTab === "suppliers"
                        ? "درباره شرکت، محصولات یا خدمات خود توضیح دهید..."
                        : "درباره تجربیات، مهارت‌ها و علاقه‌مندی‌های خود توضیح دهید..."
                    }
                    required
                  ></textarea>
                </div>

                {activeTab === "careers" && (
                  <div className="mt-6">
                    <label
                      htmlFor="resume"
                      className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                    >
                      آپلود رزومه <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-dashed border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-xl p-6 text-center bg-secondary-50/50 dark:bg-voxcina-blue/5 transition-colors hover:bg-secondary-100/50 dark:hover:bg-voxcina-blue/10">
                      <label
                        htmlFor="resume"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="w-14 h-14 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mb-4 shadow-soft">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-sm text-voxcina-blue/80 dark:text-secondary-300">
                          {formData.resume
                            ? `فایل انتخاب شده: ${
                                (formData.resume as any)?.name
                              }`
                            : "کلیک کنید یا فایل خود را اینجا رها کنید"}
                        </span>
                        <span className="text-xs text-voxcina-blue/60 dark:text-secondary-400 mt-2">
                          (PDF, DOCX)
                        </span>
                        <input
                          type="file"
                          id="resume"
                          name="resume"
                          onChange={handleChange}
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          required
                        />
                      </label>
                      <p className="mt-3 text-xs text-voxcina-blue/60 dark:text-secondary-400">
                        حداکثر اندازه فایل: 5MB
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-start">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-5 w-5 mt-0.5 ml-3 rounded border-secondary-200 text-voxcina-blue focus:ring-voxcina-blue/30"
                    required
                  />
                  <label
                    htmlFor="acceptTerms"
                    className="text-voxcina-blue/80 dark:text-secondary-300 text-sm"
                  >
                    با ارسال این فرم، موافقت خود را با
                    <Link
                      href="/privacy"
                      className="text-voxcina-blue hover:text-voxcina-darkBlue dark:text-secondary-200 dark:hover:text-white hover:underline mx-1 transition-colors"
                    >
                      شرایط و قوانین
                    </Link>
                    سایت اعلام می‌کنم.
                  </label>
                </div>

                <div className="mt-8">
                  <motion.button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white font-medium rounded-xl shadow-soft hover:shadow-medium transition-all flex items-center justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send className="w-5 h-5 ml-2" />
                    {activeTab === "suppliers"
                      ? "ارسال درخواست همکاری"
                      : "ارسال رزومه"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </section>
        <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
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
              {[
                {
                  question: "مراحل همکاری با شما چگونه است؟",
                  answer:
                    "پس از تکمیل فرم درخواست همکاری، کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت. سپس جلسه‌ای برای آشنایی بیشتر و بررسی جزئیات همکاری ترتیب داده می‌شود. در صورت توافق طرفین، قرارداد همکاری تنظیم و امضا خواهد شد.",
                },
                {
                  question: "آیا امکان همکاری به صورت نمایندگی وجود دارد؟",
                  answer:
                    "بله، ما برنامه گسترش نمایندگی در سراسر کشور داریم. برای دریافت اطلاعات بیشتر و شرایط اخذ نمایندگی، لطفاً با ما تماس بگیرید.",
                },
                {
                  question: "چه مدارکی برای آغاز همکاری نیاز است؟",
                  answer:
                    "برای همکاری با ما، نیاز به مدارک هویتی، مدارک ثبتی شرکت، مجوزهای فعالیت و نمونه محصولات یا مستندات خدمات خود دارید. پس از تماس اولیه، لیست دقیق مدارک مورد نیاز به شما اعلام خواهد شد.",
                },
                {
                  question: "روند بررسی رزومه‌ها چگونه است؟",
                  answer:
                    "پس از دریافت رزومه، تیم منابع انسانی ما آن را بررسی می‌کند. در صورت تناسب با موقعیت‌های شغلی موجود، برای مصاحبه با شما تماس گرفته خواهد شد. این فرآیند معمولاً بین یک تا دو هفته طول می‌کشد.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  className="mb-6 bg-white/90 dark:bg-voxcina-blue/10 rounded-xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -3 }}
                >
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-3 flex items-center">
                      <div className="w-8 h-8 bg-secondary-100 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9.09 9.00001C9.3251 8.33167 9.78915 7.76811 10.4 7.40914C11.0108 7.05016 11.7289 6.91894 12.4272 7.03872C13.1255 7.15849 13.7588 7.52153 14.2151 8.06353C14.6713 8.60554 14.9211 9.29153 14.92 10C14.92 12 11.92 13 11.92 13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 17H12.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      {faq.question}
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
                <Link
                  href="/contact"
                  className="inline-flex items-center text-voxcina-blue dark:text-secondary-200 hover:text-voxcina-darkBlue dark:hover:text-white font-medium"
                >
                  <span className="ml-1">سوال دیگری دارید؟</span>
                  <span className="border-b border-dashed border-voxcina-blue/30 dark:border-secondary-200/30 hover:border-voxcina-blue dark:hover:border-secondary-200 transition-colors pb-0.5">
                    با ما تماس بگیرید
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1"
                  >
                    <path
                      d="M8.5 3.5L5 7.00001L8.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="container mx-auto max-w-5xl relative z-10"></div>
          <motion.div
            className="bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue rounded-2xl p-8 md:p-12 text-white text-center shadow-medium relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-400/20 rounded-full blur-xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20"
              >
                <Send className="w-7 h-7" />
              </motion.div>

              <h2 className="text-3xl font-bold mb-4 relative">
                همین امروز همکاری خود را آغاز کنید
              </h2>

              <p className="text-lg mb-8 max-w-2xl mx-auto text-secondary-100">
                ما مشتاق همکاری با شما هستیم. فرصت‌های بی‌نظیری در انتظار شماست.
              </p>

              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="#"
                    onClick={() => setActiveTab("suppliers")}
                    className="inline-block px-8 py-3 bg-white text-voxcina-blue font-medium rounded-xl shadow-soft hover:shadow-medium transition-all"
                  >
                    همکاری تجاری
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="#"
                    onClick={() => setActiveTab("careers")}
                    className="inline-block px-8 py-3 bg-transparent border-2 border-white text-white font-medium rounded-xl hover:bg-white/10 transition-all"
                  >
                    فرصت‌های شغلی
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
      <Footer />
    </>
  );
}
