"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Minus, Plus, Ruler, Share2, ShieldCheck, Shirt, Sparkles, Star } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import { VariantSelection } from "./useVariantSelection";
import ProductCartButton from "./ProductCartButton";
import ProductColorModal from "./ProductColorModal";
import SizeGuideModal from "./SizeGuideModal";
import SizeRecommendationModal from "./SizeRecommendationModal";

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
  isTryOnAvailable: boolean;
  isNotifyEnabled: boolean;
  isAdding: boolean;
  onColorChange: (color?: string) => void;
  onAddToCart: () => void;
  onTryOn: () => void;
  onShare: () => void;
  onNotifyRequest: () => void;
  className?: string;
}

const helperButtonClass = "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-voxcina-blue/15 bg-white/80 px-2.5 text-xs font-medium text-voxcina-blue/90 shadow-2xs transition-all hover:border-voxcina-blue/30 hover:bg-white hover:text-voxcina-blue active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

function selectionHint(selection: VariantSelection): string | null {
  if (selection.isComplete) return null;
  if (selection.needsColorSelection && selection.needsSizeSelection) return "رنگ و سایز دلخواهتان را انتخاب کنید";
  if (selection.needsColorSelection) return "رنگ دلخواهتان را انتخاب کنید";
  if (selection.needsSizeSelection) return "سایز دلخواهتان را انتخاب کنید";
  return null;
}

