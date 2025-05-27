"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
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
                    <span className="block">همکاری</span>
                    <span className="block text-voxcina-blue relative">
                      با ما
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
                      شرکا{" "}
                    </span>
                    به
                    <span className="text-voxcina-blue font-semibold">
                      {" "}
                      موفقیت{" "}
                    </span>
                    می‌رسند
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
              className="text-center mb-12 sm:mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-darkBlue dark:text-white mb-4 sm:mb-6 relative inline-block">
                چرا با ما همکاری کنید؟
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-voxcina-blue dark:text-white relative z-10 text-center">
                  بازار بزرگ
                </h3>

                <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 relative z-10 text-center leading-relaxed">
                  ما با داشتن بیش از ۵۰۰ هزار کاربر فعال ماهانه، بازار بزرگی
                  برای محصولات و خدمات شما فراهم می‌کنیم.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105 lg:transform lg:translate-y-4 xl:translate-y-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-darkBlue/5 dark:bg-voxcina-darkBlue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-darkBlue to-voxcina-blue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-voxcina-darkBlue dark:text-white relative z-10 text-center">
                  رشد مداوم
                </h3>

                <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 relative z-10 text-center leading-relaxed">
                  کسب و کار ما هر سال بیش از ۳۰٪ رشد می‌کند و این فرصت رشد
                  مناسبی برای شرکای تجاری ما ایجاد می‌کند.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105 sm:col-span-2 lg:col-span-1"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-secondary-200/20 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-secondary-600 to-secondary-400 text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-secondary-600 dark:text-white relative z-10 text-center">
                  برند معتبر
                </h3>

                <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 relative z-10 text-center leading-relaxed">
                  همکاری با برند ما که به عنوان یکی از ۱۰ شرکت برتر در حوزه خود
                  شناخته می‌شود، اعتبار کسب و کار شما را افزایش می‌دهد.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-transparent relative overflow-hidden">
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
                {activeTab === "suppliers"
                  ? "درخواست همکاری تجاری"
                  : "ارسال رزومه"}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                {activeTab === "suppliers"
                  ? "برای آغاز همکاری، لطفاً فرم زیر را تکمیل کنید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت."
                  : "برای پیوستن به تیم ما، لطفاً رزومه خود را از طریق فرم زیر ارسال کنید."}
              </p>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-voxcina-blue/10 overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {formSubmitted && (
                <motion.div
                  className="p-3 sm:p-4 bg-green-100/90 dark:bg-green-900/20 text-voxcina-blue dark:text-green-400 flex items-start border-b border-green-200 dark:border-green-800/30"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle2 className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  <p className="text-sm sm:text-base">
                    {activeTab === "suppliers"
                      ? "درخواست همکاری شما با موفقیت ثبت شد. کارشناسان ما به زودی با شما تماس خواهند گرفت."
                      : "رزومه شما با موفقیت ارسال شد. در صورت تناسب با موقعیت‌های موجود، با شما تماس خواهیم گرفت."}
                  </p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 text-sm sm:text-base"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 text-sm sm:text-base"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 text-sm sm:text-base"
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 text-sm sm:text-base"
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
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base appearance-none"
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
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base appearance-none"
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

                <div className="mt-4 sm:mt-6">
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 text-sm sm:text-base"
                    placeholder={
                      activeTab === "suppliers"
                        ? "درباره شرکت، محصولات یا خدمات خود توضیح دهید..."
                        : "درباره تجربیات، مهارت‌ها و علاقه‌مندی‌های خود توضیح دهید..."
                    }
                    required
                  ></textarea>
                </div>

                {activeTab === "careers" && (
                  <div className="mt-4 sm:mt-6">
                    <label
                      htmlFor="resume"
                      className="block text-sm font-medium text-voxcina-blue dark:text-secondary-200 mb-2"
                    >
                      آپلود رزومه <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-dashed border-voxcina-blue/20 dark:border-voxcina-darkBlue/30 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center bg-white/40 dark:bg-voxcina-blue/5 transition-colors hover:bg-white/60 dark:hover:bg-voxcina-blue/10">
                      <label
                        htmlFor="resume"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                          <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-xs sm:text-sm text-voxcina-blue/80 dark:text-secondary-300">
                          {formData.resume
                            ? `فایل انتخاب شده: ${
                                (formData.resume as any)?.name
                              }`
                            : "کلیک کنید یا فایل خود را اینجا رها کنید"}
                        </span>
                        <span className="text-xs text-voxcina-blue/60 dark:text-secondary-400 mt-1 sm:mt-2">
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
                      <p className="mt-2 sm:mt-3 text-xs text-voxcina-blue/60 dark:text-secondary-400">
                        حداکثر اندازه فایل: 5MB
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 sm:mt-6 flex items-start">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 ml-2 sm:ml-3 rounded border-voxcina-blue/20 text-voxcina-blue focus:ring-voxcina-blue/30"
                    required
                  />
                  <label
                    htmlFor="acceptTerms"
                    className="text-voxcina-blue/80 dark:text-secondary-300 text-xs sm:text-sm"
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

                <div className="mt-6 sm:mt-8">
                  <motion.button
                    type="submit"
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue hover:from-voxcina-darkBlue hover:to-voxcina-blue text-white font-medium rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-sm sm:text-base relative overflow-hidden group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    {activeTab === "suppliers"
                      ? "ارسال درخواست همکاری"
                      : "ارسال رزومه"}
                    <motion.div
                      className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
