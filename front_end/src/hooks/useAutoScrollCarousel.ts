"use client";

import { useCallback, useEffect, useRef } from "react";
import { getScrollOffset, offsetToRaw, setScrollOffset } from "@/lib/carousel/rtl";

/**
 * Auto-scroll behaviour for product carousels.
 * Encapsulates the IntersectionObserver + reduced-motion + hover/pointer pauses
 * that were previously inline inside ProductCarouselSectionClient.
 *
 * Two deliberate constraints, both for low-end phones:
 *  - Touch devices never auto-scroll. The tween wrote `scrollLeft` on every
 *    frame for 18s straight per carousel (two of them on the homepage), which
 *    kept the main thread busy while the user was trying to scroll the page,
 *    and it fought the user's own swipe. Touch users pan the strip themselves.
 *  - The tween is a plain rAF interpolation instead of a GSAP tween, so the
 *    homepage no longer ships GSAP (~69 KB) just to move a scroll offset. Both
 *    endpoints are resolved to raw `scrollLeft` values up front, so each frame
 *    is a pure write with no layout read.
 */
export function useAutoScrollCarousel(
  sliderRef: React.RefObject<HTMLDivElement | null>,
  deps: {
    isDragging: boolean;
    isHoveredRef: React.MutableRefObject<boolean>;
    isCardFocusedRef: React.MutableRefObject<boolean>;
    productsLength: number;
  },
) {
  const rafRef = useRef<number | null>(null);
  const resumeAtRef = useRef(0);
  const isInViewRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const isCoarsePointerRef = useRef(false);
  const startAutoScrollRef = useRef<() => void>(() => {});

  const AUTO_SCROLL_DURATION_MS = 18_000;
  const AUTO_RESUME_DELAY = 2200;

  const killAutoScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    if (prefersReducedMotionRef.current || isCoarsePointerRef.current) return;
    if (!isInViewRef.current) return;
    if (deps.isHoveredRef.current || deps.isDragging || deps.isCardFocusedRef.current) return;
    if (Date.now() < resumeAtRef.current) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) return;

    if (getScrollOffset(el) >= maxScroll - 1) {
      setScrollOffset(el, 0);
    }

    el.classList.remove("snap-x", "snap-mandatory");
    el.classList.add("snap-none");
    el.style.scrollBehavior = "auto";

    const startOffset = getScrollOffset(el);
    const remaining = maxScroll - startOffset;
    const duration = (remaining / maxScroll) * AUTO_SCROLL_DURATION_MS;
    if (duration <= 0) return;

    const from = offsetToRaw(el, startOffset);
    const to = offsetToRaw(el, maxScroll);
    const startedAt = performance.now();

    const step = (now: number) => {
      if (sliderRef.current !== el) {
        rafRef.current = null;
        return;
      }

      const progress = Math.min(1, (now - startedAt) / duration);
      el.scrollLeft = from + (to - from) * progress;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      rafRef.current = null;
      setScrollOffset(el, 0);
      if (
        !deps.isHoveredRef.current &&
        !deps.isDragging &&
        !deps.isCardFocusedRef.current &&
        isInViewRef.current &&
        !prefersReducedMotionRef.current &&
        Date.now() >= resumeAtRef.current
      ) {
        startAutoScrollRef.current();
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [deps.isDragging, deps.isHoveredRef, deps.isCardFocusedRef, sliderRef]);

  startAutoScrollRef.current = startAutoScroll;

  const pauseAutoScroll = useCallback(
    (resumeDelay = AUTO_RESUME_DELAY) => {
      killAutoScroll();
      resumeAtRef.current = Date.now() + resumeDelay;
    },
    [killAutoScroll],
  );

  const scheduleResume = useCallback(() => {
    resumeAtRef.current = Date.now() + AUTO_RESUME_DELAY;
    window.setTimeout(() => {
      if (
        !deps.isHoveredRef.current &&
        !deps.isDragging &&
        !deps.isCardFocusedRef.current &&
        isInViewRef.current &&
        !prefersReducedMotionRef.current
      ) {
        startAutoScroll();
      }
    }, AUTO_RESUME_DELAY);
  }, [deps.isDragging, deps.isHoveredRef, deps.isCardFocusedRef, startAutoScroll]);

  // reduced-motion + touch: either one keeps the tween off entirely
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const update = () => {
      prefersReducedMotionRef.current = reducedMotion.matches;
      isCoarsePointerRef.current = coarsePointer.matches;
      if (reducedMotion.matches || coarsePointer.matches) killAutoScroll();
    };
    update();
    const queries = [reducedMotion, coarsePointer];
    queries.forEach((mql) => {
      if (mql.addEventListener) mql.addEventListener("change", update);
      else mql.addListener(update);
    });
    return () => {
      queries.forEach((mql) => {
        if (mql.removeEventListener) mql.removeEventListener("change", update);
        else mql.removeListener(update);
      });
    };
  }, [killAutoScroll]);

  // intersection observer
  useEffect(() => {
    const node = sliderRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isInViewRef.current = entry.isIntersecting;
          if (!entry.isIntersecting) killAutoScroll();
          else startAutoScrollRef.current();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [killAutoScroll, sliderRef]);

  // boot
  useEffect(() => {
    if (deps.productsLength === 0) return;
    const id = window.setTimeout(() => startAutoScroll(), 400);
    return () => {
      window.clearTimeout(id);
      killAutoScroll();
    };
  }, [deps.productsLength, killAutoScroll, startAutoScroll]);

  return { killAutoScroll, pauseAutoScroll, scheduleResume, startAutoScrollRef };
}
