"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useTransition } from "react";
import {
  X,
  Filter,
  ArrowUpDown,
  Check,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { SORT_OPTIONS } from "@/lib/constants";
import { ProductFilter } from "@/types/product";
import { Category } from "@/types/category";
import Button from "@/components/ui/Button";

/**
 * Product Filters Client Component
 * 
 * A client component for interactive filter UI that updates URL on filter changes.
 * Used with SSR products page to maintain filter state in URL for SEO.
 * 
 * Requirements: 5.3 - Update URL on filter changes using useRouter
 */

interface ProductFiltersClientProps {
  categories: Category[];
  initialFilters: {
    category?: string;
    brand?: string;
    search?: string;
    sort?: string;
    inStockOnly?: boolean;
  };
  productCount?: number;
}

export default function ProductFiltersClient({
  categories,
  initialFilters,
  productCount,
}: ProductFiltersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    filter.search ||
    (filter.categories && filter.categories.length > 0) ||
    filter.inStockOnly ||
    filter.sort
  );

  return (
    <>
      {/* Filter Controls Bar */}
      <div className="flex items-center gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
        {/* Sort Dropdown */}
        <div className="relative">
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

        {/* Filter Button (Mobile) */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 md:hidden"
          >
            <Filter className="h-4 w-4" />
            فیلترها
          </Button>
        </motion.div>

        {/* Clear Filters Button */}
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

        {/* Loading Indicator */}
        {isPending && (
          <div className="flex items-center text-voxcina-blue/60 dark:text-voxcina-cream/60">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Desktop Sidebar Filters */}
      <DesktopFilters
        categories={categories}
        filter={filter}
        onCategoryFilter={handleCategoryFilter}
        onInStockFilter={handleInStockFilter}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
    </>
  );
}

/**
 * Desktop Sidebar Filters Component
 */
function DesktopFilters({
  categories,
  filter,
  onCategoryFilter,
  onInStockFilter,
  onClearFilters,
  hasActiveFilters,
}: {
  categories: Category[];
  filter: ProductFilter;
  onCategoryFilter: (categoryId: string) => void;
  onInStockFilter: (checked: boolean) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
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
                id="desktop-in-stock-only"
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
                htmlFor="desktop-in-stock-only"
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
                      id={`desktop-category-${category.id || ""}`}
                      className="opacity-0 absolute h-5 w-5 cursor-pointer"
                      checked={(filter.categories || []).includes(category.id || "")}
                      onChange={() => category.id && onCategoryFilter(category.id)}
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
                      htmlFor={`desktop-category-${category.id || ""}`}
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

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
  const hasActiveFilters = Boolean(
    filter.search ||
    (filter.categories && filter.categories.length > 0) ||
    filter.inStockOnly ||
    filter.sort
  );

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

export { DesktopFilters, MobileFilterDrawer };
