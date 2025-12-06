"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useCartStore } from "@/store/cart-store";
import { useSliderStore } from "@/store/slider-store";
import { Product } from "@/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ModernSliderSection } from "@/components/home/ModernSlider";
import HeroSection from "@/components/home/HeroSection";
import ModernCategoriesSection from "@/components/home/ModernCategoriesSection";
import { FaArrowLeft } from "react-icons/fa";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

// Lazy load کردن کامپوننت‌های سنگین
const ColorMatchingTool = lazy(
  () => import("@/components/home/ColorMatchingTool")
);
const InstagramFeed = lazy(() => import("@/components/home/InstagramFeed"));
const AIAssistantPromo = lazy(() => import("@/components/home/AIAssistantPromo"));

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

  const { sliders, fetchSliders, isLoading: isLoadingSliders } = useSliderStore();

  const { addItem: addItemToCart } = useCartStore();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchFlashSaleProducts();
    fetchNewProducts();
    fetchCategories();
    fetchSliders();
    setIsVisible(true);
  }, [fetchFlashSaleProducts, fetchNewProducts, fetchCategories, fetchSliders]);

  // انیمیشن‌های ساده‌تر با عملکرد بهتر
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const handleAddToCart = (product: Product) => {
    addItemToCart(product, 1);
    console.log(`${product.name} added to cart`);
  };

  return (
    <>
      <Header />
      <AnimatedBackground />
      <div className="pb-10 overflow-x-hidden font-sans bg-transparent relative z-10">
        <HeroSection />
        <ModernCategoriesSection />
        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24 overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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
                    href="/collection/بهار"
                    className="inline-flex gap-2 items-center font-medium text-voxcina-blue hover:text-voxcina-darkBlue transition-colors group"
                  >
                    <span>مشاهده کالکشن</span>
                    <FaArrowLeft />
                  </Link>
                </motion.div>
              </div>

              <div className="relative h-64 sm:h-72 md:h-auto">
                <div className="absolute inset-0 overflow-hidden rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-blue/30 mix-blend-multiply z-10"></div>
                  <div className="absolute inset-0 bg-[url('/images/banners/FinalB2.jpg')] bg-cover bg-center" />
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
          viewport={{ once: true }}
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
            <div>
              <ProductGrid
                items={featuredProducts}
                columns={4}
                glassEffect={true}
              />
            </div>
          )}
        </motion.section>

        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              در حال بارگذاری...
            </div>
          }
        >
          <AIAssistantPromo />
        </Suspense>
        <ModernSliderSection sliders={sliders} />


        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              در حال بارگذاری...
            </div>
          }
        >
          <ColorMatchingTool />
        </Suspense>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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
            <div>
              <ProductGrid items={newProducts} columns={4} />
            </div>
          )}
        </motion.section>
        {/* <VirtualWardrobe /> */}
        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="relative py-10 px-5 sm:py-12 sm:px-6 md:p-16 bg-gradient-to-r from-voxcina-darkBlue to-voxcina-blue rounded-3xl overflow-hidden shadow-medium">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
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
                <div key={index} className="text-center relative">
                  <div className="flex justify-center mb-3 md:mb-4">
                    <div className="bg-gradient-to-br from-white/20 to-white/5 text-white p-3 md:p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-soft">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 md:mb-2 text-white">
                    {benefit.title}
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              در حال بارگذاری...
            </div>
          }
        >
          <InstagramFeed
            username="voxcina"
            postsCount={6}
            showCaption={true}
            showStats={true}
            className="mb-16"
          />
        </Suspense>

        <motion.section
          className="container px-4 md:px-8 mb-16 md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="bg-gradient-to-r from-voxcina-blue to-primary-600 rounded-3xl p-6 sm:p-8 md:p-12 text-center relative overflow-hidden shadow-medium">
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
