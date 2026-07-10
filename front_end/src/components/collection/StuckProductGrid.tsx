"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ColorVariantListItem } from "@/types/product";
import BackendImage from "@/components/BackendImage";
import { getCanonicalColor } from "@/lib/product-variants";

interface StuckProductGridProps {
  title: string;
  items: ColorVariantListItem[];
}

/** The 12 perimeter cells of a 4x4 grid (the center 2x2 is reserved for the title). */
const GRID_POSITIONS: Array<{ row: number; col: number }> = [
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 2, col: 1 },
  { row: 2, col: 4 },
  { row: 3, col: 1 },
  { row: 3, col: 4 },
  { row: 4, col: 1 },
  { row: 4, col: 2 },
  { row: 4, col: 3 },
  { row: 4, col: 4 },
];

/** Spread start-percentages (of the pinned scroll range) for each flight slot — mirrors the
 * reference CSS's varied `animation-range` windows so cells don't all fire in lockstep. */
const START_OFFSETS = [
  4, 46, 18, 62, 30, 8, 74, 52, 20, 38, 66, 12, 58, 26, 84, 42, 10, 70, 34, 90, 16, 48, 78, 24,
];

const SLOT_SPAN = 16; // percent of the pinned range each flight occupies

interface Slot {
  item: ColorVariantListItem;
  image: string;
  row: number;
  col: number;
  startPercent: number;
}

function buildSlots(items: ColorVariantListItem[]): Slot[] {
  if (items.length === 0) return [];

  const flightCount = Math.max(items.length, GRID_POSITIONS.length);
  const slots: Slot[] = [];

  for (let i = 0; i < flightCount; i++) {
    const item = items[i % items.length];
    const image = item.colorVariant.images?.[0] || "/images/products/placeholder.jpg";
    const position = GRID_POSITIONS[i % GRID_POSITIONS.length];
    const startPercent = START_OFFSETS[i % START_OFFSETS.length];
    slots.push({ item, image, row: position.row, col: position.col, startPercent });
  }

  return slots;
}

export default function StuckProductGrid({ title, items }: StuckProductGridProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const slots = buildSlots(items);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const grid = gridRef.current;
      if (!section || !grid || slots.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions as {
            isDesktop: boolean;
            reduceMotion: boolean;
          };

          if (reduceMotion) {
            // Static collage fallback: just reveal everything, no pin/animation.
            gsap.set(".stuck-grid-item", { autoAlpha: 1, z: 0, filter: "blur(0px)" });
            return undefined;
          }

          if (isDesktop) {
            const cells = gsap.utils.toArray<HTMLElement>(".stuck-grid-item", grid);

            gsap.set(cells, { autoAlpha: 0, z: -900, filter: "blur(6px)" });

            // Fast/momentum scrolling runs on a separate thread than the JS
            // that drives ScrollTrigger, so a quick flick can blow straight
            // past this pinned section before the scrub calculations catch
            // up — visually "skipping" the pin and jumping to the content
            // below. ScrollTrigger.normalizeScroll(true) forces scrolling
            // onto the JS thread so pin/scrub timing stays in sync even
            // during fast scrolls (see GSAP docs for normalizeScroll()).
            const normalizer = ScrollTrigger.normalizeScroll(true);

            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "+=260%",
                scrub: 1,
                pin: true,
                anticipatePin: 1,
                fastScrollEnd: true,
              },
              defaults: { ease: "none" },
            });

            cells.forEach((cell, i) => {
              const slot = slots[i];
              if (!slot) return;
              const mid = slot.startPercent + SLOT_SPAN / 2;

              tl.fromTo(
                cell,
                { z: -900, autoAlpha: 0, filter: "blur(6px)" },
                { z: 0, autoAlpha: 1, filter: "blur(0px)", duration: SLOT_SPAN / 2 },
                slot.startPercent
              ).to(
                cell,
                { z: 900, autoAlpha: 0, filter: "blur(6px)", duration: SLOT_SPAN / 2 },
                mid
              );
            });

            return () => {
              tl.scrollTrigger?.kill();
              tl.kill();
              normalizer?.kill();
            };
          }

          return undefined;
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [items.length] }
  );

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative isolate hidden lg:block bg-voxcina-blue"
      aria-hidden="true"
    >
      <div
        ref={gridRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ perspective: "1400px" }}
      >
        <div
          className="grid h-full w-full grid-cols-4 grid-rows-4 place-items-center gap-2 p-4"
          style={{ transformStyle: "preserve-3d" }}
        >
          {slots.map((slot, i) => (
            <div
              key={`${slot.item.productId}-${i}`}
              className="stuck-grid-item relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl"
              style={{
                gridRow: slot.row,
                gridColumn: slot.col,
                transformStyle: "preserve-3d",
                willChange: "transform, opacity, filter",
              }}
            >
              <BackendImage
                src={slot.image}
                alt={slot.item.name}
                width={260}
                height={340}
                className="h-full w-full rounded-xl object-cover shadow-strong"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 py-2.5">
                <p className="truncate text-center text-xs sm:text-sm font-medium text-white">
                  {slot.item.name}
                </p>
              </div>
            </div>
          ))}

          <div
            className="relative z-10 flex flex-col items-center justify-center text-center text-voxcina-cream"
            style={{ gridRow: "2 / span 2", gridColumn: "2 / span 2" }}
          >
            <span className="text-xs sm:text-sm tracking-widest text-voxcina-cream/60 mb-2">
              کالکشن
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{title}</h2>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Mobile fallback — a lightweight horizontal auto-scrolling strip instead of
 * the 3D pinned grid (no pin/perspective on small screens for performance
 * and reliability). Rendered by the parent alongside StuckProductGrid when
 * the viewport is small (handled via CSS breakpoints: this file exports the
 * desktop scene as `hidden lg:block`; use `StuckProductGridMobile` below on
 * small screens).
 */
export function StuckProductGridMobile({ title, items }: StuckProductGridProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeItems = items.length > 0 ? [...items, ...items] : [];

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || items.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.to(track, {
          xPercent: -50,
          ease: "none",
          duration: 20,
          repeat: -1,
        });
        return () => tween.kill();
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [items.length] }
  );

  if (items.length === 0) return null;

  return (
    <section ref={containerRef} className="block lg:hidden bg-voxcina-blue py-10 overflow-hidden">
      <h2 className="text-center text-2xl font-bold text-voxcina-cream mb-6">{title}</h2>
      <div className="relative overflow-hidden">
        <div ref={trackRef} className="flex w-max gap-4 px-4">
          {marqueeItems.map((item, i) => {
            const image = item.colorVariant.images?.[0] || "/images/products/placeholder.jpg";
            const color = getCanonicalColor(item.colorVariant) || item.colorVariant.colorName;
            return (
              <div
                key={`${item.productId}-${color}-${i}`}
                className="relative h-56 w-40 shrink-0 overflow-hidden rounded-xl shadow-strong"
              >
                <BackendImage src={image} alt={item.name} width={160} height={224} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 py-2">
                  <p className="truncate text-center text-xs font-medium text-white">{item.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
