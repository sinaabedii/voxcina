"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap-plugins";
import type { ColorVariantListItem } from "@/types/product";
import IndexRow from "./_components/IndexRow";
import PodiumCard from "./_components/PodiumCard";
import QuickAddSheet from "./_components/QuickAddSheet";
import TrendingEmpty from "./_components/TrendingEmpty";
import TrendingMasthead from "./_components/TrendingMasthead";
import { faNumber } from "./_components/trending-utils";

interface TrendingPageClientProps {
  items: ColorVariantListItem[];
}

/** How many entries are shown as objects before the list takes over. */
const PODIUM_SIZE = 3;

/**
 * The ranking, in two movements.
 *
 * The top three are shown as objects — photographed, priced, sized to be looked
 * at. Everything below is an index: one row per entry, read top to bottom. Two
 * shapes rather than ten identical cards, because a leaderboard is not a
 * catalogue, and because a row is the layout that survives a phone screen
 * without either shrinking its type or stretching a card across the viewport.
 */
export default function TrendingPageClient({ items }: TrendingPageClientProps) {
  const [quickAddItem, setQuickAddItem] = useState<ColorVariantListItem | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const podium = items.slice(0, PODIUM_SIZE);
  const rest = items.slice(PODIUM_SIZE);
  const leaderViews = items[0]?.viewCount ?? 0;

  const stats = useMemo(
    () => ({
      designCount: items.length,
      totalViews: items.reduce((sum, item) => sum + (item.viewCount ?? 0), 0),
      brandCount: new Set(items.map((item) => item.brand).filter(Boolean)).size,
    }),
    [items]
  );

  const closeQuickAdd = useCallback(() => setQuickAddItem(null), []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || items.length === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Transform only, never opacity: the rank-one photograph is this page's
      // LCP candidate, and an element faded up from zero does not qualify until
      // the tween has run. The podium rises into place already painted.
      gsap.from(root.querySelectorAll<HTMLElement>(".trending-podium-item"), {
        y: 26,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform",
      });

      const list = root.querySelector<HTMLElement>(".trending-index");
      if (!list) return;

      // Below the fold, so a fade is free here — nothing in the index competes
      // to be the largest painted element.
      gsap.from(list.querySelectorAll<HTMLElement>(".trending-row"), {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.07,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: list, start: "top 85%" },
      });

      // The view bars draw themselves out from the right, so the ranking's
      // shape is something the visitor watches resolve rather than arrives at.
      gsap.from(list.querySelectorAll<HTMLElement>(".trending-bar"), {
        scaleX: 0,
        duration: 1.1,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger: { trigger: list, start: "top 85%" },
      });
    },
    { scope: rootRef, dependencies: [items.length] }
  );

  if (items.length === 0) {
    return <TrendingEmpty />;
  }

  return (
    <div ref={rootRef}>
      <TrendingMasthead {...stats} />

      <div className="container pb-20 pt-12 sm:pt-16">
        {/* The podium. On a wide screen rank one runs at 1.35 to its
            neighbours' 1 — dominant without towering over them, which a 2:1
            split did, leaving a tall void beside the shorter pair. On a phone
            it takes the full width and the other two share a row. Both are
            stepped down the page so the block descends the way the ranking
            does rather than sitting as a flat row. */}
        <section aria-label="سه طرح برتر" className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-[1.35fr_1fr_1fr] lg:items-start lg:gap-x-10">
          {podium.map((item, index) => {
            const hero = index === 0;
            return (
              <div
                key={`${item.productId}-${item.colorVariant.variantId || index}`}
                className={`trending-podium-item ${
                  hero ? "col-span-2 lg:col-span-1" : "col-span-1"
                } ${index === 1 ? "lg:pt-14" : ""} ${index === 2 ? "lg:pt-24" : ""}`}
              >
                <PodiumCard
                  item={item}
                  rank={index + 1}
                  variant={hero ? "hero" : "standard"}
                  listPosition={index}
                  onQuickAdd={setQuickAddItem}
                />
              </div>
            );
          })}
        </section>

        {rest.length > 0 && (
          <section className="mt-20 sm:mt-28">
            <header className="mb-2 flex items-baseline justify-between gap-4 border-b border-voxcina-blue/15 pb-4">
              <h2 className="text-lg font-bold text-voxcina-blue sm:text-2xl">ادامهٔ فهرست</h2>
              <span className="shrink-0 text-xs tabular-nums text-voxcina-blue/45 sm:text-sm">
                رتبهٔ {faNumber(PODIUM_SIZE + 1)} تا {faNumber(items.length)}
              </span>
            </header>

            <ol className="trending-index">
              {rest.map((item, index) => (
                <IndexRow
                  key={`${item.productId}-${item.colorVariant.variantId || index + PODIUM_SIZE}`}
                  item={item}
                  rank={index + PODIUM_SIZE + 1}
                  listPosition={index + PODIUM_SIZE}
                  leaderViews={leaderViews}
                  onQuickAdd={setQuickAddItem}
                />
              ))}
            </ol>
          </section>
        )}

        {/* No dead end: the ranking is ten entries deep, the catalogue is not. */}
        <div className="mt-16 flex justify-center border-t border-voxcina-blue/10 pt-12">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 text-sm font-bold text-voxcina-blue transition-colors hover:text-secondary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 focus-visible:ring-offset-4 sm:text-base"
          >
            مشاهده همهٔ محصولات
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>

      <QuickAddSheet item={quickAddItem} onClose={closeQuickAdd} />
    </div>
  );
}
