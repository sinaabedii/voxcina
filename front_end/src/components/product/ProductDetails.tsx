"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
} from "lucide-react";
import { Product } from "@/types/product";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";

/* NEW ➜ ratings / reviews live data */
import { useReviewStore } from "@/store/review-store"; // adjust path to your project

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const { addToCart } = useCart();

  // Get images to display based on selected color
  const displayImages = (() => {
    if (selectedColor && product.variants?.length > 0) {
      // Find variants matching the selected color
      const colorVariants = product.variants.filter(v => v.color === selectedColor);
      if (colorVariants.length > 0 && colorVariants[0].images?.length > 0) {
        return colorVariants[0].images;
      }
    }
    // Fallback to main product images
    return product.images || [];
  })();

  // Get try-on image based on selected color
  const displayTryOnImage = (() => {
    if (selectedColor && product.variants?.length > 0) {
      const colorVariants = product.variants.filter(v => v.color === selectedColor);
      if (colorVariants.length > 0 && colorVariants[0].tryOnImage) {
        return colorVariants[0].tryOnImage;
      }
    }
    // Fallback to main product try-on image
    return product.tryOnImage;
  })();

  // Reset selected image index when color changes
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setSelectedImage(0); // Reset to first image when color changes
  };

  /* ---------- dynamic rating / review-count ---------- */
  // Product.id is optional in the interface; handle undefined defensively
  const productIdSafe = product.id ?? "";
  const averageRating = useReviewStore(
    (s) => s.getAverageRatingByProductId(productIdSafe)
  );
  const reviewCount = useReviewStore(
    (s) => s.getReviewCountByProductId(productIdSafe)
  );

  const discount = product.originalPrice
    ? getDiscountPercentage(product.originalPrice, product.price)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* ---------- images ---------- */}
      <div className="animate-fadeIn">
        <div className="product-zoom mb-4 aspect-square relative rounded-xl overflow-hidden border border-border/10 shadow-soft">
          {displayImages && displayImages.length > 0 ? (
            <div className="relative h-full w-full bg-secondary/30">
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                تصویر محصول
                {selectedColor && (
                  <span className="absolute bottom-2 right-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {selectedColor}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
              <span className="text-muted-foreground">بدون تصویر</span>
            </div>
          )}
        </div>

        {/* thumbnails */}
        {displayImages && displayImages.length > 1 && (
          <div className="flex space-x-2 space-x-reverse">
            {displayImages.map((_, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className={`w-20 h-20 border rounded-lg overflow-hidden transition-all duration-200 ${
                  selectedImage === index
                    ? "border-primary shadow-soft"
                    : "border-border/10"
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <div className="h-full w-full bg-secondary/30 flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">{index + 1}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- details ---------- */}
      <div className="animate-slideInRight">
        {/* brand + rating row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{product.brand}</span>

          <div className="flex items-center">
            <Star className="h-4 w-4 text-warning fill-warning ml-1" />
            <span className="text-sm font-medium">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground mr-1">
              ({reviewCount} نظر)
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-primary">
          {product.name}
        </h1>

        {/* price / discount */}
        <div className="flex items-center mb-6">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>

          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-base text-muted-foreground line-through mr-2">
              {formatPrice(product.originalPrice)}
            </span>
          )}

          {discount > 0 && (
            <span className="mr-2 px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-md">
              {discount}% تخفیف
            </span>
          )}
        </div>

        {/* description */}
        <div className="mb-6">
          <p className="text-foreground leading-relaxed">{product.description}</p>
        </div>

        {/* sizes */}
        {product.variants?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 text-foreground">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(product.variants.map((v) => v.size))).map(
                (size) => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2 border rounded-md text-sm transition-all duration-200 ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary shadow-soft"
                        : "border-border/20 text-foreground hover:border-primary/30"
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </motion.button>
                )
              )}
            </div>
          </div>
        )}

        {/* colors */}
        {product.variants?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 text-foreground">
              رنگ
              {selectedColor && (
                <span className="mr-2 text-xs text-muted-foreground">
                  ({Array.from(
                    new Map(
                      product.variants.map((v) => [v.color, v.colorName || v.color])
                    ).entries()
                  ).find(([color]) => color === selectedColor)?.[1] || selectedColor})
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Map(
                  product.variants.map((v) => [v.color, v])
                ).values()
              ).map((variant) => (
                <motion.button
                  key={variant.color}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-8 h-8 rounded-full border-2 shadow-soft transition-all duration-200 ${
                    selectedColor === variant.color
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-primary/20"
                  }`}
                  style={{ backgroundColor: variant.color }}
                  onClick={() => handleColorChange(variant.color)}
                  title={variant.colorName || variant.color}
                />
              ))}
            </div>
          </div>
        )}

        {/* quantity + add-to-cart */}
        <div className="flex items-center mb-8">
          <div className="flex items-center border border-border/20 rounded-lg mr-4 shadow-soft overflow-hidden">
            <motion.button
              whileHover={{ backgroundColor: "rgba(26, 60, 105, 0.05)" }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              onClick={decrementQuantity}
            >
              <Minus className="h-4 w-4" />
            </motion.button>

            <span className="px-4 py-2 border-x border-border/10 font-medium">
              {quantity}
            </span>

            <motion.button
              whileHover={{ backgroundColor: "rgba(26, 60, 105, 0.05)" }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              onClick={incrementQuantity}
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="flex-grow"
          >
            افزودن به سبد خرید
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="mr-2 hover:bg-secondary"
            aria-label="افزودن به علاقه‌مندی‌ها"
          >
            <Heart className="h-5 w-5" />
          </Button>
        </div>

        {/* features */}
        <div className="bg-secondary/50 rounded-xl p-4 mb-6 shadow-soft border border-border/5">
          <h3 className="text-sm font-medium mb-3 text-primary">ویژگی‌ها</h3>
          <ul className="space-y-2">
            {product.attributes?.length ? (
              product.attributes.map((attr) => (
                <li key={attr.name} className="text-sm flex items-start group">
                  <span className="ml-2 text-primary group-hover:text-primary/80 transition-colors duration-200">
                    •
                  </span>
                  <span className="group-hover:text-primary/90 transition-colors duration-200">
                    {attr.shownName ?? attr.name}: {attr.value}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                ویژگی خاصی درج نشده است
              </li>
            )}
          </ul>
        </div>

        {/* guarantees */}
        <div className="border-t border-border/10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-colors duration-200 group">
              <Truck className="h-5 w-5 ml-2 text-primary group-hover:text-primary/80 transition-colors duration-200" />
              <span className="text-sm group-hover:text-primary/90 transition-colors duration-200">
                ارسال سریع
              </span>
            </div>
            <div className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-colors duration-200 group">
              <RotateCcw className="h-5 w-5 ml-2 text-primary group-hover:text-primary/80 transition-colors duration-200" />
              <span className="text-sm group-hover:text-primary/90 transition-colors duration-200">
                بازگشت تا ۷ روز
              </span>
            </div>
            <div className="flex items-center p-3 rounded-lg hover:bg-secondary/50 transition-colors duration-200 group">
              <ShieldCheck className="h-5 w-5 ml-2 text-primary group-hover:text-primary/80 transition-colors duration-200" />
              <span className="text-sm group-hover:text-primary/90 transition-colors duration-200">
                ضمانت اصالت
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
