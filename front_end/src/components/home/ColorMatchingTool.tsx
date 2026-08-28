"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface SkinTone {
  id: string;
  name: string;
  color: string;
  description: string;
  undertone: string;
  characteristics: string[];
}

interface ColorRecommendation {
  name: string;
  hex: string;
  products: number;
  category: "neutral" | "warm" | "cool";
  occasions: string[];
  description: string;
}

type Step = "upload" | "analysis" | "results";

const AdvancedColorMatchingTool: React.FC = () => {
  const [step, setStep] = useState<Step>("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skinTones: SkinTone[] = [
    {
      id: "fair-pink",
      name: "روشن با زیرپوست صورتی",
      color: "#FDBCB4",
      description: "پوست روشن با زیرپوست صورتی - معمول در شمال ایران",
      undertone: "cool",
      characteristics: [
        "رگ‌های آبی-بنفش",
        "سریع قرمز می‌شود",
        "موهای بلوند تا قهوه‌ای روشن",
      ],
    },
    {
      id: "fair-yellow",
      name: "روشن با زیرپوست زرد",
      color: "#E1A95F",
      description: "پوست کرم‌رنگ با زیرپوست زرد - رایج در مناطق مرکزی",
      undertone: "warm",
      characteristics: [
        "رگ‌های سبز-زیتونی",
        "به آهستگی برنزه می‌شود",
        "موهای طلایی تا قهوه‌ای",
      ],
    },
    {
      id: "medium-olive",
      name: "متوسط زیتونی",
      color: "#C68642",
      description: "پوست گندمی با زیرپوست زیتونی - متداول در ایران",
      undertone: "neutral",
      characteristics: ["رگ‌های سبز-آبی", "برنزه مناسب", "موهای قهوه‌ای تیره"],
    },
    {
      id: "medium-warm",
      name: "متوسط گرم",
      color: "#B8860B",
      description: "پوست گندمی با زیرپوست طلایی - جنوب و غرب ایران",
      undertone: "warm",
      characteristics: [
        "رگ‌های سبز-طلایی",
        "برنزه عالی",
        "موهای قهوه‌ای تا مشکی",
      ],
    },
    {
      id: "tan-golden",
      name: "برنزه طلایی",
      color: "#A0522D",
      description: "پوست برنزه با زیرپوست طلایی - مناطق جنوبی",
      undertone: "warm",
      characteristics: [
        "رگ‌های طلایی",
        "برنزه آسان",
        "موهای مشکی تا قهوه‌ای تیره",
      ],
    },
    {
      id: "deep-rich",
      name: "تیره غنی",
      color: "#654321",
      description: "پوست تیره با زیرپوست قرمز-طلایی - جنوب شرق ایران",
      undertone: "warm",
      characteristics: ["رگ‌های طلایی-قرمز", "رنگ‌پذیری عالی", "موهای مشکی"],
    },
  ];

  const colorRecommendations: Record<string, ColorRecommendation[]> = {
    "fair-pink": [
      {
        name: "آبی یخی",
        hex: "#B0E0E6",
        products: 24,
        category: "cool",
        occasions: ["اداری", "مهمانی"],
        description: "تضاد زیبا با زیرپوست صورتی",
      },
      {
        name: "یاسی ملایم",
        hex: "#E6E6FA",
        products: 18,
        category: "cool",
        occasions: ["روزمره", "مجلسی"],
        description: "هارمونی با تون پوست",
      },
      {
        name: "صورتی غبارآلود",
        hex: "#D8BFD8",
        products: 21,
        category: "cool",
        occasions: ["بهاری", "عاشقانه"],
        description: "ظرافت و نرمی",
      },
      {
        name: "خاکستری نقره‌ای",
        hex: "#C0C0C0",
        products: 16,
        category: "neutral",
        occasions: ["کار", "رسمی"],
        description: "شیک و مدرن",
      },
    ],
    "fair-yellow": [
      {
        name: "کرال گرم",
        hex: "#FF7F50",
        products: 28,
        category: "warm",
        occasions: ["تابستان", "شاد"],
        description: "انرژی و گرمای طبیعی",
      },
      {
        name: "زرد طلایی",
        hex: "#FFD700",
        products: 32,
        category: "warm",
        occasions: ["جشن", "ویژه"],
        description: "درخشش و شادابی",
      },
      {
        name: "فیروزه‌ای",
        hex: "#40E0D0",
        products: 22,
        category: "cool",
        occasions: ["تابستان", "ساحلی"],
        description: "تازگی و زیبایی",
      },
      {
        name: "کرم گرم",
        hex: "#F5DEB3",
        products: 26,
        category: "warm",
        occasions: ["پاییز", "کژوال"],
        description: "نرمی و گرمای طبیعی",
      },
    ],
    "medium-olive": [
      {
        name: "سبز زمردی",
        hex: "#50C878",
        products: 34,
        category: "cool",
        occasions: ["طبیعت", "آرامش"],
        description: "هارمونی با زیرپوست زیتونی",
      },
      {
        name: "زرد خردلی",
        hex: "#FFDB58",
        products: 29,
        category: "warm",
        occasions: ["پاییز", "مدرن"],
        description: "جسارت و مدرنیته",
      },
      {
        name: "قرمز آجری",
        hex: "#B22222",
        products: 31,
        category: "warm",
        occasions: ["زمستان", "قدرت"],
        description: "قدرت و اعتماد",
      },
      {
        name: "بنفش عمیق",
        hex: "#663399",
        products: 19,
        category: "cool",
        occasions: ["شب", "مجلسی"],
        description: "اشرافیت و عمق",
      },
    ],
    "medium-warm": [
      {
        name: "نارنجی گرم",
        hex: "#FF8C00",
        products: 36,
        category: "warm",
        occasions: ["پاییز", "انرژی"],
        description: "گرمای خورشید",
      },
      {
        name: "قهوه‌ای شکلاتی",
        hex: "#D2691E",
        products: 33,
        category: "warm",
        occasions: ["زمستان", "کژوال"],
        description: "گرمای طبیعی",
      },
      {
        name: "زرد آفتابگردان",
        hex: "#FFD700",
        products: 27,
        category: "warm",
        occasions: ["تابستان", "شادی"],
        description: "نشاط و روشنایی",
      },
      {
        name: "سبز زیتونی",
        hex: "#808000",
        products: 24,
        category: "warm",
        occasions: ["طبیعت", "آرام"],
        description: "ثبات و آرامش",
      },
    ],
    "tan-golden": [
      {
        name: "فوشیا زنده",
        hex: "#FF1493",
        products: 25,
        category: "cool",
        occasions: ["شب", "جذاب"],
        description: "تضاد خیره‌کننده",
      },
      {
        name: "آبی کبالت",
        hex: "#0047AB",
        products: 30,
        category: "cool",
        occasions: ["اداری", "قدرت"],
        description: "اعتماد و قدرت",
      },
      {
        name: "سفید خالص",
        hex: "#FFFFFF",
        products: 42,
        category: "neutral",
        occasions: ["تمام مواقع"],
        description: "کلاسیک و تمیز",
      },
      {
        name: "بنفش ملکه‌ای",
        hex: "#9966CC",
        products: 28,
        category: "cool",
        occasions: ["مجلسی", "اشرافی"],
        description: "شکوه و زیبایی",
      },
    ],
    "deep-rich": [
      {
        name: "سفید برفی",
        hex: "#FFFAFA",
        products: 45,
        category: "neutral",
        occasions: ["کلاسیک", "شیک"],
        description: "کنتراست قدرتمند",
      },
      {
        name: "زرد لیمویی",
        hex: "#32CD32",
        products: 35,
        category: "warm",
        occasions: ["تابستان", "انرژی"],
        description: "انرژی و شادابی",
      },
      {
        name: "صورتی فوشیا",
        hex: "#FF69B4",
        products: 38,
        category: "cool",
        occasions: ["جشن", "زیبایی"],
        description: "درخشش و جذابیت",
      },
      {
        name: "آبی الکترونیک",
        hex: "#0066FF",
        products: 41,
        category: "cool",
        occasions: ["مدرن", "تکنولوژی"],
        description: "مدرنیته و آینده",
      },
    ],
  };

  const MAX_IMAGE_SIZE_MB = 5;

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    // allow re-selecting same file
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("فرمت فایل نامعتبر است. لطفاً یک تصویر انتخاب کنید.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setUploadError(`حجم تصویر نباید بیشتر از ${MAX_IMAGE_SIZE_MB} مگابایت باشد.`);
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setSelectedImage(e.target.result);
        setStep("analysis");
      }
    };
    reader.onerror = () => {
      setUploadError("خطا در خواندن فایل. دوباره تلاش کنید.");
    };
    reader.readAsDataURL(file);
  };

  const handleSkipUpload = (): void => {
    setUploadError(null);
    setSelectedImage(null);
    setStep("analysis");
  };

  const handleBackToUpload = (): void => {
    setStep("upload");
  };

  const handleBackToAnalysis = (): void => {
    setStep("analysis");
  };

  const handleSkinToneSelect = (toneId: string): void => {
    setSkinTone(toneId);
    setStep("results");
  };

  const resetTool = (): void => {
    setStep("upload");
    setSelectedImage(null);
    setSkinTone(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedToneData = skinTones.find((tone) => tone.id === skinTone);
  const recommendations = skinTone ? colorRecommendations[skinTone] || [] : [];

  return (
    <section className="mb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-voxcina-blue mb-3 sm:mb-4">
            تطبیق رنگ هوشمند
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-voxcina-blue/70 max-w-2xl mx-auto">
            بهترین رنگ‌های لباس را براساس تون پوست و زیرپوست خود کشف کنید
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="انتخاب عکس برای تطبیق رنگ"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="cursor-pointer border-2 border-dashed border-voxcina-blue/30 rounded-2xl sm:rounded-3xl p-8 sm:p-12 hover:border-voxcina-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-lg"
                >
                  <div className="mb-4 sm:mb-6">
                    <svg
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-voxcina-blue/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-voxcina-blue mb-2">
                    عکس خود را آپلود کنید{" "}
                    <span className="text-sm font-normal text-voxcina-blue/60">
                      (اختیاری)
                    </span>
                  </h3>
                  <p className="text-sm sm:text-base text-voxcina-blue/70 mb-4 sm:mb-6 max-w-md mx-auto">
                    برای تشخیص دقیق‌تر تون پوست، عکسی با نور طبیعی و بدون فیلتر
                    انتخاب کنید — یا مستقیم تون پوست را انتخاب کنید
                  </p>
                  <span className="inline-block bg-voxcina-blue text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:bg-voxcina-darkBlue transition-colors text-sm sm:text-base">
                    انتخاب عکس
                  </span>
                  <p className="text-xs text-voxcina-blue/50 mt-3">
                    JPG, PNG تا {MAX_IMAGE_SIZE_MB} مگ — عکس فقط در مرورگر شما
                    نمایش داده می‌شود و ذخیره نمی‌شود
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                {uploadError && (
                  <div
                    role="alert"
                    className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                  >
                    {uploadError}
                  </div>
                )}
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={handleSkipUpload}
                    className="text-sm sm:text-base text-voxcina-blue font-medium underline underline-offset-4 hover:text-voxcina-darkBlue transition-colors px-4 py-2"
                  >
                    رد کردن و انتخاب دستی تون پوست
                  </button>
                  <span className="hidden sm:inline text-voxcina-blue/30">|</span>
                  <p className="text-xs text-voxcina-blue/60">
                    آپلود اختیاری است و تاثیری بر هوشمندی ندارد
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 sm:mt-8 bg-gradient-to-r from-voxcina-blue/10 to-primary-100/10 rounded-xl sm:rounded-2xl p-4 sm:p-6"
                >
                  <h4 className="font-bold text-voxcina-blue mb-3 text-sm sm:text-base">
                    نکات مهم برای عکس مناسب:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm text-voxcina-blue/80">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <p>نور طبیعی روز</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <p>بدون آرایش یا کم‌رنگ</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <p>بدون فیلتر</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <p>صورت کاملاً نمایان</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {step === "analysis" && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start"
              >
                <div className="relative order-2 lg:order-1">
                  {selectedImage ? (
                    <>
                      <img
                        src={selectedImage}
                        alt="تصویر آپلود شده"
                        className="w-full max-w-sm mx-auto rounded-xl sm:rounded-2xl shadow-lg"
                      />
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-voxcina-blue text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                        عکس شما
                      </div>
                    </>
                  ) : (
                    <div className="w-full max-w-sm mx-auto rounded-xl sm:rounded-2xl border-2 border-dashed border-voxcina-blue/20 bg-voxcina-blue/5 p-8 text-center">
                      <p className="text-sm text-voxcina-blue/70">
                        عکسی آپلود نکردید — مستقیم تون پوست خود را انتخاب کنید
                      </p>
                      <button
                        onClick={handleBackToUpload}
                        className="mt-3 text-sm font-medium text-voxcina-blue underline underline-offset-4 hover:text-voxcina-darkBlue"
                      >
                        بازگشت و آپلود عکس
                      </button>
                    </div>
                  )}
                </div>

                <div className="order-1 lg:order-2">
                  <button
                    onClick={handleBackToUpload}
                    className="mb-4 inline-flex items-center gap-2 text-sm text-voxcina-blue/70 hover:text-voxcina-blue transition-colors"
                    aria-label="بازگشت به مرحله آپلود"
                  >
                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    بازگشت
                  </button>
                  <h3 className="text-xl sm:text-2xl font-bold text-voxcina-blue mb-4 sm:mb-6">
                    تون پوست خود را انتخاب کنید
                  </h3>
                  <p className="text-sm sm:text-base text-voxcina-blue/70 mb-4 sm:mb-6">
                    براساس ویژگی‌های ذکر شده، مناسب‌ترین تون پوست را انتخاب کنید
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {skinTones.map((tone) => (
                      <motion.button
                        key={tone.id}
                        onClick={() => handleSkinToneSelect(tone.id)}
                        className="p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-voxcina-blue transition-all duration-300 text-right bg-white hover:bg-voxcina-blue/5"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md flex-shrink-0"
                            style={{ backgroundColor: tone.color }}
                          />
                          <span className="font-medium text-voxcina-blue text-sm sm:text-base">
                            {tone.name}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-voxcina-blue/70 mb-2">
                          {tone.description}
                        </p>
                        <div className="text-xs text-voxcina-blue/60">
                          {tone.characteristics.slice(0, 2).map((char, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-voxcina-blue/40 rounded-full"></span>
                              {char}
                            </div>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === "results" && skinTone && selectedToneData && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-voxcina-blue mb-2">
                    رنگ‌های پیشنهادی شما
                  </h3>
                  <p className="text-sm sm:text-base text-voxcina-blue/70 mb-3">
                    براساس تون پوست{" "}
                    <span className="font-medium">{selectedToneData.name}</span>
                  </p>
                  <div className="inline-flex items-center gap-2 bg-voxcina-blue/10 px-3 sm:px-4 py-2 rounded-full">
                    <div
                      className="w-4 h-4 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: selectedToneData.color }}
                    />
                    <span className="text-xs sm:text-sm text-voxcina-blue font-medium">
                      زیرپوست{" "}
                      {selectedToneData.undertone === "warm"
                        ? "گرم"
                        : selectedToneData.undertone === "cool"
                        ? "سرد"
                        : "خنثی"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {recommendations.map((color, index) => (
                    <motion.div
                      key={`${color.hex}-${color.name}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
                    >
                      <Link
                        href={`/products?search=${encodeURIComponent(color.name)}`}
                        aria-label={`مشاهده محصولات رنگ ${color.name}`}
                        className="block"
                      >
                        <div
                          className="h-24 sm:h-32 relative border-b border-gray-100"
                          style={{
                            backgroundColor: color.hex,
                            borderColor: color.hex === "#FFFFFF" || color.hex === "#FFFAFA" ? "#e5e7eb" : "transparent",
                            borderWidth: color.hex === "#FFFFFF" || color.hex === "#FFFAFA" ? "1px" : "0",
                            borderBottomWidth: "1px",
                          }}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                            <span className="bg-white/90 backdrop-blur-md text-voxcina-blue px-3 sm:px-4 py-1 sm:py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs sm:text-sm font-medium shadow-sm">
                              مشاهده محصولات
                            </span>
                          </div>
                          <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-[10px] font-mono text-voxcina-blue px-1.5 py-0.5 rounded border border-gray-200">
                            {color.hex}
                          </span>
                        </div>
                      </Link>
                      <div className="p-3 sm:p-4">
                        <Link
                          href={`/products?search=${encodeURIComponent(color.name)}`}
                          className="hover:text-voxcina-darkBlue transition-colors"
                        >
                          <h4 className="font-medium text-voxcina-blue mb-1 text-sm sm:text-base">
                            {color.name}
                          </h4>
                        </Link>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {color.occasions.slice(0, 2).map((occasion) => (
                            <span
                              key={occasion}
                              className="bg-gray-100 text-voxcina-blue px-2 py-0.5 rounded text-xs"
                            >
                              {occasion}
                            </span>
                          ))}
                          <span className="bg-voxcina-blue/10 text-voxcina-blue px-2 py-0.5 rounded text-xs">
                            {color.category === "warm" ? "گرم" : color.category === "cool" ? "سرد" : "خنثی"}
                          </span>
                        </div>
                        <p className="text-xs text-voxcina-blue/60 line-clamp-2">
                          {color.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-voxcina-blue/10 to-primary-100/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8"
                >
                  <h4 className="font-bold text-voxcina-blue mb-3 text-sm sm:text-base">
                    ویژگی‌های تون پوست شما:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-voxcina-blue/80">
                    {selectedToneData.characteristics.map((char, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-voxcina-blue rounded-full flex-shrink-0"></span>
                        {char}
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Link
                      href={`/products?search=${encodeURIComponent(recommendations[0]?.name || selectedToneData.name)}`}
                      className="bg-voxcina-blue text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium shadow-lg hover:shadow-xl hover:bg-voxcina-darkBlue transition-all duration-300 text-sm sm:text-base text-center"
                    >
                      مشاهده محصولات پیشنهادی
                    </Link>
                    <button
                      onClick={handleBackToAnalysis}
                      className="bg-white text-voxcina-blue border-2 border-voxcina-blue px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium hover:bg-voxcina-blue hover:text-white transition-all duration-300 text-sm sm:text-base"
                    >
                      تغییر تون پوست
                    </button>
                    <button
                      onClick={resetTool}
                      className="bg-gray-100 text-voxcina-blue px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 text-sm sm:text-base"
                    >
                      تست مجدد
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-voxcina-blue/60 max-w-2xl mx-auto">
                    این توصیه‌ها براساس اصول رنگ‌شناسی و تناسب با تون پوست
                    ایرانیان تهیه شده‌اند — برای دیدن محصولات هر رنگ، روی کارت رنگ بزنید
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default AdvancedColorMatchingTool;
