"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap, Flip } from "@/lib/gsap";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";
import { COLLECTION_GRID_ITEM_CLASS } from "./CollectionProductGrid";

interface CollectionFilterBarProps {
  collectionValue: string;
  currentPage: number;
  totalItems: number;
  initialSort?: string;
  initialInStockOnly?: boolean;
  /** Shared ref: populated with a Flip.getState() snapshot right before a
   * sort/filter change navigates, so CollectionProductGrid can animate the
   * reflow once the newly-sorted items render. */
  pendingFlipStateRef: { current: ReturnType<typeof Flip.getState> | null };
}

export default function CollectionFilterBar({
  collectionValue,
  currentPage,
  totalItems,
  initialSort,
  initialInStockOnly,
  pendingFlipStateRef,
}: CollectionFilterBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState(initialSort || "");
  const [inStockOnly, setInStockOnly] = useState(initialInStockOnly || false);

  // Reveal-on-scroll-into-view (single trigger, not scrubbed).
  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.from(el, {
          autoAlpha: 0,
          y: 16,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  useGSAP(
    () => {
      if (!sortOpen || !dropdownRef.current) return;
      gsap.fromTo(
        dropdownRef.current,
        { autoAlpha: 0, y: -8 },
        { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" }
      );
    },
    { scope: dropdownRef, dependencies: [sortOpen] }
  );

  const buildUrl = (params: { page?: number; sort?: string; inStockOnly?: boolean }) => {
    const searchParams = new URLSearchParams();

    const newSort = params.sort !== undefined ? params.sort : sort;
    const newInStock = params.inStockOnly !== undefined ? params.inStockOnly : inStockOnly;
    const newPage = params.page !== undefined ? params.page : currentPage;

    if (newSort) searchParams.set("sort", newSort);
    if (newInStock) searchParams.set("inStockOnly", "true");
    if (newPage > 1) searchParams.set("page", String(newPage));

    const queryString = searchParams.toString();
    const base = `/collection/${collectionValue}`;
    return queryString ? `${base}?${queryString}` : base;
  };

  const captureFlipState = () => {
    const cards = gsap.utils.toArray<HTMLElement>(`.${COLLECTION_GRID_ITEM_CLASS}`);
    if (cards.length > 0) {
      pendingFlipStateRef.current = Flip.getState(cards);
    }
  };

  const handleSortChange = (newSort: string) => {
    captureFlipState();
    setSort(newSort);
    setSortOpen(false);
    router.push(buildUrl({ sort: newSort, page: 1 }));
  };

  const handleStockFilterChange = () => {
    captureFlipState();
    const newValue = !inStockOnly;
    setInStockOnly(newValue);
    router.push(buildUrl({ inStockOnly: newValue, page: 1 }));
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || "مرتبسازی";

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/20"
    >
      <p className="text-sm text-muted-foreground">{totalItems} محصول</p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={handleStockFilterChange}
            className="w-4 h-4 rounded border-gray-300 text-voxcina-blue focus:ring-voxcina-blue"
          />
          <span className="text-sm">فقط موجود</span>
        </label>

        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/70 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {currentSortLabel}
            <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>

          {sortOpen && (
            <div
              ref={dropdownRef}
              className="absolute left-0 top-full mt-2 w-48 bg-card rounded-lg shadow-medium border border-border/20 z-10"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-right px-4 py-2 text-sm hover:bg-secondary first:rounded-t-lg last:rounded-b-lg ${
                    sort === option.value ? "text-voxcina-blue font-medium" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
