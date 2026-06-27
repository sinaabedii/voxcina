"use client";

import React, { useEffect, useState } from "react";
import { X, Filter, Check } from "lucide-react";
import { useProductStore } from "@/store/product-store";
import { ProductFilter as ProductFilterType } from "@/types/product";
import Button from "@/components/ui/Button";
import { SORT_OPTIONS } from "@/lib/constants";
import { motion } from "framer-motion";
import { useCategoryStore } from "@/store/category-store"; // path may differ
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductFilterProps {
  onClose?: () => void;
  isMobile?: boolean;
}

// Define a color interface based on the structure used in the component
interface ColorOption {
  code: string;
  name: string;
  swatchImage?: string;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  onClose,
  isMobile = false,
}) => {
  const { filter, setFilter, clearFilters, products } = useProductStore();

  const [localFilter, setLocalFilter] =
    useState<Partial<ProductFilterType>>(filter);

  // Derive unique categories from products
  const { getCategoryName } = useCategoryStore();

  const categories = Array.from(
    new Set(products.flatMap((p) => p.category_ids ?? []))
  ).map((id) => ({
    id,                           // keep the real id
    name: getCategoryName(id),    // human-readable label
  }));

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  // Extract and filter out undefined brand values
  const brands = Array.from(
    new Set(products.map((product) => product.brand).filter(Boolean))
  ).sort() as string[];

  // Extract all unique colors from product color variants
  const allColors = products.map((product) => ({
    code: getCanonicalColor(product.colorVariant) || product.colorVariant.colorName,
    name: product.colorVariant.colorName || getCanonicalColor(product.colorVariant) || "",
    swatchImage: product.colorVariant.swatchImage,
  }));
  
  // Create unique color objects
  const uniqueColorCodes = Array.from(new Set(allColors.map(c => c.code)));
  const uniqueColors: ColorOption[] = uniqueColorCodes.map(colorCode => {
    const found = allColors.find(c => c.code === colorCode);
    return {
      code: colorCode,
      name: found?.name || colorCode,
      swatchImage: found?.swatchImage,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Extract all unique sizes from product color variants
  const allSizes = products.flatMap((product) => 
    product.colorVariant.sizes.map(s => s.size)
  );
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
      className={`voxcina-card bg-card rounded-xl ${isMobile ? "p-5" : "p-4"} animate-fadeIn`}
    >
      {isMobile && (
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-border/10">
          <h2 className="text-lg font-bold text-primary flex items-center">
            <Filter className="h-5 w-5 ml-2" />
            فیلترها
          </h2>
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200"
              aria-label="بستن"
            >
              <X className="h-5 w-5" />
            </motion.button>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">مرتب‌سازی</h3>
          <select
            value={localFilter.sort || ""}
            onChange={(e) => handleSortChange(e.target.value)}
            className="voxcina-input w-full rounded-lg border border-border/20 bg-background px-3 py-2 text-sm hover:border-primary/30 focus:border-primary/50 transition-all duration-200 shadow-soft"
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
          <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">دسته‌بندی</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide custom-scrollbar pr-1">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center">
                <div className="relative ml-2">
                  <input
                    type="checkbox"
                    id={`category-${category.id}`}
                    checked={(localFilter.categories || []).includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="peer h-4 w-4 rounded border-border/30 text-primary focus:ring-primary/30 transition-all duration-200"
                  />
                  <div className="absolute inset-0 pointer-events-none opacity-0 peer-checked:opacity-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
                <label 
                  htmlFor={`category-${category.id}`} 
                  className="text-sm text-foreground hover:text-primary cursor-pointer transition-colors duration-200"
                >
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">محدوده قیمت</h3>
          <div className="space-y-2">
            {priceRanges.map((range, index) => (
              <div key={index} className="flex items-center group">
                <div className="relative ml-2">
                  <input
                    type="radio"
                    id={`price-${index}`}
                    name="price-range"
                    checked={
                      localFilter.priceRange?.min === range.min &&
                      localFilter.priceRange?.max === range.max
                    }
                    onChange={() => handlePriceRangeChange(range)}
                    className="h-4 w-4 rounded-full border-border/30 text-primary focus:ring-primary/30 transition-all duration-200"
                  />
                </div>
                <label 
                  htmlFor={`price-${index}`} 
                  className="text-sm text-foreground group-hover:text-primary cursor-pointer transition-colors duration-200"
                >
                  {formatPriceRange(range)}
                </label>
              </div>
            ))}
          </div>
        </div>

        {brands.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">برند</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide custom-scrollbar pr-1">
              {brands.map((brand) => (
                <div key={brand} className="flex items-center">
                  <div className="relative ml-2">
                    <input
                      type="checkbox"
                      id={`brand-${brand}`}
                      checked={(localFilter.brands || []).includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                      className="peer h-4 w-4 rounded border-border/30 text-primary focus:ring-primary/30 transition-all duration-200"
                    />
                    <div className="absolute inset-0 pointer-events-none opacity-0 peer-checked:opacity-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <label 
                    htmlFor={`brand-${brand}`} 
                    className="text-sm text-foreground hover:text-primary cursor-pointer transition-colors duration-200"
                  >
                    {brand}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        {uniqueColors.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">رنگ</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map((color) => (
                <motion.button
                  key={color.code}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
	                  className={`w-6 h-6 rounded-full border shadow-soft transition-all duration-200 ${
	                    (localFilter.colors || []).includes(color.code)
	                      ? "border-primary ring-2 ring-primary/30"
	                      : "border-border/30 hover:border-primary/30"
	                  }`}
	                  style={!color.swatchImage && color.code.startsWith("#") ? { backgroundColor: color.code } : undefined}
	                  onClick={() => handleColorChange(color.code)}
	                  title={color.name}
	                  aria-label={`رنگ ${color.name}`}
	                >
	                  {color.swatchImage ? (
	                    <img src={color.swatchImage} alt="" className="w-full h-full rounded-full object-cover" />
	                  ) : null}
	                </motion.button>
	              ))}
            </div>
          </div>
        )}

        {uniqueSizes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-primary border-r-2 border-primary/20 pr-2">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => (
                <motion.button
                  key={size}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-2 py-1 text-xs rounded-md border shadow-soft transition-all duration-200 ${
                    (localFilter.sizes || []).includes(size)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/20 bg-background text-foreground hover:border-primary/30"
                  }`}
                  onClick={() => handleSizeChange(size)}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-2 pt-4 border-t border-border/10">
          <Button 
            variant="primary" 
            onClick={applyFilters}
            className="flex items-center justify-center"
          >
            <Check className="ml-1 h-4 w-4" />
            اعمال فیلترها
          </Button>
          <Button 
            variant="outline" 
            onClick={resetFilters}
            className="hover:bg-secondary transition-colors duration-200"
          >
            پاک کردن فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilter;
