"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Phone } from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AboutClient() {
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
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
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
                      <span className="relative z-10">وکسینا (ووکسینا | Voxcina)</span>
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
                    <span className="block">درباره</span>
                    <span className="block text-voxcina-blue relative">
                      ما
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
                      ایده‌ها{" "}
                    </span>
                    به
                    <span className="text-voxcina-blue font-semibold">
                      {" "}
                      واقعیت{" "}
                    </span>
                    تبدیل می‌شوند
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
              className="max-w-6xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="text-center mb-12 sm:mb-16 md:mb-20"
              >
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-darkBlue dark:text-white mb-4 sm:mb-6 relative inline-block">
                  داستان ما
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                  />
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-12 sm:mb-16">
                <motion.div
                  variants={itemVariants}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-bl from-voxcina-blue/20 to-transparent rounded-bl-xl sm:rounded-bl-2xl"></div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-voxcina-blue mb-3 sm:mb-4 relative z-10">
                    شروع
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 leading-relaxed relative z-10">
                    در سال ۱۳۹۵، با هدف ایجاد تحولی در صنعت فروش آنلاین، فعالیت
                    خود را آغاز کردیم و با تمرکز بر کیفیت محصولات توانستیم به
                    یکی از معتبرترین فروشگاه‌ها تبدیل شویم.
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 lg:transform lg:translate-y-4 xl:translate-y-8"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-bl from-voxcina-darkBlue/20 to-transparent rounded-bl-xl sm:rounded-bl-2xl"></div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-voxcina-darkBlue mb-3 sm:mb-4 relative z-10">
                    امروز
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 leading-relaxed relative z-10">
                    با تیمی متشکل از ۵۰ نفر از متخصصان و همکاری با بیش از ۱۰۰
                    تولیدکننده، افتخار ارائه بیش از ۵۰۰۰ محصول با کیفیت را داریم
                    و همواره در حال بهبود خدمات هستیم.
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-bl from-secondary-200/30 to-transparent rounded-bl-xl sm:rounded-bl-2xl"></div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-secondary-600 dark:text-secondary-200 mb-3 sm:mb-4 relative z-10">
                    آینده
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-200/90 leading-relaxed relative z-10">
                    چشم‌انداز ما گسترش دامنه فعالیت و حضور موثر در بازارهای
                    بین‌المللی است. ماموریت ما ایجاد تجربه‌ای لذت‌بخش از خرید
                    آنلاین برای همه مشتریان است.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-transparent relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            <motion.div
              animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 right-20 w-32 h-32 border border-voxcina-blue/5 rounded-full"
            />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-voxcina-darkBlue dark:text-white mb-6">
                ارتباط با ما
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue mx-auto rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              {[
                {
                  icon: MapPin,
                  title: "آدرس",
                  content: ["پاسداران بوستان پنجم کوی گلشن پلاک ۱۴"],
                  delay: 0.2,
                },
                {
                  icon: Mail,
                  title: "ایمیل",
                  content: ["info@voxcina.com", "support@voxcina.com"],
                  delay: 0.4,
                },
                {
                  icon: Phone,
                  title: "تلفن",
                  content: ["021-22325653", "09128930115"],
                  delay: 0.6,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.8, delay: item.delay }}
                  className="group perspective-1000"
                >
                  <div className="relative bg-white/60 dark:bg-voxcina-darkBlue/20 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-voxcina-blue/10 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:bg-white/80 dark:group-hover:bg-voxcina-darkBlue/30">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                      <item.icon className="w-8 h-8" />
                    </motion.div>

                    <h3 className="text-xl font-bold mb-4 text-voxcina-darkBlue dark:text-white text-center">
                      {item.title}
                    </h3>

                    <div className="text-center">
                      {item.content.map((line, i) => (
                        <p
                          key={i}
                          className="text-gray-600 dark:text-secondary-200/80 mb-1"
                        >
                          {line}
                        </p>
                      ))}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-voxcina-blue/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/contact"
                  className="inline-flex items-center bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue hover:from-voxcina-darkBlue hover:to-voxcina-blue text-white px-10 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                >
                  <Mail className="w-5 h-5 ml-3 group-hover:rotate-12 transition-transform duration-300" />
                  تماس با ما
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-2xl"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
