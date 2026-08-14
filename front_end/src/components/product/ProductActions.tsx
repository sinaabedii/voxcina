"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Share2,
  Bell,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Shirt,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart-store";
import { useReviewStore } from "@/store/review-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn, formatPrice, toEnglishNumber } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import QuantitySelector from "@/components/ui/QuantitySelector";
import ColorSelector from "@/components/ui/ColorSelector";
import SizeSelector from "@/components/ui/SizeSelector";
import PriceDisplay from "@/components/ui/PriceDisplay";
import StockStatus from "@/components/ui/StockStatus";
import { FeatureGrid } from "@/components/ui/FeatureCard";
import ProductReviews from "@/components/product/ProductReviews";
import SizeGuideTable from "@/components/product/SizeGuideTable";
import ProductAttributes from "@/components/product/ProductAttributes";
import SocialShare from "@/components/product/SocialShare";
import { Product, Review, ColorVariantListItem } from "@/types/product";
import { useTryOnStore } from "@/store/tryon-store";
import { useAuthStore } from "@/store/auth-store";
import { useBrandStore } from "@/store/brand-store";
import { useProductStore } from "@/store/product-store";
import { activityTracker } from "@/lib/activity-tracker";
import BackendImage from "@/components/BackendImage";
import { ImageSkeleton } from "@/components/ui/Loading";
import { findVariantByIdOrLegacyValue, getVariantId } from "@/lib/product-variants";

interface ProductActionsProps {
  product: Product;
  productUrl: string;
  reviews: Review[];
  categoryName: string;
}

