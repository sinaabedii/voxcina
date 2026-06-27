"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  ArrowUpRight,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getBrandName, getCategoryName } from "@/lib/utils";
import { useProductStore } from "@/store/product-store";
import { formatPrice } from "@/lib/utils";
import { ColorVariantListItem } from "@/types/product";
import { motion, AnimatePresence } from "framer-motion";
import { getCanonicalColor } from "@/lib/product-variants";

interface SmartSearchProps {
  isOpen?: boolean;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  isOpen = false,
  onClose,
  placeholder = "جستجو در محصولات...",
  className = "",
  value,
  onChange,
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [results, setResults] = useState<ColorVariantListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { products, brands, categories } = useProductStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchTerm = value !== undefined ? value : internalSearchTerm;

  const encodedSearchTerm = useMemo(() => {
    return encodeURIComponent(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      setShowResults(true);

      const trimmedSearchTerm = searchTerm.trim().toLowerCase();
      const filteredProducts = products
        .filter((item) => {
          // Check if in stock using colorVariant sizes
          const inStock = item.colorVariant.sizes?.some((s) => s.quantity > 0) ?? false;
          if (!inStock) return false;

          const name = item.name.toLowerCase();
          const description = item.description.toLowerCase();
          const brandName = getBrandName(item.brand_id, brands) || "";
          const brand = brandName.toLowerCase();
          const categoryName =
            getCategoryName(item.category_ids, categories) || "";
          const category = categoryName.toLowerCase();
          const colorName = item.colorVariant.colorName?.toLowerCase() || "";

          return (
            name.includes(trimmedSearchTerm) ||
            description.includes(trimmedSearchTerm) ||
            brand.includes(trimmedSearchTerm) ||
            category.includes(trimmedSearchTerm) ||
            colorName.includes(trimmedSearchTerm)
          );
        })
        .sort((a, b) => {
          const aStartsWith = a.name
            .toLowerCase()
            .startsWith(trimmedSearchTerm);
          const bStartsWith = b.name
            .toLowerCase()
            .startsWith(trimmedSearchTerm);

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          const aFeatured = a.is_flash_sale;
          const bFeatured = b.is_flash_sale;

          if (aFeatured && !bFeatured) return -1;
          if (!aFeatured && bFeatured) return 1;

          return 0;
        })
        .slice(0, 8);

      setResults(filteredProducts);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, products, brands, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/products?search=${encodedSearchTerm}`);
      if (onClose) onClose();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalSearchTerm(newValue);
    }
  };

  const setSearchValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalSearchTerm(newValue);
    }
  };

  const handleClearSearch = () => {
    if (onChange) {
      onChange("");
    } else {
      setInternalSearchTerm("");
    }
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.trim()})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-primary-100 text-primary-700 rounded-md px-1 font-semibold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (isOpen === false && !className) return null;

  return (
    <>
      {isOpen ? (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-voxcina-lightCream/80 via-white/60 to-secondary-100/70 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-16 sm:top-20 left-6 sm:left-20 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-r from-primary-200/20 to-voxcina-blue/10 rounded-full blur-xl"
                animate={{
                  x: [0, 15, 0],
                  y: [0, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-16 sm:bottom-20 right-6 sm:right-20 w-24 sm:w-40 h-24 sm:h-40 bg-gradient-to-r from-secondary-300/20 to-primary-300/10 rounded-full blur-xl"
                animate={{
                  x: [0, -12, 0],
                  y: [0, 8, 0],
                  scale: [1, 0.9, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
            </div>

            <div
              className="relative z-10 flex flex-col items-center justify-center min-h-screen px-3 sm:px-4 py-4"
              onClick={onClose}
            >
              <motion.div
                className="w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{
                  delay: 0.1,
                  duration: 0.4,
                  type: "spring" as const,
                  stiffness: 300,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  className="text-center mb-4 sm:mb-6 md:mb-8 px-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-voxcina-blue" />
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-voxcina-blue to-primary-600 bg-clip-text text-transparent">
                      جستجوی هوشمند
                    </h2>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary-500" />
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                    محصول مورد نظرتان را پیدا کنید
                  </p>
                </motion.div>

                <div className="relative group px-2 sm:px-0">
                  <form onSubmit={handleSubmit} className="relative">
                    <div className="relative">
                      <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-voxcina-blue via-primary-500 to-secondary-600 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300 blur-sm"></div>

                      <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder={placeholder}
                        className={`relative w-full pl-11 sm:pl-12 md:pl-14 lg:pl-16 pr-11 sm:pr-12 md:pr-14 lg:pr-16 py-3 sm:py-4 md:py-5 lg:py-6 text-sm sm:text-base md:text-lg bg-white/95 backdrop-blur-md border-2 border-secondary-300/50 rounded-full shadow-soft focus:outline-none focus:ring-4 focus:ring-primary-200/50 focus:border-voxcina-blue/60 transition-all duration-300 text-right hover:shadow-medium ${className}`}
                        autoComplete="off"
                      />

                      <div className="absolute right-2.5 sm:right-3 md:right-4 lg:right-5 top-1/2 -translate-y-1/2 z-20">
                        <motion.div
                          className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-gradient-to-r from-voxcina-blue to-primary-600 rounded-full flex items-center justify-center shadow-soft cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{
                            type: "spring" as const,
                            stiffness: 400,
                            damping: 10,
                          }}
                        >
                          <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5 text-white" />
                        </motion.div>
                      </div>

                      {searchTerm && (
                        <div className="absolute left-2.5 sm:left-3 md:left-4 lg:left-5 top-1/2 -translate-y-1/2 z-20">
                          <motion.button
                            type="button"
                            onClick={handleClearSearch}
                            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-secondary-200 hover:bg-secondary-300 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors duration-200"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                              type: "spring" as const,
                              stiffness: 400,
                              damping: 10,
                            }}
                          >
                            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {!searchTerm && (
                  <motion.div
                    className="mt-4 sm:mt-6 md:mt-8 text-center px-2 sm:px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium">
                        جستجوهای پرطرفدار
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      {[
                        "کیف زنانه",
                        "کفش اسپرت",
                        "لباس مجلسی",
                        "اکسسوری",
                        "عینک آفتابی",
                      ].map((term, index) => (
                        <motion.button
                          key={term}
                          onClick={() => setSearchValue(term)}
                          className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-voxcina-lightCream to-secondary-200 hover:from-voxcina-blue hover:to-primary-600 hover:text-white border border-secondary-300 hover:border-transparent rounded-full transition-all duration-300 text-xs sm:text-sm font-medium shadow-soft hover:shadow-medium"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {term}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {showResults && searchTerm && (
                <motion.div
                  className="w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mt-4 sm:mt-6 md:mt-8 px-3 sm:px-0"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  transition={{ delay: 0.2, type: "spring" as const, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-3xl shadow-strong border border-secondary-200/50 overflow-hidden">
                    {isSearching ? (
                      <div className="p-6 sm:p-8 md:p-12 text-center">
                        <div className="relative">
                          <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin mx-auto text-voxcina-blue mb-3 sm:mb-4" />
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-primary-200/50"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        </div>
                        <p className="text-gray-600 text-base sm:text-lg font-medium">
                          در حال جستجو...
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">
                          لطفاً صبر کنید
                        </p>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="p-6 sm:p-8 md:p-12 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-secondary-200 to-secondary-300 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <Search className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                          محصولی یافت نشد
                        </h3>
                        <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">
                          متأسفانه هیچ محصولی با این عبارت پیدا نکردیم
                        </p>
                        <div className="text-xs sm:text-sm text-gray-400 space-y-1">
                          <p>• از کلمات کلیدی دیگری استفاده کنید</p>
                          <p>• املای کلمات را بررسی کنید</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-primary-50 to-secondary-100 border-b border-secondary-200">
                          <div className="flex items-center justify-between">
                            <p className="text-gray-700 font-semibold text-sm sm:text-base">
                              {results.length} محصول یافت شد برای{" "}
                              <span className="text-voxcina-blue">
                                &ldquo;{searchTerm}&rdquo;
                              </span>
                            </p>
                            <div className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                              بهترین نتایج
                            </div>
                          </div>
                        </div>

                        <div className="max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-6">
	                            {results.map((item, index) => {
	                              const brandName = getBrandName(
	                                item.brand_id,
	                                brands
	                              );
	                              const categoryName = getCategoryName(
	                                item.category_ids,
	                                categories
	                              );
	                              const selectedColor = getCanonicalColor(item.colorVariant) || item.colorVariant.colorName;

	                              return (
	                                <motion.div
	                                  key={`${item.productId}-${selectedColor}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
	                                  <Link
	                                    href={`/products/${item.productId}?color=${encodeURIComponent(selectedColor)}`}
                                    className="group block p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl hover:bg-gradient-to-br hover:from-voxcina-lightCream hover:to-primary-50 transition-all duration-300 border border-transparent hover:border-primary-200 hover:shadow-medium"
                                    onClick={onClose}
                                  >
                                    <div className="text-center">
                                      <motion.div
                                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary-100 to-secondary-200 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:from-primary-200 group-hover:to-secondary-300 transition-all duration-300"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                      >
                                        <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-voxcina-blue" />
                                      </motion.div>
                                      <h4 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm truncate group-hover:text-voxcina-blue transition-colors leading-tight">
                                        {highlightText(item.name)}
                                      </h4>
                                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-2 truncate">
                                        {brandName}{" "}
                                        {categoryName ? `• ${categoryName}` : ""}
                                      </p>
                                      <div className="text-xs sm:text-sm">
                                        <span className="font-bold bg-gradient-to-r from-voxcina-blue to-primary-700 bg-clip-text text-transparent">
                                          {formatPrice(item.price)}
                                        </span>
                                        {item.originalPrice &&
                                          item.originalPrice > item.price && (
                                            <span className="block text-[10px] sm:text-xs text-gray-400 line-through mt-0.5 sm:mt-1">
                                              {formatPrice(item.originalPrice)}
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-voxcina-lightCream to-primary-50 border-t border-secondary-200">
                          <Link
                            href={`/products?search=${encodedSearchTerm}`}
                            className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-voxcina-blue to-primary-600 hover:from-voxcina-darkBlue hover:to-primary-700 text-white rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 font-semibold text-sm sm:text-base shadow-soft hover:shadow-medium transform hover:scale-[1.02]"
                            onClick={onClose}
                          >
                            <span>مشاهده همه {results.length}+ محصول</span>
                            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <form onSubmit={handleSubmit} className={className}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={placeholder}
              className="w-full px-4 py-2 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
            </div>
            {searchTerm && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              </button>
            )}
          </div>
        </form>
      )}
    </>
  );
};

export default SmartSearch;
