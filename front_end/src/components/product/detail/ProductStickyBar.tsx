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
        "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-t-[24px] border-x border-t border-voxcina-cream/15 bg-voxcina-blue p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-strong transition-transform duration-300 motion-reduce:transition-none lg:inset-x-6 lg:bottom-[max(12px,env(safe-area-inset-bottom))] lg:max-w-5xl lg:rounded-[28px] lg:border lg:p-3",
        isVisible ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+2rem)]"
      )}
    >
      <div className="flex items-center gap-4">
        {image && (
          <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-voxcina-cream lg:block">
            <Image src={image} alt="" fill sizes="56px" className="object-contain" />
          </span>
        )}

        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate font-medium text-voxcina-cream">{product.name}</p>
          <p className="mt-1 truncate text-xs text-voxcina-cream/70">
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