export default function ProductActions({ product, productUrl, reviews, categoryName }: ProductActionsProps) {
  const searchParams = useSearchParams();
  const urlVariant = searchParams.get('variant');
  const urlColor = searchParams.get('color');
  const isVariantLocked = Boolean(urlVariant || urlColor);
  
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
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [showSelectColorMessage, setShowSelectColorMessage] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageViewStartRef = useRef<number>(0); // 0 = sentinel for the first image view
  const lastImageSourceRef = useRef<string>('initial');
  const productViewStartRef = useRef<number>(Date.now());
  const productViewReportedRef = useRef<boolean>(false);

  const { addItem } = useCartStore();
  const { submitReview } = useReviewStore();
  const { addToFavorites, isFavorite } = useDashboardStore();
  const { addRecentlyViewed } = useProductStore();
  const {
    uploadedPreview,
    uploadedFile,
    resultImage,
    isProcessing: isTryOnLoading,
    setUploadedFile,
    startTryOn,
  } = useTryOnStore();
  const { isAuthenticated, user } = useAuthStore();
  const { activeBrand, fetchBrandById } = useBrandStore();

  const isProductFavorite = product?.id ? isFavorite(product.id) : false;

  const findSelectedVariant = (value = selectedColor) =>
    findVariantByIdOrLegacyValue(product?.colorVariants, value);

  const variantSelectionKey = (variant: Product["colorVariants"][number]) =>
    variant.variantId || variant.colorName;


  // Helper function to get product images based on selected color
  const getProductImages = () => {
    if (!product) return [];
    if (selectedColor) {
      const colorVariant = findSelectedVariant();
      if (colorVariant?.images?.length) {
        return [...colorVariant.images, ...(product.mainImages || [])];
      }
    }
    const mainImages = product.mainImages || [];
    const firstColorImages = product.colorVariants?.[0]?.images || [];
    return [...firstColorImages, ...mainImages];
  };

  // Helper function to get try-on image based on selected color
  const getTryOnImage = () => {
    if (!product) return null;
    if (selectedColor) {
      const colorVariant = findSelectedVariant();
      if (colorVariant?.tryOnImage) return colorVariant.tryOnImage;
    }
    return null;
  };

  // Check if any color variant has a try-on image available
  const hasTryOnAvailable = () => {
    if (!product?.colorVariants) return false;
    return product.colorVariants.some(cv => cv.tryOnImage);
  };

  const productImages = getProductImages();
  const tryOnImage = getTryOnImage();

  // Extract available sizes and colors from colorVariants
  // Normalize Persian/Arabic digits to Latin to prevent duplicate size buttons
  const normalizeSize = (s: string) => toEnglishNumber(s).trim();
  const availableSizes = product?.colorVariants
    ? [...new Set(product.colorVariants
      .filter(cv => cv.variantId && (cv.color?.trim() || cv.colorName?.trim()))
      .flatMap((cv) => cv.sizes.map(s => normalizeSize(s.size))))]
    : [];

  const availableColors = product?.colorVariants
      ? product.colorVariants
        .filter(cv => cv.variantId && (cv.color?.trim() || cv.colorName?.trim()))
        .map((cv) => ({ variantId: cv.variantId, color: cv.color, colorName: cv.colorName, swatchImage: cv.swatchImage }))
    : [];

  // Get available sizes based on selected color
  const getAvailableSizesForColor = (color: string | undefined) => {
    if (!product || !color) return availableSizes;
    const colorVariant = findVariantByIdOrLegacyValue(product.colorVariants, color);
    if (!colorVariant) return [];
    return colorVariant.sizes.filter(s => s.quantity > 0).map(s => normalizeSize(s.size));
  };

  // Get available colors based on selected size
  const getAvailableColorsForSize = (size: string | undefined) => {
    if (!product || !size) return availableColors;
    const normalizedTarget = normalizeSize(size);
    return product.colorVariants
      .filter(cv => cv.variantId && (cv.color?.trim() || cv.colorName?.trim()) && cv.sizes.some(s => normalizeSize(s.size) === normalizedTarget && s.quantity > 0))
      .map(cv => ({ variantId: cv.variantId, color: cv.color, colorName: cv.colorName, swatchImage: cv.swatchImage }));
  };

  // Check if a specific variant is in stock
  const isVariantInStock = (size: string, color: string) => {
    if (!product) return false;
    const colorVariant = findVariantByIdOrLegacyValue(product.colorVariants, color);
    if (!colorVariant) return false;
    const normalizedTarget = normalizeSize(size);
    return colorVariant.sizes.some(s => normalizeSize(s.size) === normalizedTarget && s.quantity > 0);
  };

  // Get inventory count for selected variant
  const getSelectedVariantInventory = (): number => {
    if (!product) return 0;
    if (!product.colorVariants?.length) return 99;
    const needsColorSelection = availableColors.length > 0;
    const needsSizeSelection = availableSizes.length > 0;
    if (!needsColorSelection && !needsSizeSelection) {
      const firstVariant = product.colorVariants[0];
      if (firstVariant?.sizes?.[0]) {
        return firstVariant.sizes[0].quantity;
      }
      return 99;
    }
    if (!selectedColor || !selectedSize) return 0;
    const colorVariant = findSelectedVariant();
    if (!colorVariant) return 0;
    const normalizedTarget = normalizeSize(selectedSize);
    const sizeVariant = colorVariant.sizes.find(s => normalizeSize(s.size) === normalizedTarget);
    return sizeVariant?.quantity || 0;
  };

  const selectedVariantInventory = getSelectedVariantInventory();
  const needsColorSelection = !isVariantLocked && availableColors.length > 0;
  const needsSizeSelection = availableSizes.length > 0;
  const isVariantSelected = (!needsColorSelection || !!selectedColor) && (!needsSizeSelection || !!selectedSize);
  const canModifyQuantity = isVariantSelected && selectedVariantInventory > 0;

  const availableSizesForSelectedColor = selectedColor
    ? getAvailableSizesForColor(selectedColor)
    : availableSizes;

  const availableColorsForSelectedSize = selectedSize
    ? getAvailableColorsForSize(selectedSize)
    : availableColors;

  const handleClearSelection = () => {
    setSelectedSize(undefined);
    setSelectedColor(undefined);
  };

  const handleColorChange = (colorName: string | undefined) => {
    setSelectedColor(colorName);
    if (product) {
      const variant = findVariantByIdOrLegacyValue(product.colorVariants, colorName);
      const inStock = variant?.sizes?.some(s => s.quantity > 0);
      activityTracker.trackColorClick(
        product.id,
        product.name,
        colorName,
        variant?.color,
        {
          swatchImage: variant?.swatchImage,
          hasStock: inStock,
          variantId: getVariantId(variant),
        }
      );
      if (variant) {
        activityTracker.trackProductView(product.id, product.name, undefined, {
          source: 'variant_selection',
          variantId: variant.variantId,
          color: variant.color,
          colorName: variant.colorName,
          swatchImage: variant.swatchImage,
        });
      }
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Add to recently viewed on mount, then record one product_view with dwell time when the visit ends.
  useEffect(() => {
    if (!product) return;
    addRecentlyViewed(product);
    productViewStartRef.current = Date.now();
    productViewReportedRef.current = false;

    const reportProductView = () => {
      if (productViewReportedRef.current) return;
      productViewReportedRef.current = true;
       const initialVariant = findVariantByIdOrLegacyValue(
         product.colorVariants,
         urlVariant || urlColor
       ) || product.colorVariants?.[0];
       activityTracker.trackProductView(
         product.id,
         product.name,
         Date.now() - productViewStartRef.current,
         {
           source: 'product_detail_dwell',
           variantId: initialVariant?.variantId,
           color: initialVariant?.color,
           colorName: initialVariant?.colorName,
           swatchImage: initialVariant?.swatchImage,
         },
         true
       );
    };

    document.addEventListener('visibilitychange', reportProductView);
    return () => {
      document.removeEventListener('visibilitychange', reportProductView);
      reportProductView();
    };
  }, [product, addRecentlyViewed, urlVariant, urlColor]);

  // Fetch brand detail when product is loaded
  useEffect(() => {
    if (product?.brand_id) {
      fetchBrandById(product.brand_id);
    }
  }, [product, fetchBrandById]);

  // Pre-select color from URL query parameter
  useEffect(() => {
    if (product && (urlVariant || urlColor) && !selectedColor) {
      const matchingVariant = findVariantByIdOrLegacyValue(
        product.colorVariants,
        urlVariant || urlColor
      );
      if (matchingVariant) {
        setSelectedColor(variantSelectionKey(matchingVariant));
        setSelectedImage(0);
      }
    }
  }, [product, urlVariant, urlColor, selectedColor]);

  // Reset quantity when variant selection changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedColor, selectedSize]);

   // Reset image selection when color changes — variant-specific images
  // come first, so resetting to 0 shows the first image for the new color.
   useEffect(() => {
     const newImages = getProductImages();
     const allLoaded = newImages.every(img => loadedImages.has(img));
     if (!allLoaded) {
       setImagesLoading(true);
     }
     lastImageSourceRef.current = 'color_change';
     setSelectedImage(0);
   }, [selectedColor]);

  // Track image gallery interaction: when selectedImage changes, report the
  // time the user spent on the previous image. Source is captured by the
  // helpers below (handlePrevImage, handleNextImage, thumbnail click, etc.).
  useEffect(() => {
    if (!product) return;
    const total = productImages?.length || 0;
    if (total === 0) return;
    const now = Date.now();
    const dwell = imageViewStartRef.current === 0 ? 0 : now - imageViewStartRef.current;
    imageViewStartRef.current = now;
    const safeIndex = Math.min(selectedImage, total - 1);
    activityTracker.trackImageViewed(
      product.id,
      product.name,
      safeIndex,
      total,
      lastImageSourceRef.current,
      dwell,
    );
    lastImageSourceRef.current = 'navigation';
  }, [selectedImage, productImages, product]);

  // Handle image load completion
  const handleImageLoad = (imageSrc: string) => {
    setLoadedImages(prev => new Set(prev).add(imageSrc));
    const currentImages = getProductImages();
    const newLoaded = new Set(loadedImages).add(imageSrc);
    if (currentImages.every(img => newLoaded.has(img))) {
      setImagesLoading(false);
    }
  };

  // Check if current main image is loaded
  const isMainImageLoaded = productImages[selectedImage] ? loadedImages.has(productImages[selectedImage]) : false;

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!productImages.length) return;
      if (e.key === "ArrowLeft") {
        setSelectedImage((prev) => {
          if (prev >= productImages.length - 1) return prev;
          lastImageSourceRef.current = 'keyboard';
          return prev + 1;
        });
      } else if (e.key === "ArrowRight") {
        setSelectedImage((prev) => {
          if (prev <= 0) return prev;
          lastImageSourceRef.current = 'keyboard';
          return prev - 1;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [productImages]);

  const handleAddToCart = () => {
    if (!selectedSize && availableSizes.length > 0) {
      alert("لطفاً سایز مورد نظر خود را انتخاب کنید");
      return;
    }
    if (needsColorSelection && !selectedColor) {
      alert("لطفاً رنگ مورد نظر خود را انتخاب کنید");
      return;
    }
    if (selectedSize && selectedColor && !isVariantInStock(selectedSize, selectedColor)) {
      alert("ترکیب سایز و رنگ انتخابی موجود نیست");
      return;
    }
    const selectedVariant = selectedColor ? findSelectedVariant() : undefined;
    if (!selectedVariant?.variantId || !(selectedVariant.color?.trim() || selectedVariant.colorName?.trim())) {
      alert("این محصول رنگ مشخصی ندارد و قابل افزودن به سبد نیست");
      return;
    }
    const colorVal = selectedVariant?.color || selectedVariant?.colorName || selectedColor;
    const colorName = selectedVariant?.colorName || selectedColor;
    addItem(product, quantity, selectedSize, colorVal, colorName, selectedVariant?.variantId);
    toast.success("محصول به سبد خرید اضافه شد");
  };

  const handleToggleFavorite = () => {
    if (product && product.id) {
      addToFavorites(product.id);
    }
  };

  const handleAddReview = (reviewData: Omit<Review, "id" | "date" | "likes" | "dislikes">) => {
    if (!isAuthenticated || !user) {
      alert("برای ثبت نظر ابتدا وارد شوید");
      return;
    }
    const token = localStorage.getItem("authToken") || "";
    submitReview(reviewData.productId, reviewData.rating, reviewData.comment, reviewData.isRecommended ?? true, token);
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => {
      if (prev <= 0) return prev;
      lastImageSourceRef.current = 'arrow';
      return prev - 1;
    });
  };

  const handleNextImage = () => {
    if (!productImages) return;
    setSelectedImage((prev) => {
      if (prev >= (productImages?.length || 1) - 1) return prev;
      lastImageSourceRef.current = 'arrow';
      return prev + 1;
    });
  };

  const handleZoomToggle = () => {
    setIsZoomed((prev) => {
      const next = !prev;
      if (product) {
        activityTracker.trackImageViewed(
          product.id,
          product.name,
          selectedImage,
          productImages?.length || 0,
          next ? 'zoom_in' : 'zoom_out',
        );
      }
      return next;
    });
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      }).catch(() => setShowShareModal(true));
    } else {
      setShowShareModal(true);
    }
  };

  const handleTryOnSubmit = async () => {
    if (!tryOnImage) return;
    const colorVariant = findSelectedVariant();
    const garmentType = colorVariant?.tryOnGarmentType || "upper_body";
    setShowTryOnModal(false);
    try {
      await startTryOn(tryOnImage, garmentType);
    } catch (error) {
      console.error("Error in try-on process:", error);
    }
  };

  const handleTryOnClick = () => {
    if (!selectedColor && hasTryOnAvailable()) {
      setShowSelectColorMessage(true);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
      {/* Image Gallery Section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
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
              <div className="relative w-full h-full" onClick={handleZoomToggle}>
                {(imagesLoading && !isMainImageLoaded) && (
                  <ImageSkeleton className="absolute inset-0 z-10 rounded-2xl" />
                )}
                <Image
                  src={productImages?.[selectedImage] || ''}
                  alt={`${product?.name || ''} - ${product?.brand || ''}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={cn(
                    "object-contain transition-all duration-300",
                    isZoomed && "scale-150",
                    (imagesLoading && !isMainImageLoaded) && "opacity-0"
                  )}
                  style={isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
                  priority
                  unoptimized={productImages?.[selectedImage]?.startsWith('/uploads/')}
                  onLoad={() => handleImageLoad(productImages[selectedImage])}
                />
              </div>
              <button
                className="absolute bottom-4 right-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white dark:text-voxcina-cream rounded-full p-2 backdrop-blur-sm z-20 hover:bg-voxcina-blue dark:hover:bg-voxcina-cream/40 transition-colors"
                onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
              >
                <Maximize2 className="h-5 w-5" />
              </button>
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-3 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
              >
                <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-voxcina-blue/50 rounded-full p-3 shadow-md hover:bg-white dark:hover:bg-voxcina-blue/70 transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
              >
                <ChevronRight className="h-5 w-5 text-voxcina-blue dark:text-white" />
              </button>
              <div className="absolute bottom-4 left-4 bg-voxcina-blue/70 dark:bg-voxcina-cream/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-10 pointer-events-none">
                {selectedImage + 1} / {productImages?.length || 1}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-voxcina-cream/20 dark:bg-voxcina-blue/20">
              <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50">بدون تصویر</span>
            </div>
          )}
        </div>

        {productImages && productImages.length > 1 && (
          <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-2 scrollbar-thin">
            {productImages.map((image, index) => (
              <button
                key={index}
                className={`w-20 h-20 min-w-[5rem] border rounded-xl overflow-hidden transition-colors ${
                  selectedImage === index
                    ? "border-voxcina-blue dark:border-voxcina-cream ring-2 ring-voxcina-blue/30 dark:ring-voxcina-cream/30 shadow-sm"
                    : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/50 bg-white dark:bg-zinc-900"
                }`}
                onClick={() => {
                  lastImageSourceRef.current = 'thumbnail';
                  setSelectedImage(index);
                }}
              >
                <div className="relative w-full h-full">
                  {(imagesLoading && !loadedImages.has(image)) && (
                    <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
                  )}
                  <Image
                    src={image}
                    alt={`${product?.name || ''} - تصویر ${index + 1}`}
                    fill
                    sizes="80px"
                    className={cn("object-contain", (imagesLoading && !loadedImages.has(image)) && "opacity-0")}
                    unoptimized={image?.startsWith('/uploads/')}
                    onLoad={() => handleImageLoad(image)}
                  />
                </div>
              </button>
            ))}
           </div>
         )}

          </motion.div>


      {/* Product Details Section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
                {product.name}
              </h1>
              {activeBrand ? (
                <Link href={`/brands/${activeBrand.slug || activeBrand.id}`} className="flex items-center gap-2 group">
                  {activeBrand.logo && (
                    <div className="w-6 h-6 relative rounded-full overflow-hidden border border-voxcina-cream/50">
                      <BackendImage src={activeBrand.logo} alt={activeBrand.name} className="object-cover w-full h-full" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
                    {activeBrand.name}
                  </span>
                </Link>
              ) : product.brand ? (
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  <span className="font-medium">{product.brand}</span>
                </p>
              ) : null}
            </div>
          </div>
          <PriceDisplay price={product.price} originalPrice={product.originalPrice} className="mb-4" />
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
              isAvailable: !selectedSize || availableColorsForSelectedSize.some(ac => ac.variantId === c.variantId)
            }))}
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
          />
        )}

        <StockStatus
          inStock={product.inStock}
          isNotifyEnabled={isStockNotifyEnabled}
          onNotifyClick={() => setShowNotifyModal(true)}
          className="mb-6"
        />

        {product.inStock && (
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
                <span className="text-xs text-muted-foreground">موجودی: {selectedVariantInventory} عدد</span>
              )}
            </div>

            <div className="flex-grow grid grid-cols-6 gap-2">
              <motion.div className="col-span-3 sm:col-span-3" whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  افزودن به سبد خرید
                </Button>
              </motion.div>

              <motion.div className="col-span-1" whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
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
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6" fill={isProductFavorite ? "currentColor" : "none"} />
                </Button>
              </motion.div>

              <motion.div
                className="col-span-1 relative z-10"
                whileHover={{ y: -5, rotate: [0, -5, 5, -5, 0], transition: { duration: 0.5 } }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: [0, 1.1, 1], rotate: [0, -10, 10, -5, 0], transition: { duration: 0.6, ease: "easeOut" } }}
              >
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
                  } transition-all duration-500 disabled:opacity-40 relative group`}
                  disabled={!hasTryOnAvailable()}
                  onClick={handleTryOnClick}
                  aria-label="آزمایش مجازی"
                >
                  {hasTryOnAvailable() && (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      <div className="absolute top-0 left-[-100%] h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/40 dark:to-purple-300/30 opacity-40 animate-shine" />
                    </div>
                  )}
                  <div className="relative flex items-center justify-center">
                    {hasTryOnAvailable() && (
                      <>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75"></span>
                        <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDelay: "0.5s" }}></span>
                        <span className="absolute -top-1 -left-2 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-75" style={{ animationDelay: "1s" }}></span>
                      </>
                    )}
                    <motion.div animate={{ scale: hasTryOnAvailable() ? [1, 1.2, 1] : 1, transition: { repeat: Infinity, repeatType: "mirror", duration: 1.5, ease: "easeInOut" } }}>
                      <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />
                    </motion.div>
                  </div>
                </Button>
              </motion.div>

              <motion.div className="col-span-1" whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
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

        <ProductAttributes attributes={product.attributes} />

        <motion.div
          className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl mb-6 overflow-hidden shadow-sm backdrop-blur-sm"
          whileHover={{ y: -3 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-voxcina-cream/30 dark:divide-voxcina-blue/30">
            <button className="py-3 text-sm font-medium bg-voxcina-cream/30 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream">توضیحات تکمیلی</button>
            <button className="py-3 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">نحوه نگهداری</button>
            <button className="py-3 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors">جدول سایزبندی</button>
          </div>
          <div className="p-4 text-sm leading-relaxed text-voxcina-blue/80 dark:text-voxcina-cream/80">
            <p>{product.name} یکی از محصولات پرطرفدار و باکیفیت برند {product.brand} است که با بهترین مواد اولیه و دقت بالا تولید شده است.</p>
            <p className="mt-2">پارچه به کار رفته در این محصول دارای کیفیت عالی و مقاوم در برابر پارگی و آسیب‌های معمول است.</p>
          </div>
        </motion.div>

        <FeatureGrid
          features={[
            { icon: Truck, title: "ارسال سریع", description: <>ارسال به سراسر کشور<br />طی ۲-۳ روز کاری</> },
            { icon: RotateCcw, title: "۷ روز ضمانت بازگشت", description: <>در صورت عدم رضایت<br />بدون قید و شرط</> },
            { icon: ShieldCheck, title: "ضمانت اصالت کالا", description: <>تضمین اصالت و کیفیت<br />تمامی محصولات</> },
          ]}
          columns={3}
        />
      </motion.div>


      {/* Virtual Try-On Section */}
      <motion.div
        className="col-span-1 md:col-span-2 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-8 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-6">پرو مجازی</h2>
        <div className="grid grid-cols-1 gap-6">
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
                <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">پرو مجازی لباس</h3>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">با آپلود عکس خود، ببینید این محصول چطور به شما می‌آید</p>
                <Button variant="outline" size="sm" className="w-full rounded-xl mb-2" disabled={!hasTryOnAvailable()} onClick={handleTryOnClick}>
                  <Camera className="w-4 h-4 ml-1" />
                  شروع پرو مجازی
                </Button>
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
                  <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-2">(برای این محصول در دسترس نیست)</span>
                )}
              </div>
              <div className="sm:w-2/3">
                {isTryOnLoading && (
                  <div className="flex flex-col items-center justify-center p-6 h-full min-h-[200px]">
                    <div className="w-12 h-12 relative mb-3">
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">در حال پردازش تصویر...</p>
                  </div>
                )}
                {!isTryOnLoading && resultImage && (
                  <div className="flex flex-col gap-4">
                    <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream text-center sm:text-right">نتیجه پرو مجازی</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uploadedPreview && (
                        <div className="aspect-square relative rounded-lg overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
                          <img src={uploadedPreview} alt="تصویر شما" className="object-cover w-full h-full" />
                          <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">تصویر اصلی</div>
                        </div>
                      )}
                      <div className="aspect-square relative rounded-lg overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
                        <img src={resultImage} alt="نتیجه پرو مجازی" className="object-cover w-full h-full" />
                        <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">با لباس</div>
                      </div>
                    </div>
                  </div>
                )}
                {!isTryOnLoading && !resultImage && (
                  <div className="flex flex-col items-center justify-center p-6 h-full min-h-[200px] border border-dashed border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-lg">
                    <Shirt className="h-10 w-10 text-voxcina-blue/30 dark:text-voxcina-cream/30 mb-2" />
                    <p className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50 text-center">با کلیک روی دکمه پرو مجازی، تصویر خود را آپلود کنید<br />و ببینید این لباس روی شما چطور به نظر می‌رسد</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Reviews Section */}
      <div className="col-span-1 md:col-span-2 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-12 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <ProductReviews productId={product.id} reviews={reviews} avgRating={avgRating} onAddReview={handleAddReview} />
        </motion.div>
      </div>

      {/* Modals */}
      <Modal isOpen={showNotifyModal} onClose={() => setShowNotifyModal(false)} title="اطلاع از موجود شدن کالا">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-soft">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">به محض موجود شدن {product.name} به شما اطلاع خواهیم داد.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">ایمیل</label>
            <input type="email" className="w-full px-3 py-2 border border-border/30 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" placeholder="ایمیل خود را وارد کنید" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">شماره موبایل</label>
            <input type="tel" className="w-full px-3 py-2 border border-border/30 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" placeholder="شماره موبایل خود را وارد کنید" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground/80">
            <input type="checkbox" className="w-4 h-4 rounded border-border/30" />
            فقط در صورت موجود شدن سایز {selectedSize || "انتخاب شده"} به من اطلاع بده
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowNotifyModal(false)}>انصراف</Button>
          <Button variant="primary" onClick={() => { setIsStockNotifyEnabled(true); setShowNotifyModal(false); }}>ثبت درخواست</Button>
        </div>
      </Modal>

      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="اشتراک‌گذاری محصول">
        <SocialShare url={productUrl} title={product.name} description={product.description} imageUrl={productImages?.[0]} />
        <div className="flex justify-end mt-6">
          <Button variant="primary" onClick={() => setShowShareModal(false)}>بستن</Button>
        </div>
      </Modal>

      <AnimatePresence>
        {showLightbox && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLightbox(false)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" onClick={() => setShowLightbox(false)}>
              <X className="h-8 w-8" />
            </button>
            <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
              <BackendImage src={productImages?.[selectedImage] || ''} alt={product?.name || ''} className="object-contain max-w-full max-h-full" priority />
              <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors" onClick={(e) => { e.stopPropagation(); handleNextImage(); }}>
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors" onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}>
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
              {productImages?.map((img, idx) => (
                <button
                  key={idx}
                  className={cn("w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative shrink-0", selectedImage === idx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-100")}
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(idx); }}
                >
                  <BackendImage src={img} alt="" className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={showTryOnModal} onClose={() => setShowTryOnModal(false)} title="پرو مجازی" contentClassName="max-w-sm">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-soft">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">تصویر خود را بارگذاری کنید</p>
        </div>
        <label className="block cursor-pointer mb-4">
          <div className={cn("border-2 border-dashed rounded-xl p-4 text-center transition-colors", uploadedPreview ? "border-primary/30" : "border-border/30 hover:border-primary/40")}>
            {uploadedPreview ? (
              <img src={uploadedPreview} alt="preview" className="max-h-[30vh] w-auto mx-auto rounded-lg shadow object-contain" />
            ) : (
              <div className="py-6">
                <Camera className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">برای انتخاب تصویر کلیک کنید</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleUserImageSelect} className="hidden" />
        </label>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => { setUploadedFile(null); setShowTryOnModal(false); }}>انصراف</Button>
          <Button variant="primary" className="flex-1" onClick={handleTryOnSubmit} disabled={!uploadedFile}>شروع آزمایش</Button>
        </div>
      </Modal>
    </div>
  );
}
