"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useTransition } from "react";
import {
  X,
  ArrowUpDown,
  PackageCheck,
  Package,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { SORT_OPTIONS } from "@/lib/constants";
import { ColorVariantListItem, PaginationInfo, ProductFilter } from "@/types/product";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import SmartSearch from "@/components/ui/SmartSearch";
import ProductFilterPanel from "./ProductFilterPanel";

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
  brands: Brand[];
  initialFilters: {
    category?: string;
    brand?: string;
    search?: string;
    sort?: string;
    inStockOnly?: boolean;
    flashSaleOnly?: boolean;
  };
  currentPage: number;
}

export default function ProductsPageContent({
  initialProducts,
  initialPagination,
  categories,
  brands,
  initialFilters,
  currentPage,
}: ProductsPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Current filter state derived from URL
  const filter: ProductFilter = {
    categories: initialFilters.category ? [initialFilters.category] : [],
    brands: initialFilters.brand ? [initialFilters.brand] : [],
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

  const handleBrandFilter = (brandName: string) => {
    const newBrand = initialFilters.brand === brandName ? null : brandName;
    updateUrl({ brand: newBrand });
  };

  const handleInStockFilter = (checked: boolean) => {
    updateUrl({ inStockOnly: checked ? "true" : null });
  };

  const handleFlashSaleFilter = (checked: boolean) => {
    updateUrl({ flashSale: checked ? "true" : null });
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

  const activeCategory = initialFilters.category;
  const activeBrand = initialFilters.brand;

  // Counts only the narrowing filters — the drawer badge should not light up
  // for a sort order or a search term, which have their own controls.
  const activeFilterCount =
    (activeCategory ? 1 : 0) +
    (activeBrand ? 1 : 0) +
    (initialFilters.inStockOnly ? 1 : 0) +
    (initialFilters.flashSaleOnly ? 1 : 0);

  const hasActiveFilters = Boolean(filter.search || filter.sort) || activeFilterCount > 0;

  // A filter chosen inside the drawer re-renders the page underneath it; the
  // drawer stays open so several filters can be combined in one pass, but the
  // body must not scroll behind it.
  useEffect(() => {
    if (!isFilterDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterDrawerOpen]);

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
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsFilterDrawerOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-voxcina-cream/50 bg-white px-4 text-sm text-voxcina-blue shadow-sm transition-colors hover:border-voxcina-blue/40 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10 dark:text-voxcina-cream md:hidden"
            aria-haspopup="dialog"
            aria-expanded={isFilterDrawerOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            فیلترها
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-voxcina-blue px-1.5 text-xs font-medium text-white dark:bg-voxcina-cream dark:text-voxcina-blue">
                {activeFilterCount.toLocaleString("fa-IR")}
              </span>
            )}
          </motion.button>

          <div className="relative z-10">
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

      {/* Quick filters — the category and stock filters from the sidebar, as
          one-tap chips. Rendered at every breakpoint, so small screens (where
          the sidebar is hidden) reach the same filters without a drawer. */}
      <motion.div
        className="mb-8 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <FilterChip
          label="همه محصولات"
          isActive={!activeCategory}
          onClick={() => updateUrl({ category: null })}
        />
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            label={category.name}
            isActive={activeCategory === category.id}
            onClick={() => category.id && handleCategoryFilter(category.id)}
          />
        ))}
        <span
          aria-hidden="true"
          className="h-6 w-px flex-shrink-0 bg-voxcina-cream dark:bg-voxcina-blue/40"
        />
        <FilterChip
          label="فقط کالاهای موجود"
          isActive={!!filter.inStockOnly}
          onClick={() => handleInStockFilter(!filter.inStockOnly)}
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <FilterChip
          label="فقط تخفیف‌دار"
          isActive={!!initialFilters.flashSaleOnly}
          onClick={() => handleFlashSaleFilter(!initialFilters.flashSaleOnly)}
          icon={<Sparkles className="h-4 w-4" />}
        />
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
          <div className="sticky top-24">
            <ProductFilterPanel
              categories={categories}
              brands={brands}
              activeCategory={activeCategory}
              activeBrand={activeBrand}
              inStockOnly={!!filter.inStockOnly}
              flashSaleOnly={!!initialFilters.flashSaleOnly}
              onToggleCategory={handleCategoryFilter}
              onToggleBrand={handleBrandFilter}
              onToggleInStock={handleInStockFilter}
              onToggleFlashSale={handleFlashSaleFilter}
              onClear={handleClearFilters}
              hasActiveFilters={!!hasActiveFilters}
            />
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
                  {initialPagination?.totalColorVariants ?? initialProducts.length}
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

      {/* Mobile filter drawer — the same panel the desktop sidebar renders,
          reached through the filters button since the sidebar is hidden on
          small screens. */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="فیلترها"
              className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl dark:bg-voxcina-blue/95"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <header className="flex items-center justify-between border-b border-voxcina-cream/40 px-5 py-4 dark:border-voxcina-blue/40">
                <h2 className="flex items-center gap-2 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                  <SlidersHorizontal className="h-4 w-4" />
                  فیلترها
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  aria-label="بستن فیلترها"
                  className="rounded-lg p-1.5 text-voxcina-blue/70 transition-colors hover:bg-voxcina-cream/40 dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/40"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5">
                <ProductFilterPanel
                  variant="drawer"
                  categories={categories}
                  brands={brands}
                  activeCategory={activeCategory}
                  activeBrand={activeBrand}
                  inStockOnly={!!filter.inStockOnly}
                  flashSaleOnly={!!initialFilters.flashSaleOnly}
                  onToggleCategory={handleCategoryFilter}
                  onToggleBrand={handleBrandFilter}
                  onToggleInStock={handleInStockFilter}
                  onToggleFlashSale={handleFlashSaleFilter}
                  onClear={handleClearFilters}
                  hasActiveFilters={!!hasActiveFilters}
                />
              </div>

              <footer className="border-t border-voxcina-cream/40 px-5 py-4 dark:border-voxcina-blue/40">
                <Button
                  variant="primary"
                  fullWidth
                  className="h-12 rounded-xl"
                  onClick={() => setIsFilterDrawerOpen(false)}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال اعمال...
                    </span>
                  ) : (
                    `نمایش ${(initialPagination?.totalColorVariants ?? initialProducts.length).toLocaleString("fa-IR")} محصول`
                  )}
                </Button>
              </footer>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
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
 * Quick Filter Chip
 *
 * One filter, one tap. Mirrors the category, stock and offer filters the
 * panel offers, so both stay in sync through the same URL parameters.
 */
function FilterChip({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
        isActive
          ? "border-transparent bg-voxcina-blue text-white shadow-sm dark:bg-voxcina-cream dark:text-voxcina-blue"
          : "border-voxcina-cream/60 bg-white/80 text-voxcina-blue hover:border-voxcina-blue/40 hover:bg-voxcina-cream/30 dark:border-voxcina-blue/40 dark:bg-voxcina-blue/10 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/30"
      }`}
    >
      {icon}
      {label}
      {isActive && <Check className="h-3.5 w-3.5" />}
    </motion.button>
  );
}
