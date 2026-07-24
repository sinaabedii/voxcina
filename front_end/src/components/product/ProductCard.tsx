"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, ShoppingCart } from "lucide-react";
import { ColorVariantListItem } from "@/types/product";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { useDashboardStore } from "@/store/dashboard-store";
import { motion, AnimatePresence } from "framer-motion";
import { activityTracker } from "@/lib/activity-tracker";
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductCardProps {
  item: ColorVariantListItem;
  glassEffect?: boolean;
  ribbonLabel?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  item,
  glassEffect = false,
  ribbonLabel,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { isFavorite, addToFavorites, removeFromFavorites } = useDashboardStore();
  const isProductFavorite = isFavorite(item.productId || '');
  const addItem = useCartStore((state) => state.addItem);

  // Extract data from the color variant list item
  const { productId, colorVariant, name, price, originalPrice, brand, inStock } = item;
  const { color, colorName, swatchImage, images, sizes } = colorVariant;
  const selectedColor = getCanonicalColor(colorVariant) || colorName;
  const productHref = `/products/${productId}?color=${encodeURIComponent(selectedColor)}`;

  // Display the first image from this color's images
  const displayImage = images && images.length > 0 ? images[0] : null;

  // Available sizes for this specific color (filtered by stock)
  const availableSizes = sizes.filter(s => s.quantity > 0);

  const rating = item.average_rating;
  const isNew = item.created_at && (new Date().getTime() - new Date(item.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;

  const discount = originalPrice && originalPrice > price
    ? getDiscountPercentage(originalPrice, price)
    : 0;

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleProductClick = () => {
    activityTracker.trackProductClick(productId, name, {
      colorName,
      colorHex: color,
      inStock,
      brand,
      price,
      listPosition: undefined,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSize(null);
  };

  const handleModalAddToCart = () => {
    if (selectedSize) {
      const sizeVariant = sizes.find(s => s.size === selectedSize);
      if (sizeVariant && sizeVariant.quantity > 0) {
        // TODO: Update addItem to accept productId, size, color, or create a minimal Product object
        // For now, creating a minimal product object
        addItem({
          id: productId,
          name,
          price,
          originalPrice,
          brand,
          mainImages: images, // Using color images as main for cart
          colorVariants: [colorVariant],
          category_ids: item.category_ids,
          brand_id: item.brand_id,
          collection: item.collection,
          attributes: [],
          is_flash_sale: item.is_flash_sale,
          is_active: true,
          inStock: true,
          created_at: item.created_at,
          updated_at: item.created_at,
        } as any, 1, selectedSize, selectedColor, colorName);

        handleCloseModal();
        toast.success("محصول به سبد خرید اضافه شد");
      }
    }
  };

  return (
    <>
      <Link
        href={productHref}
        data-activity-tracked="true"
        onClick={handleProductClick}
        className={`product-card group block rounded-xl overflow-hidden transition-all duration-300 ${glassEffect
            ? "glass-effect backdrop-blur-sm hover:bg-card/90"
            : "bg-card border border-border/10"
          } hover:shadow-medium`}
      >
        <div className="product-card-image relative aspect-[3/4] overflow-hidden bg-secondary/30">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={`${name} - ${colorName}`}
              width={300}
              height={300}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
              sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, (max-width: 1024px) 220px, 250px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground">بدون تصویر</span>
            </div>
          )}

          {/* Badges - جدید on RIGHT side */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            {(isNew || ribbonLabel) && (
              <span className="px-2 py-1 text-xs font-medium rounded-md bg-warning text-warning-foreground shadow-soft">
                {ribbonLabel || "جدید"}
              </span>
            )}
            {!inStock && (
              <span className="px-2 py-1 text-xs font-medium rounded-md bg-neutral-700 text-white shadow-soft">
                ناموجود
              </span>
            )}
          </div>

          {/* Discount badge - تخفیف on LEFT side */}
          {discount > 0 && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-md bg-destructive text-destructive-foreground shadow-soft">
                {discount}٪ تخفیف
              </span>
            </div>
          )}

          {/* Color indicator badge */}
          <div className="absolute bottom-3 right-3 flex gap-1">
	            <div
	              className="w-7 h-7 rounded-full border-2 border-white shadow-md overflow-hidden"
	              style={!swatchImage && color?.startsWith("#") ? { backgroundColor: color } : undefined}
	              title={colorName}
            >
              {swatchImage && (
                <img src={swatchImage} alt={colorName} className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          {/* Favorite button - on LEFT side */}
          <button
            className={`absolute ${discount > 0 ? 'top-12' : 'top-2'} left-2 p-2 backdrop-blur-sm rounded-full transition-all duration-300 ${isProductFavorite
                ? "bg-destructive/10 text-destructive"
                : "bg-black/10 text-white hover:bg-white/20"
              }`}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (productId) {
                isProductFavorite
                  ? removeFromFavorites(productId)
                  : addToFavorites(productId);
              }
            }}
            aria-label={
              isProductFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "افزودن به علاقه‌مندی‌ها"
            }
          >
            <Heart
              className="h-5 w-5"
              fill={isProductFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="product-card-content p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="product-card-title text-xs font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1 overflow-hidden text-ellipsis">
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{colorName} - {brand}</p>
            </div>

            {rating && rating > 0 && (
              <div className="flex items-center bg-secondary rounded-md px-1.5 py-0.5">
                <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                <span className="text-xs font-medium mr-1">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="mt-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`product-card-price text-base sm:text-lg font-bold ${discount > 0 ? "text-primary" : "text-foreground"
                  }`}
              >
                {formatPrice(price)}
              </span>

              {discount > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {inStock && availableSizes.length > 0 && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleOpenModal}
                className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              >
                <ShoppingCart className="h-4 w-4 ml-2" />
                انتخاب سایز و خرید
              </Button>
            </div>
          )}

          {!inStock && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                disabled
              >
                ناموجود
              </Button>
            </div>
          )}
        </div>
      </Link>

      {/* Size Selection Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">انتخاب سایز</h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-secondary rounded-lg transition"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">{name} - {colorName}</p>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">سایز:</label>
                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((sizeVariant) => (
                    <button
                      key={sizeVariant.size}
                      onClick={() => setSelectedSize(sizeVariant.size)}
                      disabled={sizeVariant.quantity === 0}
                      className={`px-4 py-3 border rounded-lg text-sm font-medium transition ${selectedSize === sizeVariant.size
                          ? "border-primary bg-primary/10 text-primary"
                          : sizeVariant.quantity > 0
                            ? "border-border/20 hover:border-primary/50"
                            : "border-border/10 opacity-50 cursor-not-allowed"
                        }`}
                    >
                      {sizeVariant.size}
                      {sizeVariant.quantity === 0 && (
                        <div className="text-xs text-muted-foreground">ناموجود</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseModal}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleModalAddToCart}
                  disabled={!selectedSize}
                >
                  افزودن به سبد
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductCard;
