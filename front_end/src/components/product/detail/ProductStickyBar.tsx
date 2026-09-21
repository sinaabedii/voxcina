"use client";

import { RefObject, useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { cn, formatPrice, toPersianNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import { VariantSelection } from "./useVariantSelection";

interface ProductStickyBarProps {
  product: Product;
  selection: VariantSelection;
  image?: string;
  /** The panel's action row. The bar shows once this scrolls out of view. */
  anchorRef: RefObject<HTMLDivElement | null>;
  onAddToCart: () => void;
}

/**
 * Desktop add-to-cart bar, pinned to the bottom of the viewport.
 *
 * Below the hero this page runs long — tabs, try-on, reviews, similar products —
 * so by the time someone has read the reviews the buy button is several
 * screens away. The bar keeps it reachable without duplicating the panel: it
 * carries the variant summary and one action, and when the variant is not
 * chosen yet it scrolls back to the pickers instead of failing.
 *
 * Bottom rather than top because the site header is already `sticky top-0`.
 * Mounted at all widths but only shown from `lg` up; on a phone the panel is
 * close enough that a permanent bar would just eat viewport height.
 */
export default function ProductStickyBar({
  product,
  selection,
  image,
  anchorRef,
  onAddToCart,
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
      anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAddToCart();
  };

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden border-t border-border/20 bg-card/95 shadow-strong backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none lg:block",
        isVisible ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
    >
      <div className="container flex items-center gap-4 py-3">
        {image && (
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/20 bg-card">
            <Image src={image} alt="" fill sizes="56px" className="object-contain" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-primary">{product.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {variantSummary || "رنگ و سایز انتخاب نشده"}
          </p>
        </div>

        <div className="shrink-0 text-left">
          <p className="font-bold text-foreground">{formatPrice(product.price)}</p>
          {selection.isComplete && selection.inventory > 0 && (
            <p className="text-xs text-muted-foreground">
              {toPersianNumber(selection.inventory)} عدد موجود
            </p>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleClick}
          tabIndex={isVisible ? 0 : -1}
          className="shrink-0 rounded-xl px-8"
        >
          {missingSelection ? "انتخاب رنگ و سایز" : "افزودن به سبد خرید"}
        </Button>
      </div>
    </div>
  );
}
