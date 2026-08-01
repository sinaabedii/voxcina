import { motion } from "framer-motion";
import Link from "next/link";
import { formatPrice, cn, getDiscountPercentage } from "@/lib/utils";
import { ColorVariantListItem } from "@/types/product";
import BackendImage from "@/components/BackendImage";
import { Eye, ShoppingCart, Heart } from "lucide-react";
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductGridItemProps {
  item: ColorVariantListItem;
  index?: number;
  glassEffect?: boolean;
  onAddToCart?: (item: ColorVariantListItem) => void;
  onAddToFavorites?: (productId: string) => void;
  isFavorite?: boolean;
}

/**
 * آیتم محصول در گرید با بهینه‌سازی لود تصاویر و نشانه‌گذاری ساختاری
 */
export default function ProductGridItem({
  item,
  index = 0,
  glassEffect = false,
  onAddToCart,
  onAddToFavorites,
  isFavorite = false,
}: ProductGridItemProps) {
  // محاسبه درصد تخفیف
  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const discountPercentage = hasDiscount
    ? getDiscountPercentage(item.originalPrice as number, item.price)
    : 0;

  // آیا موجود است؟
  const isInStock = item.inStock !== false;

  // تأخیر برای انیمیشن
  const animationDelay = Math.min(index * 0.1, 0.8);

  // آماده‌سازی آدرس تصویر - use colorVariant images
  const imageSrc = item.colorVariant.images?.[0] || "/images/products/placeholder.jpg";
  const selectedColor = getCanonicalColor(item.colorVariant) || item.colorVariant.colorName;
  const productHref = `/products/${item.productId}?color=${encodeURIComponent(selectedColor)}`;

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

      {/* علامت موجود نبودن */}
      {!isInStock && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm text-white font-medium text-sm shadow-lg">
            ناموجود
          </div>
        </div>
      )}

      <Link href={productHref} rel="nofollow" className="relative aspect-square overflow-hidden">
        <div className="relative w-full h-full">
          <BackendImage
            src={imageSrc}
            alt={item.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            priority={index < 4}
          />
        </div>

        {/* دکمه‌های اکشن */}
        <div className="absolute bottom-3 right-3 z-10 flex gap-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = productHref;
            }}
            className="bg-white/90 dark:bg-voxcina-blue/90 text-voxcina-blue dark:text-white p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-voxcina-blue transition-colors"
            title="مشاهده محصول"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(item);
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
                onAddToFavorites(item.productId);
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
        <Link href={productHref} rel="nofollow">
          <h3 className="text-voxcina-blue dark:text-voxcina-cream font-medium mb-1 truncate hover:text-voxcina-darkBlue dark:hover:text-white transition-colors">
            {item.name}
          </h3>
        </Link>

        {item.brand && (
          <Link
            href={`/brands/${item.brand.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
          >
            {item.brand}
          </Link>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {formatPrice(item.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 line-through">
                {formatPrice(item.originalPrice as number)}
              </span>
            )}
          </div>

          {/* Rating display (removed ratings property as it doesn't exist in the Product type) */}
        </div>
      </div>
    </motion.div>
  );
}
