import { motion } from "framer-motion";
import Link from "next/link";
import { formatPrice, cn, getDiscountPercentage } from "@/lib/utils";
import { Product } from "@/types/product";
import ProductImage from "./ProductImage";
import { Eye, ShoppingCart, Heart } from "lucide-react";

interface ProductGridItemProps {
  product: Product;
  index?: number;
  glassEffect?: boolean;
  onAddToCart?: (product: Product) => void;
  onAddToFavorites?: (productId: string) => void;
  isFavorite?: boolean;
  ribbonLabel?: string;
}

/**
 * آیتم محصول در گرید با بهینه‌سازی لود تصاویر و نشانه‌گذاری ساختاری
 */
export default function ProductGridItem({
  product,
  index = 0,
  glassEffect = false,
  onAddToCart,
  onAddToFavorites,
  isFavorite = false,
  ribbonLabel,
}: ProductGridItemProps) {
  // محاسبه درصد تخفیف
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? getDiscountPercentage(product.originalPrice as number, product.price)
    : 0;

  // آیا موجود است؟
  const isInStock = product.inStock !== false;

  // تأخیر برای انیمیشن
  const animationDelay = Math.min(index * 0.1, 0.8);

  return (
    <motion.div
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm",
        glassEffect && "bg-white/80 dark:bg-voxcina-blue/10 backdrop-blur-sm"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animationDelay }}
      whileHover={{ y: -5 }}
    >
      {/* اگر تخفیف دارد، نمایش نشانگر تخفیف */}
      {hasDiscount && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-medium shadow-sm">
          {discountPercentage}٪ تخفیف
        </div>
      )}

      {/* نمایش ribbonLabel اگر وجود داشته باشد */}
      {ribbonLabel && (
        <div className="absolute top-3 left-3 z-10 bg-voxcina-blue text-white text-xs px-2 py-1 rounded-lg font-medium shadow-sm">
          {ribbonLabel}
        </div>
      )}

      {/* علامت موجود نبودن */}
      {!isInStock && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm text-white font-medium text-sm shadow-lg">
            ناموجود
          </div>
        </div>
      )}

      <Link href={`/products/${product.id}`} className="relative aspect-square overflow-hidden">
        <ProductImage
          src={product.images?.[0] || "/images/products/placeholder.jpg"}
          alt={product.name}
          fill
          productName={product.name}
          brand={product.brand}
          category={product.category_ids?.length > 0 ? product.category_ids[0] : undefined}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* دکمه‌های اکشن */}
        <div className="absolute bottom-3 right-3 z-10 flex gap-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
          <Link
            href={`/products/${product.id}`}
            className="bg-white/90 dark:bg-voxcina-blue/90 text-voxcina-blue dark:text-white p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-voxcina-blue transition-colors"
            title="مشاهده محصول"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(product);
              }}
              className="bg-white/90 dark:bg-voxcina-blue/90 text-voxcina-blue dark:text-white p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-voxcina-blue transition-colors"
              title="افزودن به سبد خرید"
              disabled={!isInStock}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
          {onAddToFavorites && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToFavorites(product.id);
              }}
              className={`${
                isFavorite
                  ? "bg-red-500 text-white"
                  : "bg-white/90 dark:bg-voxcina-blue/90 text-voxcina-blue dark:text-white"
              } p-2 rounded-full shadow-md hover:bg-red-500 hover:text-white transition-colors`}
              title={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-voxcina-blue dark:text-voxcina-cream font-medium mb-1 truncate hover:text-voxcina-darkBlue dark:hover:text-white transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <Link
            href={`/brands/${product.brand.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
          >
            {product.brand}
          </Link>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 line-through">
                {formatPrice(product.originalPrice as number)}
              </span>
            )}
          </div>

          {/* Rating display (removed ratings property as it doesn't exist in the Product type) */}
        </div>
      </div>
    </motion.div>
  );
} 