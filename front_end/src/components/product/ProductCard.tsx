"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, X, Check, AlertCircle, ShoppingCart } from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice, getDiscountPercentage, hasAttribute } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { useDashboardStore } from "@/store/dashboard-store";
import { motion, AnimatePresence } from "framer-motion";

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
    toast.success(message);
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
              <span
                className={`product-card-price text-lg font-bold ${
                  discount > 0 ? "text-primary" : "text-foreground"
                }`}
              >
                {formatPrice(price)}
              </span>

              {originalPrice && originalPrice > price && (
                <span className="product-card-discount text-sm text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {product.inStock && hasVariantsInStock && (
            <div className="mt-4 pt-4 border-t border-border/10">
              {onAddToCart ? (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={canAddToCartDirectly ? handleDirectAddToCart : handleOpenModal}
                >
                  {canAddToCartDirectly ? "افزودن به سبد خرید" : (hasVariantsInStock ? "انتخاب گزینه ها" : "مشاهده محصول")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleOpenModal}
                  className="rounded-xl"
                >
                  انتخاب رنگ و سایز
                </Button>
              )}
            </div>
          )}
        </div>
      </Link>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 relative shadow-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={handleCloseModal}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  انتخاب رنگ و سایز
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  لطفاً رنگ و سایز مورد نظر را برای {name} انتخاب کنید
                </p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    رنگ
                  </h4>
                  {selectedColor && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedColor}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColorsForSelectedSize.map((color) => {
                    const isAvailable = !selectedSize || availableColorsForSelectedSize.includes(color);
                    return (
                      <button
                        key={color}
                        className={`px-4 py-2 border rounded-lg text-sm transition-all ${
                          selectedColor === color
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium"
                            : isAvailable
                            ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500"
                            : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => isAvailable && setSelectedColor(color)}
                        disabled={!isAvailable}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    سایز
                  </h4>
                  {selectedSize && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedSize}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizesForSelectedColor.map((size) => {
                    const isAvailable = !selectedColor || availableSizesForSelectedColor.includes(size);
                    return (
                      <button
                        key={size}
                        className={`px-4 py-2 border rounded-lg text-sm transition-all ${
                          selectedSize === size
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium"
                            : isAvailable
                            ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500"
                            : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => isAvailable && setSelectedSize(size)}
                        disabled={!isAvailable}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedColor && selectedSize && !isVariantInStock(selectedSize, selectedColor) && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5 ml-2 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    ترکیب رنگ و سایز انتخابی در حال حاضر ناموجود است. لطفاً ترکیب دیگری را انتخاب کنید.
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleModalAddToCart}
                disabled={!selectedColor || !selectedSize || !isVariantInStock(selectedSize!, selectedColor!)}
                className="rounded-xl mt-2"
              >
                تایید و افزودن به سبد
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductCard;

