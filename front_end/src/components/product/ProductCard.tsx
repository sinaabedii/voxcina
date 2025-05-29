"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, X, Check, AlertCircle, ShoppingCart } from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice, getDiscountPercentage, hasAttribute } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/store/dashboard-store";

interface ProductCardProps {
  product: Product;
  glassEffect?: boolean;
  ribbonLabel?: string;
  onAddToCart?: (product: Product) => void;
}


const ProductCard: React.FC<ProductCardProps> = ({
  product,
  glassEffect = false,
  ribbonLabel,
  onAddToCart,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizesForSelectedColor, setAvailableSizesForSelectedColor] = useState<string[]>([]);
  const [availableColorsForSelectedSize, setAvailableColorsForSelectedSize] = useState<string[]>([]);
  
  const { isFavorite, addToFavorites, removeFromFavorites } =
    useDashboardStore();
  const isProductFavorite = isFavorite(product.id || '');
  const addItem = useCartStore((state) => state.addItem);

  const { id, name, price, originalPrice, images, brand } =
    product;
  const rating = null; // Or calculate from reviews if available
  const isNew = hasAttribute(product, "isNew");

  // Use the original price from the product, with proper fallback
  const discount = originalPrice && originalPrice > price
    ? getDiscountPercentage(originalPrice, price)
    : 0;
    
  // Extract available sizes and colors from variants
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      // Get unique sizes and colors from variants that have quantity > 0
      const inStockVariants = product.variants.filter(v => v.quantity > 0);
      
      setAvailableSizes([...new Set(inStockVariants.map(v => v.size))]);
      setAvailableColors([...new Set(inStockVariants.map(v => v.color))]);
      
      // Initial values for filtered lists match the full lists
      setAvailableSizesForSelectedColor([...new Set(inStockVariants.map(v => v.size))]);
      setAvailableColorsForSelectedSize([...new Set(inStockVariants.map(v => v.color))]);
    }
  }, [product.variants]);
  
  // Get available sizes based on selected color
  useEffect(() => {
    if (product.variants && selectedColor) {
      const filteredSizes = [
        ...new Set(
          product.variants
            .filter(v => v.color === selectedColor && v.quantity > 0)
            .map(v => v.size)
        )
      ];
      setAvailableSizesForSelectedColor(filteredSizes);
      
      // If current selected size is not available with the new color, reset it
      if (selectedSize && !filteredSizes.includes(selectedSize)) {
        setSelectedSize(null);
      }
    } else {
      setAvailableSizesForSelectedColor(availableSizes);
    }
  }, [selectedColor, product.variants, availableSizes, selectedSize]);
  
  // Get available colors based on selected size
  useEffect(() => {
    if (product.variants && selectedSize) {
      const filteredColors = [
        ...new Set(
          product.variants
            .filter(v => v.size === selectedSize && v.quantity > 0)
            .map(v => v.color)
        )
      ];
      setAvailableColorsForSelectedSize(filteredColors);
      
      // If current selected color is not available with the new size, reset it
      if (selectedColor && !filteredColors.includes(selectedColor)) {
        setSelectedColor(null);
      }
    } else {
      setAvailableColorsForSelectedSize(availableColors);
    }
  }, [selectedSize, product.variants, availableColors, selectedColor]);

  // Check if a specific variant is in stock
  const isVariantInStock = (size: string, color: string) => {
    if (!product.variants) return false;
    return product.variants.some(
      v => v.size === size && v.color === color && v.quantity > 0
    );
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedColor(null);
    setSelectedSize(null);
  };

  const showNotification = (message: string) => {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeOut";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000); // Increased timeout slightly for visibility
  };

  const handleModalAddToCart = () => {
    if (selectedColor && selectedSize && isVariantInStock(selectedSize, selectedColor)) {
      addItem(product, 1, selectedSize, selectedColor);
      handleCloseModal();
      showNotification("محصول به سبد خرید اضافه شد");
    }
  };

  const handleDirectAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart) {
      onAddToCart(product);
      showNotification("محصول به سبد خرید اضافه شد");
    }
  };

  // Check if the product has any variants in stock
  const hasVariantsInStock = product.variants && product.variants.some(v => v.quantity > 0);

  const canAddToCartDirectly = onAddToCart && (!product.variants || product.variants.length === 0);

  return (
    <>
      <Link
        href={`/products/${id}`}
        className={`product-card group block rounded-xl overflow-hidden transition-all duration-300 ${
          glassEffect
            ? "glass-effect backdrop-blur-sm hover:bg-card/90"
            : "bg-card border border-border/10"
        } hover:shadow-medium`}
      >
        <div className="product-card-image relative aspect-square overflow-hidden bg-secondary/30">
          {images && images.length > 0 ? (
            <Image
              src={images[0]}
              alt={name}
              width={300}
              height={300}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground">بدون تصویر</span>
            </div>
          )}

          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {(isNew || ribbonLabel) && (
              <span className="product-tag bg-warning text-warning-foreground shadow-soft">
                {ribbonLabel || "جدید"}
              </span>
            )}
            {discount > 0 && (
              <span className="product-tag bg-destructive text-destructive-foreground shadow-soft">
                {discount}٪ تخفیف
              </span>
            )}
            {product.inStock === false && (
              <span className="product-tag bg-neutral-700 text-white shadow-soft">
                ناموجود
              </span>
            )}
          </div>

          <button
            className={`absolute top-3 left-3 p-2 backdrop-blur-sm rounded-full z-10 transition-all duration-300 ${
              isProductFavorite
                ? "bg-destructive/10 text-destructive"
                : "bg-black/10 text-white hover:bg-white/20"
            }`}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (product.id) {
                isProductFavorite
                  ? removeFromFavorites(product.id)
                  : addToFavorites(product.id);
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
              <h3 className="product-card-title font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{brand}</p>
            </div>

            {rating && (
              <div className="flex items-center bg-secondary rounded-md px-1.5 py-0.5">
                <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                <span className="text-xs font-medium mr-1">{rating}</span>
              </div>
            )}
          </div>

          <div className="mt-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {formatPrice(price)}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-muted-foreground line-through text-sm">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-auto">
            {!product.variants || product.variants.length === 0 ? (
              canAddToCartDirectly ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={handleDirectAddToCart}
                >
                  افزودن به سبد خرید
                </Button>
              ) : (
                <Button variant="primary" size="sm" className="w-full">
                  <span>مشاهده محصول</span>
                </Button>
              )
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleOpenModal}
                disabled={!hasVariantsInStock}
              >
                <ShoppingCart className="w-4 h-4 ml-1" />
                انتخاب سایز و رنگ
              </Button>
            )}
          </div>
        </div>
      </Link>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card max-w-md w-full rounded-xl shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-4 bg-secondary/50 flex justify-between items-center">
              <h3 className="font-medium text-lg">{name}</h3>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-background rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex mb-6 gap-4">
                <div className="w-24 h-24 shrink-0 overflow-hidden rounded-md">
                  {images && images.length > 0 ? (
                    <Image
                      src={images[0]}
                      alt={name}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <span className="text-muted-foreground">بدون تصویر</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{brand}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground">
                      {formatPrice(price)}
                    </span>
                    {originalPrice && originalPrice > price && (
                      <span className="text-muted-foreground line-through text-sm">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {availableColors.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    انتخاب رنگ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColorsForSelectedSize.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full transition-all duration-300 relative ${
                          isVariantInStock(
                            selectedSize || availableSizes[0],
                            color
                          )
                            ? ""
                            : "opacity-30"
                        } ${
                          selectedColor === color
                            ? "ring-2 ring-primary ring-offset-2"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                        disabled={
                          !isVariantInStock(
                            selectedSize || availableSizes[0],
                            color
                          )
                        }
                        title={color}
                      >
                        {selectedColor === color && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className="h-5 w-5 text-white drop-shadow-md"
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableSizes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    انتخاب سایز
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizesForSelectedColor.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[3rem] h-10 px-2 rounded-md border transition-all duration-300 ${
                          isVariantInStock(
                            size,
                            selectedColor || availableColors[0]
                          )
                            ? "border-border hover:border-primary"
                            : "opacity-30 border-dashed"
                        } ${
                          selectedSize === size
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card"
                        }`}
                        disabled={
                          !isVariantInStock(
                            size,
                            selectedColor || availableColors[0]
                          )
                        }
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedColor || !selectedSize ? (
                <div className="flex items-center gap-2 text-sm text-amber-500 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>لطفاً رنگ و سایز مورد نظر خود را انتخاب کنید.</span>
                </div>
              ) : !isVariantInStock(selectedSize, selectedColor) ? (
                <div className="flex items-center gap-2 text-sm text-destructive mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>این ترکیب رنگ و سایز موجود نیست.</span>
                </div>
              ) : null}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleModalAddToCart}
                disabled={
                  !selectedColor ||
                  !selectedSize ||
                  !isVariantInStock(selectedSize, selectedColor)
                }
              >
                افزودن به سبد خرید
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;

