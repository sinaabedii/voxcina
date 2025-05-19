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
    <div className="pb-16 overflow-x-hidden font-sans bg-voxcina-cream">
      {/* Hero Section with Improved Mobile Responsiveness */}
      <section
        ref={heroRef as React.RefObject<HTMLElement>}
        className="relative h-[80vh] md:h-[85vh] mb-16 md:mb-24 overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="absolute inset-0 bg-voxcina-blue"
          style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
        />
        <div className="absolute inset-0 bg-[url('/images/banners/heroheader.jpeg')] bg-cover bg-center opacity-20 mix-blend-soft-light"></div>

        {/* Enhanced Mobile-friendly Blur Effect */}
        <motion.div
          className="absolute w-[200px] h-[200px] md:w-[300px] md:h-[300px] rounded-full bg-white opacity-10 blur-3xl pointer-events-none mix-blend-overlay"
          animate={{
            x: mousePosition.x - 100,
            y: mousePosition.y - 100,
          }}
          transition={{ type: "spring", damping: 15, stiffness: 150 }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative h-full w-full flex items-center"
        >
          <div className="container px-6 md:px-8">
            <div className="max-w-lg md:max-w-xl text-white z-10 relative">
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ duration: 0.7 }}
                className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-sm mb-4 border border-white/20 shadow-soft"
              >
                #VoxcinaStyle2025
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 md:mb-6 leading-tight"
              >
                کالکشن جدید{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-200 to-secondary-100">
                  تابستانه
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-lg sm:text-xl md:text-2xl mb-8 md:mb-10 text-gray-100 font-light"
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
                  className="group relative overflow-hidden bg-voxcina-cream text-voxcina-blue px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium hover:shadow-xl transition-all duration-300 inline-block"
                >
                  <span className="relative z-10">مشاهده کالکشن</span>
                  <motion.span
                    className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    initial={{ x: "100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                </Link>

                <Link
                  href="/categories/trending"
                  className="backdrop-blur-md bg-white/10 text-white border border-white/20 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium hover:bg-white/20 transition-all duration-300 inline-block"
                >
                  ترندهای امسال
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Floating Elements with Better Animation */}
        <div className="absolute right-4 md:right-10 top-1/4 w-16 md:w-24 h-16 md:h-24 bg-secondary-400 rounded-full opacity-30 animate-pulse-soft blur-lg"></div>
        <div className="absolute left-8 md:left-20 bottom-1/4 w-20 md:w-32 h-20 md:h-32 bg-secondary-300 rounded-full opacity-20 animate-pulse-soft blur-xl"></div>
        <div className="absolute right-1/3 bottom-12 md:bottom-20 w-12 md:w-16 h-12 md:h-16 bg-primary-400 rounded-full opacity-25 animate-pulse-soft blur-md"></div>

        {/* Scroll Indicator - Mobile Friendly */}
        <motion.div
          className="absolute bottom-6 md:bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <span className="text-white/70 mb-2 text-xs md:text-sm">
            اسکرول کنید
          </span>
          <span className="w-5 md:w-6 h-8 md:h-10 border-2 border-white/30 rounded-full flex justify-center pt-1">
            <motion.span
              className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full"
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

      {/* Categories Section - Improved Mobile Grid */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={fadeIn}
      >
        <motion.h2
          className="text-2xl sm:text-3xl font-bold mb-8 md:mb-12 pb-4 relative text-center md:text-right text-voxcina-blue"
          variants={fadeIn}
        >
          <span className="relative inline-block">
            دسته‌بندی‌های محبوب
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-voxcina-blue to-primary-400"></span>
          </span>
        </motion.h2>

        {isLoadingCategories && (
          <div className="text-center py-8">
            <div className="inline-block w-12 md:w-16 h-12 md:h-16 relative">
              <div className="absolute inset-0 border-4 border-secondary-300 rounded-full opacity-25"></div>
              <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-voxcina-blue">
              درحال بارگذاری دسته‌بندی‌ها...
            </p>
          </div>
        )}

        {categoriesError && (
          <div className="text-center py-8 text-red-500 bg-red-50 rounded-2xl p-4 md:p-6 shadow-soft">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm md:text-base">
              خطا در بارگذاری دسته‌بندی‌ها: {categoriesError}
            </p>
          </div>
        )}

        {!isLoadingCategories &&
          !categoriesError &&
          categories.length === 0 && (
            <div className="text-center py-8 bg-secondary-100 rounded-2xl p-6 md:p-8 shadow-soft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-voxcina-blue"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
              <p className="text-voxcina-blue text-sm md:text-base">
                هیچ دسته‌بندی برای نمایش وجود ندارد.
              </p>
            </div>
          )}

        {/* Improved Mobile Grid for Categories */}
        {!isLoadingCategories && !categoriesError && categories.length > 0 && (
          <motion.div
            className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6"
            variants={staggerContainer}
          >
            {mainCategories.map((category, index) => (
              <motion.div key={category.id || index} variants={itemVariant}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group block"
                >
                  <div className="relative h-52 xs:h-60 md:h-72 rounded-2xl overflow-hidden bg-secondary-200 shadow-soft transition-all duration-500 group-hover:shadow-medium">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-voxcina-blue/80 group-hover:via-voxcina-blue/20 transition-colors duration-500">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <motion.div
                          className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md"
                          whileHover={{ scale: 1.1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 md:h-7 md:w-7 text-white"
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
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white transform transition-transform duration-500 group-hover:translate-y-0">
                      <h3 className="text-lg md:text-xl font-bold">
                        {category.name}
                      </h3>
                      <div className="h-0.5 w-0 bg-white transition-all duration-500 group-hover:w-20 md:group-hover:w-24 mt-2 md:mt-3"></div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
      {/* Seasonal Collection Section - Improved Mobile Layout */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32 overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative rounded-3xl bg-secondary-200 shadow-soft overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              <motion.span
                className="inline-block py-1 px-3 rounded-full bg-voxcina-blue/10 text-voxcina-blue text-xs sm:text-sm mb-3 md:mb-4"
                variants={fadeIn}
              >
                کالکشن فصلی
              </motion.span>

              <motion.h2
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-voxcina-blue"
                variants={fadeIn}
              >
                طراحی‌های منحصربفرد <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
                  برای سبک زندگی مدرن
                </span>
              </motion.h2>

              <motion.p
                className="text-base md:text-lg text-voxcina-blue/80 mb-6 md:mb-8"
                variants={fadeIn}
              >
                محصولات طراحی شده با بهترین متریال‌ها که برای راحتی و استایل شما
                طراحی شده‌اند. اکتشاف کنید، انتخاب کنید، و استایل خود را ارتقا
                دهید.
              </motion.p>

              <motion.div variants={fadeIn}>
                <Link
                  href="/collections/season"
                  className="inline-flex items-center font-medium text-voxcina-blue hover:text-voxcina-darkBlue transition-colors group"
                >
                  <span>مشاهده کالکشن</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 md:h-5 md:w-5 mr-2 transform transition-transform duration-300 group-hover:translate-x-1"
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

            <div className="relative h-64 sm:h-72 md:h-auto">
              <div className="absolute inset-0 overflow-hidden rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
                <div className="absolute inset-0 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-blue/30 mix-blend-multiply z-10"></div>
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

          {/* Decorative Elements - Adjusted for Mobile */}
          <div className="hidden md:block absolute -bottom-6 right-12 w-12 h-12 bg-voxcina-blue rounded-full opacity-20"></div>
          <div className="hidden md:block absolute top-12 left-6 w-24 h-24 bg-secondary-600 rounded-full opacity-10"></div>
        </div>
      </motion.section>

      {/* Popular Products Section */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold relative inline-block text-voxcina-blue mb-4 sm:mb-0"
            variants={fadeIn}
          >
            محصولات پرطرفدار
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-voxcina-blue to-primary-400"></span>
          </motion.h2>

          <motion.div variants={fadeIn}>
            <Link
              href="/products?sort=popular"
              className="text-voxcina-blue hover:text-voxcina-darkBlue flex items-center group transition-all duration-300"
            >
              <span>مشاهده همه</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 md:h-5 md:w-5 mr-1 transform transition-transform duration-300 group-hover:translate-x-1"
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
          <div className="h-52 md:h-64 flex items-center justify-center">
            <div className="relative w-12 h-12 md:w-16 md:h-16">
              <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
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

      {/* Fashion Trends Section - Improved for Mobile */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleUp}
      >
        <div className="relative bg-voxcina-blue rounded-3xl overflow-hidden shadow-medium">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          <div className="py-10 px-6 sm:py-12 sm:px-8 md:p-16 lg:p-20 text-center">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 text-white"
              variants={fadeIn}
            >
              ترندهای فشن ۲۰۲۵
            </motion.h2>

            <motion.p
              className="text-white/80 mb-8 sm:mb-12 mx-auto text-base md:text-lg max-w-xs sm:max-w-md md:max-w-2xl"
              variants={fadeIn}
            >
              آخرین ترندهای دنیای مد را کشف کنید و با سبک منحصر به فرد خود، در
              میان جمعیت بدرخشید
            </motion.p>

            <motion.div
              className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
              variants={staggerContainer}
            >
              {[
                {
                  name: "مینیمال لاکچری",
                  icon: "✨",
                  color: "from-secondary-300 to-secondary-400",
                },
                {
                  name: "استایل نئو کلاسیک",
                  icon: "🌟",
                  color: "from-primary-300 to-primary-400",
                },
                {
                  name: "استریت استایل",
                  icon: "⚡",
                  color: "from-secondary-200 to-secondary-300",
                },
                {
                  name: "اکو فرندلی",
                  icon: "🌱",
                  color: "from-primary-200 to-primary-300",
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
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 md:p-6 hover:bg-white/15 transition-colors duration-300 h-full border border-white/5 shadow-soft">
                      <div
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${trend.color} flex items-center justify-center text-lg md:text-xl mb-3 md:mb-4 mx-auto shadow-soft`}
                      >
                        {trend.icon}
                      </div>
                      <h3 className="text-white text-base md:text-lg font-medium">
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

      {/* Banner Grid Section - Mobile Optimized */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleUp}
      >
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
          variants={staggerContainer}
        >
          {DEMO_BANNERS.map((banner, index) => (
            <motion.div key={banner.id} variants={itemVariant}>
              <Link
                href={banner.href}
                className="relative h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden group block shadow-soft"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-voxcina-blue to-primary-400 opacity-90 group-hover:opacity-95 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 sm:p-8 transform transition-transform duration-500">
                  <motion.div
                    className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 mb-4 md:mb-6 flex items-center justify-center backdrop-blur-md"
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 md:h-8 md:w-8 text-white"
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
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-3 md:mb-4">
                    {banner.title}
                  </h3>
                  <p className="text-white/80 text-sm md:text-base mb-4 md:mb-6">
                    {banner.description}
                  </p>
                  <div className="w-0 h-0.5 bg-white/70 transition-all duration-300 group-hover:w-12 md:group-hover:w-16"></div>
                </div>

                <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
                  <motion.div
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-all duration-300"
                    whileHover={{ scale: 1.2 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 md:h-5 md:w-5 text-white"
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
      {/* New Products Section */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-12">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold relative inline-block text-voxcina-blue mb-4 sm:mb-0"
            variants={fadeIn}
          >
            جدیدترین محصولات
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-voxcina-blue to-primary-400"></span>
          </motion.h2>

          <motion.div variants={fadeIn}>
            <Link
              href="/products?sort=newest"
              className="text-voxcina-blue hover:text-voxcina-darkBlue flex items-center group transition-all duration-300"
            >
              <span>مشاهده همه</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 md:h-5 md:w-5 mr-1 transform transition-transform duration-300 group-hover:translate-x-1"
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
          <div className="h-52 md:h-64 flex items-center justify-center">
            <div className="relative w-12 h-12 md:w-16 md:h-16">
              <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
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

      {/* Features Section - Mobile Optimized */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative py-12 px-5 sm:py-16 sm:px-6 md:p-16 bg-gradient-to-r from-voxcina-darkBlue to-voxcina-blue rounded-3xl overflow-hidden shadow-medium">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5 mix-blend-overlay"></div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10"
            variants={staggerContainer}
          >
            {[
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 md:h-12 md:w-12"
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
                    className="h-10 w-10 md:h-12 md:w-12"
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
                    className="h-10 w-10 md:h-12 md:w-12"
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
                    className="h-10 w-10 md:h-12 md:w-12"
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
                <div className="flex justify-center mb-4 md:mb-6">
                  <motion.div
                    className="bg-gradient-to-br from-white/20 to-white/5 text-white p-4 md:p-5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-soft"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {benefit.icon}
                  </motion.div>
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">
                  {benefit.title}
                </h3>
                <p className="text-white/70 text-sm md:text-base">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced Background Effects */}
          <div className="absolute -top-5 left-10 w-24 md:w-32 h-24 md:h-32 rounded-full bg-secondary-400/10 blur-3xl"></div>
          <div className="absolute -bottom-10 right-10 w-32 md:w-48 h-32 md:h-48 rounded-full bg-primary-400/10 blur-3xl"></div>
        </div>
      </motion.section>
      {/* Instagram Section - Mobile Optimized */}
      <motion.section
        className="container px-4 md:px-8 mb-20 md:mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="text-center mb-8 md:mb-12">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold mb-3 md:mb-4 text-voxcina-blue"
            variants={fadeIn}
          >
            مارا در اینستاگرام دنبال کنید
          </motion.h2>
          <motion.p
            className="text-voxcina-blue/80 max-w-xs sm:max-w-md md:max-w-lg mx-auto text-sm md:text-base"
            variants={fadeIn}
          >
            جدیدترین محصولات و ترندها را در اینستاگرام ما ببینید
          </motion.p>
        </div>

        {/* Instagram Grid - Mobile Optimized */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4"
          variants={staggerContainer}
        >
          {[...Array(6)].map((_, index) => (
            <motion.a
              key={index}
              href="https://instagram.com/voxcina"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden bg-secondary-200 rounded-lg shadow-soft"
              variants={itemVariant}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/0 to-black/0 group-hover:from-voxcina-blue/50 group-hover:to-voxcina-blue/30 transition-all duration-300 z-10"></div>

              <motion.div
                className="absolute inset-0 scale-105 group-hover:scale-100 transition-transform duration-700 bg-cover bg-center"
                style={{
                  backgroundImage: `url('/instagram.com/voxcina-${
                    index + 1
                  }.jpg')`,
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 md:h-6 md:w-6 text-white"
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

        <motion.div className="text-center mt-6 md:mt-8" variants={fadeIn}>
          <a
            href="https://instagram.com/voxcina"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-voxcina-blue hover:text-voxcina-darkBlue transition-colors"
          >
            <span className="text-base md:text-lg mr-2">voxcina</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 md:h-5 md:w-5"
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

      {/* Newsletter Section - Mobile Optimized */}
      <motion.section
        className="container px-4 md:px-8 mb-16 md:mb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="bg-gradient-to-r from-voxcina-blue to-primary-600 rounded-3xl p-6 sm:p-10 md:p-16 text-center relative overflow-hidden shadow-medium">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          {/* Enhanced Background Blur Effects */}
          <div className="absolute -top-20 -left-20 w-48 md:w-64 h-48 md:h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-48 md:w-64 h-48 md:h-64 bg-secondary-400/20 rounded-full blur-3xl"></div>

          <motion.div
            className="relative z-10 max-w-md sm:max-w-lg md:max-w-2xl mx-auto"
            variants={fadeIn}
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs md:text-sm mb-3 md:mb-4 border border-white/5"
              variants={fadeIn}
            >
              اولین نفری باشید که مطلع می‌شوید
            </motion.span>

            <motion.h3
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4"
              variants={fadeIn}
            >
              عضویت در خبرنامه
            </motion.h3>

            <motion.p
              className="text-white/80 mb-6 md:mb-8 max-w-xs sm:max-w-md lg:max-w-lg mx-auto text-sm md:text-base"
              variants={fadeIn}
            >
              برای دریافت آخرین اخبار، تخفیف‌ها و محصولات جدید در خبرنامه ما عضو
              شوید
            </motion.p>

            <motion.div
              className="max-w-xs sm:max-w-md mx-auto"
              variants={fadeIn}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="ایمیل خود را وارد کنید"
                    className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl outline-none text-right pr-8 md:pr-10 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 shadow-inner-soft text-sm md:text-base"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 md:h-5 md:w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50"
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
                <button className="bg-voxcina-cream text-voxcina-blue px-6 md:px-8 py-3 md:py-4 rounded-xl hover:bg-white transition-colors font-medium shadow-soft text-sm md:text-base">
                  عضویت
                </button>
              </div>

              <p className="text-white/60 text-xs md:text-sm mt-3 md:mt-4">
                ما به حریم خصوصی شما احترام می‌گذاریم و هرگز اطلاعات شما را به
                اشتراک نمی‌گذاریم.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* App Download Section - Mobile Optimized */}
      <motion.section
        className="container px-4 md:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
      >
        <div className="relative rounded-3xl bg-gradient-to-br from-secondary-100 to-secondary-200 overflow-hidden shadow-soft">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              <motion.h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-voxcina-blue"
                variants={fadeIn}
              >
                دانلود اپلیکیشن موبایل ما
              </motion.h2>

              <motion.p
                className="text-sm md:text-base text-voxcina-blue/80 mb-6 md:mb-8"
                variants={fadeIn}
              >
                با اپلیکیشن موبایل ما تجربه خرید آسان‌تر، سریع‌تر و لذت‌بخش‌تری
                داشته باشید. از تخفیف‌های ویژه و امکانات منحصر به فرد بهره‌مند
                شوید.
              </motion.p>

              <motion.div
                className="flex flex-col xs:flex-row flex-wrap gap-3 md:gap-4"
                variants={staggerContainer}
              >
                <motion.a
                  href="#"
                  className="bg-voxcina-blue text-white py-2 md:py-3 px-4 md:px-6 rounded-xl flex items-center space-x-2 hover:bg-voxcina-darkBlue transition-colors shadow-soft"
                  variants={itemVariant}
                  whileHover={{ scale: 1.03 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 md:h-7 md:w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.21 2.33-.91 3.57-.84 1.5.09 2.63.68 3.38 1.68-3.03 1.86-2.53 5.68.08 7.08-.65 1.45-1.51 2.9-2.11 4.24zM12.03 7.25c-.15-2.23 1.66-4.13 3.67-4.75.18 2.23-1.7 4.17-3.67 4.75z" />
                  </svg>
                  <div className="flex flex-col mr-3">
                    <span className="text-xs">دانلود از</span>
                    <span className="text-xs md:text-sm font-bold">
                      App Store
                    </span>
                  </div>
                </motion.a>

                <motion.a
                  href="#"
                  className="bg-voxcina-blue text-white py-2 md:py-3 px-4 md:px-6 rounded-xl flex items-center space-x-2 hover:bg-voxcina-darkBlue transition-colors shadow-soft"
                  variants={itemVariant}
                  whileHover={{ scale: 1.03 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 md:h-7 md:w-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.293-.707V2.521a1 1 0 0 1 .293-.707zM14.5 12.707l2.302 2.302-10.956 6.172 8.654-8.474zm2.302-3.716l-2.302 2.302-8.653-8.474 10.955 6.172zm1.344.666L7.974 3.314C9.149 2.462 10.515 2 12 2c5.512 0 10.069 4.236 10.069 9.5S17.512 21 12 21c-1.485 0-2.851-.462-4.026-1.314l10.172-6.343a2.003 2.003 0 0 0 0-3.372z" />
                  </svg>
                  <div className="flex flex-col mr-3">
                    <span className="text-xs">دانلود از</span>
                    <span className="text-xs md:text-sm font-bold">
                      Google Play
                    </span>
                  </div>
                </motion.a>
              </motion.div>
            </div>

            <div className="relative h-64 sm:h-72 md:h-auto flex items-center justify-center p-6 md:p-8">
              <motion.div
                className="relative max-w-xs mx-auto"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="bg-black rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl relative z-10">
                  <div className="aspect-[9/19.5] w-full bg-white">
                    <div className="absolute top-0 right-0 left-0 h-5 md:h-6 bg-black rounded-t-xl flex justify-center items-center">
                      <div className="w-16 md:w-20 h-1 md:h-1.5 bg-gray-700 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="absolute -inset-3 md:-inset-4 bg-gradient-to-br from-voxcina-blue/40 to-primary-400/40 rounded-full blur-xl -z-10 opacity-70"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
