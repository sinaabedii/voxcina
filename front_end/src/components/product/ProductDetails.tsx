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

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const { addToCart } = useCart();

  const discount = product.originalPrice
    ? getDiscountPercentage(product.originalPrice, product.price)
    : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="mb-4 aspect-square relative rounded-lg overflow-hidden border">
          {product.images && product.images.length > 0 ? (
            <div className="relative h-full w-full bg-gray-200">
              <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                تصویر محصول
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">بدون تصویر</span>
            </div>
          )}
        </div>

        {product.images && product.images.length > 1 && (
          <div className="flex space-x-2 space-x-reverse">
            {product.images.map((image, index) => (
              <button
                key={index}
                className={`w-20 h-20 border rounded-md overflow-hidden ${
                  selectedImage === index ? "border-primary" : "border-border"
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">{index + 1}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">{product.brand}</div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 ml-1" />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-xs text-muted-foreground mr-1">
              ({product.reviewCount} نظر)
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>

        <div className="flex items-center mb-6">
          <span className="text-2xl font-bold">
            {formatPrice(product.price)}
          </span>

          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-base text-muted-foreground line-through mr-2">
              {formatPrice(product.originalPrice)}
            </span>
          )}

          {discount > 0 && (
            <span className="mr-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md">
              {discount}% تخفیف
            </span>
          )}
        </div>

        <div className="mb-6">
          <p className="text-foreground">{product.description}</p>
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  className={`px-4 py-2 border rounded-md text-sm ${
                    selectedSize === size
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground"
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.colors && product.colors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">رنگ</h3>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color.code}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color.code
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.code }}
                  onClick={() => setSelectedColor(color.code)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center mb-8">
          <div className="flex items-center border border-border rounded-md mr-4">
            <button
              className="px-3 py-2 text-muted-foreground"
              onClick={decrementQuantity}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 border-x">{quantity}</span>
            <button
              className="px-3 py-2 text-muted-foreground"
              onClick={incrementQuantity}
            >
              <Plus className="h-4 w-4" />
            </button>
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
            className="mr-2"
            aria-label="افزودن به علاقه‌مندی‌ها"
          >
            <Heart className="h-5 w-5" />
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium mb-3">ویژگی‌ها</h3>
          <ul className="space-y-2">
            {product.features ? (
              product.features.map((feature, index) => (
                <li key={index} className="text-sm flex items-start">
                  <span className="ml-2 text-primary">•</span>
                  {feature}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                ویژگی خاصی درج نشده است
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-border pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center">
              <Truck className="h-5 w-5 ml-2 text-muted-foreground" />
              <span className="text-sm">ارسال سریع</span>
            </div>
            <div className="flex items-center">
              <RotateCcw className="h-5 w-5 ml-2 text-muted-foreground" />
              <span className="text-sm">بازگشت تا ۷ روز</span>
            </div>
            <div className="flex items-center">
              <ShieldCheck className="h-5 w-5 ml-2 text-muted-foreground" />
              <span className="text-sm">ضمانت اصالت</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
