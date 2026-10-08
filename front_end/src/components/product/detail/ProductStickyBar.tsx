"use client";

import { RefObject, useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product";
import { VariantSelection } from "./useVariantSelection";
import ProductCartButton from "./ProductCartButton";

interface ProductStickyBarProps {
  product: Product;
  selection: VariantSelection;
  image?: string;
  /** The panel's action row. The bar shows once this scrolls out of view. */
  anchorRef: RefObject<HTMLDivElement | null>;
  onAddToCart: () => void;
  isAdding: boolean;
}

/**
 * Add-to-cart bar, pinned to the bottom after the main action leaves the viewport.
 *
 * Below the hero this page runs long — tabs, try-on, reviews, similar products —
 * so by the time someone has read the reviews the buy button is several
 * screens away. The bar keeps it reachable without duplicating the panel: it
 * carries the variant summary and one action, and when the variant is not
 * chosen yet it scrolls back to the pickers instead of failing.
 *
 * Bottom rather than top because the site header is already `sticky top-0`.
 * On phones the same compact purchase pill keeps buying reachable below the
 * details. It is hidden until the original purchase action has scrolled past.
 */
export default function ProductStickyBar({
  product,
  selection,
  image,
  anchorRef,
  onAddToCart,
  isAdding,
}: ProductStickyBarProps) {
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(false);
          return;
        }
        // `entry.boundingClientRect` is captured at the moment the threshold is
        // crossed, so scrolling past the row reports `top: 0` rather than a
        // negative offset. Read the live rect instead to tell "scrolled above
        // the viewport" (show the bar) from "still below it" (leave it hidden).
        setVisible(anchor.getBoundingClientRect().bottom <= 0);
      },
      { threshold: 0 }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef]);

  const missingSelection = selection.validate();
  const variantSummary = [selection.selectedVariant?.colorName, selection.selectedSize]
    .filter(Boolean)
    .join(" · ");

  const handleClick = () => {
    if (missingSelection) {
      document.getElementById("product-selection")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
      return;
    }
    onAddToCart();
  };

  if (!product.inStock) return null;

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg overflow-hidden rounded-t-[24px] border-x border-t border-white/90 bg-white/80 sm:bg-[#FAF7F2]/85 backdrop-blur-2xl backdrop-saturate-130 p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(26,60,105,0.08),inset_0_1.5px_1px_rgba(255,255,255,0.95)] transition-transform duration-300 motion-reduce:transition-none lg:inset-x-6 lg:bottom-[max(12px,env(safe-area-inset-bottom))] lg:max-w-5xl lg:rounded-[28px] lg:border lg:p-3",
        isVisible ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+2rem)]"
      )}
    >
      {/* Specular glass highlights, bevel rim reflection, and silky smooth hardware-accelerated shine */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Top edge hairline glass rim reflection */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent" />

        {/* Subtle ambient light situation behind bottom sticky glass bar */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden filter blur-3xl opacity-20" aria-hidden="true">
          <div className="absolute -bottom-10 right-16 size-44 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.18)_0%,rgba(245,158,11,0.03)_40%,transparent_75%)] animate-light-shine-pulse" />
          <div className="absolute -bottom-10 left-16 size-44 rounded-full bg-[radial-gradient(circle,rgba(224,242,254,0.15)_0%,rgba(56,189,248,0.02)_40%,transparent_75%)] animate-organic-morph" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-voxcina-cream/10" />

        {/* Silky smooth hardware-accelerated shining specular sweep */}
        <div className="absolute -inset-y-16 -left-full w-2/3 animate-glass-shine bg-gradient-to-r from-transparent via-white/35 via-amber-50/20 to-transparent motion-reduce:hidden" />
      </div>

      <div className="flex items-center gap-4">
        {image && (
          <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-voxcina-cream lg:block">
            <Image src={image} alt="" fill sizes="56px" className="object-contain" />
          </span>
        )}

        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-sm font-medium text-voxcina-blue">{product.name}</p>
          <p className="mt-1 truncate text-xs text-voxcina-blue/70">
            {variantSummary || "رنگ و سایز انتخاب نشده"}
          </p>
        </div>

        <ProductCartButton
          total={product.price * selection.quantity}
          isAdding={isAdding}
          onClick={handleClick}
          tabIndex={isVisible ? 0 : -1}
          className="lg:w-auto lg:min-w-[340px]"
          label={missingSelection ? "انتخاب رنگ و سایز" : "افزودن به سبد خرید"}
        />
      </div>
    </div>
  );
}
