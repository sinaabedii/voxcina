import { ColorVariantListItem } from "@/types/product";
import ProductCard from "./ProductCard";
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductGridProps {
  items: ColorVariantListItem[]; // Changed from products: Product[]
  columns?: 2 | 3 | 4 | 5;
  glassEffect?: boolean;
  /** True when this grid's first card is the page LCP (e.g. catalog top of fold). */
  priorityFirst?: boolean;
}

/**
 * گرید محصولات بهینه‌سازی شده برای سئو
 * Now displays ColorVariantListItem (each color as a separate card)
 */
export default function ProductGrid({
  items,
  columns = 4,
  glassEffect = false,
  priorityFirst = false,
}: ProductGridProps) {
  // تنظیم تعداد ستون‌ها
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
      {items.map((item, index) => (
        <ProductCard
          key={`${item.productId}-${item.colorVariant.variantId || getCanonicalColor(item.colorVariant) || item.colorVariant.colorName}`}
          item={item}
          glassEffect={glassEffect}
          priority={priorityFirst && index === 0}
        />
      ))}
    </div>
  );
}
