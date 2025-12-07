"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

interface AuthWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export default function AuthWrapper({
  children,
  title,
  subtitle,
  imageSrc = "/images/banners/sidecover.webp",
  imageAlt = "Fashion Banner",
}: AuthWrapperProps) {
  return (
    <div className="min-h-screen w-full relative">
      {/* Full Screen Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Subtle dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Logo - Top Right */}
      <motion.div 
        className="fixed top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" className="inline-block">
          <div className="relative w-24 h-10 sm:w-28 sm:h-11 lg:w-32 lg:h-12 bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Image
              alt={APP_NAME}
              priority
              quality={100}
              src="/images/Logo/BlueXTransparent.png"
              fill
              className="object-contain p-1"
            />
          </div>
        </Link>
      </motion.div>

      {/* Feature Badges - Bottom Right (Hidden on Mobile) */}
      <motion.div
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-20 hidden lg:flex flex-col gap-2"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-sm font-medium">ارسال رایگان</span>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-sm font-medium">گارانتی اصالت</span>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-sm font-medium">پشتیبانی ۲۴/۷</span>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-screen flex items-center p-4 sm:p-6 lg:p-8">
        {/* Form Card - Positioned to the left side */}
        <motion.div
          className="w-full max-w-md lg:mr-auto lg:ml-12 xl:ml-20"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Glassmorphism Card */}
          <div className="bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 text-center border-b border-gray-100/80">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
              )}
            </div>

            {/* Form Content */}
            <div className="p-6 sm:p-8">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
