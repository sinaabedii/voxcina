"use client";

import { RefObject, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface UseScrollRevealOptions {
  /** CSS selector (relative to the container) for the items to reveal. */
  selector: string;
  /** Starting y-offset in px before items settle into place. */
  y?: number;
  /** Seconds between each item's start in a batch. */
  stagger?: number;
  /** ScrollTrigger start position. */
  start?: string;
  /** Dependencies that should trigger a re-scan of the DOM (e.g. list length). */
  deps?: unknown[];
}

/**
 * Fades + lifts items into view as they scroll into the viewport, batched so a
 * fast scroll reveals a whole group together instead of one-by-one.
 * Thin wrapper around ScrollTrigger.batch() — see CollectionScrollShowcase.tsx
 * for the sibling pattern (pinned scroll) this project already uses.
 *
 * Respects prefers-reduced-motion: items are simply set to their final state.
 */
export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  { selector, y = 24, stagger = 0.08, start = "top 85%", deps = [] }: UseScrollRevealOptions
) {
  const batchRef = useRef<ScrollTrigger[]>([]);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;
      const items = container.querySelectorAll<HTMLElement>(selector);
      if (items.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            gsap.set(items, { autoAlpha: 1, y: 0 });
            return undefined;
          }

          gsap.set(items, { autoAlpha: 0, y });

          batchRef.current = ScrollTrigger.batch(items, {
            start,
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                stagger,
                overwrite: true,
              });
            },
          });

          return () => {
            batchRef.current.forEach((st) => st.kill());
            batchRef.current = [];
          };
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [selector, y, stagger, start, ...deps] }
  );
}
