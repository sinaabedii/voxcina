"use client";

import { useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap";

interface CollectionIntroProps {
  title: string;
  tagline?: string;
  /** Called once the exit animation has fully finished (overlay should be unmounted by parent) */
  onExitComplete: () => void;
  cyclingLabels?: string[];
}

const DEFAULT_LABELS = ["اسکرول کنید", "کشف کنید"];

/**
 * Act One — full-screen branded intro.
 *
 * Headline splits into characters and animates in, a cycling label loops
 * at the bottom (inspired by lassepedersen.biz's "Scroll / Swipe" label),
 * then after a short hold (or as soon as the user scrolls/clicks/presses a
 * key) the whole scene animates away: characters scatter through 3D space
 * while a two-panel curtain wipes the overlay off screen, revealing the
 * page underneath.
 */
export default function CollectionIntro({
  title,
  tagline,
  onExitComplete,
  cyclingLabels = DEFAULT_LABELS,
}: CollectionIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const topPanelRef = useRef<HTMLDivElement>(null);
  const bottomPanelRef = useRef<HTMLDivElement>(null);

  const [isExiting, setIsExiting] = useState(false);
  const exitTweenRef = useRef<gsap.core.Timeline | null>(null);
  const hasExitedRef = useRef(false);

  const triggerExit = useCallback(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    setIsExiting(true);
    // If the exit timeline already exists (created in useGSAP), fast-forward it
    // instead of restarting — respects an in-flight animation.
    exitTweenRef.current?.play();
  }, []);

  useGSAP(
    () => {
      const container = containerRef.current;
      const headline = headlineRef.current;
      if (!container || !headline) return;

      const mm = gsap.matchMedia();

      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            // Respect reduced motion: skip animation entirely, reveal instantly.
            gsap.set(container, { autoAlpha: 1 });
            const t = setTimeout(() => onExitComplete(), 50);
            return () => clearTimeout(t);
          }

          const split = SplitText.create(headline, {
            type: "chars, words",
            charsClass: "collection-intro-char",
          });

          // Cycling bottom label loop
          let cycleTl: gsap.core.Timeline | null = null;
          if (labelRef.current && cyclingLabels.length > 0) {
            cycleTl = gsap.timeline({ repeat: -1 });
            cyclingLabels.forEach((text) => {
              cycleTl!
                .call(() => {
                  if (labelRef.current) labelRef.current.textContent = text;
                })
                .fromTo(
                  labelRef.current,
                  { autoAlpha: 0, y: 6 },
                  { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }
                )
                .to(labelRef.current, { autoAlpha: 0, y: -6, duration: 0.4, ease: "power2.in" }, "+=1.1");
            });
          }

          // Entrance timeline
          const enterTl = gsap.timeline({
            defaults: { ease: "power3.out" },
          });
          enterTl
            .fromTo(
              split.chars,
              { autoAlpha: 0, yPercent: 120, rotationX: -80 },
              {
                autoAlpha: 1,
                yPercent: 0,
                rotationX: 0,
                duration: 0.9,
                stagger: { each: 0.02, from: "start" },
              }
            )
            .fromTo(
              taglineRef.current,
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.6 },
              "-=0.4"
            );

          // Exit timeline (paused, played on triggerExit)
          const exitTl = gsap.timeline({ paused: true });
          exitTl
            .call(() => cycleTl?.pause(), undefined, 0)
            .to(
              [taglineRef.current, labelRef.current],
              { autoAlpha: 0, y: -10, duration: 0.35, ease: "power2.in" },
              0
            )
            .to(
              split.chars,
              {
                autoAlpha: 0,
                z: () => gsap.utils.random(-600, 600),
                x: () => gsap.utils.random(-200, 200),
                y: () => gsap.utils.random(-160, 160),
                rotationX: () => gsap.utils.random(-120, 120),
                rotationY: () => gsap.utils.random(-120, 120),
                duration: 0.7,
                stagger: { each: 0.012, from: "random" },
                ease: "power3.in",
              },
              0.05
            )
            .to(
              topPanelRef.current,
              { yPercent: -100, duration: 0.6, ease: "power4.inOut" },
              0.35
            )
            .to(
              bottomPanelRef.current,
              { yPercent: 100, duration: 0.6, ease: "power4.inOut" },
              0.35
            )
            .set(container, { autoAlpha: 0, pointerEvents: "none" })
            .call(() => {
              split.revert();
              onExitComplete();
            });

          exitTweenRef.current = exitTl;

          return () => {
            cycleTl?.kill();
            enterTl.kill();
            exitTl.kill();
            split.revert();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-voxcina-blue text-voxcina-cream overflow-hidden"
      style={{ perspective: "1200px" }}
      role="presentation"
      aria-hidden={isExiting}
      onClick={triggerExit}
      onWheel={triggerExit}
      onTouchStart={triggerExit}
    >
      {/* Curtain panels used for the exit wipe */}
      <div
        ref={topPanelRef}
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-voxcina-blue"
        style={{ transform: "translateY(0)" }}
      />
      <div
        ref={bottomPanelRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-voxcina-blue"
        style={{ transform: "translateY(0)" }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center" style={{ transformStyle: "preserve-3d" }}>
        <span className="mb-3 text-xs sm:text-sm tracking-widest text-voxcina-cream/60">
          کالکشن
        </span>
        <h1
          ref={headlineRef}
          className="text-[13vw] sm:text-[9vw] md:text-[7vw] font-bold leading-[1.05]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {title}
        </h1>
        {tagline && (
          <p
            ref={taglineRef}
            className="mt-6 max-w-xl text-sm sm:text-base md:text-lg text-voxcina-cream/80"
          >
            {tagline}
          </p>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <span
          ref={labelRef}
          className="text-xs sm:text-sm tracking-widest text-voxcina-cream/50"
        >
          {cyclingLabels[0]}
        </span>
      </div>
    </div>
  );
}
