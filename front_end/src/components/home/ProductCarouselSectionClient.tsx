"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ColorVariantListItem } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";
import { Button, SectionTitle } from "@/components/ui";
import { getCanonicalColor } from "@/lib/product-variants";
import { gsap } from "@/lib/gsap";

interface ProductCarouselSectionClientProps {
  title: string;
  viewAllHref: string;
  products: ColorVariantListItem[];
  className?: string;
}

/**
 * Client-side Product Carousel with drag/scroll functionality.
 * Receives server-fetched products as props and handles client-side interactions.
 *
 * Auto-scroll behavior:
 *  - When the carousel is in view, not interacted with, and the user has not
 *    asked for reduced motion, GSAP tweens `scrollLeft` from the current
 *    position to `scrollWidth - clientWidth` over a fixed duration. The tween
 *    uses an ease that is "linear-ish" in the middle but eases in and out at
 *    the ends, so the loop never feels like it slams into the wrap point.
 *  - On wrap, the tween immediately restarts at 0 — the mask-image fade hides
 *    the transition so it reads as infinite scrolling.
 *  - On any user interaction (pointer hover on a card, drag, touch swipe,
 *    arrow click, keyboard focus on a card link) the active auto-scroll
 *    tween is killed; the GSAP tween's own easing makes the deceleration
 *    feel natural.
 *  - A short grace period after the last interaction keeps the carousel
 *    paused so the user can finish reading/inspecting a card.
 *  - The animation is suppressed when the user has `prefers-reduced-motion`.
 *  - When the section leaves the viewport (IntersectionObserver), the active
 *    tween is killed so we don't burn CPU on hidden content.
 *
 * Edge fade + blur:
 *  - The scroll container is masked with a horizontal CSS gradient that
 *    fades the first/last ~6% to transparent. The fade creates a perceptual
 *    blur at the boundaries because the alpha transition happens over a
 *    range of pixels rather than a single hard line. This works regardless
 *    of RTL and avoids hard card edges at the container boundary.
 *
 * Touch / mobile behavior:
 *  - `touchstart` pauses the auto-scroll and starts a manual drag.
 *  - `touchmove` continuously updates `scrollLeft` from the finger position
 *    and keeps the auto-scroll tween killed.
 *  - `touchend` releases the drag and schedules a resume after the grace
 *    period. The GSAP tween restart uses the standard ease-in/out so the
 *    resume is smooth.
 */
