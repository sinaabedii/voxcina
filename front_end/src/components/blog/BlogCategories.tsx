"use client";

import { useState, useEffect } from "react";
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

  return (
    <div className="mb-6 md:mb-8 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
      <div className="flex gap-1.5 sm:gap-2 min-w-max">
        {allCategories.map((category) => (
          <button
            key={category.id}
            onClick={() =>
              onSelectCategory(category.id === "all" ? null : category.name)
            }
            className={`whitespace-nowrap rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
              (category.id === "all" && selectedCategory === null) ||
              category.name === selectedCategory
                ? "bg-voxcina-blue text-white"
                : "bg-secondary-200 text-voxcina-blue hover:bg-secondary-300"
            }`}
          >
            {category.name}
            {category.postCount > 0 && (
              <span className="mr-1 text-xs opacity-70">({category.postCount})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
