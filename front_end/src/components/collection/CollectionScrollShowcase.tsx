"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ColorVariantListItem } from "@/types/product";
import BackendImage from "@/components/BackendImage";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { getCanonicalColor } from "@/lib/product-variants";
import { activityTracker } from "@/lib/activity-tracker";

interface CollectionScrollShowcaseProps {
  items: ColorVariantListItem[];
}

/** How much pinned scroll range (in viewport-heights) is allotted per product. */
const VH_PER_ITEM = 1.1;

/**
 * Full-viewport, scroll-scrubbed product showcase.
 *
 * Replaces the traditional product grid entirely: one product is shown at a
 * time — 3:4 main image, name, price, and a "n / total" counter — pinned
 * center-stage. As the user scrolls, the current product fades/scales out
 * while the next one fades/scales in, so products appear and disappear in
 * sync with scroll position. Each product is a real `<Link>` to its page.
 *
 * Cards are stacked using the CSS Grid "shared cell" technique (every card
 * placed at col 1 / row 1) so the stage naturally sizes to the tallest card
 * without any manual absolute-positioning height math.
 */
export default function CollectionScrollShowcase({ items }: CollectionScrollShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const counterCurrentRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stack = stackRef.current;
      if (!section || !stack || items.length === 0) return;

      const cards = gsap.utils.toArray<HTMLElement>(".showcase-card", stack);
      if (cards.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            // No pin/scrub: just reveal the first card, hide the rest.
            // Each card remains a real, clickable link in the DOM.
            gsap.set(cards, { autoAlpha: 0 });
            gsap.set(cards[0], { autoAlpha: 1 });
            return undefined;
          }

          gsap.set(cards, { autoAlpha: 0, scale: 0.85 });
          gsap.set(cards[0], { autoAlpha: 1, scale: 1 });
          if (counterCurrentRef.current) counterCurrentRef.current.textContent = "1";

          // Fast/momentum scrolling runs on a separate thread than the JS
          // driving ScrollTrigger, so a quick flick can blow straight past
          // a pinned section before scrub calculations catch up, making the
          // pin appear to be skipped entirely. Force scroll handling onto
          // the JS thread so pin/scrub timing always stays in sync.
          const normalizer = ScrollTrigger.normalizeScroll(true);

          const perItem = 1 / items.length;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: `+=${items.length * VH_PER_ITEM * 100}%`,
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              fastScrollEnd: true,
              onUpdate: (self) => {
                if (!counterCurrentRef.current) return;
                const idx = Math.min(
                  items.length - 1,
                  Math.floor(self.progress * items.length)
                );
                counterCurrentRef.current.textContent = String(idx + 1);
              },
            },
            defaults: { ease: "none" },
          });

          cards.forEach((card, i) => {
            if (i === 0) return; // first card starts already visible
            const start = i * perItem;
            tl.to(
              cards[i - 1],
              { autoAlpha: 0, scale: 0.85, duration: perItem * 0.4 },
              start - perItem * 0.4
            ).fromTo(
              card,
              { autoAlpha: 0, scale: 1.15 },
              { autoAlpha: 1, scale: 1, duration: perItem * 0.4 },
              start - perItem * 0.2
            );
          });

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
            normalizer?.kill();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [items.length] }
  );

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative isolate bg-voxcina-blue">
      <div className="sticky top-0 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6 py-6">
        <span className="mb-6 shrink-0 text-xs sm:text-sm tracking-widest text-voxcina-cream/50">
          <span ref={counterCurrentRef}>1</span>
          <span className="mx-1">/</span>
          <span>{items.length}</span>
        </span>

        <div
          ref={stackRef}
          className="grid w-full max-w-xs sm:max-w-sm"
          style={{ perspective: "1200px" }}
        >
          {items.map((item, i) => {
            const image =
              item.colorVariant.images?.[0] || "/images/products/placeholder.jpg";
            const color = getCanonicalColor(item.colorVariant) || item.colorVariant.colorName;
            const href = `/products/${item.productId}?color=${encodeURIComponent(color)}`;
            const discount =
              item.originalPrice && item.originalPrice > item.price
                ? getDiscountPercentage(item.originalPrice, item.price)
                : 0;

            return (
              <Link
                key={`${item.productId}-${color}-${i}`}
                href={href}
                data-activity-tracked="true"
                onClick={() =>
                  activityTracker.trackProductClick(item.productId, item.name, {
                    colorName: item.colorVariant.colorName,
                    colorHex: item.colorVariant.color,
                    inStock: item.inStock,
                    brand: item.brand,
                    price: item.price,
                    listPosition: i,
                  })
                }
                className="showcase-card col-start-1 row-start-1 flex flex-col items-center"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-strong">
                  <BackendImage
                    src={image}
                    alt={item.name}
                    width={480}
                    height={640}
                    className="h-full w-full object-cover"
                    priority={i === 0}
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

                <div className="mt-4 flex flex-col items-center text-center text-voxcina-cream">
                  <h3 className="line-clamp-1 max-w-full text-base font-medium sm:text-lg">
                    {item.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-lg font-bold sm:text-xl">
                      {formatPrice(item.price)}
                    </span>
                    {discount > 0 && (
                      <span className="text-sm text-voxcina-cream/50 line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
