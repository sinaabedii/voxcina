"use client";

import React, { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FaArrowLeft } from "react-icons/fa";
import { HeroImage, DEFAULT_GRADIENT } from "@/types/hero-image";

interface HeroSectionClientProps {
  desktopImage?: HeroImage | null;
  mobileImage?: HeroImage | null;
}

/**
 * Get the gradient class for a hero image
 */
function getGradientClass(heroImage: HeroImage | null | undefined): string {
  if (!heroImage) {
    return DEFAULT_GRADIENT;
  }
  
  if (heroImage.noGradient) {
    return "";
  }
  
  if (heroImage.gradient && heroImage.gradient.trim() !== "") {
    return heroImage.gradient;
  }
  
  return DEFAULT_GRADIENT;
}

/**
 * Client-side Hero Section with scroll-based animations.
 * Uses Next.js Image component for automatic image optimization.
 */
const HeroSectionClient: React.FC<HeroSectionClientProps> = ({
  desktopImage,
  mobileImage,
}) => {
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const { desktopGradient, mobileGradient } = useMemo(() => ({
    desktopGradient: getGradientClass(desktopImage),
    mobileGradient: getGradientClass(mobileImage),
  }), [desktopImage, mobileImage]);

  // Determine if we need a fallback background (when no images are available)
  const needsFallbackBackground = !desktopImage && !mobileImage;

  return (
    <section
      ref={heroRef}
      className={`relative max-w-6xl mx-4 sm:mx-6 lg:mx-auto rounded-lg sm:rounded-xl md:rounded-2xl mb-6 sm:mb-8 md:mb-10 py-4 sm:py-5 md:py-6 min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] lg:min-h-[65vh] flex items-center overflow-hidden ${needsFallbackBackground ? DEFAULT_GRADIENT : ''}`}
    >
      {/* Desktop Hero Image - Hidden on mobile */}
      {desktopImage && (
        <div className="hidden md:block absolute inset-0">
          <motion.div
            className="absolute inset-0"
            style={{ opacity: heroOpacity, y: heroY }}
          >
            {desktopGradient && (
              <div className={`absolute inset-0 z-10 ${desktopGradient}`} />
            )}
            <Image
              src={desktopImage.image}
              alt="Hero banner desktop"
              fill
              priority
              sizes="(min-width: 768px) 100vw, 0vw"
              className="object-cover opacity-30"
              quality={85}
            />
          </motion.div>
        </div>
      )}

      {/* Mobile Hero Image - Hidden on desktop */}
      {mobileImage && (
        <div className="block md:hidden absolute inset-0">
          <motion.div
            className="absolute inset-0"
            style={{ opacity: heroOpacity, y: heroY }}
          >
            {mobileGradient && (
              <div className={`absolute inset-0 z-10 ${mobileGradient}`} />
            )}
            <Image
              src={mobileImage.image}
              alt="Hero banner mobile"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 0vw"
              className="object-cover opacity-30"
              quality={80}
            />
          </motion.div>
        </div>
      )}

      {/* Decorative blur elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 sm:-top-16 md:-top-20 sm:-right-16 md:-right-20 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-60 lg:h-60 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-xl" />
        <div className="absolute -bottom-10 -left-10 sm:-bottom-16 md:-bottom-20 sm:-left-16 md:-left-20 w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 blur-xl" />
      </div>

      {/* Content overlay */}
      <motion.div
        className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8"
        style={{ y: textY }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="inline-block mb-3 sm:mb-4 md:mb-6"
          >
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-medium">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
              کالکشن جدید
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight"
          >
            <span className="text-white block mb-1 sm:mb-2">
              فروشگاه اینترنتی لباس و پوشاک
            </span>
            <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                وکسینا
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 mb-4 sm:mb-6 md:mb-8 max-w-xs sm:max-w-sm md:max-w-xl mx-auto font-light leading-relaxed"
          >
            با جدیدترین ترندهای مد تابستانی، استایل منحصر به فرد خود را خلق کنید
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
          >
            <Link
              href="/categories/summer"
              className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-medium text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                مشاهده کالکشن
                <FaArrowLeft />
              </span>
            </Link>

            <Link
              href="/categories/trending"
              className="backdrop-blur-md bg-white/10 text-white border-2 border-white/30 px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-medium text-sm sm:text-base md:text-lg hover:bg-white/20 hover:border-white/50 transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                پرفروش‌ترین‌ها
                <span className="text-yellow-400 text-sm sm:text-base">⭐</span>
              </span>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSectionClient;
