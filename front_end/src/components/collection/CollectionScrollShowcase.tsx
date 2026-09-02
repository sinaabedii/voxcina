"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap-plugins";
import { ColorVariantListItem } from "@/types/product";
import BackendImage from "@/components/BackendImage";
import TexturedBackground from "@/components/ui/TexturedBackground";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { getVariantUrlValue } from "@/lib/product-variants";
import { activityTracker } from "@/lib/activity-tracker";

interface CollectionScrollShowcaseProps {
  items: ColorVariantListItem[];
}

/** Viewport-heights of pinned scroll allotted per product in the tunnel. */
const VH_PER_ITEM = 0.85;
/** Depth (px) between two adjacent products in 3D space. */
const SPACING = 760;
/** How many products to keep mounted on each side of the active one. */
const WINDOW = 3;

/**
 * Full-viewport, scroll-scrubbed 3D product tunnel.
 *
 * Replaces the product grid entirely: products fly toward the camera through
 * 3D space as the user scrolls — each starts far/small/blurred, scales up to
 * full size at center, then keeps moving past the viewer and fades out. This
 * is a faithful adaptation of argyleink's "3D spatial scroll zoom" CSS Scroll
 * Animation demo (perspective + translateZ driven by scroll position), rebuilt
 * here with GSAP so it works cross-browser and stays in sync with the page's
 * normalizeScroll handling.
 *
 * Only a small window of products is mounted at a time (virtualized) so we
 * never fetch/transform hundreds of <img> elements at once.
 */
