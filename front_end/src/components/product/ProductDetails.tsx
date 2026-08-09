"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { useReviewStore } from "@/store/review-store";
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const searchParams = useSearchParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);

  const { addToCart } = useCart();

  // Pre-select color from URL parameter on mount
  useEffect(() => {
    const variantParam = searchParams?.get("variant");
    const colorParam = searchParams?.get("color");
    if ((variantParam || colorParam) && product.colorVariants) {
      const colorIndex = product.colorVariants.findIndex(
        cv => cv.variantId === variantParam || cv.color === colorParam || cv.colorName === colorParam
      );
      if (colorIndex !== -1) {
        setSelectedColorIndex(colorIndex);
      }
    }
  }, [searchParams, product.colorVariants]);

  const selectedColorVariant = product.colorVariants?.[selectedColorIndex];

  // Build combined image gallery: mainImages + selected color's images
  const displayImages = (() => {
    const images: string[] = [];

    // Add main images first (shared across all colors)
    if (product.mainImages && product.mainImages.length > 0) {
      images.push(...product.mainImages);
    }

    // Add selected color's images
    if (selectedColorVariant?.images && selectedColorVariant.images.length > 0) {
      images.push(...selectedColorVariant.images);
    }

    return images.length > 0 ? images : []; // Fallback to empty array
  })();

  const displayTryOnImage = selectedColorVariant?.tryOnImage;

  // Get available sizes for the selected color
  const availableSizes = selectedColorVariant?.sizes || [];

  // Reset selected image index when color changes
  const handleColorChange = (colorIndex: number) => {
    setSelectedColorIndex(colorIndex);
    setSelectedImage(0);
    setSelectedSize(undefined); // Reset size when color changes
  };

  // Get quantity for selected size
  const selectedSizeQuantity = selectedSize
    ? availableSizes.find(s => s.size === selectedSize)?.quantity || 0
    : 0;

  /* ---------- dynamic rating / review-count ---------- */
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
    if (!selectedSize) {
      alert("لطفاً سایز را انتخاب کنید");
      return;
    }
    if (!selectedColorVariant) {
      alert("لطفاً رنگ را انتخاب کنید");
      return;
    }
    if (selectedSizeQuantity === 0) {
      alert("این سایز موجود نیست");
      return;
    }

    addToCart(
      product,
      quantity,
      selectedSize,
      getCanonicalColor(selectedColorVariant) || selectedColorVariant.colorName,
      selectedColorVariant.colorName,
      selectedColorVariant.variantId
    );
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, selectedSizeQuantity)));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* image gallery */}
        <div>
          <div className="mb-4 rounded-xl overflow-hidden bg-secondary/30 aspect-square relative">
            {displayImages.length > 0 ? (
              <Image
                src={displayImages[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground">بدون تصویر</span>
              </div>
            )}

            {/* try-on image overlay button */}
            {displayTryOnImage && (
              <button className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm">
                پرو کردن مجازی
              </button>
            )}
          </div>

          {/* thumbnails */}
          <div className="flex gap-2 overflow-x-auto">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx
                  ? "border-primary"
                  : "border-transparent hover:border-primary/30"
                  }`}
                onClick={() => setSelectedImage(idx)}
              >
                <Image
                  src={img}
                  alt={`${product.name} ${idx + 1}`}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </button>
            ))}
          </div>
        </div>

        {/* product info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-primary">
            {product.name}
          </h1>

          {/* rating */}
          {averageRating > 0 && (
            <div className="flex items-center mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(averageRating)
                      ? "text-warning fill-warning"
                      : "text-muted-foreground"
                      }`}
                  />
                ))}
              </div>
              <span className="mr-2 text-sm text-muted-foreground">
                {averageRating.toFixed(1)} ({reviewCount} نظر)
              </span>
            </div>
          )}

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

          {/* colors */}
          {product.colorVariants && product.colorVariants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 text-foreground">
                رنگ
                {selectedColorVariant && (
                  <span className="mr-2 text-xs text-muted-foreground">
                    ({selectedColorVariant.colorName})
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.colorVariants.map((colorVariant, idx) => {
                  // Check if this color has any inventory
                  const hasStock = colorVariant.sizes.some(s => s.quantity > 0);

                  return (
	                    <motion.button
                      key={colorVariant.variantId || getCanonicalColor(colorVariant) || colorVariant.colorName}
	                      whileHover={{ scale: hasStock ? 1.1 : 1 }}
	                      whileTap={{ scale: hasStock ? 0.95 : 1 }}
	                      disabled={!hasStock}
	                      className={`w-8 h-8 rounded-full border-2 shadow-soft transition-all duration-200 overflow-hidden ${selectedColorIndex === idx
	                          ? "border-primary ring-2 ring-primary/30"
	                          : "border-transparent hover:border-primary/20"
	                        } ${!hasStock ? 'opacity-50 cursor-not-allowed' : ''}`}
	                      style={!colorVariant.swatchImage && colorVariant.color?.startsWith("#") ? { backgroundColor: colorVariant.color } : undefined}
	                      onClick={() => hasStock && handleColorChange(idx)}
	                      title={`${colorVariant.colorName}${!hasStock ? ' (ناموجود)' : ''}`}
	                    >
	                      {colorVariant.swatchImage ? (
	                        <img src={colorVariant.swatchImage} alt="" className="w-full h-full object-cover" />
	                      ) : null}
	                    </motion.button>
	                  );
                })}
              </div>
            </div>
          )}

          {/* sizes */}
          {availableSizes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 text-foreground">سایز</h3>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((sizeVariant) => (
                  <motion.button
                    key={sizeVariant.size}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={sizeVariant.quantity === 0}
                    className={`px-4 py-2 border rounded-md text-sm transition-all duration-200 ${selectedSize === sizeVariant.size
                      ? "border-primary bg-primary/10 text-primary shadow-soft"
                      : sizeVariant.quantity > 0
                        ? "border-border/20 text-foreground hover:border-primary/30"
                        : "border-border/10 text-muted-foreground opacity-50 cursor-not-allowed"
                      }`}
                    onClick={() => setSelectedSize(sizeVariant.size)}
                  >
                    {sizeVariant.size}
                    {sizeVariant.quantity === 0 && (
                      <span className="block text-xs">ناموجود</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* quantity */}
          {selectedSize && selectedSizeQuantity > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 text-foreground">تعداد</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 border rounded-md min-w-[60px] text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= selectedSizeQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground mr-2">
                  ({selectedSizeQuantity} عدد موجود)
                </span>
              </div>
            </div>
          )}

          {/* add to cart button */}
          <div className="mb-6">
            <Button
              variant="primary"
              fullWidth
              onClick={handleAddToCart}
              disabled={!selectedSize || selectedSizeQuantity === 0}
            >
              افزودن به سبد خرید
            </Button>
          </div>

          {/* features */}
          <div className="space-y-3 pt-6 border-t border-border/20">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-sm">ارسال رایگان برای خریدهای بالای 500 هزار تومان</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary" />
              <span className="text-sm">امکان بازگشت کالا تا 7 روز</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm">گارانتی اصالت کالا</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
