"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCategoryStore } from "@/store/category-store";
import { Category } from "@/types/category";
import { Loader2, Tags } from "lucide-react";

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const visible: Category[] = useMemo(
    () => (categories || []).filter((c) => c.is_active !== false),
    [categories]
  );

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
          <>
            {/* Desktop / tablet grid */}
            <div className="hidden md:flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
              {visible.map((category, index) => {
                const palette =
                  RING_PALETTE[index % RING_PALETTE.length];
                const isHovered = hoveredId === category.id;
                return (
                  <div key={category.id} className="relative">
                    <Link
                      href={`/products?category=${
                        category.id ?? category.slug
                      }`}
                      onMouseEnter={() => setHoveredId(category.id ?? null)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="relative group cursor-pointer transition-transform duration-300 hover:-translate-y-2">
                        <div
                          className={`relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br ${palette.ring} p-0.5 ${palette.shadow} shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        >
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-3">
                            {category.avatar ? (
                              <img
                                src={category.avatar}
                                alt={category.name}
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

                      <h3 className="text-center mt-3 text-sm md:text-base font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                        {category.name}
                      </h3>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Mobile horizontal scroller */}
            <div className="md:hidden mb-12">
              <div className="relative">
                <div className="overflow-x-auto scrollbar-hide py-4">
                  <div
                    className="flex gap-4 px-4"
                    style={{ width: "max-content" }}
                  >
                    {visible.map((category, index) => {
                      const palette =
                        RING_PALETTE[index % RING_PALETTE.length];
                      return (
                        <div
                          key={category.id}
                          className="flex-shrink-0"
                        >
                          <Link
                            href={`/products?category=${
                              category.id ?? category.slug
                            }`}
                          >
                            <div className="relative group cursor-pointer active:scale-95 transition-transform duration-150">
                              <div
                                className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${palette.ring} p-0.5 ${palette.shadow} shadow-lg transition-all duration-300`}
                              >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2">
                                  {category.avatar ? (
                                    <img
                                      src={category.avatar}
                                      alt={category.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Tags className="w-1/2 h-1/2 text-voxcina-blue/40" />
                                  )}
                                </div>
                              </div>
                            </div>

                            <h3 className="text-center mt-2 text-xs font-medium text-gray-800 px-1 max-w-[5rem] truncate">
                              {category.name}
                            </h3>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ModernCategoriesSection;
