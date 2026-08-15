"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Slider } from "@/types/slider";
import { overlayClassFor, contentAlignmentFor } from "@/lib/slider-presentation";

interface ModernSliderSectionClientProps {
  sliders: Slider[];
}

/**
 * Client-side Slider Section with animations and auto-play.
 * Receives server-fetched sliders as props and handles client-side interactions.
 * 
 * Requirements: 3.2, 3.4, 5.1
 */
export const ModernSliderSectionClient = ({ sliders }: ModernSliderSectionClientProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progressKey, setProgressKey] = useState(0);

  const sliderData = sliders ?? [];

  useEffect(() => {
    if (!sliderData || sliderData.length === 0) return;

    let interval: NodeJS.Timeout;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderData.length);
        setProgressKey((prev) => prev + 1);
      }, 6000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isAutoPlaying, sliderData]);

  const handleNext = () => {
    if (!sliderData || sliderData.length === 0) return;
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    setProgressKey((prev) => prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handlePrev = () => {
    if (!sliderData || sliderData.length === 0) return;
    setIsAutoPlaying(false);
    setCurrentSlide(
      (prev) => (prev - 1 + sliderData.length) % sliderData.length
    );
    setProgressKey((prev) => prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const handleGoToSlide = (index: number) => {
    if (!sliderData || sliderData.length === 0) return;
    setIsAutoPlaying(false);
    setCurrentSlide(index);
    setProgressKey((prev) => prev + 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // Sliders are entirely admin-authored. With none published there is nothing
  // to promote, so the section collapses rather than reserving 400-700px for a
  // placeholder — the old "Loading Slides..." box was permanent, not transient.
  if (sliderData.length === 0) {
    return null;
  }

  return (
    <section className="container px-4 md:px-8 mb-16 md:mb-24">
      <div className="relative h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-2xl md:rounded-3xl overflow-hidden">
        <div key={currentSlide} className="absolute inset-0 animate-fadeIn">
            <div className="absolute inset-0">
              <Image
                src={sliderData[currentSlide].image}
                alt={sliderData[currentSlide].title}
                fill
                className="object-cover"
                priority={currentSlide === 0}
                loading={currentSlide === 0 ? 'eager' : 'lazy'}
                sizes="100vw"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-br ${sliderData[currentSlide].bgColor} opacity-85`}
              />
              <div
                className={`absolute inset-0 ${overlayClassFor(
                  sliderData[currentSlide].overlayStrength
                )}`}
              />
            </div>

            <div className="relative h-full px-4 sm:px-6 md:px-8 lg:px-12">
              <div className="h-full flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-center w-full">
                  <div
                    className={`lg:col-span-7 text-white flex flex-col ${contentAlignmentFor(
                      sliderData[currentSlide].contentPosition
                    )}`}
                  >
                    <div className="mb-3 md:mb-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 md:px-5 md:py-2 rounded-full bg-gradient-to-r ${sliderData[currentSlide].accentColor} text-white text-xs md:text-sm font-semibold`}
                      >
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
                        {sliderData[currentSlide].badge}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 leading-tight">
                      {sliderData[currentSlide].title}
                    </h2>

                    <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-2 md:mb-3 text-white/90 font-normal">
                      {sliderData[currentSlide].subtitle}
                    </p>

                    <p className="hidden sm:block text-sm md:text-base lg:text-lg mb-4 md:mb-8 text-white/70 max-w-2xl">
                      {sliderData[currentSlide].description}
                    </p>

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

                    {/* Only the admin-authored CTA is rendered. The former
                        "محصولات بیشتر" button linked to /products?tag=<badge>,
                        but no `tag` filter exists in the products page or the
                        Go handler — it silently served the unfiltered listing
                        under an unbounded set of crawlable URLs. */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                      <Link
                        href={sliderData[currentSlide].buttonLink}
                        className="inline-flex items-center justify-center bg-white text-gray-900 px-4 py-2.5 md:px-8 md:py-4 rounded-full font-medium md:font-semibold overflow-hidden transition-all duration-300 text-sm md:text-base hover:bg-gray-100"
                      >
                        <span className="relative z-10">
                          {sliderData[currentSlide].buttonText}
                        </span>
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
                          <div className="text-white/70 text-xs">رضایت</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={handlePrev}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="قبلی"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
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
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="بعدی"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
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

        {/* Progress Bar and Dots */}
        <div className="absolute bottom-6 right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 flex items-center gap-2">
          {sliderData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleGoToSlide(index)}
              type="button"
              aria-label={`رفتن به اسلاید ${index + 1}`}
              aria-current={currentSlide === index ? "true" : undefined}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full transition-colors ${
                  currentSlide === index ? "bg-white" : "bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
          <div
            key={progressKey}
            className={`h-full bg-white ${isAutoPlaying ? "animate-slider-progress" : ""}`}
            style={{ animationDuration: "6s" }}
          />
        </div>
      </div>
    </section>
  );
};
