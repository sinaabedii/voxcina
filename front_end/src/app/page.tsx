"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import ProductGrid from "@/components/product/ProductGrid";
import { motion, useScroll, useTransform } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);

  const mockCategories = [
    {
      id: 1,
      name: "پوشاک زنانه",
      slug: "women-clothing",
      icon: "👗",
      color: "from-pink-400 to-purple-500",
    },
    {
      id: 2,
      name: "پوشاک مردانه",
      slug: "men-clothing",
      icon: "👔",
      color: "from-blue-400 to-indigo-500",
    },
    {
      id: 3,
      name: "کیف و کفش",
      slug: "bags-shoes",
      icon: "👜",
      color: "from-amber-400 to-orange-500",
    },
    {
      id: 4,
      name: "لوازم جانبی",
      slug: "accessories",
      icon: "💍",
      color: "from-emerald-400 to-teal-500",
    },
    {
      id: 5,
      name: "کودک و نوزاد",
      slug: "kids",
      icon: "🧸",
      color: "from-cyan-400 to-blue-500",
    },
    {
      id: 6,
      name: "ورزشی",
      slug: "sports",
      icon: "⚽",
      color: "from-green-400 to-emerald-500",
    },
    {
      id: 7,
      name: "آرایشی",
      slug: "beauty",
      icon: "💄",
      color: "from-rose-400 to-pink-500",
    },
  ];

  const sliderData = [
    {
      id: 1,
      title: "کالکشن پاییز 2025",
      subtitle: "رنگ‌های گرم و طراحی‌های منحصربفرد",
      image: "/images/slider/autumn-collection.jpg",
      buttonText: "کاوش کنید",
      buttonLink: "/collections/autumn-2025",
      badge: "جدید",
      bgColor: "from-amber-500 to-orange-600",
    },
    {
      id: 2,
      title: "تخفیف ویژه برندها",
      subtitle: "تا 70% تخفیف روی محبوب‌ترین برندها",
      image: "/images/slider/brand-sale.jpg",
      buttonText: "خرید کنید",
      buttonLink: "/sales/brands",
      badge: "فروش ویژه",
      bgColor: "from-red-500 to-pink-600",
    },
    {
      id: 3,
      title: "استایل اداری شیک",
      subtitle: "برای روزهای کاری پرانرژی",
      image: "/images/slider/office-style.jpg",
      buttonText: "مشاهده استایل‌ها",
      buttonLink: "/collections/office",
      badge: "ترند",
      bgColor: "from-slate-500 to-gray-600",
    },
    {
      id: 4,
      title: "لوازم جانبی لوکس",
      subtitle: "کیف، کفش و جواهرات برندهای معتبر",
      image: "/images/slider/luxury-accessories.jpg",
      buttonText: "مجموعه لوکس",
      buttonLink: "/collections/luxury",
      badge: "پریمیوم",
      bgColor: "from-purple-500 to-indigo-600",
    },
  ];

  useEffect(() => {
    fetchFlashSaleProducts();
    fetchNewProducts();
    fetchCategories();
    setIsVisible(true);

    document.documentElement.style.scrollBehavior = "smooth";

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    }, 4000);

    return () => {
      document.documentElement.style.scrollBehavior = "";
      clearInterval(interval);
    };
  }, [fetchFlashSaleProducts, fetchNewProducts, fetchCategories]);

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

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const rect = heroElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderData.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + sliderData.length) % sliderData.length
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <>
      <Header />
      <div className="pb-16 overflow-x-hidden font-sans bg-voxcina-cream">
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

          <div className="absolute right-4 md:right-10 top-1/4 w-16 md:w-24 h-16 md:h-24 bg-secondary-400 rounded-full opacity-30 animate-pulse-soft blur-lg"></div>
          <div className="absolute left-8 md:left-20 bottom-1/4 w-20 md:w-32 h-20 md:h-32 bg-secondary-300 rounded-full opacity-20 animate-pulse-soft blur-xl"></div>
          <div className="absolute right-1/3 bottom-12 md:bottom-20 w-12 md:w-16 h-12 md:h-16 bg-primary-400 rounded-full opacity-25 animate-pulse-soft blur-md"></div>

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

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          variants={fadeIn}
        >
          <motion.h2
            className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 md:mb-10 pb-3 relative text-center text-voxcina-blue"
            variants={fadeIn}
          >
            <span className="relative inline-block">
              دسته‌بندی‌های محبوب
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 md:w-24 h-0.5 bg-gradient-to-r from-voxcina-blue to-primary-400 rounded-full"></span>
            </span>
          </motion.h2>

          <motion.div className="relative" variants={staggerContainer}>
            <div className="overflow-x-auto scrollbar-hide">
              <div
                className="flex gap-4 sm:gap-6 md:gap-8 pb-4 px-2"
                style={{ minWidth: "max-content" }}
              >
                {mockCategories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    variants={itemVariant}
                    className="flex flex-col items-center group flex-shrink-0"
                  >
                    <Link
                      href={`/categories/${category.slug}`}
                      className="block relative"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden shadow-soft group-hover:shadow-medium transition-all duration-500">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-80 group-hover:opacity-100 transition-all duration-500`}
                        />

                        <div className="absolute inset-0 bg-white/10 group-hover:bg-white/5 transition-all duration-500" />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl filter drop-shadow-sm">
                            {category.icon}
                          </span>
                        </div>

                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-white/50 opacity-0 group-hover:opacity-100"
                          initial={{ scale: 0.8, opacity: 0 }}
                          whileHover={{
                            scale: [0.8, 1.1, 1],
                            opacity: [0, 0.7, 0.7],
                            transition: { duration: 0.6, ease: "easeOut" },
                          }}
                        />
                      </div>

                      <div className="mt-2 md:mt-3 text-center">
                        <h3 className="text-xs sm:text-sm md:text-base font-medium text-voxcina-blue group-hover:text-voxcina-darkBlue transition-colors duration-300 leading-tight px-1 whitespace-nowrap">
                          {category.name}
                        </h3>

                        <motion.div
                          className="mt-1 mx-auto h-0.5 bg-gradient-to-r from-voxcina-blue/50 to-primary-400/50 rounded-full"
                          initial={{ width: 0 }}
                          whileHover={{ width: "80%" }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-4 md:hidden">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-voxcina-blue/30 rounded-full"></div>
                <div className="w-6 h-2 bg-voxcina-blue rounded-full"></div>
                <div className="w-2 h-2 bg-voxcina-blue/30 rounded-full"></div>
              </div>
            </div>

            <motion.div
              className="text-center mt-6 md:mt-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Link
                href="/categories"
                className="inline-flex items-center bg-voxcina-blue text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-full font-medium hover:bg-voxcina-darkBlue transition-all duration-300 shadow-soft hover:shadow-medium group text-sm md:text-base"
              >
                <span>مشاهده همه دسته‌بندی‌ها</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 md:mr-2 transform transition-transform duration-300 group-hover:translate-x-1"
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
          </motion.div>
        </motion.section>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24 overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <div className="relative rounded-3xl bg-gradient-to-br from-secondary-200 via-secondary-100 to-white shadow-soft overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
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
                  محصولات طراحی شده با بهترین متریال‌ها که برای راحتی و استایل
                  شما طراحی شده‌اند. اکتشاف کنید، انتخاب کنید، و استایل خود را
                  ارتقا دهید.
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

            <div className="hidden md:block absolute -bottom-6 right-12 w-12 h-12 bg-voxcina-blue rounded-full opacity-20"></div>
            <div className="hidden md:block absolute top-12 left-6 w-24 h-24 bg-secondary-600 rounded-full opacity-10"></div>
          </div>
        </motion.section>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
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

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <div className="relative h-64 sm:h-80 md:h-96 lg:h-[450px] rounded-3xl overflow-hidden shadow-medium">
            <motion.div
              key={currentSlide}
              className={`absolute inset-0 bg-gradient-to-r ${sliderData[currentSlide].bgColor}`}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage: `url('${sliderData[currentSlide].image}')`,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/40" />

              <div className="relative h-full flex items-center">
                <div className="w-full px-6 sm:px-8 md:px-12 lg:px-16">
                  <div className="max-w-lg md:max-w-2xl text-white">
                    <motion.span
                      key={`badge-${currentSlide}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="inline-block py-1.5 px-3 rounded-full bg-white/20 backdrop-blur-sm text-xs sm:text-sm mb-3 md:mb-4 border border-white/30"
                    >
                      {sliderData[currentSlide].badge}
                    </motion.span>

                    <motion.h3
                      key={`title-${currentSlide}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 leading-tight"
                    >
                      {sliderData[currentSlide].title}
                    </motion.h3>

                    <motion.p
                      key={`subtitle-${currentSlide}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 md:mb-6 text-white/90 leading-relaxed"
                    >
                      {sliderData[currentSlide].subtitle}
                    </motion.p>

                    <motion.div
                      key={`button-${currentSlide}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                    >
                      <Link
                        href={sliderData[currentSlide].buttonLink}
                        className="inline-flex items-center bg-white text-gray-900 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl group text-sm md:text-base"
                      >
                        <span>{sliderData[currentSlide].buttonText}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 transform transition-transform duration-300 group-hover:translate-x-1"
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
                </div>
              </div>

              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/10 rounded-full backdrop-blur-sm animate-pulse-soft" />
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/15 rounded-full backdrop-blur-sm animate-pulse-soft" />
            </motion.div>

            <div className="absolute inset-y-0 left-2 sm:left-4 md:left-6 flex items-center">
              <button
                onClick={prevSlide}
                className="bg-white/20 backdrop-blur-md border border-white/30 text-white p-2 sm:p-3 md:p-4 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transform group-hover:scale-110 transition-transform"
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
            </div>

            <div className="absolute inset-y-0 right-2 sm:right-4 md:right-6 flex items-center">
              <button
                onClick={nextSlide}
                className="bg-white/20 backdrop-blur-md border border-white/30 text-white p-2 sm:p-3 md:p-4 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transform group-hover:scale-110 transition-transform"
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

            <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
              {sliderData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 border border-white/50 ${
                    index === currentSlide
                      ? "bg-white scale-125 shadow-lg"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 bg-black/30 backdrop-blur-sm text-white px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full border border-white/20">
              <span className="text-xs sm:text-sm md:text-base font-medium">
                {currentSlide + 1} / {sliderData.length}
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
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

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <div className="relative py-10 px-5 sm:py-12 sm:px-6 md:p-16 bg-gradient-to-r from-voxcina-darkBlue to-voxcina-blue rounded-3xl overflow-hidden shadow-medium">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5 mix-blend-overlay"></div>

            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10"
              variants={staggerContainer}
            >
              {[
                {
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
                      className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
                      className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
                      className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
                  <div className="flex justify-center mb-3 md:mb-4">
                    <motion.div
                      className="bg-gradient-to-br from-white/20 to-white/5 text-white p-3 md:p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-soft"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      }}
                    >
                      {benefit.icon}
                    </motion.div>
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 md:mb-2 text-white">
                    {benefit.title}
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <div className="absolute -top-5 left-10 w-24 md:w-32 h-24 md:h-32 rounded-full bg-secondary-400/10 blur-3xl"></div>
            <div className="absolute -bottom-10 right-10 w-32 md:w-48 h-32 md:h-48 rounded-full bg-primary-400/10 blur-3xl"></div>
          </div>
        </motion.section>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <div className="text-center mb-6 md:mb-8">
            <motion.h2
              className="text-2xl sm:text-3xl font-bold mb-2 md:mb-3 text-voxcina-blue"
              variants={fadeIn}
            >
              ما را در اینستاگرام دنبال کنید
            </motion.h2>
            <motion.p
              className="text-voxcina-blue/80 max-w-md mx-auto text-sm md:text-base"
              variants={fadeIn}
            >
              جدیدترین محصولات و ترندها را در اینستاگرام ما ببینید
            </motion.p>
          </div>

          <motion.div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3"
            variants={staggerContainer}
          >
            {[...Array(6)].map((_, index) => (
              <motion.a
                key={index}
                href="https://instagram.com/voxcina"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden bg-secondary-200 rounded-lg shadow-soft hover:shadow-medium transition-all duration-300"
                variants={itemVariant}
                whileHover={{ scale: 1.02, y: -2 }}
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
                      className="h-4 w-4 md:h-5 md:w-5 text-white"
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

          <motion.div className="text-center mt-4 md:mt-6" variants={fadeIn}>
            <a
              href="https://instagram.com/voxcina"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-voxcina-blue hover:text-voxcina-darkBlue transition-colors"
            >
              <span className="text-base md:text-lg mr-2">@voxcina</span>
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

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          <div className="bg-gradient-to-r from-voxcina-blue to-primary-600 rounded-3xl p-6 sm:p-8 md:p-12 text-center relative overflow-hidden shadow-medium">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

            <div className="absolute -top-20 -left-20 w-48 md:w-64 h-48 md:h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-48 md:w-64 h-48 md:h-64 bg-secondary-400/20 rounded-full blur-3xl"></div>

            <motion.div
              className="relative z-10 max-w-md sm:max-w-lg md:max-w-xl mx-auto"
              variants={fadeIn}
            >
              <motion.span
                className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs md:text-sm mb-3 md:mb-4 border border-white/5"
                variants={fadeIn}
              >
                اولین نفری باشید که مطلع می‌شوید
              </motion.span>

              <motion.h3
                className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 md:mb-3"
                variants={fadeIn}
              >
                عضویت در خبرنامه
              </motion.h3>

              <motion.p
                className="text-white/80 mb-4 md:mb-6 text-sm md:text-base"
                variants={fadeIn}
              >
                برای دریافت آخرین اخبار، تخفیف‌ها و محصولات جدید در خبرنامه ما
                عضو شوید
              </motion.p>

              <motion.div className="max-w-sm mx-auto" variants={fadeIn}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      placeholder="ایمیل خود را وارد کنید"
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl outline-none text-right pr-6 md:pr-8 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300 text-sm md:text-base"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 md:h-5 md:w-5 absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-white/50"
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
                  <button className="bg-voxcina-cream text-voxcina-blue px-4 md:px-6 py-2.5 md:py-3 rounded-xl hover:bg-white transition-colors font-medium shadow-soft text-sm md:text-base">
                    عضویت
                  </button>
                </div>

                <p className="text-white/60 text-xs md:text-sm mt-3 leading-relaxed">
                  ما به حریم خصوصی شما احترام می‌گذاریم و هرگز اطلاعات شما را به
                  اشتراک نمی‌گذاریم.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>
      </div>
      <Footer />
    </>
  );
}
