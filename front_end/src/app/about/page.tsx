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
            <span className="relative z-10">درباره ما</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
          </motion.h1>

          <motion.p
            className="text-xl max-w-3xl mx-auto text-secondary-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            ما با تلاش و تعهد به ارائه بهترین محصولات و خدمات، در مسیر رضایت
            مشتریان گام برمی‌داریم.
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
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">داستان ما</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="prose prose-lg max-w-none bg-white/80 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30"
            >
              <p className="text-voxcina-blue/80 dark:text-secondary-300">
                در سال ۱۳۹۵، با هدف ایجاد تحولی در صنعت فروش آنلاین، فعالیت خود
                را آغاز کردیم. ما از ابتدا با تمرکز بر کیفیت محصولات و تجربه
                خرید مشتریان، توانستیم به یکی از معتبرترین فروشگاه‌های آنلاین
                تبدیل شویم.
              </p>

              <p className="text-voxcina-blue/80 dark:text-secondary-300">
                امروز، با تیمی متشکل از ۵۰ نفر از متخصصان و همکاری با بیش از ۱۰۰
                تولیدکننده و تأمین‌کننده معتبر، افتخار ارائه بیش از ۵۰۰۰ محصول
                با کیفیت را داریم. ما همواره تلاش می‌کنیم تا با بهره‌گیری از
                آخرین فناوری‌ها و بهبود مستمر خدمات، رضایت مشتریان را جلب کنیم.
              </p>

              <p className="text-voxcina-blue/80 dark:text-secondary-300">
                چشم‌انداز ما گسترش دامنه فعالیت و حضور موثر در بازارهای
                بین‌المللی است. ماموریت ما ایجاد تجربه‌ای لذت‌بخش از خرید آنلاین
                برای همه مشتریان با هر سلیقه و بودجه‌ای است.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
              <span className="relative z-10">ارزش‌های ما</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
            </h2>
            <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

              <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                <Award className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10">
                کیفیت برتر
              </h3>

              <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10">
                ما همواره به دنبال بهترین محصولات با بالاترین کیفیت هستیم تا
                رضایت مشتریان را جلب کنیم.
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
                <Target className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10">
                مشتری‌مداری
              </h3>

              <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10">
                مشتریان محور اصلی فعالیت‌های ما هستند و تمام تلاش ما برای جلب
                رضایت و اعتماد آنهاست.
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
                <TrendingUp className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10">
                نوآوری مستمر
              </h3>

              <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10">
                ما همواره به دنبال نوآوری و بهبود مستمر در محصولات و خدمات خود
                هستیم.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
              <span className="relative z-10">تیم ما</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
            </h2>
            <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
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
                className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 * index }}
                whileHover={{ y: -5 }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-voxcina-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                <div className="p-6 relative">
                  <div className="absolute top-0 left-0 transform -translate-y-1/2 w-24 h-1 bg-secondary-200 dark:bg-voxcina-blue/30 rounded-full"></div>

                  <h3 className="text-xl font-bold mb-1 text-voxcina-blue dark:text-secondary-200 transition-colors">
                    {member.name}
                  </h3>

                  <p className="text-voxcina-blue/60 dark:text-secondary-200/70 mb-4 inline-block px-3 py-1 bg-secondary-100 dark:bg-voxcina-blue/20 rounded-full text-sm">
                    {member.position}
                  </p>

                  <div className="flex justify-center space-x-3 space-x-reverse mt-3">
                    <motion.a
                      href="#"
                      className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-voxcina-blue/20 flex items-center justify-center text-voxcina-blue/70 dark:text-secondary-300 hover:bg-voxcina-blue hover:text-white dark:hover:bg-secondary-200 dark:hover:text-voxcina-blue transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </motion.a>

                    <motion.a
                      href="#"
                      className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-voxcina-blue/20 flex items-center justify-center text-voxcina-blue/70 dark:text-secondary-300 hover:bg-voxcina-blue hover:text-white dark:hover:bg-secondary-200 dark:hover:text-voxcina-blue transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        className="w-4 h-4"
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
                    </motion.a>

                    <motion.a
                      href="#"
                      className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-voxcina-blue/20 flex items-center justify-center text-voxcina-blue/70 dark:text-secondary-300 hover:bg-voxcina-blue hover:text-white dark:hover:bg-secondary-200 dark:hover:text-voxcina-blue transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        className="w-4 h-4"
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
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
              <span className="relative z-10">ارتباط با ما</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
            </h2>
            <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200 text-center">
                آدرس
              </h3>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 text-center">
                تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه 12
              </p>
            </motion.div>

            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200 text-center">
                ایمیل
              </h3>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 text-center">
                info@voxcina.com
              </p>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 text-center">
                support@voxcina.com
              </p>
            </motion.div>

            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
                <Phone className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200 text-center">
                تلفن
              </h3>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 text-center">
                ۰۲۱-۸۸۷۷۶۶۵۵
              </p>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 text-center">
                ۰۹۱۲۳۴۵۶۷۸۹
              </p>
            </motion.div>
          </div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/contact"
                className="inline-flex items-center bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue rounded-xl px-8 py-3 font-medium transition-colors shadow-soft hover:shadow-medium"
              >
                <Mail className="w-5 h-5 ml-2" />
                تماس با ما
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <div className="h-16 bg-gradient-to-t from-voxcina-blue to-voxcina-blue/70 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-1/3 w-64 h-64 bg-secondary-200/10 rounded-full blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-secondary-200/20"></div>
      </div>
    </div>
  );
}