export default function CollectionScrollShowcase({ items }: CollectionScrollShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Map<number, HTMLElement>>(new Map());
  const pRef = useRef(0);
  const lastBlur = useRef<Map<HTMLElement, number>>(new Map());

  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  const total = items.length;
  const lastIdx = Math.max(0, total - 1);
  const prevIdx = total > 0 ? (active - 1 + total) % total : 0;
  const nextIdx = total > 0 ? (active + 1) % total : 0;
  const from = Math.max(0, active - WINDOW);
  const to = Math.min(lastIdx, active + WINDOW);
  const visible = items.slice(from, to + 1);

  useEffect(() => {
    setReduced(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  // Stable pseudo-random scatter per product so positions don't jump on
  // re-render. Each product lives at its own random (x, y) offset and tilt;
  // when it is NOT the focused one it sits there — blurred — while the
  // focused product is pulled to dead center and sharpened.
  const rng = useMemo(() => {
    const seed = (n: number) => {
      let t = (n + 0x6d2b79f5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return items.map((_, i) => {
      const r1 = seed(i * 2654435761 + 97);
      const r2 = seed(i * 40503 + 11);
      const r3 = seed(i * 19349663 + 7);
      return {
        x: (r1 * 2 - 1) * 22, // vw  — scattered column offset
        y: (r2 * 2 - 1) * 15, // vh  — scattered row offset
        rot: (r3 * 2 - 1) * 12, // deg — subtle per-card tilt
      };
    });
  }, [items]);

  const applyTransforms = (p: number) => {
    const vw = typeof window !== "undefined" ? window.innerWidth / 100 : 12;
    const vh = typeof window !== "undefined" ? window.innerHeight / 100 : 8;
    const desktopScatter = typeof window !== "undefined" && window.innerWidth >= 1024;
    const scatterScale = desktopScatter ? 1.5 : 1;
    // `p` is the global scroll progress (0..1). Each product has its own
    // "focus" point at k/(N-1); as `p` passes it the product flies forward
    // through the scene: far (translateZ < 0) → full depth (z = 0) → passed
    // (translateZ > 0). Positions stay at their scattered offsets — the
    // perspective naturally shrinks distant cards toward the vanishing point,
    // creating the forward-motion illusion (à la argyleink's scroll zoom).
    const center = p * lastIdx; // floating "current" index
    const start = Math.max(0, Math.floor(center) - WINDOW);
    const end = Math.min(lastIdx, Math.ceil(center) + WINDOW);
    for (let k = start; k <= end; k++) {
      const el = cardEls.current.get(k);
      if (!el) continue;
      const focus = lastIdx > 0 ? k / lastIdx : 0;
      const d = (p - focus) * lastIdx; // signed depth coordinate (±1 ≈ neighbour)
      const ad = Math.abs(d);
      const z = d * SPACING; // <0 far, 0 focused, >0 passed
      const pos = rng[k] ?? { x: 0, y: 0, rot: 0 };
      const x = pos.x * scatterScale * vw; // constant scattered offset (NOT pulled to center)
      const y = pos.y * scatterScale * vh;
      const opacity = Math.max(0, 1 - ad * 0.7);
      // Blur is the most expensive property on mobile GPUs, so we quantize it
      // into coarse 2px steps and only rewrite `filter` when the step changes
      // (the compositor caches the rasterized layer between steps). Transforms
      // and opacity stay on the GPU and are updated every frame for free.
      const blurStep = Math.round(Math.min(10, ad * 4) / 2) * 2;
      const prev = lastBlur.current.get(el);
      if (prev !== blurStep) {
        el.style.filter = blurStep > 0 ? `blur(${blurStep}px)` : "none";
        lastBlur.current.set(el, blurStep);
      }
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x,
        y,
        z,
        rotationZ: pos.rot,
        opacity,
        pointerEvents: opacity > 0.2 ? "auto" : "none",
      });
    }
  };

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage || total === 0 || reduced) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };
          if (reduceMotion) {
            setReduced(true);
            return undefined;
          }

          // Fast/momentum scrolling runs on a separate thread than the JS
          // driving ScrollTrigger, so a quick flick can blow straight past a
          // pinned section before scrub calculations catch up. Force scroll
          // handling onto the JS thread so pin/scrub timing always stays synced.
          const normalizer = ScrollTrigger.normalizeScroll(true);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: `+=${total * VH_PER_ITEM * 100}%`,
              scrub: true,
              pin: true,
              anticipatePin: 1,
              fastScrollEnd: true,
              onUpdate: (self) => {
                const prog = total > 1 ? self.progress : 0;
                pRef.current = prog;
                applyTransforms(prog);
                const idx = Math.min(lastIdx, Math.round(prog * lastIdx));
                setActive(idx);
              },
            },
            defaults: { ease: "none" },
          });

          applyTransforms(0);
          setActive(0);

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
            normalizer?.kill();
            lastBlur.current.clear();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [total, reduced] }
  );

  if (total === 0) return null;

  // Reduced-motion (or pre-hydration fallback) → plain scrollable grid.
  if (reduced) {
    return (
      <section className="relative isolate min-h-screen px-4 py-20 sm:px-6">
        <TexturedBackground />
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, i) => (
            <ProductCard key={`${item.productId}-${i}`} item={item} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative isolate">
      <TexturedBackground />
      <div className="sticky top-0 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden">
        {/* Odometer counter — the numbers stay visually ordered in RTL */}
        <div
          className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20"
          dir="ltr"
          aria-label={`محصول ${active + 1} از ${total}`}
        >
          <div className="flex h-[4.5rem] w-44 items-center justify-center rounded-[2rem] bg-voxcina-blue px-3 shadow-[0_14px_32px_rgba(10,27,60,0.25)] ring-1 ring-white/10 sm:h-24 sm:w-52 sm:rounded-[2.25rem]">
            <div className="grid w-full grid-cols-[1fr_1.35fr_1fr] items-center text-center tabular-nums">
              <span className="text-lg font-semibold tracking-tight text-voxcina-cream/40 sm:text-xl">
                {(prevIdx + 1).toLocaleString("fa-IR")}
              </span>
              <span className="text-[2.8rem] font-bold leading-none tracking-tight text-voxcina-cream sm:text-6xl">
                {(active + 1).toLocaleString("fa-IR")}
              </span>
              <span className="text-lg font-semibold tracking-tight text-voxcina-cream/40 sm:text-xl">
                {(nextIdx + 1).toLocaleString("fa-IR")}
              </span>
            </div>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-voxcina-blue/15">
            <div
              className="h-full rounded-full bg-voxcina-blue/70 transition-[width] duration-100"
              style={{ width: `${total > 1 ? (active / (total - 1)) * 100 : 100}%` }}
            />
          </div>
        </div>

        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
        >
          {visible.map((item, i) => {
            const k = from + i;
            return (
              <div
                key={`${item.productId}-${k}`}
                ref={(el) => {
                  if (el) cardEls.current.set(k, el);
                  else cardEls.current.delete(k);
                }}
                className="absolute left-1/2 top-1/2 w-[46vw] max-w-[14rem] opacity-0 will-change-transform sm:w-80"
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  willChange: "transform, opacity",
                }}
              >
                <ProductCard item={item} index={k} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  item,
  index,
}: {
  item: ColorVariantListItem;
  index: number;
}) {
  const image = item.colorVariant.images?.[0] || "/images/products/placeholder.jpg";
  const variantValue = getVariantUrlValue(item.colorVariant) || item.colorVariant.colorName;
  const href = `/products/${item.productId}?${item.colorVariant.variantId ? "variant" : "color"}=${encodeURIComponent(variantValue || "")}`;
  const discount =
    item.originalPrice && item.originalPrice > item.price
      ? getDiscountPercentage(item.originalPrice, item.price)
      : 0;

  return (
    <Link
      href={href}
      rel="nofollow"
      data-activity-tracked="true"
      onClick={() =>
        activityTracker.trackProductClick(item.productId, item.name, {
          colorName: item.colorVariant.colorName,
          colorHex: item.colorVariant.color,
          inStock: item.inStock,
          brand: item.brand,
          price: item.price,
          listPosition: index,
        })
      }
      className="flex flex-col items-center"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-strong">
        <BackendImage
          src={image}
          alt={item.name}
          width={480}
          height={640}
          className="h-full w-full object-cover"
          priority={index === 0}
        />
        {discount > 0 && (
          <span className="absolute top-3 right-3 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground shadow-soft">
            {discount}٪ تخفیف
          </span>
        )}
        {!item.inStock && (
          <span className="absolute top-3 left-3 rounded-md bg-neutral-700 px-2 py-1 text-xs font-medium text-white shadow-soft">
            ناموجود
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center text-center text-voxcina-blue">
        <h3 className="line-clamp-1 max-w-full text-base font-medium sm:text-lg">
          {item.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-lg font-bold sm:text-xl">{formatPrice(item.price)}</span>
          {discount > 0 && (
            <span className="text-sm text-voxcina-blue/50 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
