"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import LazyMount from "@/components/ui/LazyMount";
import Modal from "@/components/ui/Modal";
import { activityTracker } from "@/lib/activity-tracker";
import { findVariantByIdOrLegacyValue, getVariantId } from "@/lib/product-variants";
import { useAuthStore } from "@/store/auth-store";
import { useBrandStore } from "@/store/brand-store";
import { useCartStore } from "@/store/cart-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { useProductStore } from "@/store/product-store";
import { useReviewStore } from "@/store/review-store";
import { useTryOnStore } from "@/store/tryon-store";
import { Product, Review } from "@/types/product";
import ProductGallery from "./ProductGallery";
import { cn } from "@/lib/utils";
import ProductInfoTabs from "./ProductInfoTabs";
import ProductPurchasePanel, { BrandLink } from "./ProductPurchasePanel";
import ProductStickyBar from "./ProductStickyBar";
import ProductTryOnPanel from "./ProductTryOnPanel";
import StockNotifyModal from "./StockNotifyModal";
import { useVariantSelection } from "./useVariantSelection";

// Both sit below the fold, so their code stays out of the chunk the browser
// has to parse before it can paint the gallery — this route's LCP element.
//
// Each needs its own `loading`: that is what makes Next wrap the lazy component
// in a Suspense boundary (`lazy-dynamic/loadable.js` uses a bare Fragment
// otherwise), and without it their suspension escapes all the way to the
// route's `loading.tsx` and flashes the whole page as a skeleton.
const ProductReviews = dynamic(() => import("@/components/product/ProductReviews"), {
  loading: () => <div className="min-h-[24rem]" aria-hidden="true" />,
});
const SocialShare = dynamic(() => import("@/components/product/SocialShare"), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
});

interface ProductDetailViewProps {
  product: Product;
  productUrl: string;
  reviews: Review[];
}

/**
 * Client shell for the product detail route.
 *
 * Holds the cross-cutting concerns only — variant selection, the stores, the
 * activity tracking and the cart handoff — and hands presentation to the
 * components beside it. Each section owns its own markup so none of them has
 * to know about the page grid.
 *
 * This is the component that reads `useSearchParams`, which is why the route
 * must stay dynamic; see the note at the top of the page file.
 */