export default function ProductCarouselSectionClient({
  title,
  viewAllHref,
  products,
  className,
}: ProductCarouselSectionClientProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Pointer / interaction state.
  const pointerStartXRef = useRef(0);
  const pointerStartScrollLeftRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);

  // Auto-scroll state lives in refs so the tween code can read it
  // without re-subscribing on every state change.
  const autoScrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const isHoveredRef = useRef(false);
  const isCardFocusedRef = useRef(false);
  const resumeAtRef = useRef(0);
  const isInViewRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const isCoarsePointerRef = useRef(false);
  const productsLengthRef = useRef(products.length);

  useEffect(() => {
    productsLengthRef.current = products.length;
  }, [products.length]);

  // Tunables ----------------------------------------------------------------
  // A full sweep (start → end) takes AUTO_SCROLL_DURATION seconds. The tween
  // uses "power1.inOut" so it gently accelerates from rest, cruises in the
  // middle, and decelerates into the wrap.
  const AUTO_SCROLL_DURATION = 30; // seconds per full sweep
  const AUTO_RESUME_DELAY = 2200; // ms to stay paused after user interaction

  const killAutoScroll = () => {
    if (autoScrollTweenRef.current) {
      autoScrollTweenRef.current.kill();
      autoScrollTweenRef.current = null;
    }
  };

  const startAutoScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    if (prefersReducedMotionRef.current) return;
    if (!isInViewRef.current) return;
    if (isHoveredRef.current || isDragging || isCardFocusedRef.current) return;
    if (Date.now() < resumeAtRef.current) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) return;

    // If we're already at/past the end (e.g. products shrank), reset to 0
    // so the next sweep starts cleanly.
    if (el.scrollLeft >= maxScroll - 1) {
      el.scrollLeft = 0;
    }

    const remaining = maxScroll - el.scrollLeft;
    // Scale the duration proportionally to the remaining distance so a
    // mid-sweep restart doesn't suddenly jump in speed.
    const duration = (remaining / maxScroll) * AUTO_SCROLL_DURATION;

    autoScrollTweenRef.current = gsap.to(el, {
      scrollLeft: maxScroll,
      duration,
      ease: "power1.inOut",
      overwrite: "auto",
      onComplete: () => {
        autoScrollTweenRef.current = null;
        // Seamless wrap — the mask hides the jump back to 0.
        if (sliderRef.current) sliderRef.current.scrollLeft = 0;
        if (
          !isHoveredRef.current &&
          !isDragging &&
          !isCardFocusedRef.current &&
          isInViewRef.current &&
          !prefersReducedMotionRef.current &&
          Date.now() >= resumeAtRef.current
        ) {
          startAutoScroll();
        }
      },
    });
  };

  const pauseAutoScroll = useCallback((resumeDelay = AUTO_RESUME_DELAY) => {
    killAutoScroll();
    resumeAtRef.current = Date.now() + resumeDelay;
  }, []);

  const scheduleResume = useCallback(() => {
    resumeAtRef.current = Date.now() + AUTO_RESUME_DELAY;
    window.setTimeout(() => {
      if (
        !isHoveredRef.current &&
        !isDragging &&
        !isCardFocusedRef.current &&
        isInViewRef.current &&
        !prefersReducedMotionRef.current
      ) {
        startAutoScroll();
      }
    }, AUTO_RESUME_DELAY);
  }, []);

  // Unified pointer-down handler: works for mouse, pen, and touch via the
  // Pointer Events API. This is the single source of truth for "the user
  // started interacting" across both desktop and mobile.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!sliderRef.current) return;
    // Only primary pointer / single-finger gestures.
    if (!e.isPrimary) return;
    activePointerIdRef.current = e.pointerId;
    pointerStartXRef.current = e.clientX;
    pointerStartScrollLeftRef.current = sliderRef.current.scrollLeft;
    setIsDragging(true);
    pauseAutoScroll(0);
    try {
      sliderRef.current.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer was already released.
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current) return;
    if (activePointerIdRef.current !== e.pointerId) return;
    // Don't preventDefault on passive listeners — let the browser handle
    // native touch panning on coarse pointers; we just need the auto-scroll
    // tween to stay dead, which `isDragging` already guarantees.
    const walk = (e.clientX - pointerStartXRef.current) * 1.5;
    sliderRef.current.scrollLeft = pointerStartScrollLeftRef.current - walk;
  };

  const endDrag = (e?: React.PointerEvent) => {
    if (e && activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
      return;
    }
    setIsDragging(false);
    activePointerIdRef.current = null;
    if (sliderRef.current) {
      try {
        sliderRef.current.releasePointerCapture(e?.pointerId ?? -1);
      } catch {
        // Ignore: capture might already be released.
      }
    }
    scheduleResume();
  };

  // Fallback mouse handlers for environments without Pointer Events (very old
  // browsers). Pointer Events are supported in all modern browsers (Safari
  // 13+, Chrome 55+, Firefox 59+), so these are belt-and-suspenders.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    if (typeof window !== "undefined" && "PointerEvent" in window) return; // Pointer Events already handle it
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(sliderRef.current.scrollLeft);
    pauseAutoScroll(0);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    e.preventDefault();
    const walk = (e.clientX - startX) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };
  const handleMouseUp = () => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    setIsDragging(false);
    scheduleResume();
  };

  // Track hover on the section (header / arrow buttons / empty area).
  const handleSectionMouseEnter = () => {
    isHoveredRef.current = true;
    killAutoScroll();
  };
  const handleSectionMouseLeave = () => {
    isHoveredRef.current = false;
    scheduleResume();
  };

  // Per-card hover on desktop. On coarse (touch) pointers we don't bind
  // mouseover because taps don't reliably emit paired mouseover/mouseout on
  // every browser, and the pointer-based drag handling already covers touch
  // pauses.
  const handleCardsMouseOver = (e: React.MouseEvent) => {
    if (isCoarsePointerRef.current) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest("[data-product-card]")) {
      if (!isHoveredRef.current) {
        isHoveredRef.current = true;
        killAutoScroll();
      }
    }
  };
  const handleCardsMouseOut = (e: React.MouseEvent) => {
    if (isCoarsePointerRef.current) return;
    const target = e.target as HTMLElement | null;
    const related = e.relatedTarget as HTMLElement | null;
    if (!target) return;
    if (!target.closest("[data-product-card]")) return;
    if (related && related.closest && related.closest("[data-product-card]")) return;
    isHoveredRef.current = false;
    scheduleResume();
  };

  // Keyboard focus: pause when a card link is focused (Tab navigation).
  const handleCardsFocusIn = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("[data-product-card]")) {
      isCardFocusedRef.current = true;
      killAutoScroll();
    }
  };
  const handleCardsFocusOut = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("[data-product-card]")) {
      isCardFocusedRef.current = false;
      scheduleResume();
    }
  };

  // Reduced-motion preference + pointer-type detection.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      prefersReducedMotionRef.current = motionMql.matches;
      if (motionMql.matches) killAutoScroll();
    };
    updateMotion();
    if (motionMql.addEventListener) motionMql.addEventListener("change", updateMotion);
    else motionMql.addListener(updateMotion);

    const pointerMql = window.matchMedia("(pointer: coarse)");
    const updatePointer = () => {
      isCoarsePointerRef.current = pointerMql.matches;
    };
    updatePointer();
    if (pointerMql.addEventListener) pointerMql.addEventListener("change", updatePointer);
    else pointerMql.addListener(updatePointer);

    return () => {
      if (motionMql.removeEventListener) motionMql.removeEventListener("change", updateMotion);
      else motionMql.removeListener(updateMotion);
      if (pointerMql.removeEventListener) pointerMql.removeEventListener("change", updatePointer);
      else pointerMql.removeListener(updatePointer);
    };
  }, []);

  // Pause the auto-scroll while the section is off-screen.
  useEffect(() => {
    const node = sliderRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isInViewRef.current = entry.isIntersecting;
          if (!entry.isIntersecting) {
            killAutoScroll();
          } else {
            scheduleResume();
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scheduleResume]);

  // Boot the auto-scroll once the layout is stable.
  useEffect(() => {
    if (productsLengthRef.current === 0) return;
    // Slight delay so layout-driven scrollWidth/clientWidth is final.
    const id = window.setTimeout(() => startAutoScroll(), 400);
    return () => {
      window.clearTimeout(id);
      killAutoScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Arrow click: pause, GSAP-animate to next slot, then schedule resume.
  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;

    pauseAutoScroll(0);
    const scrollAmount = 260;
    const currentScroll = sliderRef.current.scrollLeft;
    const nextScroll = direction === "right" ? currentScroll + scrollAmount : currentScroll - scrollAmount;

    gsap.to(sliderRef.current, {
      scrollLeft: Math.max(0, nextScroll),
      duration: 0.55,
      ease: "power2.out",
      overwrite: "auto",
    });
    scheduleResume();
  };

  // Touch fallback for very old browsers without Pointer Events.
  const handleTouchStartFallback = (e: React.TouchEvent) => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    if (!sliderRef.current || !e.touches[0]) return;
    pointerStartXRef.current = e.touches[0].clientX;
    pointerStartScrollLeftRef.current = sliderRef.current.scrollLeft;
    setIsDragging(true);
    pauseAutoScroll(0);
  };
  const handleTouchMoveFallback = (e: React.TouchEvent) => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    if (!isDragging || !sliderRef.current || !e.touches[0]) return;
    const walk = (e.touches[0].clientX - pointerStartXRef.current) * 1.5;
    sliderRef.current.scrollLeft = pointerStartScrollLeftRef.current - walk;
  };
  const handleTouchEndFallback = () => {
    if (typeof window !== "undefined" && "PointerEvent" in window) return;
    setIsDragging(false);
    scheduleResume();
  };

  return (
    <section
      className={`${className ?? "container px-4 md:px-8 mb-16 md:mb-24"} animate-slideUp`}
      onMouseEnter={handleSectionMouseEnter}
      onMouseLeave={handleSectionMouseLeave}
    >
      <SectionTitle
        title={title}
        size="lg"
        className="mb-8 md:mb-12"
        titleClassName="text-2xl sm:text-3xl font-bold text-voxcina-blue"
        action={
          <Link
            href={viewAllHref}
            rel="nofollow"
            className="text-voxcina-blue hover:text-voxcina-darkBlue flex items-center group transition-all duration-300"
          >
            <span>مشاهده همه</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 md:h-5 md:w-5 mr-1 transform transition-transform duration-300 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        }
      />

      {!products || products.length === 0 ? (
        <div className="h-52 md:h-64 flex items-center justify-center">
          <p className="text-gray-500">محصولی یافت نشد</p>
        </div>
      ) : (
        <div className="relative group/slider">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scroll("right")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue -translate-x-1/2"
            aria-label="بعدی"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scroll("left")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue translate-x-1/2"
            aria-label="قبلی"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>

          <div
            ref={sliderRef}
            className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory ${isDragging ? "" : "scroll-smooth"} select-none carousel-edge-mask`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "pan-x",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseOver={handleCardsMouseOver}
            onMouseOut={handleCardsMouseOut}
            onFocus={handleCardsFocusIn}
            onBlur={handleCardsFocusOut}
            onTouchStart={handleTouchStartFallback}
            onTouchMove={handleTouchMoveFallback}
            onTouchEnd={handleTouchEndFallback}
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
          </div>
        </div>
      )}
    </section>
  );
}
