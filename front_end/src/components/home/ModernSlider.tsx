import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

export const ModernSliderSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const sliderData = [
    {
      id: 1,
      title: "کالکشن پاییز 2025",
      subtitle: "رنگ‌های گرم و طراحی‌های منحصربفرد",
      description: "با الهام از طبیعت پاییز، مجموعه‌ای از پوشاک با کیفیت عالی",
      image: "/images/slider/slider_autumn.avif",
      buttonText: "کاوش کنید",
      buttonLink: "/collections/autumn-2025",
      badge: "جدید",
      bgColor: "from-amber-900 via-orange-800 to-red-900",
      accentColor: "from-amber-400 to-orange-500",
      discount: "-30%",
      features: ["ارسال رایگان", "ضمانت اصالت", "بازگشت آسان"],
      stats: { items: "250+", brands: "15", reviews: "4.9" },
    },
    {
      id: 2,
      title: "تخفیف ویژه برندها",
      subtitle: "تا 70% تخفیف روی محبوب‌ترین برندها",
      description: "فرصت استثنایی برای خرید از برندهای معتبر جهانی",
      image: "/images/slider/special-offers-and-discounts.webp",
      buttonText: "خرید کنید",
      buttonLink: "/sales/brands",
      badge: "فروش ویژه",
      bgColor: "from-rose-900 via-pink-800 to-purple-900",
      accentColor: "from-rose-400 to-pink-500",
      discount: "-70%",
      features: ["محدودیت زمانی", "برندهای اصل", "تنوع بالا"],
      stats: { items: "500+", brands: "30", reviews: "4.8" },
    },
    {
      id: 3,
      title: "استایل اداری شیک",
      subtitle: "برای روزهای کاری پرانرژی",
      description: "ترکیب زیبایی و حرفه‌ای بودن در یک مجموعه",
      image: "/images/slider/office-wear-for-men.webp",
      buttonText: "مشاهده استایل‌ها",
      buttonLink: "/collections/office",
      badge: "ترند",
      bgColor: "from-slate-900 via-gray-800 to-zinc-900",
      accentColor: "from-slate-400 to-gray-500",
      discount: "NEW",
      features: ["طراحی مدرن", "راحتی کامل", "کیفیت عالی"],
      stats: { items: "150+", brands: "10", reviews: "4.7" },
    },
    {
      id: 4,
      title: "لوازم جانبی لوکس",
      subtitle: "کیف، کفش و جواهرات برندهای معتبر",
      description: "تکمیل کننده استایل شما با محصولات لوکس",
      image: "/images/slider/acces-loxs.jpg",
      buttonText: "مجموعه لوکس",
      buttonLink: "/collections/luxury",
      badge: "پریمیوم",
      bgColor: "from-indigo-900 via-purple-800 to-pink-900",
      accentColor: "from-indigo-400 to-purple-500",
      discount: "VIP",
      features: ["برندهای لوکس", "گارانتی اصالت", "بسته‌بندی ویژه"],
      stats: { items: "100+", brands: "20", reviews: "5.0" },
    },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderData.length);
        setProgress(0);
      }, 6000);

      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1.67, 100));
      }, 100);
    }

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [currentSlide, isAutoPlaying]);

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentSlide(
      (prev) => (prev - 1 + sliderData.length) % sliderData.length
    );
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleGoToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
  };

  return (
    <section className="container px-4 md:px-8 mb-16 md:mb-24">
      <div className="relative h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-2xl md:rounded-3xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0">
              <img
                src={sliderData[currentSlide].image}
                alt={sliderData[currentSlide].title}
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-br ${sliderData[currentSlide].bgColor} opacity-85`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>

            <div className="relative h-full px-4 sm:px-6 md:px-8 lg:px-12">
              <div className="h-full flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-center w-full">
                  <div className="lg:col-span-7 text-white">
                    <div className="mb-3 md:mb-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 md:px-5 md:py-2 rounded-full bg-gradient-to-r ${sliderData[currentSlide].accentColor} text-white text-xs md:text-sm font-semibold`}
                      >
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
                        {sliderData[currentSlide].badge}
                      </span>
                    </div>

                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 leading-tight"
                    >
                      {sliderData[currentSlide].title}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-2 md:mb-3 text-white/90 font-light"
                    >
                      {sliderData[currentSlide].subtitle}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="hidden sm:block text-sm md:text-base lg:text-lg mb-4 md:mb-8 text-white/70 max-w-2xl"
                    >
                      {sliderData[currentSlide].description}
                    </motion.p>

                    <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-8">
                      {sliderData[currentSlide].features.map(
                        (feature, index) => (
                          <span
                            key={index}
                            className="flex items-center gap-1 md:gap-2 text-white/80 text-xs md:text-base"
                          >
                            <svg
                              className="w-3 h-3 md:w-5 md:h-5 text-green-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="hidden sm:inline">{feature}</span>
                            <span className="sm:hidden">
                              {feature.split(" ")[0]}
                            </span>
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                      <Link
                        href={sliderData[currentSlide].buttonLink}
                        className="inline-flex items-center justify-center bg-white text-gray-900 px-4 py-2.5 md:px-8 md:py-4 rounded-full font-medium md:font-semibold overflow-hidden transition-all duration-300 text-sm md:text-base hover:bg-gray-100"
                      >
                        <span className="relative z-10">
                          {sliderData[currentSlide].buttonText}
                        </span>
                      </Link>

                      <Link
                        href={`/products?tag=${sliderData[currentSlide].badge.toLowerCase()}`}
                        className="inline-flex items-center justify-center bg-white/10 text-white backdrop-blur-sm px-4 py-2.5 md:px-8 md:py-4 rounded-full font-medium md:font-semibold text-sm md:text-base hover:bg-white/20 border border-white/30 transition-colors"
                      >
                        <span>محصولات بیشتر</span>
                      </Link>
                    </div>
                  </div>

                  <div className="hidden lg:block lg:col-span-5 relative">
                    <div className="absolute top-0 right-0 bg-white/10 backdrop-blur-sm p-4 rounded-2xl shadow-xl">
                      <div className="text-white text-2xl font-bold mb-1">
                        {sliderData[currentSlide].discount}
                      </div>
                      <div className="text-white/80 text-sm">
                        تخفیف ویژه
                      </div>
                    </div>

                    <div className="mt-12 p-5 bg-white/10 backdrop-blur-sm rounded-2xl">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-white text-xl font-bold">
                            {sliderData[currentSlide].stats.items}
                          </div>
                          <div className="text-white/70 text-xs">محصول</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white text-xl font-bold">
                            {sliderData[currentSlide].stats.brands}
                          </div>
                          <div className="text-white/70 text-xs">برند</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white text-xl font-bold">
                            {sliderData[currentSlide].stats.reviews}
                          </div>
                          <div className="text-white/70 text-xs">امتیاز</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors z-10"
          aria-label="Previous slide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 md:h-6 md:w-6"
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

        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors z-10"
          aria-label="Next slide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 md:h-6 md:w-6"
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

        {/* Pagination dots & progress bar */}
        <div className="absolute bottom-4 left-0 right-0 z-10">
          <div className="container px-4 md:px-8">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-16 md:w-24 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex gap-2">
                {sliderData.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleGoToSlide(index)}
                    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors ${
                      currentSlide === index ? "bg-white" : "bg-white/30"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
