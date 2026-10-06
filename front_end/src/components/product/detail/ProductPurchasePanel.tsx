"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import { Heart, RotateCcw, Share2, ShieldCheck, Shirt, Truck } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import Button from "@/components/ui/Button";
import ColorSelector from "@/components/ui/ColorSelector";
import { FeatureGrid } from "@/components/ui/FeatureCard";
import PriceDisplay from "@/components/ui/PriceDisplay";
import QuantitySelector from "@/components/ui/QuantitySelector";
import SizeSelector from "@/components/ui/SizeSelector";
import StarRating from "@/components/ui/StarRating";
import StockStatus from "@/components/ui/StockStatus";
import { cn, toPersianNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import { VariantSelection } from "./useVariantSelection";
import SizeGuideModal from "./SizeGuideModal";
import SizeRecommendationModal from "./SizeRecommendationModal";

// Compact only the PDP's pickers; other consumers keep the shared defaults.
// Size buttons stay at least 44px in both directions, including long labels.
const mobileSizeSelectorClassName = cn(
  "max-sm:mb-4",
  "max-sm:[&>div:first-child]:flex-wrap max-sm:[&>div:first-child]:gap-x-2",
  "max-sm:[&>div:first-child>div]:gap-1 max-sm:[&>div:first-child_button]:px-1.5 max-sm:[&>div:first-child_button]:text-[11px]",
  "max-sm:[&_[data-size-option]]:min-w-11 max-sm:[&_[data-size-option]]:px-2 max-sm:[&_[data-size-option]]:py-1 max-sm:[&_[data-size-option]]:text-xs"
);

// Put the smaller visual rings on the swatches, not on the 44px tap targets.
// The existing check icon identifies selection; disabled opacity stays intact.
const mobileColorSelectorClassName = cn(
  "max-sm:mb-4 max-sm:[&>div:last-child]:gap-1",
  "max-sm:[&>div:last-child>button]:size-11 max-sm:[&>div:last-child>button]:ring-0 max-sm:[&>div:last-child>button]:ring-offset-0",
  "max-sm:[&>div:last-child>button>:is(span,img)]:size-6 max-sm:[&>div:last-child>button>:is(span,img)]:ring-1 max-sm:[&>div:last-child>button>:is(span,img)]:ring-border/30",
  "max-sm:[&>div:last-child>button:has(svg)>:is(span,img)]:ring-2 max-sm:[&>div:last-child>button:has(svg)>:is(span,img)]:ring-primary max-sm:[&>div:last-child>button:has(svg)>:is(span,img)]:ring-offset-2",
  "max-sm:[&>div:last-child>button>svg]:size-3.5",
  "max-sm:[&>div:last-child>button:focus-visible]:outline max-sm:[&>div:last-child>button:focus-visible]:outline-2 max-sm:[&>div:last-child>button:focus-visible]:outline-offset-2 max-sm:[&>div:last-child>button:focus-visible]:outline-primary"
);

export interface BrandLink {
  name: string;
  href: string;
  logo?: string;
}

interface ProductPurchasePanelProps {
  product: Product;
  selection: VariantSelection;
  brand?: BrandLink;
  avgRating: number;
  reviewCount: number;
  isFavorite: boolean;
  isTryOnAvailable: boolean;
  isNotifyEnabled: boolean;
  onColorChange: (color?: string) => void;
  onAddToCart: () => void;
  onToggleFavorite: () => void;
  onTryOn: () => void;
  onShare: () => void;
  onNotifyRequest: () => void;
  className?: string;
}

/** Why the quantity stepper is still disabled, in the visitor's words. */
function selectionHint(selection: VariantSelection): string | null {
  if (selection.isComplete) return null;
  if (selection.needsColorSelection && selection.needsSizeSelection) return "ابتدا رنگ و سایز را انتخاب کنید";
  if (selection.needsColorSelection) return "ابتدا رنگ را انتخاب کنید";
  if (selection.needsSizeSelection) return "ابتدا سایز را انتخاب کنید";
  return null;
}

/**
 * Everything needed to decide and buy: identity, price, variant pickers, stock
 * and the action row. Deliberately short — the description, care notes, size
 * chart and specs moved to a full-width section below the fold, because on a
 * desktop viewport they made this column run roughly three times the height of
 * the gallery next to it and left the page badly lopsided.
 *
 * The ref lands on the action row: `ProductStickyBar` observes it to know when
 * the add-to-cart button has scrolled out of view.
 */
const ProductPurchasePanel = forwardRef<HTMLDivElement, ProductPurchasePanelProps>(
  function ProductPurchasePanel(
    {
      product,
      selection,
      brand,
      avgRating,
      reviewCount,
      isFavorite,
      isTryOnAvailable,
      isNotifyEnabled,
      onColorChange,
      onAddToCart,
      onToggleFavorite,
      onTryOn,
      onShare,
      onNotifyRequest,
      className,
    },
    actionRowRef
  ) {
    const hint = selectionHint(selection);
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isSizeRecommendationOpen, setIsSizeRecommendationOpen] = useState(false);

    return (
      <div className={cn("animate-hero-rise min-w-0", className)}>
        <h1 className="mb-2 text-2xl font-bold text-primary lg:text-3xl">{product.name}</h1>

        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {brand ? (
            <Link href={brand.href} className="group flex items-center gap-2">
              {brand.logo && (
                <span className="relative block h-6 w-6 overflow-hidden rounded-full border border-border/30">
                  {/* 24px slot. Without `sizes` this falls back to BackendImage's
                      400px default and pulls a variant larger than the product photo. */}
                  <BackendImage src={brand.logo} alt="" className="h-full w-full object-cover" sizes="24px" />
                </span>
              )}
              <span className="text-sm font-medium text-foreground/80 transition-colors group-hover:text-primary">
                {brand.name}
              </span>
            </Link>
          ) : (
            product.brand && <span className="text-sm font-medium text-foreground/80">{product.brand}</span>
          )}

          {reviewCount > 0 && (
            <a href="#reviews" className="group flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating initialRating={Math.round(avgRating)} readonly size="sm" />
              <span className="transition-colors group-hover:text-primary">
                {toPersianNumber(reviewCount)} نظر
              </span>
            </a>
          )}
        </div>

        <PriceDisplay price={product.price} originalPrice={product.originalPrice} className="mb-6" />

        {selection.sizes.length > 0 && (
          <SizeSelector
            className={mobileSizeSelectorClassName}
            sizes={selection.sizes}
            selectedSize={selection.selectedSize}
            onSizeChange={selection.setSize}
            availableSizes={selection.selectedColor ? selection.sizesForSelectedColor : undefined}
            showClearButton={!!(selection.selectedSize || selection.selectedColor)}
            onClear={selection.clear}
            showSizeGuide={true}
            sizeGuideLabel="جدول اندازه‌ها"
            onSizeGuideClick={() => setIsSizeGuideOpen(true)}
            showSizeRecommendation
            onSizeRecommendationClick={() => setIsSizeRecommendationOpen(true)}
          />
        )}

        {selection.colors.length > 0 && (
          <ColorSelector
            className={mobileColorSelectorClassName}
            colors={selection.colors.map((color) => ({
              ...color,
              isAvailable:
                !selection.selectedSize ||
                selection.colorsForSelectedSize.some((available) => available.variantId === color.variantId),
            }))}
            selectedColor={selection.selectedColor}
            onColorChange={onColorChange}
          />
        )}

        <StockStatus
          inStock={product.inStock}
          isNotifyEnabled={isNotifyEnabled}
          onNotifyClick={onNotifyRequest}
          className="mb-6"
        />

        {product.inStock && (
          <div ref={actionRowRef} className="mb-8 space-y-3">
            <div className="flex items-stretch gap-3">
              <QuantitySelector
                value={selection.quantity}
                onChange={selection.setQuantity}
                min={1}
                max={selection.canModifyQuantity ? selection.inventory : 1}
                disabled={!selection.canModifyQuantity}
              />
              <Button
                variant="primary"
                size="lg"
                onClick={onAddToCart}
                className="flex-1 rounded-xl shadow-soft transition-shadow hover:shadow-medium"
              >
                افزودن به سبد خرید
              </Button>
            </div>

            {hint && <p className="text-xs text-amber-600 dark:text-amber-400">{hint}</p>}
            {selection.isComplete && selection.inventory > 0 && (
              <p className="text-xs text-muted-foreground">
                موجودی: {toPersianNumber(selection.inventory)} عدد
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={isFavorite ? "primary" : "outline"}
                onClick={onToggleFavorite}
                className={cn("rounded-xl", isFavorite && "bg-red-500 text-white hover:bg-red-600")}
              >
                <Heart className="ml-1.5 h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                علاقه‌مندی
              </Button>
              <Button
                variant="outline"
                onClick={onTryOn}
                disabled={!isTryOnAvailable}
                title={isTryOnAvailable ? undefined : "برای این محصول در دسترس نیست"}
                className="rounded-xl"
              >
                <Shirt className="ml-1.5 h-4 w-4" />
                پرو مجازی
              </Button>
              <Button variant="outline" onClick={onShare} className="rounded-xl">
                <Share2 className="ml-1.5 h-4 w-4" />
                اشتراک‌گذاری
              </Button>
            </div>
          </div>
        )}

        <FeatureGrid
          features={[
            { icon: Truck, title: "ارسال سریع", description: <>ارسال به سراسر کشور<br />طی ۲-۳ روز کاری</> },
            { icon: RotateCcw, title: "۷ روز ضمانت بازگشت", description: <>در صورت عدم رضایت<br />بدون قید و شرط</> },
            { icon: ShieldCheck, title: "ضمانت اصالت کالا", description: <>تضمین اصالت و کیفیت<br />تمامی محصولات</> },
          ]}
          columns={3}
        />

        <SizeGuideModal
          isOpen={isSizeGuideOpen}
          onClose={() => setIsSizeGuideOpen(false)}
          product={product}
          selectedSize={selection.selectedSize}
          onSelectSize={selection.setSize}
        />

        <SizeRecommendationModal
          isOpen={isSizeRecommendationOpen}
          onClose={() => setIsSizeRecommendationOpen(false)}
          onOpenSizeGuide={() => {
            // Let the recommendation dialog restore its body lock before the
            // guide's Modal acquires its own lock.
            window.setTimeout(() => setIsSizeGuideOpen(true), 0);
          }}
          product={product}
          selection={selection}
        />
      </div>
    );
  }
);

export default ProductPurchasePanel;
