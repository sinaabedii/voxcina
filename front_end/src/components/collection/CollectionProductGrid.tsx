"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, Flip, ScrollTrigger } from "@/lib/gsap";
import { ColorVariantListItem } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";
import { getCanonicalColor } from "@/lib/product-variants";

export const COLLECTION_GRID_ITEM_CLASS = "collection-product-card";

interface CollectionProductGridProps {
  items: ColorVariantListItem[];
  /** Ref holding a captured Flip.getState() snapshot, taken right before a
   * sort/filter change triggers navigation (while the old DOM is still in
   * place). When present on mount/update, it is played and cleared. */
  pendingFlipStateRef: { current: ReturnType<typeof Flip.getState> | null };
}

export default function CollectionProductGrid({
  items,
  pendingFlipStateRef,
}: CollectionProductGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll-in batch reveal for cards (replaces per-index framer-motion delay).
  useGSAP(
    () => {
      const grid = gridRef.current;
      if (!grid) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const triggers = ScrollTriggerBatch(grid);
        return () => triggers.forEach((t) => t.kill());
      });

      return () => mm.revert();
    },
    { scope: gridRef, dependencies: [items.length] }
  );

  // Play a captured Flip state (set by the filter bar right before a sort
  // change navigates to a new URL) once the newly-sorted items have rendered.
  useEffect(() => {
    const state = pendingFlipStateRef.current;
    if (!state) return;
    pendingFlipStateRef.current = null;

    Flip.from(state, {
      duration: 0.55,
      ease: "power2.inOut",
      stagger: 0.02,
      absolute: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
    >
      {items.map((item) => (
        <div
          key={`${item.productId}-${getCanonicalColor(item.colorVariant) || item.colorVariant.colorName}`}
          className={COLLECTION_GRID_ITEM_CLASS}
          data-flip-id={`${item.productId}-${getCanonicalColor(item.colorVariant) || item.colorVariant.colorName}`}
        >
          <ProductCard item={item} />
        </div>
      ))}
    </div>
  );
}

/**
 * Wraps ScrollTrigger.batch for the grid's cards. Kept as a small helper so
 * the main effect stays readable.
 */
function ScrollTriggerBatch(grid: HTMLElement) {
  const cards = gsap.utils.toArray<HTMLElement>(`.${COLLECTION_GRID_ITEM_CLASS}`, grid);
  if (cards.length === 0) return [];

  gsap.set(cards, { autoAlpha: 0, y: 24 });

  return ScrollTrigger.batch(cards, {
    start: "top 90%",
    once: true,
    onEnter: (batch: Element[]) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        overwrite: true,
      }),
  });
}
