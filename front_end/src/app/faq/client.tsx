"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { Faq } from "@/types/faq";

interface FAQClientProps {
  faqs: Faq[];
  error?: string;
}

export default function FAQClient({ faqs, error }: FAQClientProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleAccordion = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredFaqs =
    normalizedSearch.length === 0
      ? faqs
      : faqs.filter((item) => {
          const q = (item.question ?? "").toLowerCase();
          const a = (item.answer ?? "").toLowerCase();
          return q.includes(normalizedSearch) || a.includes(normalizedSearch);
        });

  return (
    <>
      <Header />
      <div className="min-h-screen max-w-6xl mx-auto dark:bg-voxcina-darkBlue/90">
        <div className="relative overflow-hidden bg-transparent">
          <div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 md:py-24 lg:py-32 max-w-7xl">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="flex items-center gap-3 mb-6 sm:mb-8"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-voxcina-blue/10 flex items-center justify-center text-voxcina-blue">
                  <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-voxcina-blue/70 dark:text-secondary-200/70 font-medium tracking-[0.25em] uppercase mb-1">
                    FAQ
                  </p>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-darkBlue dark:text-white">
                    پرسش‌های متداول
                  </h1>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-secondary-200/80 mb-10 sm:mb-12 max-w-3xl"
              >
                در این بخش به رایج‌ترین سوالات شما درباره روند ثبت سفارش، ارسال، پیگیری و خدمات پس از فروش پاسخ داده‌ایم.
              </motion.p>

              <div className="mb-6 sm:mb-8">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setActiveIndex(null);
                  }}
                  placeholder="جستجو در سوالات..."
                  className="w-full rounded-xl border border-gray-200/80 dark:border-voxcina-blue/40 bg-white/90 dark:bg-voxcina-darkBlue/70 px-4 py-3 text-sm sm:text-base text-voxcina-darkBlue dark:text-secondary-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-voxcina-blue/70 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-4">
                {error && (
                  <p className="text-sm sm:text-base text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}

                {!error && faqs.length === 0 && (
                  <p className="text-sm sm:text-base text-gray-500 dark:text-secondary-200/80">
                    فعلاً سوال متداولی ثبت نشده است.
                  </p>
                )}

                {!error &&
                  faqs.length > 0 &&
                  filteredFaqs.length === 0 && (
                    <p className="text-sm sm:text-base text-gray-500 dark:text-secondary-200/80">
                      هیچ سوالی با این عبارت پیدا نشد.
                    </p>
                  )}

                {!error &&
                  filteredFaqs.length > 0 &&
                  filteredFaqs.map((item, index) => {
                    const isActive = activeIndex === index;
                    return (
                      <motion.div
                        key={item.id ?? index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                        className="border border-gray-200/80 dark:border-voxcina-blue/30 rounded-2xl bg-white/80 dark:bg-voxcina-darkBlue/60 backdrop-blur-sm overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleAccordion(index)}
                          className="w-full flex items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 text-right"
                        >
                          <div className="flex-1">
                            <p className="text-sm sm:text-base md:text-lg font-medium text-voxcina-darkBlue dark:text-white">
                              {item.question}
                            </p>
                          </div>
                          <div className="shrink-0 text-voxcina-blue">
                            {isActive ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </button>
                        {isActive && (
                          <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-0 text-sm sm:text-base text-gray-600 dark:text-secondary-200/90 border-t border-gray-100 dark:border-voxcina-blue/30">
                            {item.answer}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