export default function ProductDetailView({ product, productUrl, reviews }: ProductDetailViewProps) {
  const searchParams = useSearchParams();
  const lockedVariant = searchParams.get("variant") || searchParams.get("color");

  const selection = useVariantSelection(product, lockedVariant);
  const router = useRouter();

  const [isShareOpen, setShareOpen] = useState(false);
  const [isNotifyOpen, setNotifyOpen] = useState(false);
  const [isNotifyEnabled, setNotifyEnabled] = useState(false);
  const [isAdding, setAdding] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const addingRef = useRef(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const actionRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const viewStartRef = useRef(Date.now());
  const viewReportedRef = useRef(false);

  const { addItem } = useCartStore();
  const { submitReview } = useReviewStore();
  const { addToFavorites, isFavorite } = useDashboardStore();
  const { addRecentlyViewed } = useProductStore();
  const { isAuthenticated, user } = useAuthStore();
  const { activeBrand, fetchBrandById } = useBrandStore();
  const {
    uploadedPreview,
    resultImage,
    isProcessing: isTryOnProcessing,
  } = useTryOnStore();

  /** Variant images first, then the product-level shots. */
  const images = useMemo(() => {
    const variant = findVariantByIdOrLegacyValue(product.colorVariants, selection.selectedColor);
    const leading = variant?.images?.length ? variant.images : product.colorVariants?.[0]?.images || [];
    return [...leading, ...(product.mainImages || [])];
  }, [product.colorVariants, product.mainImages, selection.selectedColor]);

  const isTryOnAvailable = useMemo(
    () => Boolean(product.colorVariants?.some((variant) => variant.tryOnImage)),
    [product.colorVariants]
  );

  const avgRating = useMemo(
    () => (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0),
    [reviews]
  );

  const brand: BrandLink | undefined = activeBrand
    ? {
        name: activeBrand.name,
        href: `/brands/${activeBrand.slug || activeBrand.id}`,
        logo: activeBrand.logo,
      }
    : undefined;

  // Record the visit once it ends, with the time spent on the page.
  useEffect(() => {
    addRecentlyViewed(product);
    viewStartRef.current = Date.now();
    viewReportedRef.current = false;

    const reportView = () => {
      if (viewReportedRef.current) return;
      viewReportedRef.current = true;
      const variant =
        findVariantByIdOrLegacyValue(product.colorVariants, lockedVariant) || product.colorVariants?.[0];
      activityTracker.trackProductView(
        product.id,
        product.name,
        Date.now() - viewStartRef.current,
        {
          source: "product_detail_dwell",
          variantId: variant?.variantId,
          color: variant?.color,
          colorName: variant?.colorName,
          swatchImage: variant?.swatchImage,
        },
        true
      );
    };

    document.addEventListener("visibilitychange", reportView);
    return () => {
      document.removeEventListener("visibilitychange", reportView);
      reportView();
    };
  }, [product, addRecentlyViewed, lockedVariant]);

  useEffect(() => {
    if (product.brand_id) fetchBrandById(product.brand_id);
  }, [product.brand_id, fetchBrandById]);

  const handleImageView = useCallback(
    ({ index, total, source, dwellMs }: { index: number; total: number; source: string; dwellMs: number }) => {
      activityTracker.trackImageViewed(product.id, product.name, index, total, source, dwellMs);
    },
    [product.id, product.name]
  );

  const handleZoomChange = useCallback(
    (zoomed: boolean, index: number) => {
      activityTracker.trackImageViewed(
        product.id,
        product.name,
        index,
        images.length,
        zoomed ? "zoom_in" : "zoom_out"
      );
    },
    [product.id, product.name, images.length]
  );

  const handleColorChange = (color?: string) => {
    selection.setColor(color);
    const variant = findVariantByIdOrLegacyValue(product.colorVariants, color);
    activityTracker.trackColorClick(product.id, product.name, color, variant?.color, {
      swatchImage: variant?.swatchImage,
      hasStock: variant?.sizes?.some((size) => size.quantity > 0),
      variantId: getVariantId(variant),
    });
    if (variant) {
      activityTracker.trackProductView(product.id, product.name, undefined, {
        source: "variant_selection",
        variantId: variant.variantId,
        color: variant.color,
        colorName: variant.colorName,
        swatchImage: variant.swatchImage,
      });
    }
  };

  /** Adds the chosen variant to the cart. Returns false when the selection is not valid yet. */
  const addSelectionToCart = async () => {
    const problem = selection.validate();
    if (problem) {
      toast.error(problem);
      return false;
    }
    const variant = selection.selectedVariant;
    await addItem(
      product,
      selection.quantity,
      selection.selectedSize,
      variant?.color || variant?.colorName,
      variant?.colorName,
      variant?.variantId
    );
    return true;
  };

  const handleAddToCart = async () => {
    if (addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      if (await addSelectionToCart()) toast.success("محصول به سبد خرید اضافه شد");
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const handleTryOn = async () => {
    if (!isAuthenticated) {
      toast.info("برای استفاده از پرو مجازی ابتدا وارد شوید");
      router.push("/sign-in");
      return;
    }
    if (await addSelectionToCart()) router.push("/tryon");
  };

  const handleShare = () => {
    if (!navigator.share) {
      setShareOpen(true);
      return;
    }
    navigator
      .share({ title: product.name, text: product.description, url: window.location.href })
      .catch(() => setShareOpen(true));
  };

  const handleAddReview = (review: Omit<Review, "id" | "date" | "likes" | "dislikes">) => {
    if (!isAuthenticated || !user) {
      toast.info("برای ثبت نظر ابتدا وارد شوید");
      return;
    }
    const token = localStorage.getItem("authToken") || "";
    submitReview(review.productId, review.rating, review.comment, review.isRecommended ?? true, token);
  };

  return (
    <>
      {/* Mobile sticky top bar that slides down on scroll */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex items-center justify-between overflow-hidden border-b border-white/20 bg-[#0e223d]/85 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[0_10px_30px_rgba(10,25,47,0.35)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 motion-reduce:transition-none lg:hidden",
          isScrolled ? "translate-y-0" : "-translate-y-full pointer-events-none"
        )}
      >
        {/* Light objects behind sticky bar */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -top-10 right-10 h-28 w-28 rounded-full bg-[#E6C687]/30 blur-xl" />
          <div className="absolute -top-10 left-10 h-28 w-28 rounded-full bg-[#3b82f6]/25 blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
        </div>

        <Link
          href="/products"
          aria-label="بازگشت به محصولات"
          className="flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-voxcina-cream backdrop-blur-md transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream"
        >
          <ArrowRight className="size-5" />
        </Link>
        <p className="line-clamp-1 px-3 text-center text-sm font-bold text-voxcina-cream">
          {product.name}
        </p>
        <button
          type="button"
          onClick={() => product.id && addToFavorites(product.id)}
          aria-label={product.id && isFavorite(product.id) ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
          aria-pressed={product.id ? isFavorite(product.id) : false}
          className="flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-voxcina-cream backdrop-blur-md transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream"
        >
          <Heart className="size-5" fill={product.id && isFavorite(product.id) ? "currentColor" : "none"} />
        </button>
      </div>

      <div
        ref={heroRef}
        className="bg-[#0e223d] sm:rounded-[28px] sm:shadow-[0_20px_50px_rgba(10,25,47,0.35)] sm:border sm:border-white/15 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:rounded-[32px] lg:overflow-hidden"
      >
        <ProductGallery
          images={images}
          productName={product.name}
          brand={product.brand}
          isFavorite={product.id ? isFavorite(product.id) : false}
          onToggleFavorite={() => product.id && addToFavorites(product.id)}
          backHref="/products"
          isScrolled={isScrolled}
          onImageView={handleImageView}
          onZoomChange={handleZoomChange}
        />

        <ProductPurchasePanel
          panelRef={panelRef}
          ref={actionRowRef}
          product={product}
          selection={selection}
          brand={brand}
          avgRating={avgRating}
          reviewCount={reviews.length}
          isAdding={isAdding}
          isTryOnAvailable={isTryOnAvailable}
          isNotifyEnabled={isNotifyEnabled}
          onColorChange={handleColorChange}
          onAddToCart={handleAddToCart}
          onTryOn={handleTryOn}
          onShare={handleShare}
          onNotifyRequest={() => setNotifyOpen(true)}
        />
      </div>

      <ProductInfoTabs
        product={product}
        selectedSize={selection.selectedSize}
        onSelectSize={selection.setSize}
        className="relative z-10 mt-6 px-3 sm:px-0 lg:mt-10"
      />

      <ProductTryOnPanel
        className={cn("relative z-10 mt-6 px-3 sm:px-0 lg:mt-10", !isTryOnAvailable && "hidden")}
        isAvailable={isTryOnAvailable}
        isProcessing={isTryOnProcessing}
        resultImage={resultImage}
        uploadedPreview={uploadedPreview}
        onStart={handleTryOn}
      />

      <section id="reviews" className="relative z-10 mt-12 scroll-mt-28 px-3 sm:px-0">
        <LazyMount fallback={<div className="min-h-[24rem]" />}>
          <ProductReviews
            productId={product.id}
            reviews={reviews}
            avgRating={avgRating}
            onAddReview={handleAddReview}
          />
        </LazyMount>
      </section>

      <ProductStickyBar
        product={product}
        selection={selection}
        image={images[0]}
        anchorRef={actionRowRef}
        onAddToCart={handleAddToCart}
        isAdding={isAdding}
      />

      <StockNotifyModal
        isOpen={isNotifyOpen}
        productName={product.name}
        selectedSize={selection.selectedSize}
        onClose={() => setNotifyOpen(false)}
        onSubmit={() => {
          setNotifyEnabled(true);
          setNotifyOpen(false);
        }}
      />

      <Modal isOpen={isShareOpen} onClose={() => setShareOpen(false)} title="اشتراک‌گذاری محصول">
        <SocialShare
          url={productUrl}
          title={product.name}
          description={product.description}
          imageUrl={images[0]}
        />
        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => setShareOpen(false)}>
            بستن
          </Button>
        </div>
      </Modal>
    </>
  );
}
