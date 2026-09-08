"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { getScrollOffset, offsetToRaw, setScrollOffset } from "@/lib/carousel/rtl";

/**
 * Auto-scroll behaviour for product carousels.
 * Encapsulates the IntersectionObserver + reduced-motion + hover/pointer pauses
 * that were previously inline inside ProductCarouselSectionClient.
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
  const autoScrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const resumeAtRef = useRef(0);
  const isInViewRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const startAutoScrollRef = useRef<() => void>(() => {});

  const AUTO_SCROLL_DURATION = 18;
  const AUTO_RESUME_DELAY = 2200;

  const killAutoScroll = useCallback(() => {
    if (autoScrollTweenRef.current) {
      autoScrollTweenRef.current.kill();
      autoScrollTweenRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    if (prefersReducedMotionRef.current) return;
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

    const remaining = maxScroll - getScrollOffset(el);
    const duration = (remaining / maxScroll) * AUTO_SCROLL_DURATION;

    autoScrollTweenRef.current = gsap.to(el, {
      scrollLeft: offsetToRaw(el, maxScroll),
      duration,
      ease: "none",
      overwrite: "auto",
      onComplete: () => {
        autoScrollTweenRef.current = null;
        if (sliderRef.current) setScrollOffset(sliderRef.current, 0);
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
      },
    });
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

  // reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      prefersReducedMotionRef.current = mql.matches;
      if (mql.matches) killAutoScroll();
    };
    update();
    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
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
