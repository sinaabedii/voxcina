"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, ShoppingCart, ChevronLeft } from "lucide-react";
import { ColorVariantListItem } from "@/types/product";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { useDashboardStore } from "@/store/dashboard-store";
import { activityTracker } from "@/lib/activity-tracker";
import { getCanonicalColor, getVariantUrlValue } from "@/lib/product-variants";

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
  const { productId, colorVariant, name, description, price, originalPrice, brand, inStock } = item;
  const { color, colorName, swatchImage, images, sizes, variantId } = colorVariant;
  const selectedColor = getCanonicalColor(colorVariant) || colorName;
  const variantUrlValue = getVariantUrlValue(colorVariant) || selectedColor;
  const productHref = `/products/${productId}?${variantId ? "variant" : "color"}=${encodeURIComponent(variantUrlValue || "")}`;

  // Display the first image from this color's images
  const displayImage = images && images.length > 0 ? images[0] : null;

  // Available sizes for this specific color (filtered by stock)
  const availableSizes = sizes.filter(s => s.quantity > 0);

  const rating = item.average_rating;
  const isNew = item.created_at && (new Date().getTime() - new Date(item.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;

  const discount = originalPrice && originalPrice > price
    ? getDiscountPercentage(originalPrice, price)
    : 0;

  const buildCartProduct = () => ({
    id: productId,
    name,
    price,
    originalPrice,
    brand,
    mainImages: images,
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
  } as any);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleProductClick = () => {
    activityTracker.trackProductClick(productId, name, {
      variantId,
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
        addItem(buildCartProduct(), 1, selectedSize, selectedColor, colorName, variantId);
        handleCloseModal();
        toast.success("محصول به سبد خرید اضافه شد");
      }
    }
  };

  return (
    <>
      <Link
        href={productHref}
        rel="nofollow"
        data-activity-tracked="true"
        onClick={handleProductClick}
        className={`product-card group relative block rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md border ${glassEffect
            ? "bg-white/55 dark:bg-primary-900/30 border-white/50 dark:border-white/10 shadow-[0_10px_36px_-8px_rgba(26,60,105,0.22)]"
            : "bg-white/80 dark:bg-primary-900/40 border-white/70 dark:border-white/10 shadow-[0_4px_24px_-6px_rgba(26,60,105,0.15)]"
          } hover:shadow-[0_14px_40px_-8px_rgba(26,60,105,0.28)] hover:-translate-y-0.5`}
      >
        {/* Glass sheen highlight along the top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <div className="product-card-image relative aspect-[4/5] overflow-hidden bg-secondary/30">
          {item.rank && (
            <div className="absolute top-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-medium">
              #{item.rank}
            </div>
          )}
          {displayImage ? (
            <Image
              src={displayImage}
              alt={`${name} - ${colorName}`}
              width={300}
              height={375}
              className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
              quality={70}
              sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, (max-width: 1024px) 220px, 250px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground">بدون تصویر</span>
            </div>
          )}

          {/* Out of stock badge - RIGHT side */}
          {!inStock && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-medium rounded-full bg-foreground/80 text-background backdrop-blur-sm shadow-soft">
                ناموجود
              </span>
            </div>
          )}

          {/* Discount badge - LEFT side */}
          {discount > 0 && (
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-xs font-bold rounded-full bg-destructive text-destructive-foreground shadow-soft">
                {discount}٪ تخفیف
              </span>
            </div>
          )}

          {/* Color indicator swatch */}
          <div className="absolute bottom-3 right-3 flex gap-1">
            <div
              style={!swatchImage && color?.startsWith("#") ? { backgroundColor: color } : undefined}
              className={`w-6 h-6 rounded-full border-2 border-white shadow-soft overflow-hidden ${!swatchImage && !color?.startsWith("#") ? "bg-[repeating-linear-gradient(135deg,#d7d2ca_0,#d7d2ca_3px,#f5f1ea_3px,#f5f1ea_6px)]" : ""}`}
              title={colorName}
            >
              {swatchImage && (
                <Image
                  src={swatchImage}
                  alt={colorName}
                  width={24}
                  height={24}
                  quality={60}
                  sizes="24px"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Favorite button - LEFT side */}
          <button
            className={`absolute ${discount > 0 ? 'top-9 sm:top-12' : 'top-2.5'} left-2.5 p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-300 shadow-soft ${isProductFavorite
                ? "bg-destructive/10 text-destructive"
                : "bg-white/80 dark:bg-black/40 text-foreground hover:bg-white dark:hover:bg-black/60"
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
              className="h-3 w-3 sm:h-4 sm:w-4"
              fill={isProductFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="product-card-content p-3 sm:p-4">
          {/* Rating chip - floats over the image/content seam */}
          {rating !== undefined && rating > 0 && (
            <div className="relative z-10 -mt-7 sm:-mt-8 mb-2 w-fit">
              <div className="flex items-center gap-1 bg-card border border-border/10 shadow-medium rounded-full pl-1.5 pr-2 py-0.5 sm:pl-2 sm:pr-2.5 sm:py-1">
                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-warning fill-warning" />
                <span className="text-[10px] sm:text-xs font-bold text-foreground">{rating.toFixed(1)}</span>
                <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-muted-foreground border-r border-border/30 pr-1.5 mr-0.5">
                  نظرات
                  <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </span>
              </div>
            </div>
          )}

          <p className="product-card-title text-[11px] sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {name}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{colorName} · {brand}</p>
          {item.viewCount !== undefined && (
            <p className="mt-1 text-[10px] font-medium text-primary/70">
              {new Intl.NumberFormat("fa-IR").format(item.viewCount)} بازدید
            </p>
          )}

          {(ribbonLabel || isNew) && (
            <span className="badge badge-primary mt-2 text-[9px] sm:text-xs">
              {ribbonLabel || "جدید"}
            </span>
          )}

          {description && (
            <>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {description}
              </p>
              {description.length > 60 && (
                <span className="text-[9px] sm:text-[11px] text-primary font-medium underline underline-offset-2">
                  بیشتر بخوانید
                </span>
              )}
            </>
          )}

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span
                className={`product-card-price whitespace-nowrap text-[11px] sm:text-base md:text-lg font-bold ${discount > 0 ? "text-primary" : "text-foreground"
                  }`}
              >
                {formatPrice(price)}
              </span>

              {discount > 0 && (
                <span className="whitespace-nowrap text-[9px] sm:text-xs text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {inStock && availableSizes.length > 0 ? (
              <button
                onClick={handleOpenModal}
                className="flex-shrink-0 p-2 sm:p-2.5 rounded-full bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-medium transition-all duration-300"
                aria-label="انتخاب سایز و خرید"
              >
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            ) : (
              <span className="text-[9px] sm:text-xs text-muted-foreground">ناموجود</span>
            )}
          </div>
        </div>
      </Link>

      {/* Size Selection Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md animate-slideUp rounded-2xl bg-card p-6 shadow-strong"
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
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
