"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

// Define Trend interface to match TRENDING_DATA structure
interface Trend {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  popularity: number;
  tags: string[];
}

export default function TrendingPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  // Updated: Type trends as Trend[]
  const [trends, setTrends] = useState<Trend[]>([]);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const scaleUp = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } },
  };

  useEffect(() => {
    const fetchTrends = async () => {
      setIsLoading(true);
      setTimeout(() => {
        setTrends(TRENDING_DATA);
        setIsLoading(false);
      }, 1000);
    };

    fetchTrends();
  }, []);
  
  const filteredTrends =
    activeCategory === "all"
      ? trends
      : trends.filter((trend) => trend.category === activeCategory);

  const uniqueCategories = [
    "all",
    ...new Set(TRENDING_DATA.map((item) => item.category)),
  ];

  return (
    <div className="min-h-screen pb-16 overflow-x-hidden">
      <section
        ref={heroRef}
        className="relative h-[60vh] md:h-[75vh] overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-900 via-violet-800 to-indigo-900"
          style={{ y: heroY }}
        />
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay" />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          className="relative h-full w-full container mx-auto flex items-center justify-center text-center"
          style={{ opacity: heroOpacity, y: textY }}
        >
          <div className="max-w-3xl px-6">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-4 border border-white/20"
            >
              #FashionTrends2025
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white"
            >
              ترندهای مد{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300">
                ۱۴۰۴
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg md:text-xl mb-10 text-white/80"
            >
              با آخرین ترندهای دنیای مد آشنا شوید و استایل منحصر به فرد خود را
              بسازید. ترکیبی از سبک‌های کلاسیک و مدرن که تمام فصل‌های سال را
              پوشش می‌دهند.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <a
                href="#trends"
                className="bg-white text-indigo-700 px-8 py-4 rounded-full font-medium hover:bg-opacity-95 transition-all duration-300 hover:shadow-lg inline-block"
              >
                مشاهده ترندها
              </a>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <span className="text-white/70 mb-2 text-sm">اسکرول کنید</span>
          <span className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-1">
            <motion.span
              className="w-1.5 h-1.5 bg-white rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
            />
          </span>
        </motion.div>
      </section>

      <section className="container mx-auto py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-6"
            variants={fadeIn}
          >
            ترندها را دنبال کنید، استایل خود را بسازید
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mb-10"
            variants={fadeIn}
          >
            مد همیشه در حال تغییر است، اما همیشه راه‌هایی برای ترکیب ترندهای
            جدید با سبک شخصی وجود دارد. اینجا می‌توانید با آخرین ترندهای مد
            جهانی آشنا شوید و ایده‌های جدیدی برای استایل شخصی خود پیدا کنید.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            variants={staggerContainer}
          >
            {uniqueCategories.map((category, index) => (
              <motion.button
                key={category}
                className={`px-5 py-2 rounded-full transition-all ${
                  activeCategory === category
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveCategory(category)}
                variants={itemVariant}
              >
                {category === "all"
                  ? "همه"
                  : category === "clothing"
                  ? "پوشاک"
                  : category === "accessories"
                  ? "اکسسوری"
                  : category === "footwear"
                  ? "کفش"
                  : category === "colors"
                  ? "رنگ‌ها"
                  : category === "fabric"
                  ? "پارچه‌ها"
                  : category === "sustainability"
                  ? "پایداری"
                  : category}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section id="trends" className="container mx-auto py-10 px-6">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {filteredTrends.map((trend, index) => (
              <motion.div
                key={trend.id}
                className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300"
                variants={itemVariant}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{
                      backgroundImage: `url('/images/trends/${trend.image}')`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-6">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-3">
                        {trend.category === "clothing"
                          ? "پوشاک"
                          : trend.category === "accessories"
                          ? "اکسسوری"
                          : trend.category === "footwear"
                          ? "کفش"
                          : trend.category === "colors"
                          ? "رنگ‌ها"
                          : trend.category === "fabric"
                          ? "پارچه‌ها"
                          : trend.category === "sustainability"
                          ? "پایداری"
                          : trend.category}
                      </span>
                      <h3 className="text-white text-xl font-bold">
                        {trend.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex -space-x-3 space-x-reverse ml-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden"
                        >
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{
                              backgroundImage: `url('/images/avatars/avatar-${
                                ((index + i) % 8) + 1
                              }.jpg')`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {trend.popularity}% محبوبیت
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {trend.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-xs">
                        #{trend.tags[0]}
                      </span>
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full text-xs">
                        #{trend.tags[1]}
                      </span>
                    </div>

                    <Link
                      href={`/trends/${trend.id}`}
                      className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      <span>اطلاعات بیشتر</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="text-center mb-14"
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm mb-4"
              variants={fadeIn}
            >
              رویدادهای جهانی مد
            </motion.span>

            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-6"
              variants={fadeIn}
            >
              هفته‌های مد بین‌المللی
            </motion.h2>

            <motion.p
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              variants={fadeIn}
            >
              آخرین ترندهای مد از برترین شوهای طراحان مطرح جهان در هفته‌های مد
              نیویورک، پاریس، میلان و لندن.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {FASHION_WEEKS.map((week, index) => (
              <motion.div
                key={index}
                className="relative rounded-xl overflow-hidden shadow-lg group"
                variants={itemVariant}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('/images/fashion-weeks/${week.image}')`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/0 flex flex-col justify-end p-6">
                    <h3 className="text-white text-xl font-bold mb-2">
                      {week.city}
                    </h3>
                    <p className="text-white/80 text-sm mb-4">{week.date}</p>
                    <div className="transform translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <a
                        href={week.link}
                        className="inline-block bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
                      >
                        مشاهده جزئیات
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto py-20 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 text-sm mb-4"
              variants={fadeIn}
            >
              تحلیل ترندها
            </motion.span>

            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-6"
              variants={fadeIn}
            >
              تحلیل آماری ترندهای مد ۱۴۰۴
            </motion.h2>

            <motion.p
              className="text-gray-600 dark:text-gray-300 mb-6"
              variants={fadeIn}
            >
              ترندهای مد تنها سلیقه طراحان نیستند، بلکه بازتابی از شرایط
              اجتماعی، اقتصادی و فرهنگی جامعه هستند. با تحلیل داده‌های سال
              گذشته، می‌توانیم الگوهای پیش‌رو را پیش‌بینی کنیم.
            </motion.p>

            <motion.div className="space-y-4 mb-8" variants={staggerContainer}>
              {TREND_STATS.map((stat, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col"
                  variants={itemVariant}
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{stat.name}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {stat.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600"
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.a
              href="/reports/trends-2025"
              className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              variants={fadeIn}
            >
              <span>دانلود گزارش کامل</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.a>
          </motion.div>

          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={scaleUp}
          >
            <div className="rounded-xl overflow-hidden shadow-xl">
              <div className="aspect-video relative bg-indigo-900 p-6 md:p-8 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5"></div>

                <div className="relative z-10 mt-6 h-48 md:h-64">
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-around h-full">
                    {[65, 40, 85, 30, 70, 50, 90].map((height, index) => (
                      <div key={index} className="w-1/8 mx-1">
                        <div
                          className="rounded-t w-full bg-gradient-to-t from-indigo-500 to-purple-400"
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, index) => (
                      <div
                        key={index}
                        className="w-full h-px bg-white/10"
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 text-center">
                  <div className="grid grid-cols-7 mt-2">
                    {[
                      "رنگ‌ها",
                      "الگوها",
                      "پایداری",
                      "راحتی",
                      "گشادی",
                      "برش",
                      "لایه‌ها",
                    ].map((label, index) => (
                      <div
                        key={index}
                        className="text-xs text-white/70 truncate px-1"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 flex justify-between items-center mt-6">
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      محبوبیت ترندها
                    </h3>
                    <p className="text-white/70 text-sm">مقایسه سه‌ماهه اخیر</p>
                  </div>

                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="text-center mb-12"
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-6"
            variants={fadeIn}
          >
            الهام از اینستاگرام
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            استایل‌های محبوب از اینفلوئنسرهای مد و استایلیست‌های حرفه‌ای در
            اینستاگرام
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {[...Array(12)].map((_, index) => (
            <motion.a
              key={index}
              href="#"
              className="group relative aspect-square overflow-hidden bg-gray-200 rounded-lg"
              variants={itemVariant}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/0 to-black/0 group-hover:from-black/50 group-hover:to-black/30 transition-all duration-300 z-10"></div>

              <motion.div
                className="absolute inset-0 scale-105 group-hover:scale-100 transition-transform duration-700 bg-cover bg-center"
                style={{
                  backgroundImage: `url('/images/instagram/instagram-${
                    (index % 12) + 1
                  }.jpg')`,
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-10"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <a
            href="https://instagram.com/yourbrand"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-gray-600 dark:text-gray-text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
          >
            <span className="text-lg mr-2">@yourbrand</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </a>
        </motion.div>
      </section>

      <section className="container mx-auto py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

          <motion.div
            className="relative z-10 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-4 border border-white/5"
              variants={fadeIn}
            >
              مطلع باشید
            </motion.span>

            <motion.h3
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              variants={fadeIn}
            >
              از آخرین ترندها باخبر شوید
            </motion.h3>

            <motion.p
              className="text-white/80 mb-8 max-w-lg mx-auto"
              variants={fadeIn}
            >
              با عضویت در خبرنامه ما، اولین نفری باشید که از آخرین ترندها و
              اخبار دنیای مد مطلع می‌شود
            </motion.p>

            <motion.div className="max-w-md mx-auto" variants={fadeIn}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="ایمیل خود را وارد کنید"
                    className="w-full px-5 py-4 rounded-xl outline-none text-right pr-10 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <button className="bg-white text-indigo-600 px-8 py-4 rounded-xl hover:bg-white/90 transition-colors font-medium">
                  عضویت
                </button>
              </div>

              <p className="text-white/60 text-sm mt-4">
                ما به حریم خصوصی شما احترام می‌گذاریم و هرگز اطلاعات شما را به
                اشتراک نمی‌گذاریم.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="container mx-auto py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="text-center mb-16"
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-6"
            variants={fadeIn}
          >
            کارشناسان استایل
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            تیم کارشناسان ما با چندین سال تجربه در صنعت مد، شما را با آخرین
            ترندها و نحوه ست کردن آنها آشنا می‌کنند
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {EXPERTS.map((expert, index) => (
            <motion.div
              key={index}
              className="text-center"
              variants={itemVariant}
            >
              <div className="relative mb-6 mx-auto w-48 h-48 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('/images/experts/${expert.image}')`,
                  }}
                />
              </div>

              <h3 className="text-xl font-bold mb-2">{expert.name}</h3>
              <p className="text-indigo-600 dark:text-indigo-400 mb-4">
                {expert.role}
              </p>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-5">
                {expert.bio}
              </p>

              <div className="flex justify-center space-x-3 space-x-reverse">
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-instagram"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-twitter"
                    viewBox="0 0 16 16"
                  >
                    <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-linkedin"
                    viewBox="0 0 16 16"
                  >
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                  </svg>
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <a
            href="/about/team"
            className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <span>آشنایی با تمام تیم ما</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </motion.div>
      </section>
    </div>
  );
}

const TRENDING_DATA = [
  {
    id: "oversized-clothing",
    name: "لباس‌های گشاد و راحت",
    category: "clothing",
    description:
      "لباس‌های گشاد و راحت که آزادی حرکت بیشتری را فراهم می‌کنند، از ترندهای اصلی امسال هستند.",
    image: "trend-oversized.jpg",
    popularity: 92,
    tags: ["oversized", "comfort"],
  },
  {
    id: "sustainable-fashion",
    name: "مد پایدار و اکو فرندلی",
    category: "sustainability",
    description:
      "مواد بازیافتی و پایدار برای حفاظت از محیط زیست، به ترند مهمی در دنیای مد تبدیل شده‌اند.",
    image: "trend-sustainable.jpg",
    popularity: 85,
    tags: ["eco", "sustainable"],
  },
  {
    id: "bold-colors",
    name: "رنگ‌های جسورانه",
    category: "colors",
    description:
      "رنگ‌های جسورانه و درخشان، به خصوص رنگ‌های فسفری و نئون، در سال ۱۴۰۴ بسیار محبوب هستند.",
    image: "trend-bold-colors.jpg",
    popularity: 78,
    tags: ["colors", "neon"],
  },
  {
    id: "statement-accessories",
    name: "اکسسوری‌های خاص",
    category: "accessories",
    description:
      "اکسسوری‌های بزرگ و منحصر به فرد که بیانگر شخصیت هستند، ترند جدید محسوب می‌شوند.",
    image: "trend-accessories.jpg",
    popularity: 75,
    tags: ["accessories", "statement"],
  },
  {
    id: "natural-fabrics",
    name: "پارچه‌های طبیعی",
    category: "fabric",
    description:
      "پارچه‌های طبیعی مانند کتان، پنبه ارگانیک و ابریشم، به دلیل راحتی و سازگاری با محیط زیست بسیار محبوب شده‌اند.",
    image: "trend-natural-fabrics.jpg",
    popularity: 83,
    tags: ["natural", "comfort"],
  },
  {
    id: "chunky-boots",
    name: "بوت‌های پاشنه کلفت",
    category: "footwear",
    description:
      "بوت‌های پاشنه کلفت و بزرگ، ترند امسال در کفش‌ها هستند که به استایل‌های روزمره عمق می‌بخشند.",
    image: "trend-chunky-boots.jpg",
    popularity: 70,
    tags: ["footwear", "boots"],
  },
  {
    id: "wide-leg-pants",
    name: "شلوارهای پاچه گشاد",
    category: "clothing",
    description:
      "شلوارهای پاچه گشاد و راحت، جایگزین مناسبی برای شلوارهای اسکینی هستند و در سال ۱۴۰۴ بسیار دیده می‌شوند.",
    image: "trend-wide-leg.jpg",
    popularity: 88,
    tags: ["pants", "comfort"],
  },
  {
    id: "pastel-hues",
    name: "رنگ‌های پاستلی",
    category: "colors",
    description:
      "رنگ‌های پاستلی ملایم و آرامش‌بخش، به خصوص رنگ‌های لیلاکی و آبی آسمانی، از ترندهای رنگی امسال هستند.",
    image: "trend-pastel.jpg",
    popularity: 76,
    tags: ["colors", "pastel"],
  },
  {
    id: "layered-clothing",
    name: "لایه‌بندی لباس‌ها",
    category: "clothing",
    description:
      "لایه‌بندی هوشمندانه لباس‌ها برای ایجاد استایل‌های متنوع و کاربردی، یکی از ترندهای پرطرفدار امسال است.",
    image: "trend-layered.jpg",
    popularity: 80,
    tags: ["layering", "versatile"],
  },
];

const FASHION_WEEKS = [
  {
    city: "پاریس",
    date: "فروردین ۱۴۰۴",
    image: "paris.jpg",
    link: "/fashion-weeks/paris",
  },
  {
    city: "میلان",
    date: "اردیبهشت ۱۴۰۴",
    image: "milan.jpg",
    link: "/fashion-weeks/milan",
  },
  {
    city: "نیویورک",
    date: "خرداد ۱۴۰۴",
    image: "newyork.jpg",
    link: "/fashion-weeks/newyork",
  },
  {
    city: "لندن",
    date: "تیر ۱۴۰۴",
    image: "london.jpg",
    link: "/fashion-weeks/london",
  },
];

const TREND_STATS = [
  {
    name: "لباس‌های پایدار و سازگار با محیط زیست",
    percentage: 78,
  },
  {
    name: "لباس‌های راحت و گشاد",
    percentage: 85,
  },
  {
    name: "رنگ‌های روشن و جسورانه",
    percentage: 62,
  },
  {
    name: "پارچه‌های طبیعی",
    percentage: 70,
  },
  {
    name: "استایل مینیمال",
    percentage: 55,
  },
];

const EXPERTS = [
  {
    name: "سارا محمدی",
    role: "سردبیر مد",
    image: "expert-1.jpg",
    bio: "با بیش از ۱۰ سال تجربه در صنعت مد، سارا به شما کمک می‌کند تا بهترین انتخاب‌ها را داشته باشید.",
  },
  {
    name: "علی کریمی",
    role: "استایلیست",
    image: "expert-2.jpg",
    bio: "علی در زمینه ست کردن لباس‌ها برای مناسبت‌های مختلف تخصص دارد و مشاور استایل شخصی شماست.",
  },
  {
    name: "نیلوفر احمدی",
    role: "طراح مد",
    image: "expert-3.jpg",
    bio: "نیلوفر با تجربه طراحی برای برندهای معتبر، شما را با آخرین ترندهای طراحی آشنا می‌کند.",
  },
  {
    name: "امیر رضایی",
    role: "تحلیلگر ترندها",
    image: "expert-4.jpg",
    bio: "امیر با تحلیل دقیق بازار مد، روندهای آینده را پیش‌بینی می‌کند و به شما مشاوره می‌دهد.",
  },
];
