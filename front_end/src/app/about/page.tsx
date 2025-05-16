"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Award,
  Target,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
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
            درباره ما
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ما با تلاش و تعهد به ارائه بهترین محصولات و خدمات، در مسیر رضایت
            مشتریان گام برمی‌داریم.
          </motion.p>
        </div>
      </div>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                داستان ما
              </h2>
              <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="prose prose-lg dark:prose-invert max-w-none"
            >
              <p>
                در سال ۱۳۹۵، با هدف ایجاد تحولی در صنعت فروش آنلاین، فعالیت خود
                را آغاز کردیم. ما از ابتدا با تمرکز بر کیفیت محصولات و تجربه
                خرید مشتریان، توانستیم به یکی از معتبرترین فروشگاه‌های آنلاین
                تبدیل شویم.
              </p>

              <p>
                امروز، با تیمی متشکل از ۵۰ نفر از متخصصان و همکاری با بیش از ۱۰۰
                تولیدکننده و تأمین‌کننده معتبر، افتخار ارائه بیش از ۵۰۰۰ محصول
                با کیفیت را داریم. ما همواره تلاش می‌کنیم تا با بهره‌گیری از
                آخرین فناوری‌ها و بهبود مستمر خدمات، رضایت مشتریان را جلب کنیم.
              </p>

              <p>
                چشم‌انداز ما گسترش دامنه فعالیت و حضور موثر در بازارهای
                بین‌المللی است. ماموریت ما ایجاد تجربه‌ای لذت‌بخش از خرید آنلاین
                برای همه مشتریان با هر سلیقه و بودجه‌ای است.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              ارزش‌های ما
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                کیفیت برتر
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ما همواره به دنبال بهترین محصولات با بالاترین کیفیت هستیم تا
                رضایت مشتریان را جلب کنیم.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                مشتری‌مداری
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                مشتریان محور اصلی فعالیت‌های ما هستند و تمام تلاش ما برای جلب
                رضایت و اعتماد آنهاست.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                نوآوری مستمر
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ما همواره به دنبال نوآوری و بهبود مستمر در محصولات و خدمات خود
                هستیم.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              تیم ما
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: "علی محمدی",
                position: "مدیرعامل",
                image: "/api/placeholder/150/150",
              },
              {
                name: "مریم احمدی",
                position: "مدیر محصول",
                image: "/api/placeholder/150/150",
              },
              {
                name: "رضا کریمی",
                position: "مدیر فنی",
                image: "/api/placeholder/150/150",
              },
              {
                name: "سارا حسینی",
                position: "مدیر فروش",
                image: "/api/placeholder/150/150",
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden shadow-md text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 * index }}
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
                    {member.name}
                  </h3>
                  <p className="text-indigo-600 dark:text-indigo-400 mb-3">
                    {member.position}
                  </p>
                  <div className="flex justify-center space-x-3 space-x-reverse">
                    <a
                      href="#"
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              ارتباط با ما
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                آدرس
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه 12
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                ایمیل
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                info@example.com
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                support@example.com
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                تلفن
              </h3>
              <p className="text-gray-600 dark:text-gray-300">۰۲۱-۸۸۷۷۶۶۵۵</p>
              <p className="text-gray-600 dark:text-gray-300">۰۹۱۲۳۴۵۶۷۸۹</p>
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/contact"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              تماس با ما
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
