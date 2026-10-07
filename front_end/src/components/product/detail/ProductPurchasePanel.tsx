"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Minus, Plus, RotateCcw, Ruler, Share2, ShieldCheck, Shirt, Sparkles, Star, Truck } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import { VariantSelection } from "./useVariantSelection";
import ProductCartButton from "./ProductCartButton";
import SizeGuideModal from "./SizeGuideModal";
import SizeRecommendationModal from "./SizeRecommendationModal";

export interface BrandLink {
  name: string;
  href: string;
  logo?: string;
}

interface ProductPurchasePanelProps {
  panelRef?: React.Ref<HTMLDivElement>;
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
    { panelRef, product, selection, brand, avgRating, reviewCount, isTryOnAvailable, isNotifyEnabled,
      isAdding, onColorChange, onAddToCart, onTryOn, onShare, onNotifyRequest, className },
    actionRowRef
  ) {
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isSizeRecommendationOpen, setIsSizeRecommendationOpen] = useState(false);
    const hint = selectionHint(selection);
    const discount = product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

    return (
      <div
        id="product-selection"
        ref={panelRef}
        className={cn(
          "relative z-10 -mt-6 flex min-w-0 flex-col overflow-hidden rounded-t-[32px] border-t border-white/20 bg-[#0e223d] sm:bg-[#0e223d]/90 px-5 pb-6 pt-5 text-voxcina-cream shadow-[0_-12px_40px_rgba(10,25,47,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] sm:backdrop-blur-2xl sm:backdrop-saturate-150 sm:-mt-8 sm:rounded-t-[36px] sm:px-7 sm:py-7 lg:mt-0 lg:rounded-none lg:border-t-0 lg:border-r lg:border-white/10 lg:pt-7 lg:justify-center lg:px-8 xl:px-10",
          className
        )}
      >
        {/* Light-like smooth blurred objects behind the glassmorphic surface */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          {/* Luminous warm amber/champagne orb - top right */}
          <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-[#E6C687]/30 via-[#D4B373]/15 to-transparent blur-3xl" />
          
          {/* Radiant sapphire/cyan light orb - mid left */}
          <div className="absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-gradient-to-tr from-[#3b82f6]/25 via-[#60a5fa]/15 to-transparent blur-3xl" />

          {/* Soft pearlescent cream glow - bottom behind cart CTA */}
          <div className="absolute -bottom-10 right-1/4 h-64 w-64 rounded-full bg-gradient-to-t from-voxcina-cream/15 via-[#FAF7F2]/10 to-transparent blur-2xl" />

          {/* Specular glass sheen highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/25" />
        </div>

        {/* Header & Identity Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {(brand || product.brand) && (
              <div className="mb-1.5 flex items-center gap-2">
                {brand ? (
                  <Link
                    href={brand.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-voxcina-cream backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2"
                  >
                    {brand.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-voxcina-cream">
                    {product.brand}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl lg:text-[26px]">
              {product.name}
            </h1>
          </div>

          <div className="shrink-0 text-left">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-lg font-bold tabular-nums text-white sm:text-2xl">
                {toPersianNumber(product.price.toLocaleString("en-US"))}
              </span>
              <span className="text-[11px] text-voxcina-cream/70">تومان</span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex items-center justify-end gap-1.5 text-xs">
                <del className="text-[11px] text-voxcina-cream/50 tabular-nums">
                  {toPersianNumber(product.originalPrice.toLocaleString("en-US"))}
                </del>
                <span className="rounded-full bg-gradient-to-r from-[#E6C687] to-[#D4B373] px-1.5 py-0.5 text-[10px] font-bold text-voxcina-blue shadow-xs">
                  {toPersianNumber(discount)}٪
                </span>
              </div>
            )}
          </div>
        </div>

        {product.description?.trim() && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-voxcina-cream/70">
            {product.description}
          </p>
        )}

        {/* Star Rating Badge */}
        <a
          href="#reviews"
          className="mt-2.5 inline-flex w-fit items-center gap-2 rounded-lg py-0.5 text-xs transition-colors hover:text-white focus-visible:outline focus-visible:outline-2"
        >
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={cn(
                  "size-3.5",
                  reviewCount && index < Math.round(avgRating)
                    ? "fill-[#E6C687] text-[#E6C687]"
                    : "text-white/20"
                )}
              />
            ))}
          </span>
          <span className="text-[11px] text-voxcina-cream/80">
            {reviewCount ? `${toPersianNumber(avgRating.toFixed(1))} (${toPersianNumber(reviewCount)} نظر)` : "اولین نظر را بنویسید"}
          </span>
        </a>

        {/* Colors & Quantity row */}
        <div className="mt-4 flex items-end justify-between gap-3">
          {selection.colors.length > 0 && (
            <fieldset className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-1.5 text-xs">
                <span className="text-voxcina-cream/70">رنگ:</span>
                <span className="font-semibold text-white">
                  {selection.selectedVariant?.colorName || "انتخاب کنید"}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-hide">
                {selection.colors.map((color) => {
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
                        "relative flex size-11 shrink-0 items-center justify-center rounded-xl backdrop-blur-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream disabled:cursor-not-allowed disabled:opacity-30",
                        selected
                          ? "border border-dashed border-[#E6C687] bg-white/25 shadow-[0_4px_16px_rgba(230,198,135,0.4)] scale-105"
                          : "border border-white/15 bg-white/[0.08] hover:border-white/30 hover:bg-white/[0.14]"
                      )}
                    >
                      <span
                        className="relative block size-7 overflow-hidden rounded-[8px] border border-white/50 shadow-sm"
                        style={{ backgroundColor: color.color?.startsWith("#") ? color.color : "#DFD8CC" }}
                      >
                        {color.swatchImage && <Image src={color.swatchImage} alt="" fill sizes="28px" className="object-cover" />}
                      </span>
                      {selected && (
                        <Check className="absolute size-3.5 rounded-full bg-voxcina-blue p-0.5 text-white shadow-xs" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {product.inStock && (
            <div className="shrink-0 pb-1">
              <span className="sr-only">تعداد</span>
              <div
                className="flex h-11 items-center overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b from-white/95 to-voxcina-cream/95 text-voxcina-blue shadow-[0_4px_14px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md"
                dir="ltr"
              >
                <button
                  type="button"
                  aria-label="کاهش تعداد"
                  disabled={!selection.canModifyQuantity || selection.quantity <= 1}
                  onClick={() => selection.setQuantity(selection.quantity - 1)}
                  className="flex size-11 items-center justify-center hover:bg-white/80 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:opacity-35"
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
                  className="flex size-11 items-center justify-center hover:bg-white/80 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:opacity-35"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sizes section with compact toolbar */}
        {selection.sizes.length > 0 && (
          <fieldset className="mt-4">
            <legend className="sr-only">انتخاب سایز</legend>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-voxcina-cream/70">سایز:</span>
                <span className="font-semibold text-white">
                  {selection.selectedSize ? toPersianNumber(selection.selectedSize) : "انتخاب کنید"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.08] px-2.5 text-[11px] text-voxcina-cream/90 backdrop-blur-md transition-all hover:bg-white/15"
                  onClick={() => setIsSizeGuideOpen(true)}
                >
                  <Ruler className="size-3" />
                  راهنمای سایز
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.08] px-2.5 text-[11px] text-voxcina-cream/90 backdrop-blur-md transition-all hover:bg-white/15"
                  onClick={() => setIsSizeRecommendationOpen(true)}
                >
                  <Sparkles className="size-3 text-[#E6C687]" />
                  سایز هوشمند
                </button>
                {(selection.selectedSize || selection.selectedColor) && (
                  <button
                    type="button"
                    onClick={selection.clear}
                    className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] text-voxcina-cream/60 transition-all hover:text-white"
                    title="پاک کردن انتخاب‌ها"
                  >
                    پاک کردن
                  </button>
                )}
              </div>
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
                      "min-h-11 min-w-[3.25rem] rounded-xl border px-3 text-xs font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-cream disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none",
                      selected
                        ? "border-white/90 bg-gradient-to-b from-white to-voxcina-cream font-bold text-voxcina-blue shadow-[0_4px_14px_rgba(230,198,135,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)] scale-[1.02]"
                        : "border-white/15 bg-white/[0.07] text-voxcina-cream backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.14]",
                      !available && "line-through opacity-35"
                    )}
                  >
                    {toPersianNumber(size)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Action console & Cart CTA */}
        <div ref={actionRowRef} className="mt-5">
          {product.inStock ? (
            <>
              <div className="mb-2.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-voxcina-cream/75">
                  <span className={cn(
                    "size-2 rounded-full",
                    selection.isComplete ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400 animate-pulse"
                  )} />
                  {hint || (selection.inventory > 0 ? `${toPersianNumber(selection.inventory)} عدد موجود در انبار` : "این ترکیب رنگ و سایز موجود نیست")}
                </span>
              </div>
              <ProductCartButton total={product.price * selection.quantity} isAdding={isAdding} onClick={onAddToCart} />
            </>
          ) : (
            <>
              <div className="mb-2.5 flex items-center gap-1.5 text-xs text-rose-300">
                <span className="size-2 rounded-full bg-rose-400" />
                این محصول در حال حاضر ناموجود است
              </div>
              <button
                type="button"
                onClick={onNotifyRequest}
                disabled={isNotifyEnabled}
                className="min-h-14 w-full rounded-2xl border border-white/20 bg-gradient-to-b from-white/20 to-white/10 px-5 text-sm font-bold text-voxcina-cream backdrop-blur-md transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-voxcina-cream disabled:opacity-60"
              >
                {isNotifyEnabled ? "اطلاع‌رسانی فعال شد" : "موجود شد، خبرم کن"}
              </button>
            </>
          )}
        </div>

        {/* Secondary action capsules */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onTryOn}
            disabled={!isTryOnAvailable || !product.inStock}
            title={isTryOnAvailable ? undefined : "برای این محصول در دسترس نیست"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-medium text-voxcina-cream backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Shirt className="size-4 text-[#E6C687]" />
            پرو هوشمند (AI)
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-medium text-voxcina-cream backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream"
          >
            <Share2 className="size-3.5" />
            اشتراک‌گذاری
          </button>
        </div>

        {/* 3-Pillar Trust Badges */}
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          <div className="flex flex-col items-center gap-1 text-[11px] text-voxcina-cream/80">
            <ShieldCheck className="size-4 text-[#E6C687]" />
            <span>اصالت تضمینی</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-white/10 text-[11px] text-voxcina-cream/80">
            <RotateCcw className="size-4 text-[#E6C687]" />
            <span>۷ روز بازگشت</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-[11px] text-voxcina-cream/80">
            <Truck className="size-4 text-[#E6C687]" />
            <span>ارسال اکسپرس</span>
          </div>
        </div>

        <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} product={product} selectedSize={selection.selectedSize} onSelectSize={selection.setSize} />
        <SizeRecommendationModal isOpen={isSizeRecommendationOpen} onClose={() => setIsSizeRecommendationOpen(false)} onOpenSizeGuide={() => window.setTimeout(() => setIsSizeGuideOpen(true), 0)} product={product} selection={selection} />
      </div>
    );
  }
);

export default ProductPurchasePanel;
