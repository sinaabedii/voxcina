"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useCategoryStore } from "@/store/category-store";
import { Category } from "@/types/category";
import { Loader2, Tags, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

// Gradient palette used to colour the avatar rings. Cycles through the
// list based on category index so the section stays visually varied
// without needing a per-category "color" field in the data model.
const RING_PALETTE = [
  {
    ring: "from-voxcina-blue to-blue-500",
    shadow: "shadow-blue-200/60",
  },
  {
    ring: "from-rose-400 to-pink-500",
    shadow: "shadow-pink-200/60",
  },
  {
    ring: "from-amber-400 to-orange-500",
    shadow: "shadow-amber-200/60",
  },
  {
    ring: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-200/60",
  },
  {
    ring: "from-violet-400 to-purple-500",
    shadow: "shadow-violet-200/60",
  },
  {
    ring: "from-sky-400 to-cyan-500",
    shadow: "shadow-sky-200/60",
  },
  {
    ring: "from-fuchsia-400 to-pink-500",
    shadow: "shadow-fuchsia-200/60",
  },
  {
    ring: "from-indigo-400 to-blue-500",
    shadow: "shadow-indigo-200/60",
  },
];

const ModernCategoriesSection = () => {
  const { categories, fetchCategories, isLoading } = useCategoryStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [itemWidth, setItemWidth] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const visible: Category[] = useMemo(
    () => (categories || []).filter((c) => c.is_active !== false),
    [categories]
  );

  // CSS percentage-based flex-basis drifts by a few sub-pixels once you
  // divide by 4/8 and subtract gaps, which is exactly what let a sliver of
  // the next avatar peek in. Measuring the real row width and flooring the
  // per-item share in JS guarantees the row never exceeds it. Must measure
  // rowRef (the flex container itself), not the padded scroller wrapper
  // around it, or every item ends up overshot by the wrapper's own padding.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const row = rowRef.current;
    if (!el || !row || visible.length === 0) return;

    const recompute = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const perView = isDesktop ? 8 : 4;
      const gap = isDesktop ? 16 : 12;
      const raw = (row.clientWidth - (perView - 1) * gap) / perView;
      setItemWidth(Math.floor(raw));
    };

    el.scrollLeft = 0;
    recompute();
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(row);
    window.addEventListener("resize", recompute);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [visible.length]);

  const scrollByDirection = (direction: "start" | "end") => {
    const el = scrollerRef.current;
    if (!el) return;

    const amount = el.clientWidth * 0.8;
    const next =
      direction === "end" ? el.scrollLeft + amount : el.scrollLeft - amount;
    el.scrollTo({ left: next, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    setIsDragging(true);
    setDragStartX(e.pageX - el.offsetLeft);
    setDragScrollLeft(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!isDragging || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    el.scrollLeft = dragScrollLeft - walk;
  };

  const stopDragging = () => setIsDragging(false);

  return (
    <section className="py-16 bg-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm font-medium mb-4">
            دسته‌بندی‌ها
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            انتخاب
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mx-2">
              استایل
            </span>
            شما
          </h2>

          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            دسته‌بندی مورد نظر خود را انتخاب کنید و از خرید لذت ببرید
          </p>
        </div>

        {isLoading && visible.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue/60" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Tags className="w-10 h-10 mb-2 text-gray-400" />
            <p>هنوز دسته‌بندی‌ای ثبت نشده است.</p>
          </div>
        ) : (
          <div className="relative group/scroller mb-4">
            {/* Scroll hint arrows — desktop only, mobile relies on touch swipe */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollByDirection("start")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-white/95 shadow-lg ring-1 ring-black/5 rounded-full p-2.5 opacity-0 group-hover/scroller:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
              aria-label="دسته‌بندی‌های قبلی"
            >
              <ChevronLeft className="w-5 h-5 text-voxcina-blue" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollByDirection("end")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-white/95 shadow-lg ring-1 ring-black/5 rounded-full p-2.5 opacity-0 group-hover/scroller:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
              aria-label="دسته‌بندی‌های بعدی"
            >
              <ChevronRight className="w-5 h-5 text-voxcina-blue" />
            </Button>

            <div
              ref={scrollerRef}
              className="overflow-x-auto scrollbar-hide py-4 px-4 select-none"
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
            >
              <div ref={rowRef} className="flex gap-3 md:gap-4">
                {visible.map((category, index) => {
                  const palette = RING_PALETTE[index % RING_PALETTE.length];
                  const isHovered = hoveredId === category.id;
                  return (
                    <div
                      key={category.id}
                      className="relative flex-none basis-[calc((100%_-_2.25rem)/4)] md:basis-[calc((100%_-_7rem)/8)]"
                      style={
                        itemWidth !== null
                          ? { flexBasis: `${itemWidth}px` }
                          : undefined
                      }
                    >
                      <Link
                        href={`/products?category=${
                          category.id ?? category.slug
                        }`}
                        onMouseEnter={() => setHoveredId(category.id ?? null)}
                        onMouseLeave={() => setHoveredId(null)}
                        draggable={false}
                      >
                        <div className="relative group cursor-pointer transition-transform duration-300 hover:-translate-y-1 active:scale-95">
                          <div
                            className={`relative w-full aspect-square rounded-full bg-gradient-to-br ${palette.ring} p-0.5 ${palette.shadow} shadow-lg group-hover:shadow-xl transition-all duration-300`}
                          >
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2 md:p-3">
                              {category.avatar ? (
                                <img
                                  src={category.avatar}
                                  alt={category.name}
                                  draggable={false}
                                  className="w-full h-full object-contain transform transition-transform duration-300 group-hover:scale-110"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Tags className="w-1/2 h-1/2 text-voxcina-blue/40" />
                              )}
                            </div>
                          </div>

                          <div
                            className={`absolute inset-0 rounded-full bg-gradient-to-br ${palette.ring} opacity-0 group-hover:opacity-20 group-hover:scale-110 transition-all duration-300`}
                          />

                          {isHovered && (
                            <div className="absolute inset-0 rounded-full border-4 border-gray-800 scale-110" />
                          )}
                        </div>

                        <h3 className="text-center mt-2 text-[11px] md:text-xs leading-snug font-medium text-gray-800 break-words group-hover:text-gray-900 transition-colors">
                          {category.name}
                        </h3>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ModernCategoriesSection;
