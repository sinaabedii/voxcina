"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useProductStore } from "@/store/product-store";
import { SORT_OPTIONS } from "@/lib/constants";
import { ProductFilter } from "@/types/product";
import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import SmartSearch from "@/components/ui/SmartSearch";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    products,
    categories,
    filter,
    setFilter,
    clearFilters,
    getFilteredProducts,
    isLoading,
    fetchProducts,
  } = useProductStore();

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
  }, [searchParams, setFilter, fetchProducts, products.length]);

  const filteredProducts = getFilteredProducts();

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFilter({ search: searchTerm });
  };

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

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-fuchsia-900 via-purple-800 to-indigo-900 bg-clip-text text-transparent">
          محصولات
        </h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-grow">
            <SmartSearch
              placeholder="جستجوی محصولات..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 h-12"
            />
          </form>

          <div className="flex-shrink-0 relative">
            <select
              className="h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 w-full sm:w-44 appearance-none shadow-sm hover:shadow-md transition-shadow duration-300"
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
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <button
            className="flex items-center justify-center h-12 px-5 border rounded-xl md:hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 border-transparent"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal className="h-5 w-5 ml-2" />
            فیلترها
            {Object.keys(filter).length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 text-black text-xs flex items-center justify-center">
                {Object.keys(filter).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 sticky top-20 shadow-sm border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                فیلترها
              </h2>
              {Object.keys(filter).length > 0 && (
                <button
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  onClick={handleClearFilters}
                >
                  پاک کردن
                </button>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="in-stock-only"
                  className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                  checked={!!filter.inStockOnly}
                  onChange={(e) => handleInStockFilter(e.target.checked)}
                />
                <label
                  htmlFor="in-stock-only"
                  className="text-sm cursor-pointer"
                >
                  فقط کالاهای موجود
                </label>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4">دسته‌بندی‌ها</h3>
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center group">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                      checked={(filter.categories || []).includes(category.id)}
                      onChange={() => handleCategoryFilter(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm cursor-pointer group-hover:text-primary transition-colors duration-200"
                    >
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden">
            <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white dark:bg-gray-800 shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">فیلترها</h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="mobile-in-stock-only"
                      className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                      checked={!!filter.inStockOnly}
                      onChange={(e) => handleInStockFilter(e.target.checked)}
                    />
                    <label
                      htmlFor="mobile-in-stock-only"
                      className="text-sm cursor-pointer"
                    >
                      فقط کالاهای موجود
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-4">دسته‌بندی‌ها</h3>
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`mobile-category-${category.id}`}
                          className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                          checked={(filter.categories || []).includes(
                            category.id
                          )}
                          onChange={() => handleCategoryFilter(category.id)}
                        />
                        <label
                          htmlFor={`mobile-category-${category.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4 sticky bottom-0 bg-white dark:bg-gray-800 pt-4">
                <Button
                  variant="primary"
                  fullWidth
                  className="h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={() => setIsFilterOpen(false)}
                >
                  اعمال فیلترها
                </Button>

                {Object.keys(filter).length > 0 && (
                  <Button
                    variant="outline"
                    fullWidth
                    className="h-12 rounded-xl"
                    onClick={handleClearFilters}
                  >
                    پاک کردن همه
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-grow">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center p-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400 mb-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xl font-bold mb-4">
                  متأسفانه محصولی با این مشخصات یافت نشد
                </p>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  لطفاً معیارهای جستجوی خود را تغییر دهید
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="px-6 h-12 rounded-xl"
                >
                  پاک کردن فیلترها
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {filteredProducts.length}
                    </span>{" "}
                    محصول یافت شد
                  </p>
                  {Object.keys(filter).length > 0 && (
                    <button
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center"
                      onClick={handleClearFilters}
                    >
                      <X className="h-4 w-4 ml-1" />
                      پاک کردن فیلترها
                    </button>
                  )}
                </div>
              </div>

              <ProductGrid products={filteredProducts} columns={3} />

              <div className="mt-12 flex justify-center">
                <nav className="flex items-center space-x-2 space-x-reverse">
                  <button className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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

                  {[1, 2, 3, 4, 5].map((page) => (
                    <button
                      key={page}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        page === 1
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                          : "border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
