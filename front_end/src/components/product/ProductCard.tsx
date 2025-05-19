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
        </div>

        <button
          className={`absolute top-3 left-3 p-2 backdrop-blur-sm rounded-full z-10 transition-all duration-300 ${
            isProductFavorite
              ? "bg-destructive/10 text-destructive"
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

        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={handleAddToCart}
          className="rounded-xl"
        >
          افزودن به سبد خرید
        </Button>
      </div>
    </Link>
  );
};

export default ProductCard;