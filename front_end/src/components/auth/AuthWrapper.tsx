"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

interface AuthWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  gradientClass?: string;
}

export default function AuthWrapper({
  children,
  title,
  subtitle,
  imageSrc = "/images/banners/sidecover.webp",
  imageAlt = "Fashion Banner",
  gradientClass = "bg-gradient-to-l from-black/50 via-black/55 to-black/60",
}: AuthWrapperProps) {
  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col">
        {/* Logo */}
        <div className="p-6 sm:p-8">
          <Link href="/" className="inline-block">
            <div className="relative w-28 h-10">
              <Image
                alt={APP_NAME}
                priority
                quality={100}
                src="/images/Logo/BlueXTransparent.png"
                fill
                className="object-contain object-right"
              />
            </div>
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 pb-8">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              {subtitle && (
                <p className="text-gray-500 text-sm">{subtitle}</p>
              )}
            </div>

            {/* Form */}
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-gray-100">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              قوانین و مقررات
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              حریم خصوصی
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-gray-600 transition-colors">
              تماس با ما
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Image (Hidden on mobile) */}
      <div className="hidden lg:block flex-1 relative">
        {/* Background image (will be blurred) */}
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          quality={90}
          className="object-cover"
          sizes="(max-width: 1024px) 0vw, 60vw"
        />
        {/* Glass effect overlay */}
        <div className="absolute inset-0 backdrop-blur-[2px]" />
        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${gradientClass}`} />
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
        {/* Character overlay (not blurred) */}
        <Image
          src="/images/banners/sidecover_characters.webp"
          alt="Characters"
          fill
          priority
          quality={95}
          className="object-cover z-[1]"
          sizes="(max-width: 1024px) 0vw, 60vw"
        />
        
        {/* Feature Badges */}
        <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex flex-col gap-2 lg:gap-3 z-10">
          {[
            { text: "ارسال رایگان", icon: "truck" },
            { text: "گارانتی اصالت", icon: "shield" },
            { text: "پشتیبانی ۲۴/۷", icon: "support" },
          ].map((badge) => (
            <div
              key={badge.text}
              className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-3 py-2 lg:px-4 lg:py-2.5 shadow-xl border border-white/20"
            >
              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-800 text-xs lg:text-sm font-medium whitespace-nowrap">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
