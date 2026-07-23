"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap";

interface BlogListHeroProps {
  title: string;
  subtitle: string;
}

/**
 * Blog list page heading — a lighter version of BlogHero's SplitText title
 * reveal (no parallax, just a one-time entrance on load).
 */
export default function BlogListHero({ title, subtitle }: BlogListHeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const heading = titleRef.current;
      if (!heading) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            gsap.set([heading, subtitleRef.current], { autoAlpha: 1, y: 0 });
            return undefined;
          }

          const split = SplitText.create(heading, { type: "words" });

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.fromTo(
            split.words,
            { autoAlpha: 0, yPercent: 100 },
            { autoAlpha: 1, yPercent: 0, duration: 0.7, stagger: 0.05 }
          ).fromTo(
            subtitleRef.current,
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.6 },
            "-=0.3"
          );

          return () => {
            tl.kill();
            split.revert();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: titleRef }
  );

  return (
    <div className="relative mx-auto max-w-3xl text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary-200/70 via-secondary-300/50 to-primary-300/40 blur-3xl sm:h-72 sm:w-72"
      />
      <span className="mb-4 inline-block rounded-full bg-secondary-200 px-4 py-1.5 text-xs font-medium text-voxcina-blue sm:text-sm">
        وبلاگ وکسینا
      </span>
      <h1
        ref={titleRef}
        className="mb-3 text-3xl font-bold text-voxcina-blue md:mb-4 md:text-4xl lg:text-5xl"
      >
        {title}
      </h1>
      <p ref={subtitleRef} className="text-sm text-gray-600 md:text-lg">
        {subtitle}
      </p>
    </div>
  );
}