/** The reference's compact, dark purchase surface, in Voxcina's navy and cream with glassmorphic depth. */
const ProductPurchasePanel = forwardRef<HTMLDivElement, ProductPurchasePanelProps>(
  function ProductPurchasePanel(
    { product, selection, brand, avgRating, reviewCount, isTryOnAvailable, isNotifyEnabled,
      isAdding, onColorChange, onAddToCart, onTryOn, onShare, onNotifyRequest, className },
    actionRowRef
  ) {
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isSizeRecommendationOpen, setIsSizeRecommendationOpen] = useState(false);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const hint = selectionHint(selection);
    const discount = product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

    const MAX_PREVIEW_COLORS = 4;
    const selectedColorIndex = selection.colors.findIndex(
      (c) => (c.variantId || c.colorName) === selection.selectedColor
    );
    let previewColors = selection.colors;
    if (selection.colors.length > MAX_PREVIEW_COLORS) {
      if (selectedColorIndex >= 3) {
        previewColors = [
          selection.colors[0],
          selection.colors[1],
          selection.colors[selectedColorIndex],
        ];
      } else {
        previewColors = selection.colors.slice(0, 3);
      }
    }
    const remainingColorsCount = selection.colors.length - previewColors.length;

    return (
      <div
        id="product-selection"
        className={cn(
          "relative z-10 -mt-6 flex min-w-0 flex-col overflow-hidden rounded-t-[32px] px-5 pb-6 pt-5 text-voxcina-blue shadow-[0_-12px_40px_rgba(26,60,105,0.08)] sm:-mt-8 sm:rounded-t-[36px] sm:px-7 sm:py-7 lg:mt-0 lg:rounded-none lg:pt-7 lg:justify-center lg:px-8 xl:px-10 lg:shadow-none",
          className
        )}
      >
        {/* Layer 1: Ethereal ambient light situation BEHIND the frosted glass */}
        {/* Feathered radial gradients only — a `filter: blur()` here would re-rasterize the
            whole sheet every animation frame and stalls phone scrolling */}
        <div className="pointer-events-none absolute inset-0 -z-30 overflow-hidden opacity-50" aria-hidden="true">
          {/* Ambient Warm Situational Aura (top-right) - soft champagne/gold glow */}
          <div
            className="absolute -top-32 -right-24 size-[28rem] sm:size-[36rem] rounded-full opacity-70 will-change-transform transform-gpu animate-light-shine-pulse bg-[radial-gradient(circle_at_45%_45%,rgba(255,255,255,0.40)_0%,rgba(254,240,138,0.20)_22%,rgba(245,158,11,0.07)_45%,rgba(245,158,11,0.02)_66%,transparent_86%)]"
          />

          {/* Ambient Cool Celestial Situational Aura (mid/lower-left) - soft sky azure glow */}
          <div
            className="absolute top-1/3 -left-28 size-[28rem] sm:size-[36rem] rounded-full opacity-60 will-change-transform transform-gpu animate-organic-morph bg-[radial-gradient(circle_at_45%_45%,rgba(255,255,255,0.35)_0%,rgba(186,230,253,0.16)_22%,rgba(56,189,248,0.05)_45%,rgba(56,189,248,0.015)_66%,transparent_86%)]"
          />
        </div>

        {/* Layer 2: True frosted glass surface with blur & saturation boost active on mobile & desktop */}
        <div
          className="pointer-events-none absolute inset-0 -z-20 border-t border-white/90 bg-white/80 backdrop-blur-lg backdrop-saturate-125 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(26,60,105,0.03)] sm:bg-[#FAF7F2]/80 sm:backdrop-blur-2xl sm:backdrop-saturate-140 lg:border-t-0 lg:border-r lg:border-voxcina-blue/10"
          aria-hidden="true"
        />

        {/* Layer 3: Specular glass highlights, bevel rim reflection, and silky smooth hardware-accelerated shine */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          {/* Top edge hairline glass rim reflection */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent" />

          {/* Vertical glass luminosity wash */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-voxcina-cream/10" />

          {/* Silky smooth hardware-accelerated shining specular sweep */}
          <div className="absolute -inset-y-16 -left-full w-2/3 animate-glass-shine bg-gradient-to-r from-transparent via-white/35 via-amber-50/20 to-transparent motion-reduce:hidden" />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {(brand || product.brand) && (
              <p className="mb-1 text-xs text-voxcina-blue/70">
                {brand ? <Link href={brand.href} className="rounded hover:text-voxcina-blue focus-visible:outline focus-visible:outline-2">{brand.name}</Link> : product.brand}
              </p>
            )}
            <h1 className="text-xl font-bold leading-snug text-voxcina-blue sm:text-2xl">{product.name}</h1>
          </div>
          <div className="shrink-0 pt-1 text-left">
            <p className="text-xl font-bold tabular-nums text-voxcina-blue sm:text-2xl">{toPersianNumber(product.price.toLocaleString("en-US"))}</p>
            <span className="text-xs text-voxcina-blue/70">تومان</span>
            {discount > 0 && (
              <div className="mt-1 flex items-center justify-end gap-1.5 text-xs">
                <del className="text-voxcina-blue/45">{toPersianNumber(product.originalPrice.toLocaleString("en-US"))}</del>
                <span className="rounded-full bg-voxcina-blue px-1.5 py-0.5 font-bold text-voxcina-cream">{toPersianNumber(discount)}٪</span>
              </div>
            )}
          </div>
        </div>

        {product.description?.trim() && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-voxcina-blue/75">{product.description}</p>
        )}

        <a href="#reviews" className="mt-1.5 inline-flex w-fit items-center gap-2 rounded text-xs text-voxcina-blue/80 transition-colors hover:text-voxcina-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className={cn("size-3.5", reviewCount && index < Math.round(avgRating) ? "fill-[#D4B373] text-[#D4B373]" : "text-voxcina-blue/20")} />
            ))}
          </span>
          <span className="font-medium text-voxcina-blue">
            {reviewCount ? toPersianNumber(avgRating.toFixed(1)) : "۰"}
          </span>
          <span className="text-voxcina-blue/60">
            {reviewCount ? `(${toPersianNumber(reviewCount)} نظر)` : "(ثبت اولین نظر)"}
          </span>
        </a>

        <div className="mt-3.5 flex items-center justify-between gap-3">
          {selection.colors.length > 0 && (
            <fieldset className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <legend className="text-xs">
                  رنگ: <span className="text-voxcina-blue/75">{selection.selectedVariant?.colorName || "انتخاب کنید"}</span>
                </legend>
                {selection.colors.length > MAX_PREVIEW_COLORS && (
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(true)}
                    className="text-xs text-voxcina-blue/70 transition-colors hover:text-voxcina-blue"
                  >
                    همه ({toPersianNumber(selection.colors.length)})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {previewColors.map((color) => {
                  const key = color.variantId || color.colorName;
                  const selected = selection.selectedColor === key;
                  const available = !selection.selectedSize || selection.colorsForSelectedSize.some((item) => item.variantId === color.variantId);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`${color.colorName}${available ? "" : "، ناموجود در این سایز"}`}
                      aria-pressed={selected}
                      disabled={!available}
                      title={color.colorName}
                      onClick={() => onColorChange(selected ? undefined : key)}
                      className={cn(
                        "relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue disabled:cursor-not-allowed disabled:opacity-35",
                        selected
                          ? "border border-dashed border-voxcina-blue bg-voxcina-blue/10 shadow-[0_2px_10px_rgba(26,60,105,0.18)]"
                          : "border border-voxcina-blue/15 bg-white/80 hover:border-voxcina-blue/30 hover:bg-white"
                      )}
                    >
                      <span className="relative block size-5 overflow-hidden rounded-[5px] border border-voxcina-blue/20 shadow-xs" style={{ backgroundColor: color.color?.startsWith("#") ? color.color : "#DFD8CC" }}>
                        {color.swatchImage && <Image src={color.swatchImage} alt="" fill sizes="20px" className="object-cover" />}
                      </span>
                      {selected && <Check className="absolute size-2.5 rounded-full bg-voxcina-blue p-0.5 text-white shadow-xs" aria-hidden="true" />}
                    </button>
                  );
                })}
                {remainingColorsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(true)}
                    aria-label={`مشاهده ${toPersianNumber(remainingColorsCount)} رنگ دیگر`}
                    title={`مشاهده ${toPersianNumber(remainingColorsCount)} رنگ دیگر`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-voxcina-blue/15 bg-white/80 text-xs font-bold text-voxcina-blue shadow-xs transition-all hover:border-voxcina-blue/30 hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-voxcina-blue"
                  >
                    {toPersianNumber(remainingColorsCount)}+
                  </button>
                )}
              </div>
            </fieldset>
          )}
          {product.inStock && (
            <div className="shrink-0">
              <span className="sr-only">تعداد</span>
              <div
                className="flex h-10 items-center overflow-hidden rounded-xl border border-voxcina-blue/20 bg-white/95 text-voxcina-blue shadow-[0_2px_10px_rgba(26,60,105,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                dir="ltr"
              >
                <button
                  type="button"
                  aria-label="کاهش تعداد"
                  disabled={!selection.canModifyQuantity || selection.quantity <= 1}
                  onClick={() => selection.setQuantity(selection.quantity - 1)}
                  className="flex size-10 items-center justify-center hover:bg-voxcina-cream/60 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:opacity-35"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
                  {toPersianNumber(selection.quantity)}
                </span>
                <button
                  type="button"
                  aria-label="افزایش تعداد"
                  disabled={!selection.canModifyQuantity || selection.quantity >= selection.inventory}
                  onClick={() => selection.setQuantity(selection.quantity + 1)}
                  className="flex size-10 items-center justify-center hover:bg-voxcina-cream/60 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:opacity-35"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {selection.sizes.length > 0 ? (
          <fieldset className="mt-3.5">
            <legend className="sr-only">انتخاب سایز</legend>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs">
                سایز:{" "}
                <span className="text-voxcina-blue/75">
                  {selection.selectedSize ? toPersianNumber(selection.selectedSize) : "انتخاب کنید"}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selection.sizes.map((size) => {
                const selected = size === selection.selectedSize;
                const available = !selection.selectedColor || selection.sizesForSelectedColor.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    data-size-option={size}
                    aria-pressed={selected}
                    disabled={!available}
                    onClick={() => selection.setSize(selected ? undefined : size)}
                    className={cn(
                      "h-9 min-w-9 rounded-lg border px-2.5 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-blue disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none",
                      selected
                        ? "border-voxcina-blue bg-voxcina-blue font-bold text-voxcina-cream shadow-[0_2px_10px_rgba(26,60,105,0.2)]"
                        : "border-voxcina-blue/15 bg-white/80 text-voxcina-blue hover:border-voxcina-blue/30 hover:bg-white",
                      !available && "line-through opacity-40"
                    )}
                  >
                    {toPersianNumber(size)}
                  </button>
                );
              })}
            </div>

            {/* Sizing & Try-on helper buttons row - unified matching style */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onTryOn}
                disabled={!isTryOnAvailable || !product.inStock}
                title={isTryOnAvailable ? undefined : "برای این محصول در دسترس نیست"}
                className={helperButtonClass}
              >
                <Shirt className="size-3.5" />
                پرو مجازی
              </button>
              <button
                type="button"
                className={helperButtonClass}
                onClick={() => setIsSizeGuideOpen(true)}
              >
                <Ruler className="size-3.5" />
                راهنمای سایز
              </button>
              <button
                type="button"
                className={helperButtonClass}
                onClick={() => setIsSizeRecommendationOpen(true)}
              >
                <Sparkles className="size-3.5" />
                سایز من
              </button>
            </div>
          </fieldset>
        ) : (
          isTryOnAvailable && (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={onTryOn}
                disabled={!product.inStock}
                className={cn(helperButtonClass, "w-full flex-none")}
              >
                <Shirt className="size-3.5" />
                پرو مجازی
              </button>
            </div>
          )
        )}

        <div ref={actionRowRef} className="mt-4">
          {product.inStock ? (
            <>
              <p className="mb-3 text-xs text-voxcina-blue/75" aria-live="polite">
                {hint || (selection.inventory > 0 ? `${toPersianNumber(selection.inventory)} عدد موجود در این رنگ و سایز` : "این ترکیب رنگ و سایز موجود نیست")}
              </p>
              <ProductCartButton total={product.price * selection.quantity} isAdding={isAdding} onClick={onAddToCart} />
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-voxcina-blue/75">این محصول فعلاً ناموجود است</p>
              <button type="button" onClick={onNotifyRequest} disabled={isNotifyEnabled} className="min-h-14 w-full rounded-full bg-voxcina-blue px-5 text-base font-bold text-voxcina-cream shadow-[0_4px_14px_rgba(26,60,105,0.25)] hover:bg-[#15325a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-voxcina-blue disabled:opacity-60">{isNotifyEnabled ? "اطلاع‌رسانی فعال شد" : "موجود شد، خبرم کن"}</button>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-voxcina-blue/10 pt-3">
          <p className="flex items-center gap-1.5 text-xs text-voxcina-blue/75">
            <ShieldCheck className="size-3.5 text-voxcina-blue/80" />
            ضمانت اصالت کالا
            <span aria-hidden="true" className="mx-1">·</span>
            ۷ روز فرصت بازگشت
          </p>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-voxcina-blue/15 bg-white/80 px-2.5 text-xs text-voxcina-blue/80 shadow-2xs transition-colors hover:border-voxcina-blue/30 hover:bg-white hover:text-voxcina-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue"
          >
            <Share2 className="size-3.5" />
            اشتراک‌گذاری
          </button>
        </div>

        <ProductColorModal
          isOpen={isColorModalOpen}
          onClose={() => setIsColorModalOpen(false)}
          colors={selection.colors}
          selectedColor={selection.selectedColor}
          selectedSize={selection.selectedSize}
          colorsForSelectedSize={selection.colorsForSelectedSize}
          onSelectColor={onColorChange}
          productName={product.name}
        />
        <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} product={product} selectedSize={selection.selectedSize} onSelectSize={selection.setSize} />
        <SizeRecommendationModal isOpen={isSizeRecommendationOpen} onClose={() => setIsSizeRecommendationOpen(false)} onOpenSizeGuide={() => window.setTimeout(() => setIsSizeGuideOpen(true), 0)} product={product} selection={selection} />
      </div>
    );
  }
);

export default ProductPurchasePanel;
