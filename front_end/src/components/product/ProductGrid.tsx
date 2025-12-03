import { ColorVariantListItem } from "@/types/product";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  items: ColorVariantListItem[]; // Changed from products: Product[]
  columns?: 2 | 3 | 4 | 5;
  glassEffect?: boolean;
}

/**
 * گرید محصولات بهینه‌سازی شده برای سئو
 * Now displays ColorVariantListItem (each color as a separate card)
 */
export default function ProductGrid({
  items,
  columns = 4,
  glassEffect = false,
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
          key={`${item.productId}-${item.colorVariant.color}`}
          item={item}
          glassEffect={glassEffect}
        />
      ))}
    </div>
  );
}