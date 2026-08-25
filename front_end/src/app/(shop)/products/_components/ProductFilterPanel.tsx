"use client";

import { Check, PackageCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { Brand } from "@/types/brand";
import { Category } from "@/types/category";
import Button from "@/components/ui/Button";

/**
 * The full set of product filters, shared by the desktop sidebar and the
 * mobile drawer so both offer exactly the same options.
 *
 * Every option here maps to a filter the products API already supports:
 * category_ids, brand, in_stock and is_flash_sale.
 */

interface ProductFilterPanelProps {
  categories: Category[];
  brands: Brand[];
  activeCategory?: string;
  activeBrand?: string;
  inStockOnly: boolean;
  flashSaleOnly: boolean;
  onToggleCategory: (categoryId: string) => void;
  onToggleBrand: (brandName: string) => void;
  onToggleInStock: (checked: boolean) => void;
  onToggleFlashSale: (checked: boolean) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Drawer variant drops the card chrome the sticky sidebar needs. */
  variant?: "sidebar" | "drawer";
}

interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  icon?: React.ReactNode;
}

function FilterCheckbox({ id, label, checked, onChange, hint, icon }: FilterCheckboxProps) {
  return (
    <div className="group flex items-center justify-between gap-2">
      <div className="relative flex min-w-0 items-center">
        <input
          type="checkbox"
          id={id}
          className="absolute h-5 w-5 cursor-pointer opacity-0"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-voxcina-cream/50 transition-colors dark:border-voxcina-blue/40 ${
            checked
              ? "bg-voxcina-blue dark:bg-voxcina-cream"
              : "bg-transparent group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30"
          }`}
        >
          {checked && <Check className="h-3 w-3 text-white dark:text-voxcina-blue" />}
        </div>
        <label
          htmlFor={id}
          className="ml-2 flex min-w-0 cursor-pointer items-center gap-1.5 truncate text-sm text-voxcina-blue dark:text-voxcina-cream"
        >
          {icon}
          {label}
        </label>
      </div>
      {hint && (
        <span className="flex-shrink-0 text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
          {hint}
        </span>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  children,
  variant,
}: {
  title?: string;
  children: React.ReactNode;
  variant: "sidebar" | "drawer";
}) {
  const body = (
    <>
      {title && (
        <h3 className="mb-4 font-semibold text-voxcina-blue dark:text-voxcina-cream">{title}</h3>
      )}
      {children}
    </>
  );

  if (variant === "drawer") {
    return (
      <div className="border-b border-voxcina-cream/40 py-5 last:border-b-0 dark:border-voxcina-blue/30">
        {body}
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-xl border border-voxcina-cream/30 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
    >
      {body}
    </motion.div>
  );
}

export default function ProductFilterPanel({
  categories,
  brands,
  activeCategory,
  activeBrand,
  inStockOnly,
  flashSaleOnly,
  onToggleCategory,
  onToggleBrand,
  onToggleInStock,
  onToggleFlashSale,
  onClear,
  hasActiveFilters,
  variant = "sidebar",
}: ProductFilterPanelProps) {
  const wrapperClass = variant === "drawer" ? "" : "space-y-6";

  return (
    <div className={wrapperClass}>
      <FilterGroup title="وضعیت کالا" variant={variant}>
        <div className="space-y-3">
          <FilterCheckbox
            id="filter-in-stock"
            label="فقط کالاهای موجود"
            checked={inStockOnly}
            onChange={onToggleInStock}
            icon={<PackageCheck className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
          />
          <FilterCheckbox
            id="filter-flash-sale"
            label="فقط تخفیف‌دار"
            checked={flashSaleOnly}
            onChange={onToggleFlashSale}
            icon={<Sparkles className="h-4 w-4 text-amber-500" />}
          />
        </div>
      </FilterGroup>

      <FilterGroup title="دسته‌بندی‌ها" variant={variant}>
        {categories.length > 0 ? (
          <div className="max-h-64 space-y-3 overflow-y-auto pl-1">
            {categories.map((category) => (
              <FilterCheckbox
                key={category.id}
                id={`filter-category-${category.id || ""}`}
                label={category.name}
                checked={activeCategory === category.id}
                onChange={() => category.id && onToggleCategory(category.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-voxcina-blue/60 dark:text-voxcina-cream/60">
            دسته‌بندی‌ای یافت نشد
          </p>
        )}
      </FilterGroup>

      <FilterGroup title="برندها" variant={variant}>
        {brands.length > 0 ? (
          <div className="max-h-64 space-y-3 overflow-y-auto pl-1">
            {brands.map((brand) => (
              <FilterCheckbox
                key={brand.id || brand.name}
                id={`filter-brand-${brand.id || brand.name}`}
                label={brand.name}
                checked={activeBrand === brand.name}
                onChange={() => onToggleBrand(brand.name)}
                hint={
                  brand.productsCount
                    ? brand.productsCount.toLocaleString("fa-IR")
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-voxcina-blue/60 dark:text-voxcina-cream/60">
            برندی یافت نشد
          </p>
        )}
      </FilterGroup>

      {hasActiveFilters && (
        <div className={variant === "drawer" ? "pt-5" : ""}>
          <Button
            variant="outline"
            fullWidth
            className="h-12 rounded-xl border-voxcina-blue/20 text-voxcina-blue transition-all duration-300 hover:bg-voxcina-cream/30 dark:border-voxcina-blue/30 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/30"
            onClick={onClear}
          >
            پاک کردن فیلترها
          </Button>
        </div>
      )}
    </div>
  );
}
