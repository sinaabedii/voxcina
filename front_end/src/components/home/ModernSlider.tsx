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
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentSlide(
      (prev) => (prev - 1 + sliderData.length) % sliderData.length
    );
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleGoToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
    setProgress(0);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <motion.section
      className="container px-4 md:px-8 mb-16 md:mb-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeIn}
    >
      <div className="relative h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-2xl md:rounded-3xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="absolute inset-0">
              <motion.img
                src={sliderData[currentSlide].image}
                alt={sliderData[currentSlide].title}
                className="w-full h-full object-cover"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: "linear" }}
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="mb-3 md:mb-6"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 md:px-5 md:py-2 rounded-full bg-gradient-to-r ${sliderData[currentSlide].accentColor} text-white text-xs md:text-sm font-semibold`}
                      >
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
                        {sliderData[currentSlide].badge}
                      </span>
                    </motion.div>

                    <motion.h1
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 leading-tight"
                    >
                      {sliderData[currentSlide].title}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-2 md:mb-3 text-white/90 font-light"
                    >
                      {sliderData[currentSlide].subtitle}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      className="hidden sm:block text-sm md:text-base lg:text-lg mb-4 md:mb-8 text-white/70 max-w-2xl"
                    >
                      {sliderData[currentSlide].description}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-8"
                    >
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
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="flex flex-col sm:flex-row gap-3 md:gap-4"
                    >
                      <Link
                        href={sliderData[currentSlide].buttonLink}
                        className="group relative inline-flex items-center justify-center bg-white text-gray-900 px-4 py-2.5 md:px-8 md:py-4 rounded-full font-medium md:font-semibold overflow-hidden transition-all duration-300 text-sm md:text-base"
                      >
                        <span className="relative z-10">
                          {sliderData[currentSlide].buttonText}
                        </span>
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 opacity-0 group-hover:opacity-100 absolute left-[calc(100%-2.5rem)] md:left-[calc(100%-3rem)] transition-all duration-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${sliderData[currentSlide].accentColor} transform translate-x-full group-hover:translate-x-0 transition-transform duration-300`}
                        />
                      </Link>

                      <button className="inline-flex items-center justify-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md text-white px-4 py-2.5 md:px-6 md:py-4 rounded-full font-medium md:font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 text-sm md:text-base">
                        <svg
                          className="w-4 h-4 md:w-5 md:h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="hidden sm:inline">مشاهده ویدیو</span>
                        <span className="sm:hidden">ویدیو</span>
                      </button>
                    </motion.div>
                  </div>

                  <div className="lg:col-span-5 relative hidden lg:block">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="relative"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute -top-10 -right-10 w-24 h-24 xl:w-32 xl:h-32"
                      >
                        <div
                          className={`w-full h-full rounded-full bg-gradient-to-br ${sliderData[currentSlide].accentColor} flex items-center justify-center shadow-2xl`}
                        >
                          <span className="text-2xl xl:text-3xl font-bold text-white">
                            {sliderData[currentSlide].discount}
                          </span>
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
                      </motion.div>

                      <div className="grid grid-cols-3 gap-3 xl:gap-4 mt-16 xl:mt-20">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.8 }}
                          className="bg-white/10 backdrop-blur-md rounded-xl xl:rounded-2xl p-3 xl:p-4 text-center border border-white/20"
                        >
                          <span className="block text-xl xl:text-2xl font-bold text-white mb-1">
                            {sliderData[currentSlide].stats.items}
                          </span>
                          <span className="text-white/70 text-xs xl:text-sm">
                            محصولات
                          </span>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.9 }}
                          className="bg-white/10 backdrop-blur-md rounded-xl xl:rounded-2xl p-3 xl:p-4 text-center border border-white/20"
                        >
                          <span className="block text-xl xl:text-2xl font-bold text-white mb-1">
                            {sliderData[currentSlide].stats.brands}
                          </span>
                          <span className="text-white/70 text-xs xl:text-sm">
                            برند
                          </span>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 1 }}
                          className="bg-white/10 backdrop-blur-md rounded-xl xl:rounded-2xl p-3 xl:p-4 text-center border border-white/20"
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="text-xl xl:text-2xl font-bold text-white">
                              {sliderData[currentSlide].stats.reviews}
                            </span>
                            <svg
                              className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-400 fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          </div>
                          <span className="text-white/70 text-xs xl:text-sm">
                            امتیاز
                          </span>
                        </motion.div>
                      </div>

                      <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute -bottom-10 right-10 bg-white/10 backdrop-blur-lg rounded-xl xl:rounded-2xl p-3 xl:p-4 border border-white/20 w-40 xl:w-48"
                      >
                        <div className="flex items-center gap-2 xl:gap-3 mb-2 xl:mb-3">
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/20 rounded-lg" />
                          <div>
                            <div className="h-2.5 xl:h-3 bg-white/30 rounded w-16 xl:w-20 mb-1.5 xl:mb-2" />
                            <div className="h-2 bg-white/20 rounded w-12 xl:w-16" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 text-xs xl:text-sm">
                            ویژه
                          </span>
                          <span className="text-yellow-400 text-xs xl:text-sm font-bold">
                            -25%
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>

                  <div className="lg:hidden absolute top-4 left-4 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <span className="font-bold">
                        {sliderData[currentSlide].discount}
                      </span>
                      <span className="opacity-70">|</span>
                      <div className="flex items-center gap-1">
                        <span>{sliderData[currentSlide].stats.reviews}</span>
                        <svg
                          className="w-3 h-3 text-yellow-400 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-10 md:top-20 left-10 md:left-20 w-32 md:w-64 h-32 md:h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 md:bottom-20 right-10 md:right-20 w-48 md:w-96 h-48 md:h-96 bg-white/5 rounded-full blur-3xl" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-4 lg:px-8">
          <button
            onClick={handlePrev}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            className="group bg-black/20 backdrop-blur-md text-white p-2 md:p-3 lg:p-4 rounded-full hover:bg-black/40 transition-all duration-300 border border-white/10"
          >
            
            <svg
              className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 transform group-hover:translate-x-1 transition-transform"
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

          <button
            onClick={handleNext}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            className="group bg-black/20 backdrop-blur-md text-white p-2 md:p-3 lg:p-4 rounded-full hover:bg-black/40 transition-all duration-300 border border-white/10"
          >
           <svg
              className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 transform group-hover:-translate-x-1 transition-transform"
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

        <div className="absolute bottom-4 md:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 lg:gap-4">
          {sliderData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleGoToSlide(index)}
              className="relative group"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <div className="relative">
                <div
                  className={`h-0.5 md:h-1 transition-all duration-300 rounded-full overflow-hidden ${
                    index === currentSlide
                      ? "w-8 md:w-12 lg:w-16 bg-white/30"
                      : "w-4 md:w-6 lg:w-8 bg-white/20 hover:bg-white/30"
                  }`}
                >
                  {index === currentSlide && (
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  )}
                </div>
                <div className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {sliderData[index].title}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="absolute top-4 md:top-6 lg:top-8 right-4 md:right-6 lg:right-8 bg-black/20 backdrop-blur-md text-white px-3 py-1.5 md:px-5 md:py-2.5 lg:px-6 lg:py-3 rounded-full border border-white/10">
          <span className="text-xs md:text-sm font-medium">
            <span className="text-base md:text-xl lg:text-2xl font-bold">
              {String(currentSlide + 1).padStart(2, "0")}
            </span>
            <span className="mx-1 md:mx-2 text-white/50">/</span>
            <span className="text-white/70">
              {String(sliderData.length).padStart(2, "0")}
            </span>
          </span>
        </div>

        <div className="absolute bottom-6 lg:bottom-8 right-6 lg:right-8 hidden xl:flex gap-2">
          {sliderData.map((slide, index) => (
            <motion.button
              key={index}
              onClick={() => handleGoToSlide(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                index === currentSlide
                  ? "ring-2 ring-white"
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              <div className="w-16 h-10 lg:w-20 lg:h-12 relative">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${slide.bgColor} opacity-70`}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.section>
  );
};
