"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ColorVariantListItem } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";
import { SectionTitle } from "@/components/ui";
import Section from "@/components/ui/Section";
import CarouselShell from "@/components/ui/CarouselShell";
import { getCanonicalColor } from "@/lib/product-variants";
import { getScrollOffset, isRtl, offsetToRaw, setScrollOffset } from "@/lib/carousel/rtl";
import { useAutoScrollCarousel } from "@/hooks/useAutoScrollCarousel";

interface Props {
  title: string;
  viewAllHref: string;
  products: ColorVariantListItem[];
  className?: string;
}

export default function ProductCarouselSectionClient({ title, viewAllHref, products, className }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // drag state
  const pointerStartXRef = useRef(0);
  const pointerStartScrollRef = useRef(0);
  // Raw `scrollLeft` at drag start plus the direction the raw value moves in,
  // both resolved once on pointerdown. Every pointermove then only writes —
  // the previous code re-read `getComputedStyle` + `scrollWidth` per move,
  // forcing a synchronous layout on each of a touch stream's ~120 events/s.
  const pointerStartRawScrollRef = useRef(0);
  const rawDirectionRef = useRef(-1);
  const activePointerIdRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const DRAG_THRESHOLD = 8;

  // hover / focus state for auto-scroll hook
  const isHoveredRef = useRef(false);
  const isCardFocusedRef = useRef(false);
  const isCoarsePointerRef = useRef(false);

  const { killAutoScroll, pauseAutoScroll, scheduleResume } = useAutoScrollCarousel(sliderRef, {
    isDragging,
    isHoveredRef,
    isCardFocusedRef,
    productsLength: products.length,
  });

  // coarse pointer detection (avoid hover pause on touch)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    const update = () => {
      isCoarsePointerRef.current = mql.matches;
    };
    update();
    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!sliderRef.current || !e.isPrimary) return;
      activePointerIdRef.current = e.pointerId;
      pointerStartXRef.current = e.clientX;
      pointerStartScrollRef.current = getScrollOffset(sliderRef.current);
      pointerStartRawScrollRef.current = sliderRef.current.scrollLeft;
      rawDirectionRef.current = isRtl(sliderRef.current) ? 1 : -1;
      hasDraggedRef.current = false;
      pauseAutoScroll(0);
    },
    [pauseAutoScroll],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!sliderRef.current || activePointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - pointerStartXRef.current;
    if (!hasDraggedRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      hasDraggedRef.current = true;
      setIsDragging(true);
      sliderRef.current.classList.remove("snap-x", "snap-mandatory");
      sliderRef.current.classList.add("snap-none");
      try {
        sliderRef.current.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    sliderRef.current.scrollLeft =
      pointerStartRawScrollRef.current + rawDirectionRef.current * dx * 1.5;
  }, []);

  const endDrag = useCallback(
    (e?: React.PointerEvent) => {
      if (e && activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      const wasPointerDown = activePointerIdRef.current !== null;
      const wasDrag = hasDraggedRef.current;
      activePointerIdRef.current = null;
      if (!wasPointerDown) return;
      if (wasDrag) {
        setIsDragging(false);
        if (sliderRef.current) {
          try {
            sliderRef.current.releasePointerCapture(e?.pointerId ?? -1);
          } catch {
            // ignore
          }
          sliderRef.current.classList.add("snap-x", "snap-mandatory");
          sliderRef.current.classList.remove("snap-none");
          sliderRef.current.style.scrollBehavior = "";
        }
        scheduleResume();
      } else {
        scheduleResume();
      }
    },
    [scheduleResume],
  );

  const handleSliderClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  };

  // hover on product cards (desktop only)
  const handleCardsMouseOver = (e: React.MouseEvent) => {
    if (isCoarsePointerRef.current) return;
    const target = e.target as HTMLElement | null;
    if (!target?.closest("[data-product-card]")) return;
    if (!isHoveredRef.current) {
      isHoveredRef.current = true;
      killAutoScroll();
    }
  };
  const handleCardsMouseOut = (e: React.MouseEvent) => {
    if (isCoarsePointerRef.current) return;
    const target = e.target as HTMLElement | null;
    const related = e.relatedTarget as HTMLElement | null;
    if (!target?.closest("[data-product-card]")) return;
    if (related?.closest?.("[data-product-card]")) return;
    isHoveredRef.current = false;
    scheduleResume();
  };

  const handleCardsFocusIn = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-product-card]")) {
      isCardFocusedRef.current = true;
      killAutoScroll();
    }
  };
  const handleCardsFocusOut = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-product-card]")) {
      isCardFocusedRef.current = false;
      scheduleResume();
    }
  };

  const scroll = (direction: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    pauseAutoScroll(0);
    const scrollAmount = 260;
    const max = el.scrollWidth - el.clientWidth;
    const currentOffset = getScrollOffset(el);
    const nextOffset = direction === "right" ? currentOffset + scrollAmount : currentOffset - scrollAmount;
    const clamped = Math.min(Math.max(0, nextOffset), Math.max(0, max));
    // The auto-scroll tween turns snapping off while it runs; restore it so an
    // arrow click lands on a card edge.
    el.classList.add("snap-x", "snap-mandatory");
    el.classList.remove("snap-none");
    el.style.scrollBehavior = "";
    // Native smooth scrolling runs off the main thread and keeps scroll-snap
    // intact, so the arrows no longer need a JS tween (and the homepage no
    // longer needs GSAP). `behavior` is passed explicitly so it wins over any
    // inline `scroll-behavior` the tween may have left behind.
    el.scrollTo({ left: offsetToRaw(el, clamped), behavior: "smooth" });
    scheduleResume();
  };

  // fallback for very old browsers without Pointer Events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current || (typeof window !== "undefined" && "PointerEvent" in window)) return;
    setIsDragging(true);
    pointerStartXRef.current = e.clientX;
    pointerStartScrollRef.current = getScrollOffset(sliderRef.current);
    pauseAutoScroll(0);
  };
  const handleMouseMoveFallback = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current || (typeof window !== "undefined" && "PointerEvent" in window)) return;
    e.preventDefault();
    const walk = (e.clientX - pointerStartXRef.current) * 1.5;
    setScrollOffset(sliderRef.current, pointerStartScrollRef.current - walk);
  };
  const handleMouseUpFallback = () => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    setIsDragging(false);
    scheduleResume();
  };

  const emptyState = !products || products.length === 0 ? <p className="text-gray-500">محصولی یافت نشد</p> : null;

  return (
    <Section className={className}>
      <SectionTitle
        title={title}
        size="lg"
        className="mb-8 md:mb-12"
        titleClassName="text-2xl sm:text-3xl font-bold text-voxcina-blue"
        action={
          <Link href={viewAllHref} rel="nofollow" className="text-voxcina-blue hover:text-voxcina-darkBlue flex items-center group transition-all duration-300">
            <span>مشاهده همه</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1 transform transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        }
      />

      {emptyState ? (
        <div className="h-52 md:h-64 flex items-center justify-center">{emptyState}</div>
      ) : (
        <CarouselShell
          scrollerRef={sliderRef}
          isDragging={isDragging}
          onScrollNext={() => scroll("right")}
          onScrollPrev={() => scroll("left")}
          scrollerProps={{
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onClickCapture: handleSliderClickCapture,
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMoveFallback,
            onMouseUp: handleMouseUpFallback,
            onMouseOver: handleCardsMouseOver,
            onMouseOut: handleCardsMouseOut,
            onFocus: handleCardsFocusIn,
            onBlur: handleCardsFocusOut,
          } as React.HTMLAttributes<HTMLDivElement>}
        >
          {products.map((product) => (
            <div
              key={`${product.productId}-${product.colorVariant.variantId || getCanonicalColor(product.colorVariant) || product.colorVariant.colorName}`}
              data-product-card
              className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px] lg:w-[250px] snap-start"
            >
              <ProductCard item={product} />
            </div>
          ))}
        </CarouselShell>
      )}
    </Section>
  );
}
