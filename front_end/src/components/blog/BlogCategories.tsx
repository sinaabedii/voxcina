import { useState } from 'react';
import { BlogPost } from '@/types/blog';

interface BlogCategoriesProps {
  posts: BlogPost[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function BlogCategories({
  posts,
  selectedCategory,
  onSelectCategory,
}: BlogCategoriesProps) {
  const categories = ['همه']
    .concat(
      Array.from(new Set(posts.map((post) => post.category)))
        .filter(Boolean)
        .sort()
    );

  return (
    <div className="mb-6 md:mb-8 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
      <div className="flex gap-1.5 sm:gap-2 min-w-max">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category === 'همه' ? null : category)}
            className={`whitespace-nowrap rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
              (category === 'همه' && selectedCategory === null) ||
              category === selectedCategory
                ? 'bg-voxcina-blue text-white'
                : 'bg-secondary-200 text-voxcina-blue hover:bg-secondary-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
} 