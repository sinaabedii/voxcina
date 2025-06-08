import { useCallback, useState, useEffect } from "react";
import { Product } from "@/types/product";
import ProductGridItem from "./ProductGridItem";
import { useCartStore } from "@/store/cart-store";
import { useDashboardStore } from "@/store/dashboard-store";

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
  glassEffect?: boolean;
  onAddToCart?: (product: Product) => void;
  ribbonLabel?: string;
}

/**
 * گرید محصولات بهینه‌سازی شده برای سئو
 */
export default function ProductGrid({
  products,
  columns = 4,
  glassEffect = false,
  onAddToCart,
  ribbonLabel,
}: ProductGridProps) {
  const { addItem } = useCartStore();
  const { addToFavorites, isFavorite } = useDashboardStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // شبیه‌سازی زمان بارگذاری
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // بعد از 2 ثانیه لودینگ را مخفی کن

    return () => clearTimeout(timer);
  }, []);

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

      // اگر onAddToCart از بیرون آمده، آن را هم فراخوانی کن
      if (onAddToCart) {
        onAddToCart(product);
      }
    },
    [addItem, onAddToCart]
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
      {products.length > 0 ? (
        products.map((product, index) => (
          <ProductGridItem
            key={product.id}
            product={product}
            index={index}
            glassEffect={glassEffect}
            onAddToCart={handleAddToCart}
            onAddToFavorites={handleAddToFavorites}
            isFavorite={product.id ? isFavorite(product.id) : false}
            ribbonLabel={ribbonLabel}
          />
        ))
      ) : isLoading ? (
        <div className="col-span-full h-52 md:h-64 flex items-center justify-center">
          <div className="relative w-12 h-12 md:w-16 md:h-16">
            <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-voxcina-blue/50 dark:text-voxcina-cream/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
            محصولی یافت نشد
          </h3>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60 max-w-md">
            در حال حاضر محصولی در این دسته‌بندی موجود نیست. لطفاً بعداً دوباره بررسی کنید یا دسته‌بندی دیگری را انتخاب نمایید.
          </p>
        </div>
      )}
    </div>
  );
}