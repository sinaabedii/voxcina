"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [formStatus, setFormStatus] = useState<{
    submitted: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        submitted: true,
        success: false,
        message: "لطفاً تمام فیلدهای الزامی را پر کنید.",
      });
      return;
    }

    setTimeout(() => {
      setFormStatus({
        submitted: true,
        success: true,
        message:
          "پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      setTimeout(() => {
        setFormStatus(null);
      }, 5000);
    }, 1000);
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
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
              <span className="relative z-10">تماس با ما</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h1>

            <motion.p
              className="text-xl max-w-3xl mx-auto text-secondary-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              ما مشتاق شنیدن صدای شما هستیم. از طریق راه‌های ارتباطی زیر با ما
              در تماس باشید.
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
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Phone className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-5 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  تلفن تماس
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      پشتیبانی فروش:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold ltr py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      021-88776655
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      پشتیبانی فنی:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold ltr py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      021-88778899
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Mail className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-5 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  ایمیل
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      فروش و سفارشات:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      info@example.com
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      پشتیبانی مشتریان:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      support@example.com
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Clock className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-5 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                  ساعات کاری
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      شنبه تا چهارشنبه:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      ۹ صبح تا ۵ بعدازظهر
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-1 font-medium text-sm">
                      پنجشنبه:
                    </p>
                    <p className="text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-4 bg-secondary-100/70 dark:bg-voxcina-blue/20 rounded-xl inline-block">
                      ۹ صبح تا ۱ بعدازظهر
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
        <section
          id="our-locations"
          className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">آدرس ما</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-20 -mr-20 transition-all duration-500 group-hover:scale-125"></div>

                <h3 className="text-xl font-bold mb-5 text-voxcina-blue dark:text-secondary-200 flex items-center relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-secondary-200 dark:bg-voxcina-blue/20 flex items-center justify-center ml-3 flex-shrink-0">
                    <MapPin className="w-5 h-5 text-voxcina-blue dark:text-secondary-200" />
                  </div>
                  دفتر مرکزی
                </h3>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 pr-12 relative z-10">
                  تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه 12،
                  واحد 1203
                </p>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 pr-12 relative z-10">
                  کد پستی: 1234567890
                </p>
                <div className="flex items-center text-voxcina-blue/70 dark:text-secondary-300 mb-6 pr-12 relative z-10">
                  <Phone className="w-5 h-5 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                  <span className="ltr">021-88776655</span>
                </div>

                <h3 className="text-xl font-bold mb-5 text-voxcina-blue dark:text-secondary-200 flex items-center mt-8 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-secondary-200 dark:bg-voxcina-blue/20 flex items-center justify-center ml-3 flex-shrink-0">
                    <MapPin className="w-5 h-5 text-voxcina-blue dark:text-secondary-200" />
                  </div>
                  دفتر فروش
                </h3>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 pr-12 relative z-10">
                  تهران، خیابان شریعتی، بالاتر از میرداماد، مجتمع تجاری رز، طبقه
                  3، واحد 302
                </p>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-4 pr-12 relative z-10">
                  کد پستی: 1234567891
                </p>
                <div className="flex items-center text-voxcina-blue/70 dark:text-secondary-300 pr-12 relative z-10">
                  <Phone className="w-5 h-5 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                  <span className="ltr">021-77889900</span>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium overflow-hidden h-96 relative group"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 p-6 bg-secondary-100/50 dark:bg-voxcina-blue/5">
                  <div className="absolute inset-0">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern
                          id="grid"
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-voxcina-blue/10 dark:text-secondary-200/10"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 1.5,
                      }}
                      className="absolute -inset-10 rounded-full bg-voxcina-blue/10 dark:bg-secondary-200/10"
                    ></motion.div>
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0.8 }}
                      animate={{ scale: 0.9, opacity: 0.5 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 2,
                        delay: 0.3,
                      }}
                      className="absolute -inset-5 rounded-full bg-voxcina-blue/20 dark:bg-secondary-200/20"
                    ></motion.div>
                    <div className="relative">
                      <MapPin className="w-12 h-12 text-voxcina-blue dark:text-secondary-200" />
                      <span className="absolute top-1 right-1 w-3 h-3 bg-voxcina-blue dark:bg-secondary-200 rounded-full"></span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-white/80 dark:bg-voxcina-blue/30 rounded-xl shadow-soft px-4 py-2 backdrop-blur-sm border border-secondary-200/50 dark:border-voxcina-blue/30">
                    <p className="text-voxcina-blue dark:text-secondary-200 font-medium">
                      موقعیت دفاتر Voxcina
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        <section id="contact-form" className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">ارسال پیام</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                برای ارسال پیام، پیشنهادات، انتقادات و یا درخواست همکاری، فرم
                زیر را تکمیل کنید.
              </p>
            </motion.div>

            <motion.div
              className="max-w-3xl mx-auto bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft overflow-hidden backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              {formStatus && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`p-4 ${
                    formStatus.success
                      ? "bg-green-50/70 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-b border-green-100 dark:border-green-900/20"
                      : "bg-red-50/70 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-b border-red-100 dark:border-red-900/20"
                  } flex items-start backdrop-blur-sm`}
                >
                  {formStatus.success ? (
                    <CheckCircle className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  ) : (
                    <MessageSquare className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  )}
                  <p>{formStatus.message}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      نام و نام خانوادگی <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft backdrop-blur-xs"
                      placeholder="نام و نام خانوادگی خود را وارد کنید"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      ایمیل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft backdrop-blur-xs"
                      placeholder="example@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      شماره تماس
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft backdrop-blur-xs"
                      placeholder="09123456789"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      موضوع
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft backdrop-blur-xs"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="سوال">سوال</option>
                      <option value="پیشنهاد">پیشنهاد</option>
                      <option value="انتقاد">انتقاد</option>
                      <option value="همکاری">همکاری</option>
                      <option value="پشتیبانی">پشتیبانی</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                  >
                    پیام <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft backdrop-blur-xs resize-none"
                    placeholder="پیام خود را بنویسید..."
                    required
                  ></textarea>
                </div>

                <div className="mt-8">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue rounded-xl shadow-soft hover:shadow-medium transition-all flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 ml-2" />
                    ارسال پیام
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
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">سوالات متداول</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                پاسخ بسیاری از سوالات متداول شما در این بخش قرار دارد.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              {[
                {
                  question: "چگونه می‌توانم با پشتیبانی فنی تماس بگیرم؟",
                  answer:
                    "شما می‌توانید از طریق شماره تلفن پشتیبانی فنی که در بالای صفحه درج شده است و یا از طریق ارسال ایمیل به support@example.com با کارشناسان ما در ارتباط باشید.",
                },
                {
                  question: "ساعات کاری دفتر مرکزی چگونه است؟",
                  answer:
                    "دفتر مرکزی ما از شنبه تا چهارشنبه از ساعت ۹ صبح تا ۵ بعدازظهر و پنجشنبه‌ها از ساعت ۹ صبح تا ۱ بعدازظهر آماده خدمت‌رسانی به شما است.",
                },
                {
                  question:
                    "چطور می‌توانم در مورد همکاری با شرکت شما اطلاعات کسب کنم؟",
                  answer:
                    "برای همکاری با ما می‌توانید فرم ارسال پیام را با موضوع «همکاری» تکمیل کنید و یا از طریق ایمیل info@example.com با ما در ارتباط باشید.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  className="mb-6 bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30 overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ y: -5 }}
                >
                  <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-4 flex items-center relative z-10">
                    <div className="w-8 h-8 rounded-full bg-secondary-200/70 dark:bg-voxcina-blue/20 flex items-center justify-center ml-3 flex-shrink-0 shadow-soft">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-voxcina-blue dark:text-secondary-200"
                      >
                        <path d="M10 13a2 2 0 0 1 4 0 2 2 0 0 1-4 0z"></path>
                        <circle cx="12" cy="13" r="8"></circle>
                        <path d="M12 9v-2M12 17v-2"></path>
                      </svg>
                    </div>
                    {faq.question}
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 leading-relaxed pr-10 relative z-10">
                    {faq.answer}
                  </p>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="bg-white/90 dark:bg-voxcina-blue/10 max-w-4xl mx-auto rounded-2xl shadow-soft overflow-hidden backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30 p-8 md:p-10 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-32 -mr-32"></div>
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-voxcina-blue dark:text-secondary-200 mb-4">
                    همچنان سوالی دارید؟
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-6 max-w-xl mx-auto">
                    تیم پشتیبانی Voxcina همیشه آماده پاسخگویی به سوالات و رفع
                    مشکلات شما است. با ما در ارتباط باشید.
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block"
                  >
                    <a
                      href="#contact-form"
                      className="inline-flex items-center bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue rounded-xl px-8 py-3 font-medium transition-colors shadow-soft hover:shadow-medium"
                    >
                      <MessageSquare className="w-5 h-5 ml-2" />
                      ارسال پیام
                    </a>
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
