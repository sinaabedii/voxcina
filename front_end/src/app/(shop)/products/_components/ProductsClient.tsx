"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SlidersHorizontal,
  X,
  Filter,
  ArrowUpDown,
  Package,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { SORT_OPTIONS } from "@/lib/constants";
import { ProductFilter } from "@/types/product";

import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import SmartSearch from "@/components/ui/SmartSearch";

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    products,
    filter,
    setFilter,
    clearFilters,
    getFilteredProducts,
    isLoading: isLoadingProducts,
    fetchProducts,
  } = useProductStore();

  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    fetchCategories,
  } = useCategoryStore();

  useEffect(() => {
    const initFilters: Partial<ProductFilter> = {};

    const sort = searchParams.get("sort");
    if (sort) initFilters.sort = sort as any;

    const search = searchParams.get("search");
    if (search) {
      initFilters.search = search;
      setSearchTerm(search);
    }

    const categoryId = searchParams.get("category");
    if (categoryId) initFilters.categories = [categoryId];

    const inStockOnly = searchParams.get("inStockOnly") === "true";
    if (inStockOnly) initFilters.inStockOnly = true;

    setFilter(initFilters);

    if (products.length === 0) {
      fetchProducts();
    }

    // Fetch categories if needed
    fetchCategories();
  }, [
    searchParams,
    setFilter,
    fetchProducts,
    products.length,
    fetchCategories,
  ]);

  const filteredProducts = getFilteredProducts();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ sort: e.target.value as any });
  };

  const handleCategoryFilter = (categoryId: string) => {
    const currentCategories = filter.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id) => id !== categoryId)
      : [...currentCategories, categoryId];

    setFilter({ categories: newCategories });
  };

  const handleInStockFilter = (checked: boolean) => {
    setFilter({ inStockOnly: checked });
  };

  const handleClearFilters = () => {
    clearFilters();
    setSearchTerm("");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
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

      <motion.div
        className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full">
          <SmartSearch
            placeholder="جستجوی محصولات..."
            className="w-full"
            isOpen={false}
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setFilter({ search: value });
            }}
            onClose={() => {
              setSearchTerm("");
              setFilter({ search: "" });
            }}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
          <div className="relative">
            <select
              className="h-10 rounded-xl border border-voxcina-cream/50 dark:border-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 px-4 py-2 w-32 md:w-44 appearance-none focus:outline-none focus:ring-2 focus:ring-voxcina-blue/50 dark:focus:ring-voxcina-cream/50 text-voxcina-blue dark:text-voxcina-cream text-sm shadow-sm"
              value={filter.sort || ""}
              onChange={handleSortChange}
            >
              <option value="" disabled>
                مرتب‌سازی
              </option>
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

          {(filter.search ||
            filter.categories?.length ||
            filter.inStockOnly ||
            filter.sort) && (
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
      {categoriesError && (
        <motion.div
          className="mb-8 p-4 border border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl shadow-sm backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center">
            <p className="text-red-600 dark:text-red-400 flex items-center">
              <X className="h-4 w-4 mr-2" />
              خطا در بارگذاری دسته‌بندی‌ها
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCategories()}
                className="rounded-xl border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/20"
              >
                تلاش مجدد
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-6 md:gap-8">
        <motion.div
          className="hidden md:block w-64 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="sticky top-24 space-y-6">
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

            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm p-5 backdrop-blur-sm"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-semibold text-lg mb-5 text-voxcina-blue dark:text-voxcina-cream">
                دسته‌بندی‌ها
              </h3>

              {isLoadingCategories ? (
                <div className="p-3 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  در حال بارگذاری...
                </div>
              ) : categoriesError ? (
                <div className="p-3 text-sm text-red-600 dark:text-red-400">
                  <p>خطا در بارگذاری دسته‌بندی‌ها</p>
                  <button
                    onClick={() => fetchCategories()}
                    className="text-voxcina-blue dark:text-voxcina-cream hover:underline mt-2 flex items-center"
                  >
                    <RefreshCw className="h-3 w-3 ml-1" />
                    تلاش مجدد
                  </button>
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${category.id || ""}`}
                          className="opacity-0 absolute h-5 w-5 cursor-pointer"
                          checked={(filter.categories || []).includes(
                            category.id || ""
                          )}
                          onChange={() =>
                            category.id && handleCategoryFilter(category.id)
                          }
                        />
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 transition-colors ${
                            (filter.categories || []).includes(
                              category.id || ""
                            )
                              ? "bg-voxcina-blue dark:bg-voxcina-cream"
                              : "bg-transparent group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30"
                          }`}
                        >
                          {(filter.categories || []).includes(
                            category.id || ""
                          ) && (
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

            {Object.keys(filter).length > 0 && (
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
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
        <motion.div
          className="flex-grow"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {isLoadingProducts ? (
            <motion.div
              className="h-64 flex items-center justify-center"
              variants={itemVariants}
            >
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                  در حال بارگذاری محصولات...
                </p>
              </div>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm py-16 px-6 backdrop-blur-sm"
              variants={itemVariants}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/30 flex items-center justify-center mb-4 shadow-sm">
                  <Package className="h-8 w-8 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                </div>
                <p className="text-lg font-medium mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  متأسفانه هیچ محصولی یافت نشد
                </p>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 max-w-md">
                  در حال حاضر محصولی برای نمایش وجود ندارد. لطفاً بعداً مراجعه
                  کنید.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => fetchProducts()}
                    className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                  >
                    بارگذاری مجدد
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm py-16 px-6 backdrop-blur-sm"
              variants={itemVariants}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 shadow-sm border border-amber-100 dark:border-amber-800/30">
                  <Filter className="h-8 w-8 text-amber-500 dark:text-amber-400" />
                </div>
                <p className="text-lg font-medium mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  متأسفانه محصولی با این مشخصات یافت نشد
                </p>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 max-w-md">
                  لطفاً فیلترهای خود را تغییر دهید یا با کلیک روی دکمه زیر، همه
                  فیلترها را پاک کنید.
                </p>
                {Object.keys(filter).length > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
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
                  {filteredProducts.length}
                </span>
                محصول یافت شد
              </motion.p>
              <motion.div variants={itemVariants}>
                <ProductGrid products={filteredProducts} columns={3} />
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-voxcina-blue/30 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white/95 dark:bg-voxcina-blue/95 shadow-xl p-6 overflow-y-auto z-50 md:hidden backdrop-blur-sm border-l border-voxcina-cream/30 dark:border-voxcina-blue/50"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                  فیلترها
                </h2>
                <motion.button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-8 h-8 rounded-full bg-voxcina-cream/30 dark:bg-voxcina-blue/30 flex items-center justify-center text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/50 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="mobile-in-stock-only"
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
                        htmlFor="mobile-in-stock-only"
                        className="ml-2 text-sm cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                      >
                        فقط کالاهای موجود
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4 text-voxcina-blue dark:text-voxcina-cream">
                    دسته‌بندی‌ها
                  </h3>
                  {isLoadingCategories ? (
                    <div className="p-3 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال بارگذاری...
                    </div>
                  ) : categoriesError ? (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400">
                      <p>خطا در بارگذاری دسته‌بندی‌ها</p>
                      <button
                        onClick={() => fetchCategories()}
                        className="text-voxcina-blue dark:text-voxcina-cream hover:underline mt-2 flex items-center"
                      >
                        <RefreshCw className="h-3 w-3 ml-1" />
                        تلاش مجدد
                      </button>
                    </div>
                  ) : categories && categories.length > 0 ? (
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              id={`mobile-category-${category.id || ""}`}
                              className="opacity-0 absolute h-5 w-5 cursor-pointer"
                              checked={(filter.categories || []).includes(
                                category.id || ""
                              )}
                              onChange={() =>
                                category.id && handleCategoryFilter(category.id)
                              }
                            />
                            <div
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 dark:border-voxcina-blue/40 transition-colors ${
                                (filter.categories || []).includes(
                                  category.id || ""
                                )
                                  ? "bg-voxcina-blue dark:bg-voxcina-cream"
                                  : "bg-transparent"
                              }`}
                            >
                              {(filter.categories || []).includes(
                                category.id || ""
                              ) && (
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

                <div className="mt-8 space-y-4 sticky bottom-0 bg-white/90 dark:bg-voxcina-blue/90 pt-4 backdrop-blur-sm">
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="primary"
                      fullWidth
                      className="h-12 rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      اعمال فیلترها
                    </Button>
                  </motion.div>

                  {Object.keys(filter).length > 0 && (
                    <motion.div
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                    >
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
