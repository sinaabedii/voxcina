"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
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
import ProductCard from "@/components/product/ProductCard";
import ProductReviews from "@/components/product/ProductReviews";
import ProductJsonLd from "@/components/product/ProductJsonLd";
import { Review } from "@/types/product";
import { useCategoryStore } from "@/store/category-store";
import Link from "next/link";
import { useTryOnStore } from "@/store/tryon-store";
import { useAuthStore } from "@/store/auth-store";
import BackendImage from "@/components/BackendImage";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SocialShare from "@/components/product/SocialShare";

interface ProductDetailPageProps {
  params: {
    productId: string;
  };
}

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5; // Return true if color is light
  }
  
  // For named colors, create a lookup for common light colors
  const lightColors = ['white', 'yellow', 'pink', 'lightblue', 'lightgreen', 'orange', 'cream', 'beige', 'سفید', 'زرد', 'صورتی', 'آبی روشن', 'سبز روشن', 'نارنجی', 'کرم', 'بژ'];
  return lightColors.includes(color.toLowerCase());
};

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = params;
  const pathname = usePathname();
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
  const [showSelectColorMessage, setShowSelectColorMessage] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  const {
    activeProduct,
    products,
    fetchProductById,
    isLoading,
    error,
    addRecentlyViewed,
    recentlyViewed,
    activeProductReviews,
  } = useProductStore();

  const { addItem } = useCartStore();
  const { submitReview, likeReview, dislikeReview } = useReviewStore();
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
    garmentType,
    setGarmentType,
    steps,
    setSteps,
  } = useTryOnStore();
  const { isAuthenticated, user } = useAuthStore();

  const isProductFavorite = activeProduct?.id ? isFavorite(activeProduct.id) : false;

  // Helper function to get product images based on selected color
  const getProductImages = () => {
    if (!activeProduct) return [];
    
    // If a color is selected, get images for that color
    if (selectedColor) {
      const colorVariant = activeProduct.colorVariants?.find(cv => cv.color === selectedColor);
      if (colorVariant?.images?.length) {
        // Combine color-specific images with main images
        return [...colorVariant.images, ...(activeProduct.mainImages || [])];
      }
    }
    
    // Default: combine main images with first color variant images
    const mainImages = activeProduct.mainImages || [];
    const firstColorImages = activeProduct.colorVariants?.[0]?.images || [];
    return [...mainImages, ...firstColorImages];
  };

  // Helper function to get try-on image based on selected color
  // Returns null if no color is selected - user must select a color first
  const getTryOnImage = () => {
    if (!activeProduct) return null;
    
    // Only return try-on image if a color is selected
    if (selectedColor) {
      const colorVariant = activeProduct.colorVariants?.find(cv => cv.color === selectedColor);
      if (colorVariant?.tryOnImage) return colorVariant.tryOnImage;
    }
    
    // No color selected - return null to require color selection
    return null;
  };

  // Check if any color variant has a try-on image available
  const hasTryOnAvailable = () => {
    if (!activeProduct?.colorVariants) return false;
    return activeProduct.colorVariants.some(cv => cv.tryOnImage);
  };

  // Get current product images
  const productImages = getProductImages();
  const tryOnImage = getTryOnImage();

  // Extract available sizes and colors from colorVariants
  const availableSizes = activeProduct?.colorVariants 
    ? [...new Set(activeProduct.colorVariants.flatMap((cv) => cv.sizes.map(s => s.size)))]
    : [];

  const availableColors = activeProduct?.colorVariants
    ? activeProduct.colorVariants.map((cv) => ({ color: cv.color, colorName: cv.colorName }))
    : [];

  // Get available sizes based on selected color
  const getAvailableSizesForColor = (color: string | undefined) => {
    if (!activeProduct || !color) return availableSizes;
    const colorVariant = activeProduct.colorVariants.find(cv => cv.color === color);
    if (!colorVariant) return [];
    return colorVariant.sizes.filter(s => s.quantity > 0).map(s => s.size);
  };

  // Get available colors based on selected size
  const getAvailableColorsForSize = (size: string | undefined) => {
    if (!activeProduct || !size) return availableColors;
    return activeProduct.colorVariants
      .filter(cv => cv.sizes.some(s => s.size === size && s.quantity > 0))
      .map(cv => ({ color: cv.color, colorName: cv.colorName }));
  };

  // Check if a specific variant is in stock
  const isVariantInStock = (size: string, color: string) => {
    if (!activeProduct) return false;
    const colorVariant = activeProduct.colorVariants.find(cv => cv.color === color);
    if (!colorVariant) return false;
    return colorVariant.sizes.some(s => s.size === size && s.quantity > 0);
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

  const productReviews = activeProductReviews;

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
    setHasAttemptedLoad(false);
    fetchProductById(productId).finally(() => {
      setHasAttemptedLoad(true);
    });
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
      if (!productImages.length) return;

      if (e.key === "ArrowLeft") {
        setSelectedImage((prev) =>
          prev < productImages.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowRight") {
        setSelectedImage((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [productImages]);

  // Create complete product URL for structured data (moved before early returns)
  const productUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${pathname}`;
    }
    return '';
  }, [pathname]);

  // Pre-compute category name to avoid hook issues (moved before early returns)
  const categoryName = activeProduct?.category_ids?.[0] 
    ? getCategoryName(activeProduct.category_ids[0]) 
    : '';

  // Show loading state while fetching or before fetch attempt completes
  if (isLoading || !hasAttemptedLoad) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
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

  // Only show error after load attempt has completed
  if (error || !activeProduct) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center">
        <motion.div
          className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border border-red-100 dark:border-red-800/30 shadow-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
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

    // Use react-hot-toast instead of manual DOM manipulation
    toast.success("محصول به سبد خرید اضافه شد");
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
    if (!isAuthenticated || !user) {
      alert("برای ثبت نظر ابتدا وارد شوید");
      return;
    }
    const token = localStorage.getItem("authToken") || "";
    submitReview(reviewData.productId, reviewData.rating, reviewData.comment, reviewData.isRecommended ?? true, token);
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextImage = () => {
    if (!productImages) return;
    setSelectedImage((prev) =>
      prev < (productImages?.length || 1) - 1 ? prev + 1 : prev
    );
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator
        .share({
          title: activeProduct?.name,
          text: activeProduct?.description,
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

  // products is ColorVariantListItem[], filter by productId
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
        p.productId !== activeProduct.id
    )
    .slice(0, 4);

  // recentlyViewed is Product[], filter by id
  const otherRecentlyViewed = recentlyViewed
    .filter((p) => p.id !== activeProduct.id)
    .slice(0, 4);

  const handleTryOnSubmit = async () => {
    if (!tryOnImage) return;
    setShowTryOnModal(false); // Close modal immediately
    try {
      await startTryOn(tryOnImage);
    } catch (error) {
      console.error("Error in try-on process:", error);
    }
  };

  // Handle try-on button click - show message if no color selected
  const handleTryOnClick = () => {
    if (!selectedColor && hasTryOnAvailable()) {
      setShowSelectColorMessage(true);
      // Auto-hide the message after 3 seconds
      setTimeout(() => setShowSelectColorMessage(false), 3000);
      return;
    }
    setShowTryOnModal(true);
  };

  const handleUserImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
  };

  return (
    <>
      {activeProduct && <ProductJsonLd product={activeProduct} url={productUrl} />}
      
      <div className="container py-8 md:py-16">
        <motion.div
          className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6 flex flex-wrap items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeProduct && (
            <Breadcrumbs
              items={[
                { title: "خانه", href: "/" },
                { title: "محصولات", href: "/products" },
                ...(activeProduct.category_ids && activeProduct.category_ids.length > 0
                  ? [
                      {
                        title: categoryName,
                        href: `/categories/${activeProduct.category_ids?.[0] || ''}`,
                      },
                    ]
                  : []),
                { title: activeProduct.name, href: pathname },
              ]}
            />
          )}
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
              {productImages && productImages.length > 0 ? (
                <>
                  <div className="relative w-full h-full">
                    <BackendImage
                      src={productImages?.[selectedImage] || ''}
                      alt={`${activeProduct?.name || ''} - ${activeProduct?.brand || ''}`}
                      className={cn(
                        "object-cover w-full h-full transition-transform duration-300",
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
                  </div>
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
                    {selectedImage + 1} / {productImages?.length || 1}
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

            {productImages && productImages.length > 1 && (
              <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
                {productImages.map((image, index) => (
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
                    <div className="relative w-full h-full">
                      <BackendImage
                        src={image}
                        alt={`${activeProduct?.name || ''} - تصویر ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
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
                      ? availableColors.find((c) => c.color === selectedColor)?.colorName || selectedColor
                      : "لطفاً رنگ را انتخاب کنید"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((colorObj) => {
                    const isAvailable =
                      !selectedSize ||
                      availableColorsForSelectedSize.some(c => c.color === colorObj.color);
                    return (
                      <motion.button
                        key={colorObj.color}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          selectedColor === colorObj.color
                            ? "ring-2 ring-voxcina-blue dark:ring-voxcina-cream ring-offset-2 dark:ring-offset-voxcina-blue/80"
                            : isAvailable
                            ? "ring-1 ring-voxcina-cream/50 dark:ring-voxcina-blue/30 hover:ring-voxcina-blue/50 dark:hover:ring-voxcina-cream/50"
                            : "ring-1 ring-voxcina-cream/30 dark:ring-voxcina-blue/20 opacity-40 cursor-not-allowed"
                        }`}
                        onClick={() =>
                          isAvailable &&
                          setSelectedColor(
                            selectedColor === colorObj.color ? undefined : colorObj.color
                          )
                        }
                        title={colorObj.colorName || colorObj.color}
                        whileHover={isAvailable ? { scale: 1.1 } : {}}
                        whileTap={isAvailable ? { scale: 0.9 } : {}}
                        disabled={!isAvailable}
                      >
                        <span
                          className="w-8 h-8 rounded-full block"
                          style={{ backgroundColor: colorObj.color }}
                        />
                        {selectedColor === colorObj.color && (
                          <CheckCircle className="absolute h-4 w-4 drop-shadow-md" 
                            style={{ 
                              color: isLightColor(colorObj.color) ? '#000' : '#fff',
                              filter: isLightColor(colorObj.color) ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' : 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                            }} 
                          />
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
                    className="col-span-3 sm:col-span-3"
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
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        fill={isProductFavorite ? "currentColor" : "none"}
                      />
                    </Button>
                  </motion.div>

                  {/* Try-On Button */}
                  <motion.div
                    className="col-span-1 relative z-10"
                    whileHover={{ 
                      y: -5,
                      rotate: [0, -5, 5, -5, 0],
                      transition: { duration: 0.5 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ 
                      scale: [0, 1.1, 1],
                      rotate: [0, -10, 10, -5, 0],
                      transition: { 
                        duration: 0.6,
                        ease: "easeOut"
                      }
                    }}
                  >
                    {/* Animated glow effect */}
                    {hasTryOnAvailable() && (
                      <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-500 to-blue-600 rounded-xl opacity-70 blur-lg group-hover:opacity-100 animate-gradient-xy"></div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="lg"
                      className={`w-full rounded-xl border-2 ${
                        hasTryOnAvailable() 
                          ? "border-purple-400 dark:border-purple-300 text-voxcina-blue dark:text-voxcina-cream bg-gradient-to-br from-white/80 via-purple-100/60 to-white/80 dark:from-voxcina-blue/60 dark:via-purple-900/40 dark:to-voxcina-blue/60 shadow-lg hover:shadow-purple-300/50 dark:hover:shadow-purple-500/30 relative overflow-hidden"
                          : "border-voxcina-blue/20 text-voxcina-blue/60 dark:border-voxcina-blue/30 dark:text-voxcina-cream/60 bg-voxcina-cream/20 dark:bg-voxcina-blue/20"
                      } transition-all duration-500 disabled:opacity-40 disabled:from-transparent disabled:to-transparent relative group`}
                      disabled={!hasTryOnAvailable()}
                      onClick={handleTryOnClick}
                      aria-label="آزمایش مجازی"
                    >
                      {/* Animated shine effect */}
                      {hasTryOnAvailable() && (
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                          <div className="absolute top-0 left-[-100%] h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/40 dark:to-purple-300/30 opacity-40 animate-shine" />
                        </div>
                      )}
                      
                      <div className="relative flex items-center justify-center">
                        {hasTryOnAvailable() && (
                          <>
                            {/* Sparkle elements */}
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75"></span>
                            <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDelay: "0.5s" }}></span>
                            <span className="absolute -top-1 -left-2 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-75" style={{ animationDelay: "1s" }}></span>
                          </>
                        )}
                        <motion.div
                          animate={{
                            scale: hasTryOnAvailable() ? [1, 1.2, 1] : 1,
                            transition: {
                              repeat: Infinity,
                              repeatType: "mirror",
                              duration: 1.5,
                              ease: "easeInOut"
                            }
                          }}
                        >
                          <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />
                        </motion.div>
                      </div>
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
                      <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
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
            پرو مجازی
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Try-On Feature */}
            <motion.div 
              className="bg-white/70 dark:bg-voxcina-blue/10 border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl p-5 shadow-sm backdrop-blur-sm"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="sm:w-1/3 flex flex-col items-center text-center sm:text-right">
                  <div className="w-16 h-16 bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Camera className="h-8 w-8 text-voxcina-blue dark:text-voxcina-cream" />
                  </div>
                  <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    پرو مجازی لباس
                  </h3>
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
                    با آپلود عکس خود، ببینید این محصول چطور به شما می‌آید
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl mb-2"
                    disabled={!hasTryOnAvailable()}
                    onClick={handleTryOnClick}
                  >
                    <Camera className="w-4 h-4 ml-1" />
                    شروع پرو مجازی
                  </Button>
                  
                  {/* Message to select color first */}
                  <AnimatePresence>
                    {showSelectColorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-orange-600 dark:text-orange-400 mt-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800"
                      >
                        لطفاً ابتدا یک رنگ انتخاب کنید
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {!hasTryOnAvailable() && (
                    <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-2">
                      (برای این محصول در دسترس نیست)
                    </span>
                  )}
                </div>
                
                {/* Loading or Result Preview */}
                <div className="sm:w-2/3">
                  {isTryOnLoading && (
                    <div className="flex flex-col items-center justify-center p-6 h-full min-h-[200px]">
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
                    <div className="flex flex-col gap-4">
                      <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream text-center sm:text-right">
                        نتیجه پرو مجازی
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            alt="نتیجه پرو مجازی" 
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                            با لباس
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!isTryOnLoading && !resultImage && (
                    <div className="flex flex-col items-center justify-center p-6 h-full min-h-[200px] border border-dashed border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-lg">
                      <Shirt className="h-10 w-10 text-voxcina-blue/30 dark:text-voxcina-cream/30 mb-2" />
                      <p className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50 text-center">
                        با کلیک روی دکمه پرو مجازی، تصویر خود را آپلود کنید<br />
                        و ببینید این لباس روی شما چطور به نظر می‌رسد
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
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
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
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
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
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

                <SocialShare 
                  url={productUrl} 
                  title={activeProduct.name} 
                  description={activeProduct.description} 
                  imageUrl={productImages?.[0]} 
                />

                <div className="flex justify-end mt-8">
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
              {/* Recently viewed needs conversion from Product[] to ColorVariantListItem[] - showing first color variant */}
              {otherRecentlyViewed.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {otherRecentlyViewed.map((product) => {
                    const firstColorVariant = product.colorVariants?.[0];
                    if (!firstColorVariant) return null;
                    const totalInventory = firstColorVariant.sizes.reduce((sum, s) => sum + s.quantity, 0);
                    const item: import("@/types/product").ColorVariantListItem = {
                      productId: product.id,
                      name: product.name,
                      description: product.description,
                      price: product.price,
                      originalPrice: product.originalPrice,
                      brand: product.brand || "",
                      brand_id: product.brand_id,
                      category_ids: product.category_ids,
                      inStock: product.inStock,
                      is_flash_sale: product.is_flash_sale,
                      colorVariant: firstColorVariant,
                      created_at: product.created_at,
                      totalInventory: totalInventory,
                    };
                    return (
                      <ProductCard
                        key={`${item.productId}-${item.colorVariant.color}`}
                        item={item}
                        glassEffect={false}
                      />
                    );
                  })}
                </div>
              )}
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
              <ProductGrid items={similarProducts} columns={4} />
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
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
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
                    پرو مجازی
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

                {/* Garment Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    نوع لباس
                  </label>
                  <select
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="upper_body">بالاتنه</option>
                    <option value="lower_body">پایین تنه</option>
                    <option value="dresses">لباس</option>
                  </select>
                </div>

                {/* Steps Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    مراحل (15-60)
                  </label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(Math.max(15, Math.min(60, Number(e.target.value))))}
                    min={15}
                    max={60}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
