"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Share2,
  Bell,
  CheckCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  X,
  Camera,
  Shirt,
  Minus,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductStore } from "@/store/product-store";
import { useCartStore } from "@/store/cart-store";
import { useReviewStore } from "@/store/review-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn, formatPrice, getDiscountPercentage } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import QuantitySelector from "@/components/ui/QuantitySelector";
import ColorSelector from "@/components/ui/ColorSelector";
import SizeSelector from "@/components/ui/SizeSelector";
import PriceDisplay from "@/components/ui/PriceDisplay";
import StockStatus from "@/components/ui/StockStatus";
import SectionTitle from "@/components/ui/SectionTitle";
import { FeatureGrid } from "@/components/ui/FeatureCard";
import ProductGrid from "@/components/product/ProductGrid";
import ProductCard from "@/components/product/ProductCard";
import ProductReviews from "@/components/product/ProductReviews";
import ProductJsonLd from "@/components/product/ProductJsonLd";
import ImageGallery from "@/components/product/ImageGallery";
import SizeGuideTable from "@/components/product/SizeGuideTable";
import ProductAttributes from "@/components/product/ProductAttributes";
import { Review } from "@/types/product";
import { useCategoryStore } from "@/store/category-store";
import Link from "next/link";
import { useTryOnStore } from "@/store/tryon-store";
import { useAuthStore } from "@/store/auth-store";
import { useBrandStore } from "@/store/brand-store";
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
  const searchParams = useSearchParams();
  const urlColor = searchParams.get('color'); // Get color from URL query parameter
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isZoomed, setIsZoomed] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
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
  const { activeBrand, fetchBrandById } = useBrandStore();

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

  // Get inventory count for selected variant
  const getSelectedVariantInventory = (): number => {
    if (!activeProduct) return 0;
    
    // If product has no color variants, return a default high value
    if (!activeProduct.colorVariants?.length) return 99;
    
    // If no color/size selection needed (single variant)
    const needsColorSelection = availableColors.length > 0;
    const needsSizeSelection = availableSizes.length > 0;
    
    if (!needsColorSelection && !needsSizeSelection) {
      // Single variant product - get first variant's inventory
      const firstVariant = activeProduct.colorVariants[0];
      if (firstVariant?.sizes?.[0]) {
        return firstVariant.sizes[0].quantity;
      }
      return 99;
    }
    
    if (!selectedColor || !selectedSize) return 0;
    const colorVariant = activeProduct.colorVariants.find(cv => cv.color === selectedColor);
    if (!colorVariant) return 0;
    const sizeVariant = colorVariant.sizes.find(s => s.size === selectedSize);
    return sizeVariant?.quantity || 0;
  };

  const selectedVariantInventory = getSelectedVariantInventory();
  
  // Check if variant selection is required
  const needsColorSelection = availableColors.length > 0;
  const needsSizeSelection = availableSizes.length > 0;
  const isVariantSelected = (!needsColorSelection || !!selectedColor) && (!needsSizeSelection || !!selectedSize);
  const canModifyQuantity = isVariantSelected && selectedVariantInventory > 0;

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

  // Fetch brand detail when product is loaded
  useEffect(() => {
    if (activeProduct?.brand_id) {
      fetchBrandById(activeProduct.brand_id);
    }
  }, [activeProduct, fetchBrandById]);

  // Pre-select color from URL query parameter when product loads
  useEffect(() => {
    if (activeProduct && urlColor && !selectedColor) {
      // Check if the URL color exists in this product's color variants
      const matchingVariant = activeProduct.colorVariants?.find(
        cv => cv.color === urlColor || cv.colorName === urlColor
      );
      if (matchingVariant) {
        setSelectedColor(matchingVariant.color);
        setSelectedImage(0); // Reset to first image of the color variant
      }
    }
  }, [activeProduct, urlColor, selectedColor]);

  // Reset quantity when variant selection changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedColor, selectedSize]);

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
            {/* Main Product Image */}
            <div
              ref={imageContainerRef}
              className={cn(
                "mb-4 relative rounded-2xl overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 cursor-pointer shadow-sm bg-white dark:bg-zinc-900 group",
                isZoomed && "cursor-zoom-out"
              )}
              style={{ height: '450px' }}
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setIsZoomed(false)}
            >
              {productImages && productImages.length > 0 ? (
                <>
                  <div
                    className="relative w-full h-full"
                    onClick={() => setIsZoomed(!isZoomed)}
                  >
                    <Image
                      src={productImages?.[selectedImage] || ''}
                      alt={`${activeProduct?.name || ''} - ${activeProduct?.brand || ''}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={cn(
                        "object-contain transition-transform duration-300",
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
                      unoptimized={productImages?.[selectedImage]?.startsWith('/uploads/')}
                    />
                  </div>
                  <button
                    className="absolute bottom-4 right-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white dark:text-voxcina-cream rounded-full p-2 backdrop-blur-sm z-20 hover:bg-voxcina-blue dark:hover:bg-voxcina-cream/40 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLightbox(true);
                    }}
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>

                  {/* Image Navigation Arrows */}
                  <button
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-3 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                  >
                    <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-white" />
                  </button>
                  <button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-3 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                  >
                    <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-white" />
                  </button>

                  <div className="absolute bottom-4 left-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-10 pointer-events-none">
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
                  <button
                    key={index}
                    className={`w-20 h-20 min-w-[5rem] border rounded-xl overflow-hidden transition-colors ${selectedImage === index
                      ? "border-voxcina-blue dark:border-voxcina-cream ring-2 ring-voxcina-blue/30 dark:ring-voxcina-cream/30 shadow-sm"
                      : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/50 bg-white dark:bg-zinc-900"
                      }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={image}
                        alt={`${activeProduct?.name || ''} - تصویر ${index + 1}`}
                        fill
                        sizes="80px"
                        className="object-contain"
                        unoptimized={image?.startsWith('/uploads/')}
                      />
                    </div>
                  </button>
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
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
                    {activeProduct.name}
                  </h1>

                  {activeBrand ? (
                    <Link
                      href={`/brands/${activeBrand.slug || activeBrand.id}`}
                      className="flex items-center gap-2 group"
                    >
                      {activeBrand.logo && (
                        <div className="w-6 h-6 relative rounded-full overflow-hidden border border-voxcina-cream/50">
                          <BackendImage
                            src={activeBrand.logo}
                            alt={activeBrand.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <span className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
                        {activeBrand.name}
                      </span>
                    </Link>
                  ) : activeProduct.brand ? (
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      <span className="font-medium">{activeProduct.brand}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Price Display */}
              <PriceDisplay
                price={activeProduct.price}
                originalPrice={activeProduct.originalPrice}
                className="mb-4"
              />
            </div>

            {availableSizes.length > 0 && (
              <SizeSelector
                sizes={availableSizes}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                availableSizes={selectedColor ? availableSizesForSelectedColor : undefined}
                showSizeGuide
                onSizeGuideClick={() => setShowSizeGuide(!showSizeGuide)}
                showClearButton={!!(selectedSize || selectedColor)}
                onClear={handleClearSelection}
              />
            )}

            <SizeGuideTable isOpen={showSizeGuide} />

            {availableColors.length > 0 && (
              <ColorSelector
                colors={availableColors.map(c => ({
                  ...c,
                  isAvailable: !selectedSize || availableColorsForSelectedSize.some(ac => ac.color === c.color)
                }))}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
              />
            )}
            <StockStatus
              inStock={activeProduct.inStock}
              isNotifyEnabled={isStockNotifyEnabled}
              onNotifyClick={() => setShowNotifyModal(true)}
              className="mb-6"
            />

            {activeProduct.inStock && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={canModifyQuantity ? selectedVariantInventory : 1}
                    disabled={!canModifyQuantity}
                  />
                  {!isVariantSelected && (needsSizeSelection || needsColorSelection) && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {needsColorSelection && needsSizeSelection 
                        ? "ابتدا رنگ و سایز را انتخاب کنید"
                        : needsColorSelection 
                          ? "ابتدا رنگ را انتخاب کنید"
                          : "ابتدا سایز را انتخاب کنید"}
                    </span>
                  )}
                  {isVariantSelected && selectedVariantInventory > 0 && (
                    <span className="text-xs text-muted-foreground">
                      موجودی: {selectedVariantInventory} عدد
                    </span>
                  )}
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
                      className={`w-full rounded-xl ${isProductFavorite
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
                      className={`w-full rounded-xl border-2 ${hasTryOnAvailable()
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

            <ProductAttributes attributes={activeProduct.attributes} />
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

            <FeatureGrid
              features={[
                {
                  icon: Truck,
                  title: "ارسال سریع",
                  description: <>ارسال به سراسر کشور<br />طی ۲-۳ روز کاری</>,
                },
                {
                  icon: RotateCcw,
                  title: "۷ روز ضمانت بازگشت",
                  description: <>در صورت عدم رضایت<br />بدون قید و شرط</>,
                },
                {
                  icon: ShieldCheck,
                  title: "ضمانت اصالت کالا",
                  description: <>تضمین اصالت و کیفیت<br />تمامی محصولات</>,
                },
              ]}
              columns={3}
            />


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

        {/* Stock Notify Modal */}
        <Modal
          isOpen={showNotifyModal}
          onClose={() => setShowNotifyModal(false)}
          title="اطلاع از موجود شدن کالا"
        >
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-soft">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              به محض موجود شدن {activeProduct.name} به شما اطلاع خواهیم داد.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">ایمیل</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border/30 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                placeholder="ایمیل خود را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">شماره موبایل</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-border/30 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                placeholder="شماره موبایل خود را وارد کنید"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground/80">
              <input type="checkbox" className="w-4 h-4 rounded border-border/30" />
              فقط در صورت موجود شدن سایز {selectedSize || "انتخاب شده"} به من اطلاع بده
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowNotifyModal(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsStockNotifyEnabled(true);
                setShowNotifyModal(false);
              }}
            >
              ثبت درخواست
            </Button>
          </div>
        </Modal>

        {/* Share Modal */}
        <Modal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title="اشتراک‌گذاری محصول"
        >
          <SocialShare
            url={productUrl}
            title={activeProduct.name}
            description={activeProduct.description}
            imageUrl={productImages?.[0]}
          />
          <div className="flex justify-end mt-6">
            <Button variant="primary" onClick={() => setShowShareModal(false)}>
              بستن
            </Button>
          </div>
        </Modal>

        {otherRecentlyViewed.length > 0 && recentlyViewedVisible && (
          <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-12 mb-16">
            <SectionTitle
              title="محصولاتی که اخیراً دیده‌اید"
              action={
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setRecentlyViewedVisible(false)}
                >
                  مخفی کردن
                </button>
              }
            />
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
          <div className="items-center py-6">
            <SectionTitle title="محصولات مشابه" size="lg" />
            <ProductGrid items={similarProducts} />
          </div>
        )}

        <AnimatePresence>
          {showLightbox && (
            <motion.div
              className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLightbox(false)}
            >
              <button
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                onClick={() => setShowLightbox(false)}
              >
                <X className="h-8 w-8" />
              </button>

              <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
                <BackendImage
                  src={productImages?.[selectedImage] || ''}
                  alt={activeProduct?.name || ''}
                  className="object-contain max-w-full max-h-full"
                  priority
                />

                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>

                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>

              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
                {productImages?.map((img, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative shrink-0",
                      selectedImage === idx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(idx);
                    }}
                  >
                    <BackendImage src={img} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Try-On Modal */}
        <Modal
          isOpen={showTryOnModal}
          onClose={() => setShowTryOnModal(false)}
          title="پرو مجازی"
          contentClassName="max-w-sm"
        >
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-soft">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">تصویر خود را بارگذاری کنید</p>
          </div>

          {/* Image Upload Section */}
          <label className="block cursor-pointer mb-4">
            <div className={cn(
              "border-2 border-dashed rounded-xl p-4 text-center transition-colors",
              uploadedPreview ? "border-primary/30" : "border-border/30 hover:border-primary/40"
            )}>
              {uploadedPreview ? (
                <img
                  src={uploadedPreview}
                  alt="preview"
                  className="max-h-[30vh] w-auto mx-auto rounded-lg shadow object-contain"
                />
              ) : (
                <div className="py-6">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">برای انتخاب تصویر کلیک کنید</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleUserImageSelect}
              className="hidden"
            />
          </label>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">نوع لباس</label>
              <select
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value)}
                className="w-full border border-border/30 rounded-lg p-2 text-sm bg-card text-foreground"
              >
                <option value="upper_body">بالاتنه</option>
                <option value="lower_body">پایین تنه</option>
                <option value="dresses">لباس</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">کیفیت (15-60)</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(Math.max(15, Math.min(60, Number(e.target.value))))}
                min={15}
                max={60}
                className="w-full border border-border/30 rounded-lg p-2 text-sm bg-card text-foreground"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setUploadedFile(null);
                setShowTryOnModal(false);
              }}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleTryOnSubmit}
              disabled={!uploadedFile}
            >
              شروع آزمایش
            </Button>
          </div>
        </Modal>
      </div >
    </>
  );
}
