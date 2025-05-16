"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Star,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
  Share2,
  Info,
  Bell,
  CheckCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Award,
  Users,
  Calendar,
  BarChart,
  TrendingUp,
} from "lucide-react";
import { useProductStore } from "@/store/product-store";
import { useCartStore } from "@/store/cart-store";
import { useReviewStore } from "@/store/review-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { formatPrice, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import ProductReviews from "@/components/product/ProductReviews";
import { Review } from "@/types/product";

interface ProductDetailPageProps {
  params: {
    productId: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = params;
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isStockNotifyEnabled, setIsStockNotifyEnabled] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [recentlyViewedVisible, setRecentlyViewedVisible] = useState(true);
  const [showPopularityStats, setShowPopularityStats] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  const {
    activeProduct,
    products,
    fetchProductById,
    isLoading,
    error,
    addRecentlyViewed,
    recentlyViewed,
  } = useProductStore();

  const { addItem } = useCartStore();
  const { reviews, addReview, likeReview, dislikeReview } = useReviewStore();
  const { addToFavorites, isFavorite } = useDashboardStore();

  const isProductFavorite = activeProduct
    ? isFavorite(activeProduct.id)
    : false;

  const productReviews = reviews.filter(
    (review) => review.productId === productId
  );

  const avgRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, review) => sum + review.rating, 0) /
        productReviews.length
      : 0;

  useEffect(() => {
    if (activeProduct) {
      addRecentlyViewed(activeProduct);
    }
  }, [activeProduct, addRecentlyViewed]);

  useEffect(() => {
    fetchProductById(productId);
  }, [productId, fetchProductById]);

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return;

    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomPosition({ x, y });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeProduct?.images) return;

      if (e.key === "ArrowLeft") {
        setSelectedImage((prev) =>
          prev < activeProduct.images.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowRight") {
        setSelectedImage((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProduct]);

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">
          در حال بارگذاری محصول...
        </p>
      </div>
    );
  }

  if (error || !activeProduct) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <p className="text-lg text-destructive">
          {error || "محصول مورد نظر یافت نشد"}
        </p>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (
      !selectedSize &&
      activeProduct.sizes &&
      activeProduct.sizes.length > 0
    ) {
      alert("لطفاً سایز مورد نظر خود را انتخاب کنید");
      return;
    }

    if (
      !selectedColor &&
      activeProduct.colors &&
      activeProduct.colors.length > 0
    ) {
      alert("لطفاً رنگ مورد نظر خود را انتخاب کنید");
      return;
    }

    addItem(activeProduct, quantity, selectedSize, selectedColor);

    const notification = document.createElement("div");
    notification.className =
      "fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeOut";
    notification.textContent = "محصول به سبد خرید اضافه شد";
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000);
  };

  const handleToggleFavorite = () => {
    addToFavorites(activeProduct.id);
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddReview = (
    reviewData: Omit<Review, "id" | "date" | "likes" | "dislikes">
  ) => {
    addReview(reviewData);
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextImage = () => {
    if (!activeProduct.images) return;
    setSelectedImage((prev) =>
      prev < activeProduct.images.length - 1 ? prev + 1 : prev
    );
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator
        .share({
          title: activeProduct.name,
          text: activeProduct.description,
          url: window.location.href,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
          setShowShareModal(true);
        });
    } else {
      setShowShareModal(true);
    }
  };

  const similarProducts = products
    .filter(
      (p) =>
        p.categoryId === activeProduct.categoryId && p.id !== activeProduct.id
    )
    .slice(0, 4);

  const otherRecentlyViewed = recentlyViewed
    .filter((p) => p.id !== activeProduct.id)
    .slice(0, 4);

  return (
    <div className="container py-8">
      <div className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">
          خانه
        </a>
        <span className="mx-2">/</span>
        <a href="/products" className="hover:text-primary">
          محصولات
        </a>
        <span className="mx-2">/</span>
        <a
          href={`/categories/${activeProduct.categoryId}`}
          className="hover:text-primary"
        >
          {activeProduct.category}
        </a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{activeProduct.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div>
          <div
            ref={imageContainerRef}
            className={cn(
              "mb-4 aspect-square relative rounded-lg overflow-hidden border cursor-pointer",
              isZoomed && "overflow-hidden"
            )}
            onClick={() => setIsZoomed(!isZoomed)}
            onMouseMove={handleImageMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
          >
            {activeProduct.images && activeProduct.images.length > 0 ? (
              <>
                <Image
                  src={activeProduct.images[selectedImage]}
                  alt={activeProduct.name}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-200",
                    isZoomed && "scale-150"
                  )}
                  style={
                    isZoomed
                      ? {
                          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        }
                      : undefined
                  }
                  priority
                />
                <div className="absolute bottom-4 right-4 bg-black/50 text-white rounded-full p-2">
                  <Maximize2 className="h-5 w-5" />
                </div>

                {/* Image Navigation Arrows */}
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                >
                  <ChevronLeft className="h-5 w-5 text-gray-800" />
                </button>
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                >
                  <ChevronRight className="h-5 w-5 text-gray-800" />
                </button>

                <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {selectedImage + 1} / {activeProduct.images.length}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">بدون تصویر</span>
              </div>
            )}
          </div>

          {activeProduct.images && activeProduct.images.length > 1 && (
            <div className="flex space-x-2 space-x-reverse">
              {activeProduct.images.map((image, index) => (
                <button
                  key={index}
                  className={`w-20 h-20 border rounded-md overflow-hidden ${
                    selectedImage === index
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50 transition-colors"
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <Image
                    src={image}
                    alt={`${activeProduct.name} - تصویر ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}

          {activeProduct.id === "1" && (
            <div className="mt-4 aspect-video relative rounded-lg overflow-hidden border">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">
                    نمایش ویدیوی محصول
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeProduct.sizes && activeProduct.sizes.length > 0 && (
            <div className="mt-4">
              <button
                className="text-sm text-primary flex items-center hover:underline"
                onClick={() => setShowSizeGuide(!showSizeGuide)}
              >
                <Info className="h-4 w-4 ml-1" />
                راهنمای انتخاب سایز
              </button>

              {showSizeGuide && (
                <div className="mt-2 p-4 border border-border rounded-lg bg-card shadow-sm">
                  <h4 className="font-medium mb-2">راهنمای سایز</h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-right">سایز</th>
                          <th className="p-2 text-right">سینه (cm)</th>
                          <th className="p-2 text-right">کمر (cm)</th>
                          <th className="p-2 text-right">باسن (cm)</th>
                          <th className="p-2 text-right">قد (cm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">S</td>
                          <td className="p-2">88-90</td>
                          <td className="p-2">76-78</td>
                          <td className="p-2">94-96</td>
                          <td className="p-2">160-165</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">M</td>
                          <td className="p-2">90-94</td>
                          <td className="p-2">78-82</td>
                          <td className="p-2">96-100</td>
                          <td className="p-2">165-170</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">L</td>
                          <td className="p-2">94-98</td>
                          <td className="p-2">82-86</td>
                          <td className="p-2">100-104</td>
                          <td className="p-2">170-175</td>
                        </tr>
                        <tr>
                          <td className="p-2">XL</td>
                          <td className="p-2">98-102</td>
                          <td className="p-2">86-90</td>
                          <td className="p-2">104-108</td>
                          <td className="p-2">175-180</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>
                      روش اندازه‌گیری: لطفاً از متر نواری استفاده کنید و
                      اندازه‌ها را در حالت ایستاده و بدون کشش اندازه‌گیری کنید.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {activeProduct.isNew && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                جدید
              </span>
            )}
            {activeProduct.originalPrice &&
              activeProduct.originalPrice > activeProduct.price && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                  {Math.round(
                    ((activeProduct.originalPrice - activeProduct.price) /
                      activeProduct.originalPrice) *
                      100
                  )}
                  ٪ تخفیف
                </span>
              )}
            {activeProduct.inStock && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                موجود در انبار
              </span>
            )}
            {activeProduct.isFeatured && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded">
                محصول ویژه
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-primary font-medium">
              {activeProduct.brand}
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 ml-1" />
              <span className="text-sm font-medium">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground mr-1">
                ({productReviews.length} نظر)
              </span>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            {activeProduct.name}
          </h1>

          <div className="mb-4">
            <button
              className="text-sm text-muted-foreground flex items-center hover:text-primary transition-colors"
              onClick={() => setShowPopularityStats(!showPopularityStats)}
            >
              <TrendingUp className="h-4 w-4 ml-1" />
              آمار محبوبیت محصول
              <ChevronRight
                className={cn(
                  "h-4 w-4 mr-1 transition-transform duration-200",
                  showPopularityStats && "transform rotate-90"
                )}
              />
            </button>

            {showPopularityStats && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col items-center p-2 bg-white rounded-md shadow-sm">
                    <Users className="h-5 w-5 text-blue-500 mb-1" />
                    <span className="font-medium">۱۲۵+</span>
                    <span className="text-xs text-muted-foreground">
                      خریداران
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-white rounded-md shadow-sm">
                    <Calendar className="h-5 w-5 text-green-500 mb-1" />
                    <span className="font-medium">۲ ماه</span>
                    <span className="text-xs text-muted-foreground">
                      در فروشگاه
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-white rounded-md shadow-sm">
                    <BarChart className="h-5 w-5 text-purple-500 mb-1" />
                    <span className="font-medium">۸۷٪</span>
                    <span className="text-xs text-muted-foreground">
                      رضایت مشتری
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-white rounded-md shadow-sm">
                    <Award className="h-5 w-5 text-amber-500 mb-1" />
                    <span className="font-medium">۳</span>
                    <span className="text-xs text-muted-foreground">
                      جوایز طراحی
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center mb-6 bg-gray-50 p-3 rounded-lg">
            {activeProduct.originalPrice &&
            activeProduct.originalPrice > activeProduct.price ? (
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(activeProduct.price)}
                  </span>
                  <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded mr-2">
                    {Math.round(
                      ((activeProduct.originalPrice - activeProduct.price) /
                        activeProduct.originalPrice) *
                        100
                    )}
                    ٪
                  </span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(activeProduct.originalPrice)}
                  </span>
                  <span className="text-xs text-green-600 mr-2">
                    {formatPrice(
                      activeProduct.originalPrice - activeProduct.price
                    )}{" "}
                    تومان تخفیف
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-2xl font-bold">
                {formatPrice(activeProduct.price)}
              </span>
            )}
          </div>

          <div className="mb-6">
            <p className="text-foreground leading-relaxed">
              {activeProduct.description}
            </p>
          </div>

          {activeProduct.sizes && activeProduct.sizes.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">سایز</h3>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                >
                  راهنمای سایز
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeProduct.sizes.map((size) => (
                  <button
                    key={size}
                    className={`px-4 py-2 border rounded-md text-sm transition-all ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-foreground hover:border-gray-400"
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeProduct.colors && activeProduct.colors.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">رنگ</h3>
                <span className="text-xs text-muted-foreground">
                  {selectedColor
                    ? activeProduct.colors.find((c) => c.code === selectedColor)
                        ?.name
                    : "لطفاً رنگ را انتخاب کنید"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {activeProduct.colors.map((color) => (
                  <button
                    key={color.code}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedColor === color.code
                        ? "ring-2 ring-primary ring-offset-2"
                        : "ring-1 ring-border hover:ring-gray-400"
                    }`}
                    onClick={() => setSelectedColor(color.code)}
                    title={color.name}
                  >
                    <span
                      className="w-8 h-8 rounded-full block"
                      style={{ backgroundColor: color.code }}
                    />
                    {selectedColor === color.code && (
                      <CheckCircle className="absolute h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            {activeProduct.inStock ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 ml-2" />
                <span className="font-medium">موجود در انبار</span>
                <span className="text-xs text-muted-foreground mr-2">
                  ارسال طی ۲-۳ روز کاری
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-red-500 font-medium flex items-center">
                  <svg
                    className="h-5 w-5 ml-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="8" x2="16" y2="16" />
                    <line x1="16" y1="8" x2="8" y2="16" />
                  </svg>
                  ناموجود
                </div>
                <button
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-md transition-colors flex items-center",
                    isStockNotifyEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                  onClick={() => setShowNotifyModal(true)}
                >
                  {isStockNotifyEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 ml-1" />
                      به من اطلاع بده
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 ml-1" />
                      موجود شد، خبرم کن
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {activeProduct.inStock && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="flex items-center justify-between border border-border rounded-md">
                <button
                  className="px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 border-x">{quantity}</span>
                <button
                  className="px-3 py-2 text-muted-foreground hover:text-primary transition-colors"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-grow grid grid-cols-5 gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddToCart}
                  className="col-span-3 transition-transform active:scale-95"
                >
                  افزودن به سبد خرید
                </Button>

                <Button
                  variant={isProductFavorite ? "primary" : "outline"}
                  size="lg"
                  className="col-span-1"
                  onClick={handleToggleFavorite}
                  aria-label="افزودن به علاقه‌مندی‌ها"
                >
                  <Heart
                    className="h-5 w-5"
                    fill={isProductFavorite ? "currentColor" : "none"}
                  />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="col-span-1"
                  onClick={handleShareProduct}
                  aria-label="اشتراک‌گذاری محصول"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">ویژگی‌های محصول</h3>
            <ul className="space-y-2">
              {activeProduct.features ? (
                activeProduct.features.map((feature, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 ml-2 flex-shrink-0" />
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

          <div className="border rounded-lg mb-6 overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-x-reverse">
              <button className="py-3 text-sm font-medium bg-primary/5 text-primary">
                توضیحات تکمیلی
              </button>
              <button className="py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                نحوه نگهداری
              </button>
              <button className="py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                جدول سایزبندی
              </button>
            </div>
            <div className="p-4 text-sm leading-relaxed">
              <p>
                {activeProduct.name} یکی از محصولات پرطرفدار و باکیفیت برند{" "}
                {activeProduct.brand} است که با بهترین مواد اولیه و دقت بالا
                تولید شده است. این محصول دارای طراحی منحصر به فرد و زیبایی است
                که آن را از سایر محصولات مشابه متمایز می‌کند.
              </p>
              <p className="mt-2">
                پارچه به کار رفته در این محصول دارای کیفیت عالی و مقاوم در برابر
                پارگی و آسیب‌های معمول است. همچنین این محصول قابل شستشو در ماشین
                لباسشویی است و پس از شستشو کیفیت و رنگ خود را حفظ می‌کند.
              </p>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse">
              <div className="flex flex-col items-center p-4 hover:bg-gray-50 transition-colors">
                <Truck className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium text-sm">ارسال سریع</h4>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  ارسال به سراسر کشور
                  <br />
                  طی ۲-۳ روز کاری
                </p>
              </div>
              <div className="flex flex-col items-center p-4 hover:bg-gray-50 transition-colors">
                <RotateCcw className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium text-sm">۷ روز ضمانت بازگشت</h4>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  در صورت عدم رضایت
                  <br />
                  بدون قید و شرط
                </p>
              </div>
              <div className="flex flex-col items-center p-4 hover:bg-gray-50 transition-colors">
                <ShieldCheck className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium text-sm">ضمانت اصالت کالا</h4>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  تضمین اصالت و کیفیت
                  <br />
                  تمامی محصولات
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowNotifyModal(false)}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="text-center mb-6">
              <Bell className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold">اطلاع از موجود شدن کالا</h3>
              <p className="text-sm text-muted-foreground mt-1">
                به محض موجود شدن {activeProduct.name} به شما اطلاع خواهیم داد.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">ایمیل</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="ایمیل خود را وارد کنید"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                شماره موبایل
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="شماره موبایل خود را وارد کنید"
              />
            </div>

            <div className="flex items-center mb-4">
              <input type="checkbox" id="notify-size" className="ml-2" />
              <label htmlFor="notify-size" className="text-sm">
                فقط در صورت موجود شدن سایز {selectedSize || "انتخاب شده"} به من
                اطلاع بده
              </label>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowNotifyModal(false)}
              >
                انصراف
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
                onClick={() => {
                  setIsStockNotifyEnabled(true);
                  setShowNotifyModal(false);
                }}
              >
                ثبت درخواست
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowShareModal(false)}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="text-center mb-6">
              <Share2 className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold">اشتراک‌گذاری محصول</h3>
              <p className="text-sm text-muted-foreground mt-1">
                این محصول را با دوستان خود به اشتراک بگذارید
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <input
                  type="text"
                  className="flex-grow px-3 py-2 border-none outline-none"
                  value={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  readOnly
                />
                <button className="bg-gray-100 border-r border-gray-300 px-3 py-2 text-sm">
                  کپی
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <button className="flex flex-col items-center bg-blue-500 text-white p-3 rounded-md">
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                </svg>
                <span className="text-xs">فیسبوک</span>
              </button>
              <button className="flex flex-col items-center bg-[#1DA1F2] text-white p-3 rounded-md">
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
                <span className="text-xs">توییتر</span>
              </button>
              <button className="flex flex-col items-center bg-[#0088cc] text-white p-3 rounded-md">
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.192-.46.16-1.082.362-1.61.984-.133.155-.267.354-.335.628s-.077.556.006.787c.134.37.313.627.53.815.217.187.566.36.92.463.354.104.922.166 1.27.178.348.012.737-.002 1.14-.028.404-.026.75-.062 1.058-.098.155-.018.293-.033.424-.048l4.146-1.535 4.31 1.11.163.033c.375.06.787.108 1.188.032.4-.077.787-.282 1.004-.604.217-.323.3-.752.215-1.124-.09-.375-.293-.653-.513-.853-.22-.2-.486-.34-.754-.432-.268-.092-.56-.145-.794-.155-.234-.01-.38.005-.483.02l-.127.025c-.563.11-.94.188-1.31.26-.374.075-.797.16-1.254.107-.457-.053-.85-.25-1.298-.65-.447-.4-.752-.842-1.042-1.386-.174-.33-.348-.683-.56-1.013-.21-.33-.488-.7-.904-.665-.18.016-.34.07-.48.166-.13.096-.252.238-.327.39-.075.15-.136.334-.166.48-.03.146-.049.344-.054.48-.026.654.06 1.385.222 2.21.162.826.395 1.755.703 2.637.31.882.685 1.76 1.127 2.562.442.802.957 1.51 1.59 2.047l.108.09c.464.387 1.055.705 1.674.92.62.213 1.25.324 1.848.324s1.157-.055 1.64-.184c.484-.13.943-.318 1.306-.583l.075-.055c.32-.236.673-.552 1.028-.908.355-.356.678-.734.96-1.114.282-.38.512-.765.697-1.143.185-.377.312-.75.386-1.085.075-.335.098-.633.098-.885 0-.323-.062-.637-.186-.932-.124-.295-.334-.564-.577-.8-.122-.116-.264-.232-.423-.342-.16-.11-.34-.213-.506-.313-.334-.2-.61-.41-.814-.595l-.456-.414c-.306-.286-.59-.56-.855-.81-.265-.253-.508-.486-.71-.675l-.31-.286c-.37-.34-.8-.74-1.245-1.132-.447-.392-.913-.777-1.39-1.144l-.254-.193c-.117-.09-.219-.16-.318-.23-.1-.07-.193-.138-.276-.195l-.075-.05c-.192-.12-.48-.237-.708-.257l-.106-.01z" />
                </svg>
                <span className="text-xs">تلگرام</span>
              </button>
              <button className="flex flex-col items-center bg-[#25D366] text-white p-3 rounded-md">
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-xs">واتساپ</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
                onClick={() => setShowShareModal(false)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {otherRecentlyViewed.length > 0 && recentlyViewedVisible && (
        <div className="border-t pt-12 mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">محصولاتی که اخیراً دیده‌اید</h2>
            <button
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() => setRecentlyViewedVisible(false)}
            >
              مخفی کردن
            </button>
          </div>
          <ProductGrid products={otherRecentlyViewed} columns={4} />
        </div>
      )}

      <div className="border-t pt-12 mb-16">
        <ProductReviews
          productId={productId}
          reviews={productReviews}
          avgRating={avgRating}
          onAddReview={handleAddReview}
        />
      </div>

      {similarProducts.length > 0 && (
        <div className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-8">محصولات مشابه</h2>
          <ProductGrid products={similarProducts} columns={4} />
        </div>
      )}
    </div>
  );
}
