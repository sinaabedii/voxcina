"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
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
import ProductInfoTabs from "./ProductInfoTabs";
import ProductPurchasePanel, { BrandLink } from "./ProductPurchasePanel";
import ProductStickyBar from "./ProductStickyBar";
import ProductTryOnPanel from "./ProductTryOnPanel";
import StockNotifyModal from "./StockNotifyModal";
import { useVariantSelection } from "./useVariantSelection";

// Both sit below the fold, so their code stays out of the chunk the browser
// has to parse before it can paint the gallery — this route's LCP element.
const ProductReviews = dynamic(() => import("@/components/product/ProductReviews"));
const SocialShare = dynamic(() => import("@/components/product/SocialShare"));

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

  const actionRowRef = useRef<HTMLDivElement>(null);
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
    if (await addSelectionToCart()) toast.success("محصول به سبد خرید اضافه شد");
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-12">
        <ProductGallery
          images={images}
          productName={product.name}
          brand={product.brand}
          onImageView={handleImageView}
          onZoomChange={handleZoomChange}
        />

        <ProductPurchasePanel
          ref={actionRowRef}
          product={product}
          selection={selection}
          brand={brand}
          avgRating={avgRating}
          reviewCount={reviews.length}
          isFavorite={product.id ? isFavorite(product.id) : false}
          isTryOnAvailable={isTryOnAvailable}
          isNotifyEnabled={isNotifyEnabled}
          onColorChange={handleColorChange}
          onAddToCart={handleAddToCart}
          onToggleFavorite={() => product.id && addToFavorites(product.id)}
          onTryOn={handleTryOn}
          onShare={handleShare}
          onNotifyRequest={() => setNotifyOpen(true)}
        />
      </div>

      <ProductInfoTabs product={product} className="mt-12" />

      <ProductTryOnPanel
        className="mt-12"
        isAvailable={isTryOnAvailable}
        isProcessing={isTryOnProcessing}
        resultImage={resultImage}
        uploadedPreview={uploadedPreview}
        onStart={handleTryOn}
      />

      <section id="reviews" className="mt-12 scroll-mt-28">
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
