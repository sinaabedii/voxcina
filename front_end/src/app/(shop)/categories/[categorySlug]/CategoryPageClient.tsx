"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Package, SlidersHorizontal, ChevronDown } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Category } from "@/types/category";
import { ColorVariantListItem, PaginationInfo } from "@/types/product";
import { SORT_OPTIONS } from "@/lib/constants";
import Link from "next/link";

interface CategoryPageClientProps {
  category: Category;
  products: ColorVariantListItem[];
  pagination: PaginationInfo | null;
  categories: Category[];
  currentPage: number;
  categorySlug: string;
  initialFilters: {
    sort?: string;
    inStockOnly?: boolean;
  };
}

/**
 * Category Page Client Component
 * 
 * Handles interactive elements like sorting and pagination.
 * Receives server-fetched data as props.
 */
export default function CategoryPageClient({
  category,
  products,
  pagination,
  categories,
  currentPage,
  categorySlug,
  initialFilters,
}: CategoryPageClientProps) {
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState(initialFilters.sort || "");
  const [inStockOnly, setInStockOnly] = useState(initialFilters.inStockOnly || false);

  const totalPages = pagination?.totalPages || 1;
  // The grid renders one card per color variant, so the displayed count
  // should reflect variant rows, not distinct products.
  const totalItems = pagination?.totalColorVariants ?? products.length;

  // Get subcategories
  const subcategories = categories.filter(
    (c) => c.parent_id === category.id && c.is_active !== false
  );

  // Build URL with current filters
  const buildUrl = (params: { page?: number; sort?: string; inStockOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    
    const newSort = params.sort !== undefined ? params.sort : sort;
    const newInStock = params.inStockOnly !== undefined ? params.inStockOnly : inStockOnly;
    const newPage = params.page !== undefined ? params.page : currentPage;

    if (newSort) searchParams.set("sort", newSort);
    if (newInStock) searchParams.set("inStockOnly", "true");
    if (newPage > 1) searchParams.set("page", String(newPage));

    const queryString = searchParams.toString();
    return queryString ? `/categories/${categorySlug}?${queryString}` : `/categories/${categorySlug}`;
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setSortOpen(false);
    router.push(buildUrl({ sort: newSort, page: 1 }));
  };

  // Handle stock filter change
  const handleStockFilterChange = () => {
    const newValue = !inStockOnly;
    setInStockOnly(newValue);
    router.push(buildUrl({ inStockOnly: newValue, page: 1 }));
  };

  // Get current sort label
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || "مرتب‌سازی";

  return (
    <div className="container py-8 md:py-12">
      {/* Category Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {category.image && (
          <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-6">
            <Image
              src={category.image}
              alt={category.name}
              fill
              priority
              sizes="100vw"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 right-4 text-white">
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{category.name}</h1>
              {category.description && (
                <p className="text-white/80 text-sm md:text-base max-w-xl">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        )}
        
        {!category.image && (
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {category.description}
              </p>
            )}
          </div>
        )}

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/categories/${sub.slug || sub.id}`}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-voxcina-blue hover:text-white transition-colors"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b">
        <p className="text-sm text-muted-foreground">
          {totalItems} محصول
        </p>

        <div className="flex items-center gap-4">
          {/* Stock Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={handleStockFilterChange}
              className="w-4 h-4 rounded border-gray-300 text-voxcina-blue focus:ring-voxcina-blue"
            />
            <span className="text-sm">فقط موجود</span>
          </label>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {currentSortLabel}
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>

            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                      sort === option.value ? "text-voxcina-blue font-medium" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.productId || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <ProductCard item={product} priority={index === 0} />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={buildUrl({ page: currentPage - 1 })}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  قبلی
                </Link>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Link
                      key={pageNum}
                      href={buildUrl({ page: pageNum })}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-voxcina-blue text-white"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <Link
                  href={buildUrl({ page: currentPage + 1 })}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  بعدی
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">محصولی یافت نشد</h2>
          <p className="text-muted-foreground">
            در حال حاضر محصولی برای این دسته‌بندی موجود نیست
          </p>
        </div>
      )}
    </div>
  );
}
