"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import ProductGrid from "@/components/product/ProductGrid";
import { DEMO_BANNERS } from "@/lib/constants";
import { motion, useScroll, useTransform } from "framer-motion";

export default function HomePage() {
  const {
    featuredProducts,
    newProducts,
    fetchFlashSaleProducts,
    fetchNewProducts,
    isLoading: isProductLoading,
    error: productError,
  } = useProductStore();

  const {
    categories,
    fetchCategories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCategoryStore();

  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);

  useEffect(() => {
    fetchFlashSaleProducts();
    fetchNewProducts();
    fetchCategories();
    setIsVisible(true);

    document.documentElement.style.scrollBehavior = "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, [fetchFlashSaleProducts, fetchNewProducts, fetchCategories]);

  const mainCategories = categories.slice(0, 5);

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

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const rect = heroElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
  };

  return (
    <div className="pb-16 overflow-x-hidden font-sans">
      <section
        ref={heroRef as React.RefObject<HTMLElement>}
        className="relative h-[70vh] md:h-[85vh] mb-24 overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-fuchsia-900 via-purple-800 to-indigo-900"
          style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
        />
        <div className="absolute inset-0 bg-[url('/images/banners/heroheader.jpeg')] opacity-15 mix-blend-soft-light"></div>

        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full bg-white opacity-5 blur-3xl pointer-events-none mix-blend-overlay"
          animate={{
            x: mousePosition.x - 150,
            y: mousePosition.y - 150,
          }}
          transition={{ type: "spring", damping: 15, stiffness: 150 }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative h-full w-full flex items-center"
        >
          <div className="container">
            <div className="max-w-lg md:max-w-xl text-white z-10 relative">
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ duration: 0.7 }}
                className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-sm mb-4 border border-white/20"
              >
                #FashionForward2025
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
              >
                کالکشن جدید{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
                  تابستانه
                </span>
                {" "}
                امیر حسین خره
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-xl md:text-2xl mb-10 text-gray-100 font-light"
              >
                با مجموعه جدید تابستانه ما، استایل تابستانی خود را متحول کنید
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/categories/summer"
                  className="group relative overflow-hidden bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-opacity-95 transition-all duration-300 hover:shadow-xl inline-block"
                >
                  <span className="relative z-10">مشاهده کالکشن</span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-amber-300 to-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    initial={{ x: "100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                </Link>

                <Link
                  href="/categories/trending"
                  className="backdrop-blur-md bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-all duration-300 inline-block"
                >
                  ترندهای امسال
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="absolute right-10 top-1/4 w-24 h-24 bg-pink-500 rounded-full opacity-30 animate-float blur-lg"></div>
        <div className="absolute left-20 bottom-1/4 w-32 h-32 bg-amber-400 rounded-full opacity-20 animate-float-delay blur-xl"></div>
        <div className="absolute right-1/4 bottom-20 w-16 h-16 bg-blue-500 rounded-full opacity-25 animate-float-slow blur-md"></div>

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

      <motion.section
        className="container mb-32"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={fadeIn}
      >
        <motion.h2
          className="text-3xl font-bold mb-12 border-b pb-4 relative text-center md:text-right"
          variants={fadeIn}
        >
          <span className="relative inline-block">
            دسته‌بندی‌های محبوب
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary to-pink-500"></span>
          </span>
        </motion.h2>

        {isLoadingCategories && (
          <div className="text-center py-8">درحال بارگذاری دسته‌بندی‌ها...</div>
        )}
        {categoriesError && (
          <div className="text-center py-8 text-red-500">
            خطا در بارگذاری دسته‌بندی‌ها: {categoriesError}
          </div>
        )}
        {!isLoadingCategories &&
          !categoriesError &&
          categories.length === 0 && (
            <div className="text-center py-8">
              هیچ دسته‌بندی برای نمایش وجود ندارد.
            </div>
          )}

        {!isLoadingCategories && !categoriesError && categories.length > 0 && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
            variants={staggerContainer}
          >
            {mainCategories.map((category, index) => (
              <motion.div key={category.id || index} variants={itemVariant}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group block"
                >
                  <div className="relative h-60 md:h-72 rounded-2xl overflow-hidden bg-gray-200 shadow-md transition-all duration-500 group-hover:shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 group-hover:via-black/20 transition-colors duration-500">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <motion.div
                          className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md"
                          whileHover={{ scale: 1.1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </motion.div>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white transform transition-transform duration-500 group-hover:translate-y-0">
                      <h3 className="text-xl font-bold">{category.name}</h3>
                      <div className="h-0.5 w-0 bg-white transition-all duration-500 group-hover:w-24 mt-3"></div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="container mb-32 overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative rounded-3xl bg-neutral-100 dark:bg-neutral-900">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              <motion.span
                className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm mb-4"
                variants={fadeIn}
              >
                کالکشن فصلی
              </motion.span>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
                variants={fadeIn}
              >
                طراحی‌های منحصربفرد <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">
                  برای سبک زندگی مدرن
                </span>
              </motion.h2>

              <motion.p
                className="text-lg text-gray-600 dark:text-gray-300 mb-8"
                variants={fadeIn}
              >
                محصولات طراحی شده با بهترین متریال‌ها که برای راحتی و استایل شما
                طراحی شده‌اند. اکتشاف کنید، انتخاب کنید، و استایل خود را ارتقا
                دهید.
              </motion.p>

              <motion.div variants={fadeIn}>
                <Link
                  href="/collections/season"
                  className="inline-flex items-center font-medium text-primary hover:text-primary-dark transition-colors group"
                >
                  <span>مشاهده کالکشن</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 transform transition-transform duration-300 group-hover:translate-x-1"
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
              </motion.div>
            </div>

            <div className="relative h-80 md:h-auto">
              <div className="absolute inset-0 overflow-hidden rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-primary/30 mix-blend-multiply z-10"></div>
                <motion.div
                  className="absolute inset-0 bg-[url('/images/banners/Ulyana-Sergeenko-New-York-Fashion-Week-Fall-slash-Winter-Feb-12-2013-c-Mode-Pure.jpg')] bg-cover bg-center"
                  initial={{ scale: 1.05 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 1.5 }}
                  viewport={{ once: true }}
                />
              </div>
            </div>
          </div>

          <div className="hidden md:block absolute -bottom-6 right-12 w-12 h-12 bg-primary rounded-full opacity-20"></div>
          <div className="hidden md:block absolute top-12 left-6 w-24 h-24 bg-pink-500 rounded-full opacity-10"></div>
        </div>
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="flex justify-between items-center mb-12">
          <motion.h2
            className="text-3xl font-bold relative inline-block"
            variants={fadeIn}
          >
            محصولات پرطرفدار
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary to-pink-500"></span>
          </motion.h2>

          <motion.div variants={fadeIn}>
            <Link
              href="/products?sort=popular"
              className="text-primary hover:text-primary-dark flex items-center group transition-all duration-300"
            >
              <span>مشاهده همه</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1 transform transition-transform duration-300 group-hover:translate-x-1"
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
          </motion.div>
        </div>

        {isProductLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <ProductGrid
              products={featuredProducts}
              columns={4}
              glassEffect={true}
            />
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleUp}
      >
        <div className="relative bg-gradient-to-br from-fuchsia-900 to-violet-900 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          <div className="py-12 px-8 md:p-16 lg:p-20 text-center">
            <motion.h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 text-white"
              variants={fadeIn}
            >
              ترندهای فشن ۲۰۲۵
            </motion.h2>

            <motion.p
              className="text-white/80 mb-12 max-w-2xl mx-auto text-lg"
              variants={fadeIn}
            >
              آخرین ترندهای دنیای مد را کشف کنید و با سبک منحصر به فرد خود، در
              میان جمعیت بدرخشید
            </motion.p>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
            >
              {[
                {
                  name: "مینیمال لاکچری",
                  icon: "✨",
                  color: "from-pink-500 to-rose-500",
                },
                {
                  name: "استایل نئو کلاسیک",
                  icon: "🌟",
                  color: "from-blue-500 to-indigo-500",
                },
                {
                  name: "استریت استایل",
                  icon: "⚡",
                  color: "from-amber-500 to-orange-200",
                },
                {
                  name: "اکو فرندلی",
                  icon: "🌱",
                  color: "from-green-500 to-emerald-500",
                },
              ].map((trend, index) => (
                <motion.div
                  key={index}
                  variants={itemVariant}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Link
                    href={`/trends/${trend.name
                      .replace(/\s+/g, "-")
                      .toLowerCase()}`}
                  >
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/15 transition-colors duration-300 h-full border border-white/5">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${trend.color} flex items-center justify-center text-xl mb-4 mx-auto`}
                      >
                        {trend.icon}
                      </div>
                      <h3 className="text-white text-lg font-medium">
                        {trend.name}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleUp}
      >
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={staggerContainer}
        >
          {DEMO_BANNERS.map((banner, index) => (
            <motion.div key={banner.id} variants={itemVariant}>
              <Link
                href={banner.href}
                className="relative h-80 rounded-2xl overflow-hidden group block"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-90 group-hover:opacity-95 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 transform transition-transform duration-500">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-white/20 mb-6 flex items-center justify-center backdrop-blur-md"
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </motion.div>
                  <h3 className="text-white text-2xl font-bold mb-4">
                    {banner.title}
                  </h3>
                  <p className="text-white/80 text-base mb-6">
                    {banner.description}
                  </p>
                  <div className="w-0 h-0.5 bg-white/70 transition-all duration-300 group-hover:w-16"></div>
                </div>

                <div className="absolute bottom-6 right-6">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-all duration-300"
                    whileHover={{ scale: 1.2 }}
                  >
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
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="flex justify-between items-center mb-12">
          <motion.h2
            className="text-3xl font-bold relative inline-block"
            variants={fadeIn}
          >
            جدیدترین محصولات
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary to-pink-500"></span>
          </motion.h2>

          <motion.div variants={fadeIn}>
            <Link
              href="/products?sort=newest"
              className="text-primary hover:text-primary-dark flex items-center group transition-all duration-300"
            >
              <span>مشاهده همه</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1 transform transition-transform duration-300 group-hover:translate-x-1"
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
          </motion.div>
        </div>

        {isProductLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <ProductGrid
              products={newProducts}
              columns={4}
              ribbonLabel="جدید"
            />
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative py-16 px-6 md:p-16 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5 mix-blend-overlay"></div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10"
            variants={staggerContainer}
          >
            {[
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                ),
                title: "ارسال سریع و رایگان",
                description: "برای سفارش‌های بالای ۵۰۰ هزار تومان",
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
                title: "ضمانت اصالت کالا",
                description: "تضمین اصل بودن تمامی محصولات",
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                ),
                title: "تنوع محصولات",
                description: "هزاران محصول از صدها برند معتبر",
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                ),
                title: "پرداخت امن",
                description: "درگاه‌های پرداخت معتبر و امن",
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="text-center relative"
                variants={itemVariant}
              >
                <div className="flex justify-center mb-6">
                  <motion.div
                    className="bg-gradient-to-br from-white/20 to-white/5 text-white p-5 rounded-2xl backdrop-blur-sm border border-white/10"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {benefit.icon}
                  </motion.div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {benefit.title}
                </h3>
                <p className="text-white/70">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="absolute -top-5 left-10 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl"></div>
          <div className="absolute -bottom-10 right-10 w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl"></div>
        </div>
      </motion.section>

      <motion.section
        className="container mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="text-center mb-12">
          <motion.h2 className="text-3xl font-bold mb-4" variants={fadeIn}>
            مارا در اینستاگرام دنبال کنید
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto"
            variants={fadeIn}
          >
            جدیدترین محصولات و ترندها را در اینستاگرام ما ببینید
          </motion.p>
        </div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4"
          variants={staggerContainer}
        >
          {[...Array(6)].map((_, index) => (
            <motion.a
              key={index}
              href="https://instagram.com/cna.jean"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden bg-gray-200 rounded-lg"
              variants={itemVariant}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/0 to-black/0 group-hover:from-black/50 group-hover:to-black/30 transition-all duration-300 z-10"></div>

              <motion.div
                className="absolute inset-0 scale-105 group-hover:scale-100 transition-transform duration-700 bg-cover bg-center"
                style={{
                  backgroundImage: `url('/instagram.com/cna.jean-${
                    index + 1
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

        <motion.div className="text-center mt-8" variants={fadeIn}>
          <a
            href="https://instagram.com/cna.jean"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            <span className="text-lg mr-2">cna.jean</span>
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
      </motion.section>

      <motion.section
        className="container mb-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>

          <motion.div
            className="relative z-10 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-4 border border-white/5"
              variants={fadeIn}
            >
              اولین نفری باشید که مطلع می‌شوید
            </motion.span>

            <motion.h3
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              variants={fadeIn}
            >
              عضویت در خبرنامه
            </motion.h3>

            <motion.p
              className="text-white/80 mb-8 max-w-lg mx-auto"
              variants={fadeIn}
            >
              برای دریافت آخرین اخبار، تخفیف‌ها و محصولات جدید در خبرنامه ما عضو
              شوید
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
        </div>
      </motion.section>

      <motion.section
        className="container"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-6"
                variants={fadeIn}
              >
                دانلود اپلیکیشن موبایل ما
              </motion.h2>

              <motion.p
                className="text-gray-600 dark:text-gray-300 mb-8"
                variants={fadeIn}
              >
                با اپلیکیشن موبایل ما تجربه خرید آسان‌تر، سریع‌تر و لذت‌بخش‌تری
                داشته باشید. از تخفیف‌های ویژه و امکانات منحصر به فرد بهره‌مند
                شوید.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4"
                variants={staggerContainer}
              >
                <motion.a
                  href="#"
                  className="bg-black text-white py-3 px-6 rounded-xl flex items-center space-x-2 hover:bg-gray-900 transition-colors"
                  variants={itemVariant}
                  whileHover={{ scale: 1.03 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.21 2.33-.91 3.57-.84 1.5.09 2.63.68 3.38 1.68-3.03 1.86-2.53 5.68.08 7.08-.65 1.45-1.51 2.9-2.11 4.24zM12.03 7.25c-.15-2.23 1.66-4.13 3.67-4.75.18 2.23-1.7 4.17-3.67 4.75z" />
                  </svg>
                  <div className="flex flex-col mr-3">
                    <span className="text-xs">دانلود از</span>
                    <span className="text-sm font-bold">App Store</span>
                  </div>
                </motion.a>

                <motion.a
                  href="#"
                  className="bg-black text-white py-3 px-6 rounded-xl flex items-center space-x-2 hover:bg-gray-900 transition-colors"
                  variants={itemVariant}
                  whileHover={{ scale: 1.03 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.293-.707V2.521a1 1 0 0 1 .293-.707zM14.5 12.707l2.302 2.302-10.956 6.172 8.654-8.474zm2.302-3.716l-2.302 2.302-8.653-8.474 10.955 6.172zm1.344.666L7.974 3.314C9.149 2.462 10.515 2 12 2c5.512 0 10.069 4.236 10.069 9.5S17.512 21 12 21c-1.485 0-2.851-.462-4.026-1.314l10.172-6.343a2.003 2.003 0 0 0 0-3.372z" />
                  </svg>
                  <div className="flex flex-col mr-3">
                    <span className="text-xs">دانلود از</span>
                    <span className="text-sm font-bold">Google Play</span>
                  </div>
                </motion.a>
              </motion.div>
            </div>

            <div className="relative h-80 md:h-auto flex items-center justify-center p-8">
              <motion.div
                className="relative max-w-xs mx-auto"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="bg-black rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl relative z-10">
                  <div className="aspect-[9/19.5] w-full bg-white">
                    <div className="absolute top-0 right-0 left-0 h-6 bg-black rounded-t-xl flex justify-center items-center">
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="absolute -inset-4 bg-gradient-to-br from-primary/40 to-purple-500/40 rounded-full blur-xl -z-10 opacity-70"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
