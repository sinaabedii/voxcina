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
    <div className="w-full min-w-0 overflow-x-auto scrollbar-hide pb-1">
      <div className="flex w-max min-w-full justify-center gap-2">
        {allCategories.map((category) => (
          <button
            key={category.id}
            onClick={() =>
              onSelectCategory(category.id === "all" ? null : category.name)
            }
            className={`whitespace-nowrap rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
              (category.id === "all" && selectedCategory === null) ||
              category.name === selectedCategory
                ? "bg-voxcina-blue text-white shadow-medium"
                : "bg-white text-voxcina-blue shadow-soft hover:bg-secondary-200 hover:shadow-medium"
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
