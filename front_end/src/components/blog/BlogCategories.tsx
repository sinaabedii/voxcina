"use client";

import { useState, useEffect, useRef } from "react";
import { BlogCategory } from "@/types/blog";

interface BlogCategoriesProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const ALL_ITEM: BlogCategory = {
  id: "all",
  name: "همه",
  slug: "all",
  postCount: 0,
  isActive: true,
  order: -1,
  createdAt: "",
  updatedAt: "",
};

export default function BlogCategories({
  selectedCategory,
  onSelectCategory,
}: BlogCategoriesProps) {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/blog/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch {
        // silently fail
      }
    };
    fetchCategories();
  }, []);

  const allCategories = [ALL_ITEM, ...categories];

  const getButtonClassName = (category: BlogCategory) => {
    const isActive =
      (category.id === "all" && selectedCategory === null) ||
      category.name === selectedCategory;
    return `flex-shrink-0 whitespace-nowrap rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-voxcina-blue text-white shadow-medium"
        : "bg-white text-voxcina-blue shadow-soft hover:bg-secondary-200 hover:shadow-medium"
    }`;
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full">
        <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto scrollbar-hide overscroll-behavior-x-contain [mask-image:linear-gradient(to_right,transparent_4%,#000_20%,#000_80%,transparent_96%)] sm:[mask-image:linear-gradient(to_right,transparent_4%,#000_15%,#000_85%,transparent_96%)]"
      >
        <div className="flex gap-2 px-4 sm:px-6 py-1" style={{ width: "max-content" }}>
          {allCategories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                onSelectCategory(category.id === "all" ? null : category.name)
              }
              className={getButtonClassName(category)}
            >
              {category.name}
              {category.postCount > 0 && (
                <span className="mr-1 text-xs opacity-70">
                  ({category.postCount})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => scroll("left")}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-background/90 to-transparent p-2 rounded-r-full shadow-soft hover:bg-background transition-colors"
        aria-label="Scroll left"
      >
        <svg className="w-5 h-5 text-voxcina-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => scroll("right")}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-background/90 to-transparent p-2 rounded-l-full shadow-soft hover:bg-background transition-colors"
        aria-label="Scroll right"
      >
        <svg className="w-5 h-5 text-voxcina-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}