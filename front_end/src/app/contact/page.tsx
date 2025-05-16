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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto py-24 px-4 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            تماس با ما
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ما مشتاق شنیدن صدای شما هستیم. از طریق راه‌های ارتباطی زیر با ما در
            تماس باشید.
          </motion.p>
        </div>
      </div>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              variants={itemVariants}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                تلفن تماس
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                پشتیبانی فروش:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold mb-3 ltr">
                021-88776655
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                پشتیبانی فنی:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold ltr">
                021-88778899
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              variants={itemVariants}
            >
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                ایمیل
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                فروش و سفارشات:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold mb-3">
                info@example.com
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                پشتیبانی مشتریان:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold">
                support@example.com
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              variants={itemVariants}
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                ساعات کاری
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                شنبه تا چهارشنبه:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold mb-3">
                ۹ صبح تا ۵ بعدازظهر
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                پنجشنبه:
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-bold">
                ۹ صبح تا ۱ بعدازظهر
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              آدرس ما
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <motion.div
              className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-md"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                <MapPin className="w-6 h-6 ml-2 text-indigo-500" />
                دفتر مرکزی
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه 12،
                واحد 1203
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                کد پستی: 1234567890
              </p>
              <div className="flex items-center text-gray-700 dark:text-gray-300 mb-6">
                <Phone className="w-5 h-5 ml-2 text-indigo-500" />
                <span className="ltr">021-88776655</span>
              </div>

              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center mt-8">
                <MapPin className="w-6 h-6 ml-2 text-indigo-500" />
                دفتر فروش
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                تهران، خیابان شریعتی، بالاتر از میرداماد، مجتمع تجاری رز، طبقه
                3، واحد 302
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                کد پستی: 1234567891
              </p>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Phone className="w-5 h-5 ml-2 text-indigo-500" />
                <span className="ltr">021-77889900</span>
              </div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden h-96"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
                  <p className="text-gray-700 dark:text-gray-300">
                    نقشه موقعیت دفتر ما
                  </p>
                </div>
              </div>
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
              ارسال پیام
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              برای ارسال پیام، پیشنهادات، انتقادات و یا درخواست همکاری، فرم زیر
              را تکمیل کنید.
            </p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {formStatus && (
              <div
                className={`p-4 ${
                  formStatus.success
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                } flex items-start`}
              >
                {formStatus.success ? (
                  <CheckCircle className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                ) : (
                  <MessageSquare className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                )}
                <p>{formStatus.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    نام و نام خانوادگی <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="نام و نام خانوادگی خود را وارد کنید"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    ایمیل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    شماره تماس
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="09123456789"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    موضوع
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  پیام <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="پیام خود را بنویسید..."
                  required
                ></textarea>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                >
                  <Send className="w-5 h-5 ml-2" />
                  ارسال پیام
                </button>
              </div>
            </form>
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
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
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
                className="mb-6 bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
