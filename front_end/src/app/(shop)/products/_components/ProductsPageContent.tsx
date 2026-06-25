"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useTransition } from "react";
import {
  X,
  Filter,
  ArrowUpDown,
  Package,
  Loader2,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { SORT_OPTIONS } from "@/lib/constants";
import { ColorVariantListItem, PaginationInfo, ProductFilter } from "@/types/product";
import { Category } from "@/types/category";

import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import SmartSearch from "@/components/ui/SmartSearch";

/**
 * Products Page Content - Client Component
 * 
 * Receives server-fetched products and handles client-side interactions.
 * Updates URL on filter changes for SSR-friendly navigation.
 * 
 * Requirements: 5.3 - Update URL on filter changes using useRouter
 */

interface ProductsPageContentProps {
  initialProducts: ColorVariantListItem[];
  initialPagination: PaginationInfo | null;
  categories: Category[];
  initialFilters: {
    category?: string;
    brand?: string;
    search?: string;
    sort?: string;
    inStockOnly?: boolean;
  };
  currentPage: number;
}

export default function ProductsPageContent({
  initialProducts,
  initialPagination,
  categories,
  initialFilters,
  currentPage,
}: ProductsPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");

  // Current filter state derived from URL
  const filter: ProductFilter = {
    categories: initialFilters.category ? [initialFilters.category] : [],
    search: initialFilters.search,
    sort: initialFilters.sort as ProductFilter["sort"],
    inStockOnly: initialFilters.inStockOnly,
  };

  // Update URL with new parameters (Requirements: 5.3)
  const updateUrl = useCallback(
    (updates: Record<string, string | undefined | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change (except for page changes)
      if (!("page" in updates)) {
        params.delete("page");
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl({ sort: e.target.value || null });
  };

  const handleCategoryFilter = (categoryId: string) => {
    const currentCategory = initialFilters.category;
    const newCategory = currentCategory === categoryId ? null : categoryId;
    updateUrl({ category: newCategory });
  };

  const handleInStockFilter = (checked: boolean) => {
    updateUrl({ inStockOnly: checked ? "true" : null });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    updateUrl({ search: searchTerm || null });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const handlePageChange = (page: number) => {
    updateUrl({ page: page > 1 ? String(page) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    filter.search ||
    (filter.categories && filter.categories.length > 0) ||
    filter.inStockOnly ||
    filter.sort;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <div className="container py-8 md:py-12">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-6 text-voxcina-blue dark:text-voxcina-cream relative hidden md:block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">محصولات</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      {/* Search and Filter Controls */}
      <motion.div
        className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full">
          <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(); }}>
            <SmartSearch
              placeholder="جستجوی محصولات..."
              className="w-full"
              isOpen={false}
              value={searchTerm}
              onChange={handleSearchChange}
              onClose={() => {
                setSearchTerm("");
                updateUrl({ search: null });
              }}
            />
          </form>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
          <div className="relative z-50">
            <select
              className="h-10 rounded-xl border border-voxcina-cream/50 dark:border-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 px-4 py-2 w-32 md:w-44 appearance-none focus:outline-none focus:ring-2 focus:ring-voxcina-blue/50 dark:focus:ring-voxcina-cream/50 text-voxcina-blue dark:text-voxcina-cream text-sm shadow-sm"
              value={filter.sort || ""}
              onChange={handleSortChange}
            >
              <option value="">مرتب‌سازی</option>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-voxcina-blue/60 dark:text-voxcina-cream/60">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
            >
              <Filter className="h-4 w-4" />
              فیلترها
            </Button>
          </motion.div>

          {hasActiveFilters && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 rounded-xl transition-all duration-300"
              >
                <X className="h-4 w-4" />
                حذف فیلترها
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Loading indicator for transitions */}
      {isPending && (
        <motion.div
          className="mb-4 p-3 bg-voxcina-cream/20 dark:bg-voxcina-blue/20 rounded-xl flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-5 w-5 animate-spin ml-2 text-voxcina-blue dark:text-voxcina-cream" />
          <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
            در حال بارگذاری...
          </span>
        </motion.div>
      )}

      <div className="flex gap-6 md:gap-8">
        {/* Desktop Sidebar Filters */}
        <motion.div
          className="hidden md:block w-64 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="sticky top-24 space-y-6">
            {/* In Stock Filter */}
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm p-5 backdrop-blur-sm"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center mb-2">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="in-stock-only"
                    className="opacity-0 absolute h-5 w-5 cursor-pointer"
                    checked={!!filter.inStockOnly}
                    onChange={(e) => handleInStockFilter(e.target.checked)}
                  />
                  <div
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 ${
                      filter.inStockOnly
                        ? "bg-voxcina-blue dark:bg-voxcina-cream"
                        : "bg-transparent"
                    }`}
                  >
                    {filter.inStockOnly && (
                      <Check className="h-3 w-3 text-white dark:text-voxcina-blue" />
                    )}
                  </div>
                  <label
                    htmlFor="in-stock-only"
                    className="ml-2 text-sm cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                  >
                    فقط کالاهای موجود
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Categories Filter */}
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm p-5 backdrop-blur-sm"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-semibold text-lg mb-5 text-voxcina-blue dark:text-voxcina-cream">
                دسته‌بندی‌ها
              </h3>

              {categories && categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${category.id || ""}`}
                          className="opacity-0 absolute h-5 w-5 cursor-pointer"
                          checked={(filter.categories || []).includes(category.id || "")}
                          onChange={() => category.id && handleCategoryFilter(category.id)}
                        />
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 transition-colors ${
                            (filter.categories || []).includes(category.id || "")
                              ? "bg-voxcina-blue dark:bg-voxcina-cream"
                              : "bg-transparent group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30"
                          }`}
                        >
                          {(filter.categories || []).includes(category.id || "") && (
                            <Check className="h-3 w-3 text-white dark:text-voxcina-blue" />
                          )}
                        </div>
                        <label
                          htmlFor={`category-${category.id || ""}`}
                          className="ml-2 text-sm cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                        >
                          {category.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 italic">
                  دسته‌بندی‌ای یافت نشد
                </div>
              )}
            </motion.div>

            {hasActiveFilters && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  fullWidth
                  className="h-12 rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                  onClick={handleClearFilters}
                >
                  پاک کردن فیلترها
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          className="flex-grow"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {initialProducts.length === 0 ? (
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm py-16 px-6 backdrop-blur-sm"
              variants={itemVariants}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/30 flex items-center justify-center mb-4 shadow-sm">
                  <Package className="h-8 w-8 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                </div>
                <p className="text-lg font-medium mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  {hasActiveFilters
                    ? "متأسفانه محصولی با این مشخصات یافت نشد"
                    : "متأسفانه هیچ محصولی یافت نشد"}
                </p>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 max-w-md">
                  {hasActiveFilters
                    ? "لطفاً فیلترهای خود را تغییر دهید یا با کلیک روی دکمه زیر، همه فیلترها را پاک کنید."
                    : "در حال حاضر محصولی برای نمایش وجود ندارد. لطفاً بعداً مراجعه کنید."}
                </p>
                {hasActiveFilters && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                    >
                      پاک کردن فیلترها
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <motion.p
                className="mb-6 text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center"
                variants={itemVariants}
              >
                <span className="w-6 h-6 inline-flex items-center justify-center bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full text-voxcina-blue dark:text-voxcina-cream text-sm font-medium ml-2">
                  {initialPagination?.totalItems || initialProducts.length}
                </span>
                محصول یافت شد
              </motion.p>

              <motion.div variants={itemVariants}>
                <ProductGrid items={initialProducts} columns={3} />
              </motion.div>

              {/* Pagination Controls */}
              {initialPagination && initialPagination.totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={initialPagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        categories={categories}
        filter={filter}
        onCategoryFilter={handleCategoryFilter}
        onInStockFilter={handleInStockFilter}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}


/**
 * Pagination Controls Component
 */
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center mt-12 space-y-6"
      variants={itemVariants}
    >
      {/* Progress Dots */}
      <div className="flex items-center space-x-2 space-x-reverse">
        {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => {
          const pageNumber = index + 1;
          let actualPage: number;

          if (totalPages <= 7) {
            actualPage = pageNumber;
          } else {
            if (currentPage <= 4) {
              actualPage = pageNumber;
            } else if (currentPage >= totalPages - 3) {
              actualPage = totalPages - 6 + pageNumber;
            } else {
              actualPage = currentPage - 3 + pageNumber;
            }
          }

          const isActive = actualPage === currentPage;
          const isClickable = actualPage >= 1 && actualPage <= totalPages;

          return (
            <motion.div
              key={`dot-${actualPage}`}
              className={`relative cursor-pointer transition-all duration-300 ${
                isClickable ? "opacity-100" : "opacity-50"
              }`}
              whileHover={isClickable ? { scale: 1.2 } : {}}
              whileTap={isClickable ? { scale: 0.9 } : {}}
              onClick={() => isClickable && onPageChange(actualPage)}
            >
              <div
                className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                  isActive
                    ? "bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 border-white dark:border-slate-800 shadow-xl shadow-purple-500/40 dark:shadow-purple-400/30"
                    : "bg-gray-300 dark:bg-slate-600 border-gray-400 dark:border-slate-500 hover:bg-blue-400 dark:hover:bg-blue-500 hover:border-blue-500 dark:hover:border-blue-400 shadow-md hover:shadow-lg"
                }`}
              />
              {isActive && (
                <motion.div
                  className="absolute -inset-1.5 rounded-full border-2 border-blue-400/60 dark:border-purple-400/50"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center">
        <motion.div
          className="flex items-center bg-gradient-to-r from-white to-gray-50 dark:from-voxcina-blue/20 dark:to-voxcina-blue/10 rounded-2xl p-2 shadow-lg backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Previous Button */}
          <motion.button
            className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
              currentPage === 1
                ? "text-voxcina-blue/30 dark:text-voxcina-cream/30 cursor-not-allowed"
                : "text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-cream/10 hover:shadow-md"
            }`}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
            whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
            aria-label="صفحه قبل"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>

          {/* Page Info */}
          <div className="flex items-center mx-4">
            <motion.div
              className="text-center min-w-[120px]"
              key={currentPage}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                {currentPage}
              </div>
              <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                از {totalPages} صفحه
              </div>
            </motion.div>
          </div>

          {/* Next Button */}
          <motion.button
            className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
              currentPage === totalPages
                ? "text-voxcina-blue/30 dark:text-voxcina-cream/30 cursor-not-allowed"
                : "text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-cream/10 hover:shadow-md"
            }`}
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
            whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
            aria-label="صفحه بعد"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
        </motion.div>
      </div>

      {/* Quick Jump */}
      {totalPages > 7 && (
        <motion.div
          className="flex items-center space-x-2 space-x-reverse text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span>رفتن به:</span>
          <div className="flex items-center space-x-1 space-x-reverse">
            {currentPage > 4 && (
              <>
                <motion.button
                  className="w-8 h-8 rounded-lg bg-voxcina-cream/30 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-cream/10 transition-all duration-200 text-xs font-medium"
                  onClick={() => onPageChange(1)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  1
                </motion.button>
                {currentPage > 5 && (
                  <MoreHorizontal className="h-4 w-4 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                )}
              </>
            )}

            {currentPage < totalPages - 3 && (
              <>
                {currentPage < totalPages - 4 && (
                  <MoreHorizontal className="h-4 w-4 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                )}
                <motion.button
                  className="w-8 h-8 rounded-lg bg-voxcina-cream/30 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-cream/10 transition-all duration-200 text-xs font-medium"
                  onClick={() => onPageChange(totalPages)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {totalPages}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Mobile Filter Drawer Component
 */
function MobileFilterDrawer({
  isOpen,
  onClose,
  categories,
  filter,
  onCategoryFilter,
  onInStockFilter,
  onClearFilters,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  filter: ProductFilter;
  onCategoryFilter: (categoryId: string) => void;
  onInStockFilter: (checked: boolean) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilters =
    filter.search ||
    (filter.categories && filter.categories.length > 0) ||
    filter.inStockOnly ||
    filter.sort;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-voxcina-blue/30 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white/95 dark:bg-voxcina-blue/95 shadow-xl p-6 overflow-y-auto z-50 md:hidden backdrop-blur-sm border-l border-voxcina-cream/30 dark:border-voxcina-blue/50"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                فیلترها
              </h2>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 flex items-center justify-center text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/50 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="space-y-6">
              {/* In Stock Filter */}
              <div>
                <div className="flex items-center">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="mobile-in-stock-only"
                      className="opacity-0 absolute h-5 w-5 cursor-pointer"
                      checked={!!filter.inStockOnly}
                      onChange={(e) => onInStockFilter(e.target.checked)}
                    />
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 ${
                        filter.inStockOnly
                          ? "bg-voxcina-blue dark:bg-voxcina-cream"
                          : "bg-transparent"
                      }`}
                    >
                      {filter.inStockOnly && (
                        <Check className="h-3 w-3 text-white dark:text-voxcina-blue" />
                      )}
                    </div>
                    <label
                      htmlFor="mobile-in-stock-only"
                      className="ml-2 text-sm cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                    >
                      فقط کالاهای موجود
                    </label>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-voxcina-blue dark:text-voxcina-cream">
                  دسته‌بندی‌ها
                </h3>
                {categories && categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            id={`mobile-category-${category.id || ""}`}
                            className="opacity-0 absolute h-5 w-5 cursor-pointer"
                            checked={(filter.categories || []).includes(category.id || "")}
                            onChange={() => category.id && onCategoryFilter(category.id)}
                          />
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 transition-colors ${
                              (filter.categories || []).includes(category.id || "")
                                ? "bg-voxcina-blue dark:bg-voxcina-cream"
                                : "bg-transparent"
                            }`}
                          >
                            {(filter.categories || []).includes(category.id || "") && (
                              <Check className="h-3 w-3 text-white dark:text-voxcina-blue" />
                            )}
                          </div>
                          <label
                            htmlFor={`mobile-category-${category.id || ""}`}
                            className="ml-2 text-sm cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                          >
                            {category.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 italic">
                    دسته‌بندی‌ای یافت نشد
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-4 sticky bottom-0 bg-white/90 dark:bg-voxcina-blue/90 pt-4 backdrop-blur-sm">
                <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                  <Button
                    variant="primary"
                    fullWidth
                    className="h-12 rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={onClose}
                  >
                    اعمال فیلترها
                  </Button>
                </motion.div>

                {hasActiveFilters && (
                  <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                    <Button
                      variant="outline"
                      fullWidth
                      className="h-12 rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                      onClick={onClearFilters}
                    >
                      پاک کردن فیلترها
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
