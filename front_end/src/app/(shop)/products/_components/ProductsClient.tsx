"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

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
    fetchCategories
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
  }, [searchParams, setFilter, fetchProducts, products.length, fetchCategories]);

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

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full">
          <SmartSearch
            placeholder="جستجوی محصولات..."
            className="w-full"
            onClose={() => {
              setSearchTerm("");
              setFilter({ search: "" });
            }}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 w-44 appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="h-4 w-4"
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
          
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            فیلترها
          </Button>
          
          {(filter.search || filter.categories?.length || filter.inStockOnly || filter.sort) && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              حذف فیلترها
            </Button>
          )}
        </div>
      </div>

      {categoriesError && (
        <div className="mb-8 p-4 border border-destructive/30 bg-destructive/10 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-destructive">خطا در بارگذاری دسته‌بندی‌ها</p>
            <Button variant="outline" size="sm" onClick={() => fetchCategories()}>تلاش مجدد</Button>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="in-stock-only"
                  className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                  checked={!!filter.inStockOnly}
                  onChange={(e) => handleInStockFilter(e.target.checked)}
                />
                <label htmlFor="in-stock-only" className="text-sm cursor-pointer">
                  فقط کالاهای موجود
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">دسته‌بندی‌ها</h3>
              
              {isLoadingCategories ? (
                <div className="p-3 text-sm text-gray-500">در حال بارگذاری...</div>
              ) : categoriesError ? (
                <div className="p-3 text-sm text-destructive">
                  <p>خطا در بارگذاری دسته‌بندی‌ها</p>
                  <button 
                    onClick={() => fetchCategories()} 
                    className="text-primary hover:underline mt-2"
                  >
                    تلاش مجدد
                  </button>
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center group">
                      <input
                        type="checkbox"
                        id={`category-${category.id || ''}`}
                        className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                        checked={(filter.categories || []).includes(category.id || '')}
                        onChange={() => category.id && handleCategoryFilter(category.id)}
                      />
                      <label
                        htmlFor={`category-${category.id || ''}`}
                        className="text-sm cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500">دسته‌بندی‌ای یافت نشد</div>
              )}
            </div>

            {Object.keys(filter).length > 0 && (
              <Button
                variant="outline"
                fullWidth
                className="h-12 rounded-xl"
                onClick={handleClearFilters}
              >
                پاک کردن فیلترها
              </Button>
            )}
          </div>
        </div>

        <div className="flex-grow">
          {isLoadingProducts ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                </div>
                <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium mb-4">
                  متأسفانه هیچ محصولی یافت نشد
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => fetchProducts()}>بارگذاری مجدد</Button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium mb-4">
                  متأسفانه محصولی با این مشخصات یافت نشد
                </p>
                {Object.keys(filter).length > 0 && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    پاک کردن فیلترها
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-muted-foreground">
                {filteredProducts.length} محصول یافت شد
              </p>
              <ProductGrid products={filteredProducts} columns={3} />
            </>
          )}
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
                {isLoadingCategories ? (
                  <div className="p-3 text-sm text-gray-500">در حال بارگذاری...</div>
                ) : categoriesError ? (
                  <div className="p-3 text-sm text-destructive">
                    <p>خطا در بارگذاری دسته‌بندی‌ها</p>
                    <button 
                      onClick={() => fetchCategories()} 
                      className="text-primary hover:underline mt-2"
                    >
                      تلاش مجدد
                    </button>
                  </div>
                ) : categories && categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`mobile-category-${category.id || ''}`}
                          className="ml-2 w-4 h-4 accent-indigo-600 cursor-pointer"
                          checked={(filter.categories || []).includes(category.id || '')}
                          onChange={() => category.id && handleCategoryFilter(category.id)}
                        />
                        <label
                          htmlFor={`mobile-category-${category.id || ''}`}
                          className="text-sm cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-500">دسته‌بندی‌ای یافت نشد</div>
                )}
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
                    پاک کردن فیلترها
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
