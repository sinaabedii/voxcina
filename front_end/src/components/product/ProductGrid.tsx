import { useCallback } from "react";
import { Product } from "@/types/product";
import ProductGridItem from "./ProductGridItem";
import { useCartStore } from "@/store/cart-store";
import { useDashboardStore } from "@/store/dashboard-store";

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
  glassEffect?: boolean;
}

/**
 * گرید محصولات بهینه‌سازی شده برای سئو
 */
export default function ProductGrid({
  products,
  columns = 4,
  glassEffect = false,
}: ProductGridProps) {
  const { addItem } = useCartStore();
  const { addToFavorites, isFavorite } = useDashboardStore();

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem(product, 1);
      // نمایش پیام موفقیت‌آمیز بودن عملیات
      const notification = document.createElement("div");
      notification.className =
        "fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeOut";
      notification.textContent = "محصول به سبد خرید اضافه شد";
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    },
    [addItem]
  );

  const handleAddToFavorites = useCallback(
    (productId: string) => {
      addToFavorites(productId);
    },
    [addToFavorites]
  );

  // تنظیم تعداد ستون‌ها
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
      {products.map((product, index) => (
        <ProductGridItem
          key={product.id}
          product={product}
          index={index}
          glassEffect={glassEffect}
          onAddToCart={handleAddToCart}
          onAddToFavorites={handleAddToFavorites}
          isFavorite={product.id ? isFavorite(product.id) : false}
        />
      ))}
    </div>
  );
}