"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap-plugins";

interface ReadingProgressBarProps {
  /** The article element whose scroll range drives the bar. */
  articleRef: RefObject<HTMLElement>;
}

const FALLBACK_HEADER_HEIGHT = 80;

/**
 * Thin fixed bar that fills as the reader scrolls through the article,
 * pinned directly below the site header. Scrubbed 1:1 to scroll position (no
 * easing lag) so it always matches exactly where the reader is. RTL-aware:
 * fills from the right.
 *
 * Measures the real <header> height at runtime instead of hardcoding it —
 * two `sticky top-0` siblings would otherwise stack on top of each other
 * (both pin to the same y=0), so this bar is pinned at `top: headerHeight`.
 */
export default function ReadingProgressBar({ articleRef }: ReadingProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(FALLBACK_HEADER_HEIGHT);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      const article = articleRef.current;
      const bar = barRef.current;
      if (!article || !bar) return;

      gsap.set(bar, { scaleX: 0, transformOrigin: "right center" });

      const tween = gsap.to(bar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: article,
          start: "top top+=80",
          end: "bottom bottom",
          scrub: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: trackRef }
  );

  return (
    <div
      ref={trackRef}
      className="sticky z-30 h-1 w-full bg-secondary-200/60"
      style={{ top: headerHeight }}
      aria-hidden="true"
    >
      <div ref={barRef} className="h-full w-full bg-voxcina-blue" />
    </div>
  );
}
