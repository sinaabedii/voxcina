"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useProductStore } from "@/store/product-store";
import { ProductFilter as ProductFilterType } from "@/types/product";
import Button from "@/components/ui/Button";
import { SORT_OPTIONS } from "@/lib/constants";

interface ProductFilterProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  onClose,
  isMobile = false,
}) => {
  // Updated: Remove categories from store destructuring, derive from products
  const { filter, setFilter, clearFilters, products } = useProductStore();

  const [localFilter, setLocalFilter] =
    useState<Partial<ProductFilterType>>(filter);

  // Derive unique categories from products
  const categories = Array.from(
    new Set(products.map((product) => product.category))
  )
    .map((category, index) => ({
      id: `${index + 1}`, // Generate a simple ID if needed
      name: category,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  const brands = Array.from(
    new Set(products.map((product) => product.brand))
  ).sort();

  const allColors = products.flatMap((product) => product.colors || []);
  const uniqueColors = Array.from(
    new Map(allColors.map((color) => [color.code, color])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const allSizes = products.flatMap((product) => product.sizes || []);
  const uniqueSizes = Array.from(new Set(allSizes)).sort();

  const prices = products.map((product) => product.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const priceRanges = [
    { min: minPrice, max: minPrice + (maxPrice - minPrice) * 0.25 },
    {
      min: minPrice + (maxPrice - minPrice) * 0.25,
      max: minPrice + (maxPrice - minPrice) * 0.5,
    },
    {
      min: minPrice + (maxPrice - minPrice) * 0.5,
      max: minPrice + (maxPrice - minPrice) * 0.75,
    },
    { min: minPrice + (maxPrice - minPrice) * 0.75, max: maxPrice },
  ];

  const formatPriceRange = (range: { min: number; max: number }) => {
    const formatNumber = (num: number) => {
      return Math.floor(num / 10).toLocaleString("fa-IR");
    };
    return `${formatNumber(range.min)} - ${formatNumber(range.max)} تومان`;
  };

  const handleCategoryChange = (categoryId: string) => {
    const currentCategories = localFilter.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id) => id !== categoryId)
      : [...currentCategories, categoryId];

    setLocalFilter({ ...localFilter, categories: newCategories });
  };
  
  const handleBrandChange = (brand: string) => {
    const currentBrands = localFilter.brands || [];
    const newBrands = currentBrands.includes(brand)
      ? currentBrands.filter((b) => b !== brand)
      : [...currentBrands, brand];

    setLocalFilter({ ...localFilter, brands: newBrands });
  };

  const handleColorChange = (colorCode: string) => {
    const currentColors = localFilter.colors || [];
    const newColors = currentColors.includes(colorCode)
      ? currentColors.filter((c) => c !== colorCode)
      : [...currentColors, colorCode];

    setLocalFilter({ ...localFilter, colors: newColors });
  };

  const handleSizeChange = (size: string) => {
    const currentSizes = localFilter.sizes || [];
    const newSizes = currentSizes.includes(size)
      ? currentSizes.filter((s) => s !== size)
      : [...currentSizes, size];

    setLocalFilter({ ...localFilter, sizes: newSizes });
  };

  const handlePriceRangeChange = (range: { min: number; max: number }) => {
    setLocalFilter({ ...localFilter, priceRange: range });
  };

  const handleSortChange = (sortValue: string) => {
    setLocalFilter({ ...localFilter, sort: sortValue as any });
  };

  const applyFilters = () => {
    setFilter(localFilter);
    if (onClose && isMobile) {
      onClose();
    }
  };

  const resetFilters = () => {
    clearFilters();
    setLocalFilter({});
  };

  return (
    <div
      className={`bg-card rounded-lg border shadow-sm ${isMobile ? "p-4" : ""}`}
    >
      {isMobile && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">فیلترها</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="بستن"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">مرتب‌سازی</h3>
          <select
            value={localFilter.sort || ""}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">پیش‌فرض</option>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">دسته‌بندی</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  checked={(localFilter.categories || []).includes(category.id)}
                  onChange={() => handleCategoryChange(category.id)}
                  className="ml-2 h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={`category-${category.id}`} className="text-sm">
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">محدوده قیمت</h3>
          <div className="space-y-1">
            {priceRanges.map((range, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`price-${index}`}
                  name="price-range"
                  checked={
                    localFilter.priceRange?.min === range.min &&
                    localFilter.priceRange?.max === range.max
                  }
                  onChange={() => handlePriceRangeChange(range)}
                  className="ml-2 h-4 w-4 rounded-full border-gray-300"
                />
                <label htmlFor={`price-${index}`} className="text-sm">
                  {formatPriceRange(range)}
                </label>
              </div>
            ))}
          </div>
        </div>

        {brands.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">برند</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {brands.map((brand) => (
                <div key={brand} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`brand-${brand}`}
                    checked={(localFilter.brands || []).includes(brand)}
                    onChange={() => handleBrandChange(brand)}
                    className="ml-2 h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`brand-${brand}`} className="text-sm">
                    {brand}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        {uniqueColors.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">رنگ</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map((color) => (
                <button
                  key={color.code}
                  className={`w-6 h-6 rounded-full border ${
                    (localFilter.colors || []).includes(color.code)
                      ? "border-primary ring-2 ring-primary ring-opacity-30"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color.code }}
                  onClick={() => handleColorChange(color.code)}
                  title={color.name}
                  aria-label={`رنگ ${color.name}`}
                />
              ))}
            </div>
          </div>
        )}

        {uniqueSizes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => (
                <button
                  key={size}
                  className={`px-2 py-1 text-xs rounded-md border ${
                    (localFilter.sizes || []).includes(size)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-300 bg-background text-foreground"
                  }`}
                  onClick={() => handleSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-2 pt-4 border-t">
          <Button variant="primary" onClick={applyFilters}>
            اعمال فیلترها
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            پاک کردن فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilter;
