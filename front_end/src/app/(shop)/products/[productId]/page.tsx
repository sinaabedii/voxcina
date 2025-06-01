"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
  Share2,
  Bell,
  CheckCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  ArrowRight,
  X,
  Camera,
  Shirt,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductStore } from "@/store/product-store";
import { useCartStore } from "@/store/cart-store";
import { useReviewStore } from "@/store/review-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { formatPrice, cn, getDiscountPercentage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import ProductReviews from "@/components/product/ProductReviews";
import { Review } from "@/types/product";
import { useCategoryStore } from "@/store/category-store";
import Link from "next/link";
import { useTryOnStore } from "@/store/tryon-store";

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
  const [showTryOnModal, setShowTryOnModal] = useState(false);

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
  const { categories, fetchCategories, getCategoryName } = useCategoryStore();
  const {
    uploadedPreview,
    uploadedFile,
    resultImage,
    isProcessing: isTryOnLoading,
    taskToken,
    setUploadedFile,
    startTryOn,
    resumePending,
  } = useTryOnStore();

  const isProductFavorite =
    activeProduct && activeProduct.id ? isFavorite(activeProduct.id) : false;

  // Extract available sizes and colors from variants
  const availableSizes = activeProduct
    ? [...new Set(activeProduct.variants.map((variant) => variant.size))]
    : [];

  const availableColors = activeProduct
    ? [...new Set(activeProduct.variants.map((variant) => variant.color))]
    : [];

  // Get available sizes based on selected color
  const getAvailableSizesForColor = (color: string | undefined) => {
    if (!activeProduct || !color) return availableSizes;
    return [
      ...new Set(
        activeProduct.variants
          .filter((v) => v.color === color && v.quantity > 0)
          .map((v) => v.size)
      ),
    ];
  };

  // Get available colors based on selected size
  const getAvailableColorsForSize = (size: string | undefined) => {
    if (!activeProduct || !size) return availableColors;
    return [
      ...new Set(
        activeProduct.variants
          .filter((v) => v.size === size && v.quantity > 0)
          .map((v) => v.color)
      ),
    ];
  };

  // Check if a specific variant is in stock
  const isVariantInStock = (size: string, color: string) => {
    if (!activeProduct) return false;
    return activeProduct.variants.some(
      (v) => v.size === size && v.color === color && v.quantity > 0
    );
  };

  // Get available sizes based on selected color
  const availableSizesForSelectedColor = selectedColor
    ? getAvailableSizesForColor(selectedColor)
    : availableSizes;

  // Get available colors based on selected size
  const availableColorsForSelectedSize = selectedSize
    ? getAvailableColorsForSize(selectedSize)
    : availableColors;

  // Clear selection handler
  const handleClearSelection = () => {
    setSelectedSize(undefined);
    setSelectedColor(undefined);
  };

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

  // resume pending job when token becomes available (after hydration)
  useEffect(() => {
    if (taskToken) {
      resumePending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskToken]);

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
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
            در حال بارگذاری محصول...
          </p>
        </div>
      </div>
    );
  }

  if (error || !activeProduct) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center">
        <motion.div
          className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border border-red-100 dark:border-red-800/30 shadow-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <X className="h-10 w-10 text-red-500 dark:text-red-400" />
        </motion.div>
        <motion.p
          className="text-lg text-red-600 dark:text-red-400 font-medium mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {error || "محصول مورد نظر یافت نشد"}
        </motion.p>
        <motion.p
          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 text-center max-w-md"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          متأسفانه نمی‌توانیم اطلاعات این محصول را پیدا کنیم. لطفاً بعداً دوباره
          تلاش کنید یا به صفحه محصولات بازگردید.
        </motion.p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
        >
          <Link
            href="/products"
            className="inline-flex items-center px-5 py-2.5 bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream text-white dark:text-voxcina-blue font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            بازگشت به صفحه محصولات
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize && availableSizes.length > 0) {
      alert("لطفاً سایز مورد نظر خود را انتخاب کنید");
      return;
    }

    if (!selectedColor && availableColors.length > 0) {
      alert("لطفاً رنگ مورد نظر خود را انتخاب کنید");
      return;
    }

    // Check if the selected variant is in stock
    if (
      selectedSize &&
      selectedColor &&
      !isVariantInStock(selectedSize, selectedColor)
    ) {
      alert("ترکیب سایز و رنگ انتخابی موجود نیست");
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
    if (activeProduct && activeProduct.id) {
      addToFavorites(activeProduct.id);
    }
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
        activeProduct &&
        activeProduct.category_ids &&
        activeProduct.category_ids.length > 0 &&
        p.category_ids &&
        p.category_ids.some((catId) =>
          activeProduct.category_ids.includes(catId)
        ) &&
        p.id !== activeProduct.id
    )
    .slice(0, 4);

  const otherRecentlyViewed = recentlyViewed
    .filter((p) => p.id !== activeProduct.id)
    .slice(0, 4);

  const handleTryOnSubmit = async () => {
    if (!activeProduct?.tryOnImage) return;
    await startTryOn(activeProduct.tryOnImage);
    setShowTryOnModal(false);
  };

  const handleUserImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
  };

  return (
    <div className="container py-8 md:py-16">
      {/* Try-on result section */}
      {isTryOnLoading && (
        <div className="flex items-center justify-center mb-6">
          <RefreshCw className="w-6 h-6 mr-2 animate-spin" />
          <span>در حال پردازش تصویر واقعیت افزوده...</span>
        </div>
      )}

      {!isTryOnLoading && resultImage && (
        <div className="mb-6 flex flex-col items-center">
          <h3 className="font-semibold mb-2 flex items-center">
            <Shirt className="w-5 h-5 ml-1" /> نتیجه واقعیت افزوده
          </h3>
          {/* For mock we just show product try-on image; in real case would combine */}
          <img
            src={resultImage}
            alt="نتیجه واقعیت افزوده"
            className="max-w-xs rounded-lg shadow"
          />
        </div>
      )}

      <motion.div
        className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6 flex flex-wrap items-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <a
          href="/"
          className="hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
        >
          خانه
        </a>
        <span className="mx-2">/</span>
        <a
          href="/products"
          className="hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
        >
          محصولات
        </a>
        {activeProduct &&
          activeProduct.category_ids &&
          activeProduct.category_ids.length > 0 && (
            <>
              <span className="mx-2">/</span>
              <a
                href={`/categories/${activeProduct.category_ids[0]}`}
                className="hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
              >
                {getCategoryName(activeProduct.category_ids[0])}
              </a>
            </>
          )}
        <span className="mx-2">/</span>
        <span className="text-voxcina-blue dark:text-voxcina-cream">
          {activeProduct.name}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            ref={imageContainerRef}
            className={cn(
              "mb-4 aspect-square relative rounded-2xl overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 cursor-pointer shadow-sm bg-white/90 dark:bg-voxcina-blue/10",
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
                    "object-cover transition-transform duration-300",
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
                <motion.div
                  className="absolute bottom-4 right-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white dark:text-voxcina-cream rounded-full p-2 backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Maximize2 className="h-5 w-5" />
                </motion.div>

                {/* Image Navigation Arrows */}
                <motion.button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  whileHover={{ scale: 1.1, x: -3 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-white" />
                </motion.button>
                <motion.button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  whileHover={{ scale: 1.1, x: 3 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-white" />
                </motion.button>

                <div className="absolute bottom-4 left-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {selectedImage + 1} / {activeProduct.images.length}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-voxcina-cream/20 dark:bg-voxcina-blue/20">
                <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50">
                  بدون تصویر
                </span>
              </div>
            )}
          </div>

          {activeProduct.images && activeProduct.images.length > 1 && (
            <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
              {activeProduct.images.map((image, index) => (
                <motion.button
                  key={index}
                  className={`w-20 h-20 min-w-[5rem] border rounded-xl overflow-hidden ${
                    selectedImage === index
                      ? "border-voxcina-blue dark:border-voxcina-cream ring-2 ring-voxcina-blue/30 dark:ring-voxcina-cream/30 shadow-sm"
                      : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/50 transition-colors"
                  }`}
                  onClick={() => setSelectedImage(index)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src={image}
                    alt={`${activeProduct.name} - تصویر ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </motion.button>
              ))}
            </div>
          )}

          {activeProduct.id === "1" && (
            <motion.div
              className="mt-6 aspect-video relative rounded-2xl overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-voxcina-cream/30 dark:bg-voxcina-blue/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                    نمایش ویدیوی محصول
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Product Name and Price Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
              {activeProduct.name}
            </h1>
            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
              {activeProduct.brand && (
                <span className="font-medium">{activeProduct.brand}</span>
              )}
            </p>

            {/* Price Display */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                {formatPrice(activeProduct.price)}
              </span>

              {activeProduct.originalPrice &&
                activeProduct.originalPrice > activeProduct.price && (
                  <span className="text-lg text-voxcina-blue/50 dark:text-voxcina-cream/50 line-through">
                    {formatPrice(activeProduct.originalPrice)}
                  </span>
                )}

              {activeProduct.originalPrice &&
                activeProduct.originalPrice > activeProduct.price && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg">
                    {getDiscountPercentage(
                      activeProduct.originalPrice,
                      activeProduct.price
                    )}
                    ٪ تخفیف
                  </span>
                )}
            </div>
          </div>

          {availableSizes.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                  سایز
                </h3>
                <div className="flex items-center gap-4">
                  <button
                    className="text-xs text-voxcina-blue dark:text-voxcina-cream hover:text-voxcina-blue/70 dark:hover:text-voxcina-cream/70 transition-colors"
                    onClick={() => setShowSizeGuide(!showSizeGuide)}
                  >
                    راهنمای سایز
                  </button>
                  {(selectedSize || selectedColor) && (
                    <button
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex items-center"
                      onClick={handleClearSelection}
                    >
                      <X className="h-3 w-3 ml-1" />
                      حذف انتخاب
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isAvailable =
                    !selectedColor ||
                    availableSizesForSelectedColor.includes(size);
                  return (
                    <motion.button
                      key={size}
                      className={`px-4 py-2 border rounded-lg text-sm transition-all ${
                        selectedSize === size
                          ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream font-medium shadow-sm"
                          : isAvailable
                          ? "border-voxcina-cream/50 dark:border-voxcina-blue/30 text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/50"
                          : "border-voxcina-cream/30 dark:border-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed opacity-60"
                      }`}
                      onClick={() =>
                        isAvailable &&
                        setSelectedSize(
                          selectedSize === size ? undefined : size
                        )
                      }
                      whileHover={isAvailable ? { y: -2 } : {}}
                      whileTap={isAvailable ? { scale: 0.97 } : {}}
                      disabled={!isAvailable}
                    >
                      {size}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {showSizeGuide && (
            <motion.div
              className="mt-2 p-4 border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl bg-white/90 dark:bg-voxcina-blue/10 shadow-sm backdrop-blur-sm mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h4 className="font-medium mb-3 text-voxcina-blue dark:text-voxcina-cream">
                راهنمای سایز
              </h4>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
                      <th className="p-2 text-right text-voxcina-blue dark:text-voxcina-cream">
                        سایز
                      </th>
                      <th className="p-2 text-right text-voxcina-blue dark:text-voxcina-cream">
                        سینه (cm)
                      </th>
                      <th className="p-2 text-right text-voxcina-blue dark:text-voxcina-cream">
                        کمر (cm)
                      </th>
                      <th className="p-2 text-right text-voxcina-blue dark:text-voxcina-cream">
                        باسن (cm)
                      </th>
                      <th className="p-2 text-right text-voxcina-blue dark:text-voxcina-cream">
                        قد (cm)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-voxcina-cream/20 dark:border-voxcina-blue/20 hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                      <td className="p-2 text-voxcina-blue dark:text-voxcina-cream">
                        S
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        88-90
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        76-78
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        94-96
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        160-165
                      </td>
                    </tr>
                    <tr className="border-b border-voxcina-cream/20 dark:border-voxcina-blue/20 hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                      <td className="p-2 text-voxcina-blue dark:text-voxcina-cream">
                        M
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        90-94
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        78-82
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        96-100
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        165-170
                      </td>
                    </tr>
                    <tr className="border-b border-voxcina-cream/20 dark:border-voxcina-blue/20 hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                      <td className="p-2 text-voxcina-blue dark:text-voxcina-cream">
                        L
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        94-98
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        82-86
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        100-104
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        170-175
                      </td>
                    </tr>
                    <tr className="hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                      <td className="p-2 text-voxcina-blue dark:text-voxcina-cream">
                        XL
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        98-102
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        86-90
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        104-108
                      </td>
                      <td className="p-2 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        175-180
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                <p>
                  روش اندازه‌گیری: لطفاً از متر نواری استفاده کنید و اندازه‌ها
                  را در حالت ایستاده و بدون کشش اندازه‌گیری کنید.
                </p>
              </div>
            </motion.div>
          )}

          {availableColors.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                  رنگ
                </h3>
                <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  {selectedColor
                    ? availableColors.find((c) => c === selectedColor)
                    : "لطفاً رنگ را انتخاب کنید"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {availableColors.map((color) => {
                  const isAvailable =
                    !selectedSize ||
                    availableColorsForSelectedSize.includes(color);
                  return (
                    <motion.button
                      key={color}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        selectedColor === color
                          ? "ring-2 ring-voxcina-blue dark:ring-voxcina-cream ring-offset-2 dark:ring-offset-voxcina-blue/80"
                          : isAvailable
                          ? "ring-1 ring-voxcina-cream/50 dark:ring-voxcina-blue/30 hover:ring-voxcina-blue/50 dark:hover:ring-voxcina-cream/50"
                          : "ring-1 ring-voxcina-cream/30 dark:ring-voxcina-blue/20 opacity-40 cursor-not-allowed"
                      }`}
                      onClick={() =>
                        isAvailable &&
                        setSelectedColor(
                          selectedColor === color ? undefined : color
                        )
                      }
                      title={color}
                      whileHover={isAvailable ? { scale: 1.1 } : {}}
                      whileTap={isAvailable ? { scale: 0.9 } : {}}
                      disabled={!isAvailable}
                    >
                      <span
                        className="w-8 h-8 rounded-full block"
                        style={{ backgroundColor: color }}
                      />
                      {selectedColor === color && (
                        <CheckCircle className="absolute h-4 w-4 text-white drop-shadow-md" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mb-6">
            {activeProduct.inStock ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5 ml-2" />
                <span className="font-medium">موجود در انبار</span>
                <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mr-2 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 px-2 py-1 rounded-lg">
                  ارسال طی ۲-۳ روز کاری
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-red-500 dark:text-red-400 font-medium flex items-center">
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
                <motion.button
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-xl transition-all flex items-center",
                    isStockNotifyEnabled
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-voxcina-cream/30 dark:bg-voxcina-blue/20 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/50 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                  )}
                  onClick={() => setShowNotifyModal(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
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
                </motion.button>
              </div>
            )}
          </div>

          {activeProduct.inStock && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="flex items-center justify-between border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl overflow-hidden bg-white/80 dark:bg-voxcina-blue/20 shadow-sm">
                <motion.button
                  className="px-3 py-2 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Minus className="h-4 w-4" />
                </motion.button>
                <span className="px-4 py-2 border-x border-voxcina-cream/50 dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream font-medium">
                  {quantity}
                </span>
                <motion.button
                  className="px-3 py-2 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                  onClick={incrementQuantity}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>

              <div className="flex-grow grid grid-cols-6 gap-2">
                <motion.div
                  className="col-span-3"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleAddToCart}
                    className="w-full rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    افزودن به سبد خرید
                  </Button>
                </motion.div>

                <motion.div
                  className="col-span-1"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={isProductFavorite ? "primary" : "outline"}
                    size="lg"
                    className={`w-full rounded-xl ${
                      isProductFavorite
                        ? "bg-red-500 hover:bg-red-600 text-white dark:bg-red-500 dark:hover:bg-red-600"
                        : "border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30"
                    } shadow-sm hover:shadow-md transition-all duration-300`}
                    onClick={handleToggleFavorite}
                    aria-label="افزودن به علاقه‌مندی‌ها"
                  >
                    <Heart
                      className="h-5 w-5"
                      fill={isProductFavorite ? "currentColor" : "none"}
                    />
                  </Button>
                </motion.div>

                {/* Try-On Button */}
                <motion.div
                  className="col-span-1"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-40"
                    disabled={!activeProduct.tryOnImage}
                    onClick={() => setShowTryOnModal(true)}
                    aria-label="آزمایش مجازی"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </motion.div>

                <motion.div
                  className="col-span-1"
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={handleShareProduct}
                    aria-label="اشتراک‌گذاری محصول"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          )}

          <motion.div
            className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl p-4 mb-6 shadow-sm backdrop-blur-sm"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-sm font-medium mb-3 text-voxcina-blue dark:text-voxcina-cream">
              ویژگی‌های محصول
            </h3>
            <ul className="space-y-2">
              {activeProduct.attributes &&
                activeProduct.attributes
                  .filter(
                    (attr) =>
                      attr.value &&
                      attr.value.trim() !== "" &&
                      attr.value.toLowerCase() !== "false" &&
                      attr.value !== "0"
                  )
                  .map((attribute, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 ml-2 flex-shrink-0" />
                      <span className="text-voxcina-blue/80 dark:text-voxcina-cream/80">
                        {/* Use shownName if available, otherwise fallback to name */}
                        {attribute.shownName || attribute.name}:{" "}
                        {attribute.value}
                      </span>
                    </li>
                  ))}
              {(!activeProduct.attributes ||
                !activeProduct.attributes.some(
                  (attr) =>
                    attr.value &&
                    attr.value.trim() !== "" &&
                    attr.value.toLowerCase() !== "false" &&
                    attr.value !== "0"
                )) && (
                <li className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  ویژگی خاصی درج نشده است
                </li>
              )}
            </ul>
          </motion.div>
          <motion.div
            className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl mb-6 overflow-hidden shadow-sm backdrop-blur-sm"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-voxcina-cream/30 dark:divide-voxcina-blue/30">
              <button className="py-3 text-sm font-medium bg-voxcina-cream/30 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream">
                توضیحات تکمیلی
              </button>
              <button className="py-3 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                نحوه نگهداری
              </button>
              <button className="py-3 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">
                جدول سایزبندی
              </button>
            </div>
            <div className="p-4 text-sm leading-relaxed text-voxcina-blue/80 dark:text-voxcina-cream/80">
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
          </motion.div>

          <motion.div
            className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-voxcina-cream/30 dark:divide-voxcina-blue/30">
              <div className="flex flex-col items-center p-4 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors">
                <Truck className="h-6 w-6 text-voxcina-blue dark:text-voxcina-cream mb-2" />
                <h4 className="font-medium text-sm text-voxcina-blue dark:text-voxcina-cream">
                  ارسال سریع
                </h4>
                <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 text-center mt-1">
                  ارسال به سراسر کشور
                  <br />
                  طی ۲-۳ روز کاری
                </p>
              </div>
              <div className="flex flex-col items-center p-4 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors">
                <RotateCcw className="h-6 w-6 text-voxcina-blue dark:text-voxcina-cream mb-2" />
                <h4 className="font-medium text-sm text-voxcina-blue dark:text-voxcina-cream">
                  ۷ روز ضمانت بازگشت
                </h4>
                <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 text-center mt-1">
                  در صورت عدم رضایت
                  <br />
                  بدون قید و شرط
                </p>
              </div>
              <div className="flex flex-col items-center p-4 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors">
                <ShieldCheck className="h-6 w-6 text-voxcina-blue dark:text-voxcina-cream mb-2" />
                <h4 className="font-medium text-sm text-voxcina-blue dark:text-voxcina-cream">
                  ضمانت اصالت کالا
                </h4>
                <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 text-center mt-1">
                  تضمین اصالت و کیفیت
                  <br />
                  تمامی محصولات
                </p>
              </div>
            </div>
          </motion.div>

          {/* Virtual Try-On Button (moved here for better visibility) */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={!activeProduct.tryOnImage}
              onClick={() => setShowTryOnModal(true)}
            >
              <Camera className="w-4 h-4 ml-1" />
              آزمایش مجازی
            </Button>
            {!activeProduct.tryOnImage && (
              <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 ml-2">
                (در دسترس نیست)
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Augmented Reality Section - Between Product Details and Recently Viewed */}
      <motion.div 
        className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-8 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-6">
          واقعیت افزوده
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Try-On Feature */}
          <motion.div 
            className="col-span-1 md:col-span-1 bg-white/70 dark:bg-voxcina-blue/10 border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl p-5 shadow-sm backdrop-blur-sm"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Camera className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
              </div>
              <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                آزمایش مجازی لباس
              </h3>
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
                با آپلود عکس خود، ببینید این محصول چطور به شما می‌آید
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                disabled={!activeProduct.tryOnImage}
                onClick={() => setShowTryOnModal(true)}
              >
                <Camera className="w-4 h-4 ml-1" />
                امتحان لباس روی عکس
              </Button>
              
              {!activeProduct.tryOnImage && (
                <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-2">
                  (برای این محصول در دسترس نیست)
                </span>
              )}
              
              {/* Display the result if available */}
              {resultImage && (
                <div className="mt-4 pt-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 w-full">
                  <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2">
                    نتیجه آخرین آزمایش:
                  </p>
                  <img 
                    src={resultImage} 
                    alt="نتیجه آزمایش مجازی" 
                    className="rounded-lg shadow-sm w-full object-cover"
                  />
                </div>
              )}
            </div>
          </motion.div>
          
          {/* 3D View Feature */}
          <motion.div 
            className="col-span-1 md:col-span-1 bg-white/70 dark:bg-voxcina-blue/10 border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl p-5 shadow-sm backdrop-blur-sm"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Maximize2 className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
              </div>
              <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                نمایش سه‌بعدی
              </h3>
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
                محصول را از تمام زوایا مشاهده کنید
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                disabled={true}
              >
                <Maximize2 className="w-4 h-4 ml-1" />
                مشاهده سه‌بعدی
              </Button>
              <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-2">
                (به زودی)
              </span>
            </div>
          </motion.div>
          
          {/* QR Code for AR */}
          <motion.div 
            className="col-span-1 md:col-span-1 bg-white/70 dark:bg-voxcina-blue/10 border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl p-5 shadow-sm backdrop-blur-sm"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Shirt className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
              </div>
              <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                واقعیت افزوده
              </h3>
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
                کد QR را اسکن کنید و محصول را در فضای واقعی ببینید
              </p>
              <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-sm mb-3 flex items-center justify-center">
                <div className="border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20 w-full h-full flex items-center justify-center">
                  <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                    QR Code
                  </span>
                </div>
              </div>
              <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                (به زودی)
              </span>
            </div>
          </motion.div>
        </div>
        
        {/* Loading and Result Preview Row */}
        {(isTryOnLoading || resultImage) && (
          <div className="mt-6 p-4 rounded-xl bg-white/70 dark:bg-voxcina-blue/10 border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
            {isTryOnLoading && (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 relative mb-3">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                  در حال پردازش تصویر...
                </p>
              </div>
            )}
            
            {!isTryOnLoading && resultImage && (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="md:w-1/4">
                  <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2 text-center md:text-right">
                    نتیجه آزمایش مجازی
                  </h4>
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4 text-center md:text-right">
                    تصویر شما با این محصول
                  </p>
                </div>
                <div className="md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedPreview && (
                    <div className="aspect-square relative rounded-lg overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
                      <img 
                        src={uploadedPreview} 
                        alt="تصویر شما" 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                        تصویر اصلی
                      </div>
                    </div>
                  )}
                  <div className="aspect-square relative rounded-lg overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
                    <img 
                      src={resultImage} 
                      alt="نتیجه آزمایش مجازی" 
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                      با لباس
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showNotifyModal && (
          <motion.div
            className="fixed inset-0 bg-voxcina-blue/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifyModal(false)}
          >
            <motion.div
              className="bg-white/95 dark:bg-voxcina-blue/95 rounded-2xl max-w-md w-full p-6 relative shadow-lg backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/50"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream transition-colors"
                onClick={() => setShowNotifyModal(false)}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Bell className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
                <h3 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                  اطلاع از موجود شدن کالا
                </h3>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                  به محض موجود شدن {activeProduct.name} به شما اطلاع خواهیم داد.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-voxcina-blue dark:text-voxcina-cream">
                  ایمیل
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl bg-white/70 dark:bg-voxcina-blue/20 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 dark:focus:ring-voxcina-cream/30 text-voxcina-blue dark:text-voxcina-cream shadow-inner-soft"
                  placeholder="ایمیل خود را وارد کنید"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-voxcina-blue dark:text-voxcina-cream">
                  شماره موبایل
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl bg-white/70 dark:bg-voxcina-blue/20 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 dark:focus:ring-voxcina-cream/30 text-voxcina-blue dark:text-voxcina-cream shadow-inner-soft"
                  placeholder="شماره موبایل خود را وارد کنید"
                />
              </div>

              <div className="flex items-center mb-6">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="notify-size"
                    className="opacity-0 absolute h-5 w-5 cursor-pointer"
                  />
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-voxcina-cream/50 dark:border-voxcina-blue/40 bg-white/50 dark:bg-voxcina-blue/20 mr-2">
                    <Check className="h-3 w-3 text-voxcina-blue dark:text-voxcina-cream invisible peer-checked:visible" />
                  </div>
                  <label
                    htmlFor="notify-size"
                    className="text-sm cursor-pointer text-voxcina-blue/80 dark:text-voxcina-cream/80"
                  >
                    فقط در صورت موجود شدن سایز {selectedSize || "انتخاب شده"} به
                    من اطلاع بده
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse">
                <motion.button
                  className="px-4 py-2 text-sm border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/30 transition-colors shadow-sm"
                  onClick={() => setShowNotifyModal(false)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  انصراف
                </motion.button>
                <motion.button
                  className="px-4 py-2 text-sm bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => {
                    setIsStockNotifyEnabled(true);
                    setShowNotifyModal(false);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ثبت درخواست
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 bg-voxcina-blue/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="bg-white/95 dark:bg-voxcina-blue/95 rounded-2xl max-w-md w-full p-6 relative shadow-lg backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/50"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream transition-colors"
                onClick={() => setShowShareModal(false)}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Share2 className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
                <h3 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                  اشتراک‌گذاری محصول
                </h3>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                  این محصول را با دوستان خود به اشتراک بگذارید
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-center border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl overflow-hidden shadow-sm">
                  <input
                    type="text"
                    className="flex-grow px-3 py-2 border-none outline-none bg-white/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream"
                    value={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    readOnly
                  />
                  <button className="bg-voxcina-cream/50 dark:bg-voxcina-blue/40 border-r border-voxcina-cream/50 dark:border-voxcina-blue/30 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream dark:hover:bg-voxcina-blue/50 transition-colors">
                    کپی
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <motion.button
                  className="flex flex-col items-center bg-blue-500 text-white p-3 rounded-xl shadow-sm"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg
                    className="w-6 h-6 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                  </svg>
                  <span className="text-xs">فیسبوک</span>
                </motion.button>
                <motion.button
                  className="flex flex-col items-center bg-[#1DA1F2] text-white p-3 rounded-xl shadow-sm"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg
                    className="w-6 h-6 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0023 3z"></path>
                  </svg>
                  <span className="text-xs">توییتر</span>
                </motion.button>
                <motion.button
                  className="flex flex-col items-center bg-[#0088cc] text-white p-3 rounded-xl shadow-sm"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg
                    className="w-6 h-6 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.192-.46.16-1.082.362-1.61.984-.133.155-.267.354-.335.628s-.077.556.006.787c.134.37.313.627.53.815.217.187.566.36.92.463.354.104.922.166 1.27.178.348.012.737-.002 1.14-.028.404-.026.75-.062 1.058-.098.155-.018.293-.033.424-.048l4.146-1.535 4.31 1.11.163.033c.375.06.787.108 1.188.032.4-.077.787-.282 1.004-.604.217-.323.3-.752.215-1.124-.09-.375-.293-.653-.513-.853-.22-.2-.486-.34-.754-.432-.268-.092-.56-.145-.794-.155-.234-.01-.38.005-.483.02l-.127.025c-.563.11-.94.188-1.31.26-.374.075-.797.16-1.254.107-.457-.053-.85-.25-1.298-.65-.447-.4-.752-.842-1.042-1.386-.174-.33-.348-.683-.56-1.013-.21-.33-.488-.7-.904-.665-.18.016-.34.07-.48.166-.13.096-.252.238-.327.39-.075.15-.136.334-.166.48-.03.146-.049.344-.054.48-.026.654.06 1.385.222 2.21.162.826.395 1.755.703 2.637.31.882.685 1.76 1.127 2.562.442.802.957 1.51 1.59 2.047l.108.09c.464.387 1.055.705 1.674.92.62.213 1.25.324 1.848.324s1.157-.055 1.64-.184c.484-.13.943-.318 1.306-.583l.075-.055c.32-.236.673-.552 1.028-.908.355-.356.678-.734.96-1.114.282-.38.512-.765.697-1.143.185-.377.312-.75.386-1.085.075-.335.098-.633.098-.885 0-.323-.062-.637-.186-.932-.124-.295-.334-.564-.577-.8-.122-.116-.264-.232-.423-.342-.16-.11-.34-.213-.506-.313-.334-.2-.61-.41-.814-.595l-.456-.414c-.306-.286-.59-.56-.855-.81-.265-.253-.508-.486-.71-.675l-.31-.286c-.37-.34-.8-.74-1.245-1.132-.447-.392-.913-.777-1.39-1.144l-.254-.193c-.117-.09-.219-.16-.318-.23-.1-.07-.193-.138-.276-.195l-.075-.05c-.192-.12-.48-.237-.708-.257l-.106-.01z" />
                  </svg>
                  <span className="text-xs">تلگرام</span>
                </motion.button>
                <motion.button
                  className="flex flex-col items-center bg-[#25D366] text-white p-3 rounded-xl shadow-sm"
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg
                    className="w-6 h-6 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-xs">واتساپ</span>
                </motion.button>
              </div>

              <div className="flex justify-end">
                <motion.button
                  className="px-4 py-2 text-sm bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => setShowShareModal(false)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  بستن
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {otherRecentlyViewed.length > 0 && recentlyViewedVisible && (
        <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-12 mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
              محصولاتی که اخیراً دیده‌اید
            </h2>
            <button
              className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
              onClick={() => setRecentlyViewedVisible(false)}
            >
              مخفی کردن
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductGrid products={otherRecentlyViewed} columns={4} />
          </motion.div>
        </div>
      )}

      <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-12 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProductReviews
            productId={productId}
            reviews={productReviews}
            avgRating={avgRating}
            onAddReview={handleAddReview}
          />
        </motion.div>
      </div>

      {similarProducts.length > 0 && (
        <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-12">
          <h2 className="text-2xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream">
            محصولات مشابه
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductGrid products={similarProducts} columns={4} />
          </motion.div>
        </div>
      )}

      {/* Try-On Modal */}
      <AnimatePresence>
        {showTryOnModal && (
          <motion.div
            className="fixed inset-0 bg-voxcina-blue/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTryOnModal(false)}
          >
            <motion.div
              className="bg-white/95 dark:bg-voxcina-blue/95 rounded-2xl max-w-md w-full p-6 relative shadow-lg backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/50"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream transition-colors"
                onClick={() => setShowTryOnModal(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Camera className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
                <h3 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                  آزمایش مجازی
                </h3>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
                  تصویر خود را بارگذاری کنید و نتیجه را مشاهده کنید.
                </p>
              </div>

              <div className="mb-4 flex flex-col items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUserImageSelect}
                  className="mb-4"
                />
                {uploadedPreview && (
                  <img
                    src={uploadedPreview}
                    alt="preview"
                    className="max-w-xs rounded-lg shadow"
                  />
                )}
              </div>

              <div className="flex justify-end mt-4 space-x-2 space-x-reverse">
                <motion.button
                  className="px-4 py-2 text-sm border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/30 transition-colors shadow-sm"
                  onClick={() => {
                    setUploadedFile(null);
                    setShowTryOnModal(false);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  انصراف
                </motion.button>
                <motion.button
                  className="px-4 py-2 text-sm bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
                  onClick={handleTryOnSubmit}
                  disabled={!uploadedFile}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  شروع آزمایش
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
