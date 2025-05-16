"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/store/dashboard-store";

interface ProductCardProps {
  product: Product;
  glassEffect?: boolean;
  ribbonLabel?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  glassEffect = false,
  ribbonLabel,
}) => {
  const { isFavorite, addToFavorites, removeFromFavorites } =
    useDashboardStore();
  const isProductFavorite = isFavorite(product.id);
  const addItem = useCartStore((state) => state.addItem);

  const { id, name, price, originalPrice, images, brand, rating, isNew } =
    product;

  const discount = originalPrice
    ? getDiscountPercentage(originalPrice, price)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
  };

  return (
    <Link
      href={`/products/${id}`}
      className={`group block rounded-xl overflow-hidden transition-all duration-300 ${
        glassEffect
          ? "border border-white/10 dark:border-white/5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
          : "bg-background border border-gray-200 dark:border-gray-700"
      } hover:shadow-md`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
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
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <span className="text-gray-500 dark:text-gray-400">بدون تصویر</span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {(isNew || ribbonLabel) && (
            <span className="px-2.5 py-1 bg-amber-400 text-black text-xs font-bold rounded-lg shadow-sm">
              {ribbonLabel || "جدید"}
            </span>
          )}
          {discount > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm">
              {discount}٪ تخفیف
            </span>
          )}
        </div>

        <button
          className={`absolute top-3 left-3 p-2 backdrop-blur-sm rounded-full z-10 transition-all duration-300 ${
            isProductFavorite
              ? "bg-red-500/10 text-red-500"
              : "bg-black/10 text-white hover:bg-white/20"
          }`}
          onClick={(e) => {
            e.preventDefault();
            isProductFavorite
              ? removeFromFavorites(product.id)
              : addToFavorites(product.id);
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

      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
              {name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{brand}</p>
          </div>

          {rating && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md px-1.5 py-0.5">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium mr-1">{rating}</span>
            </div>
          )}
        </div>

        <div className="mt-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-bold ${
                discount > 0 ? "text-primary" : "text-gray-900 dark:text-white"
              }`}
            >
              {formatPrice(price)}
            </span>

            {originalPrice && originalPrice > price && (
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={handleAddToCart}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          افزودن به سبد خرید
        </Button>
      </div>
    </Link>
  );
};

export default ProductCard;
