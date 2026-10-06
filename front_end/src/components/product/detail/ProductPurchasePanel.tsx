"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Minus, Plus, Ruler, Share2, ShieldCheck, Shirt, Sparkles, Star } from "lucide-react";
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

const subtleButton = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs text-voxcina-cream/85 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/[0.12] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-cream motion-reduce:transition-none";

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
          "relative z-10 -mt-6 flex min-w-0 flex-col overflow-hidden rounded-t-[32px] border-t border-white/20 bg-[#0e223d]/85 px-5 pb-6 pt-5 text-voxcina-cream shadow-[0_-12px_40px_rgba(10,25,47,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl backdrop-saturate-150 sm:-mt-8 sm:rounded-t-[36px] sm:px-7 sm:py-7 lg:mt-0 lg:rounded-none lg:border-t-0 lg:border-r lg:border-white/10 lg:pt-7 lg:justify-center lg:px-8 xl:px-10",
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

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {(brand || product.brand) && (
              <p className="mb-1.5 text-[11px] text-voxcina-cream/70 sm:text-xs">
                {brand ? <Link href={brand.href} className="rounded hover:text-white focus-visible:outline focus-visible:outline-2">{brand.name}</Link> : product.brand}
              </p>
            )}
            <h1 className="text-lg font-bold leading-relaxed text-voxcina-cream sm:text-2xl lg:text-[26px]">{product.name}</h1>
          </div>
          <div className="shrink-0 pt-1 text-left">
            <p className="text-base font-bold tabular-nums sm:text-xl">{toPersianNumber(product.price.toLocaleString("en-US"))}</p>
            <span className="text-[10px] text-voxcina-cream/75">تومان</span>
            {discount > 0 && (
              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px]">
                <del className="text-voxcina-cream/60">{toPersianNumber(product.originalPrice.toLocaleString("en-US"))}</del>
                <span className="rounded-full bg-voxcina-cream px-1.5 py-0.5 font-bold text-voxcina-blue">{toPersianNumber(discount)}٪</span>
              </div>
            )}
          </div>
        </div>

        {product.description?.trim() && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-voxcina-cream/75">{product.description}</p>
        )}

        <a href="#reviews" className="mt-3 flex min-h-8 w-fit items-center gap-2.5 rounded text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className={cn("size-4", reviewCount && index < Math.round(avgRating) ? "fill-voxcina-cream text-voxcina-cream" : "text-voxcina-cream/35")} />
            ))}
          </span>
          <span className="text-voxcina-cream/75">
            {reviewCount ? `${toPersianNumber(avgRating.toFixed(1))} · ${toPersianNumber(reviewCount)} نظر` : "اولین نظر را شما بنویسید"}
          </span>
        </a>

        <div className="mt-4 flex items-end justify-between gap-3">
          {selection.colors.length > 0 && (
            <fieldset className="min-w-0 flex-1">
              <legend className="mb-1 text-xs">
                رنگ: <span className="text-voxcina-cream/75">{selection.selectedVariant?.colorName || "انتخاب کنید"}</span>
              </legend>
              <div className="flex flex-wrap gap-1">
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
                        "relative flex size-11 items-center justify-center rounded-xl backdrop-blur-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream disabled:cursor-not-allowed disabled:opacity-35",
                        selected
                          ? "border border-dashed border-voxcina-cream bg-white/20 shadow-[0_4px_16px_rgba(230,198,135,0.35)]"
                          : "border border-white/15 bg-white/[0.08] hover:border-white/30 hover:bg-white/[0.14]"
                      )}
                    >
                      <span className="relative block size-7 overflow-hidden rounded-[8px] border border-white/50 shadow-sm" style={{ backgroundColor: color.color?.startsWith("#") ? color.color : "#DFD8CC" }}>
                        {color.swatchImage && <Image src={color.swatchImage} alt="" fill sizes="28px" className="object-cover" />}
                      </span>
                      {selected && <Check className="absolute size-3.5 rounded-full bg-voxcina-blue p-0.5 text-white shadow-xs" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {product.inStock && (
            <div className="shrink-0 pb-0.5">
              <span className="sr-only">تعداد</span>
              <div
                className="flex h-11 items-center overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b from-white/95 to-voxcina-cream/95 text-voxcina-blue shadow-[0_4px_14px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md"
                dir="ltr"
              >
                <button type="button" aria-label="کاهش تعداد" disabled={!selection.canModifyQuantity || selection.quantity <= 1} onClick={() => selection.setQuantity(selection.quantity - 1)} className="flex size-11 items-center justify-center hover:bg-white/80 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:opacity-35"><Minus className="size-3.5" /></button>
                <span className="min-w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">{toPersianNumber(selection.quantity)}</span>
                <button type="button" aria-label="افزایش تعداد" disabled={!selection.canModifyQuantity || selection.quantity >= selection.inventory} onClick={() => selection.setQuantity(selection.quantity + 1)} className="flex size-11 items-center justify-center hover:bg-white/80 active:bg-voxcina-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:opacity-35"><Plus className="size-3.5" /></button>
              </div>
            </div>
          )}
        </div>

        {selection.sizes.length > 0 && (
          <fieldset className="mt-3">
            <legend className="sr-only">انتخاب سایز</legend>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs">سایز{selection.selectedSize && <span className="mr-1 text-voxcina-cream/75">: {toPersianNumber(selection.selectedSize)}</span>}</span>
              <button type="button" className={cn(subtleButton, "min-h-8")} onClick={() => setIsSizeGuideOpen(true)}><Ruler className="size-3.5" />راهنمای سایز</button>
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
                      "min-h-11 min-w-11 rounded-xl border px-3 text-xs transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-cream disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none",
                      selected
                        ? "border-white/90 bg-gradient-to-b from-white to-voxcina-cream font-bold text-voxcina-blue shadow-[0_4px_14px_rgba(230,198,135,0.35),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                        : "border-white/15 bg-white/[0.07] text-voxcina-cream backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.14]",
                      !available && "line-through opacity-40"
                    )}
                  >
                    {toPersianNumber(size)}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <button type="button" className={subtleButton} onClick={() => setIsSizeRecommendationOpen(true)}><Sparkles className="size-3.5" />سایز مناسب من</button>
              {(selection.selectedSize || selection.selectedColor) && <button type="button" onClick={selection.clear} className={subtleButton}>پاک کردن انتخاب‌ها</button>}
            </div>
          </fieldset>
        )}

        <div ref={actionRowRef} className="mt-4">
          {product.inStock ? (
            <>
              <p className="mb-3 text-[11px] text-voxcina-cream/75" aria-live="polite">
                {hint || (selection.inventory > 0 ? `${toPersianNumber(selection.inventory)} عدد موجود در این رنگ و سایز` : "این ترکیب رنگ و سایز موجود نیست")}
              </p>
              <ProductCartButton total={product.price * selection.quantity} isAdding={isAdding} onClick={onAddToCart} />
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-voxcina-cream/75">این محصول فعلاً ناموجود است</p>
              <button type="button" onClick={onNotifyRequest} disabled={isNotifyEnabled} className="min-h-14 w-full rounded-full bg-voxcina-cream px-5 text-sm font-bold text-voxcina-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-voxcina-cream disabled:opacity-60">{isNotifyEnabled ? "اطلاع‌رسانی فعال شد" : "موجود شد، خبرم کن"}</button>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
          <button type="button" onClick={onTryOn} disabled={!isTryOnAvailable || !product.inStock} title={isTryOnAvailable ? undefined : "برای این محصول در دسترس نیست"} className={cn(subtleButton, "disabled:cursor-not-allowed disabled:opacity-40")}><Shirt className="size-4" />پرو مجازی</button>
          <button type="button" onClick={onShare} className={subtleButton}><Share2 className="size-3.5" />اشتراک‌گذاری</button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-voxcina-cream/75"><ShieldCheck className="size-3.5 text-voxcina-cream/90" />ضمانت اصالت کالا<span aria-hidden="true" className="mx-1">·</span>۷ روز فرصت بازگشت</p>

        <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} product={product} selectedSize={selection.selectedSize} onSelectSize={selection.setSize} />
        <SizeRecommendationModal isOpen={isSizeRecommendationOpen} onClose={() => setIsSizeRecommendationOpen(false)} onOpenSizeGuide={() => window.setTimeout(() => setIsSizeGuideOpen(true), 0)} product={product} selection={selection} />
      </div>
    );
  }
);

export default ProductPurchasePanel;
