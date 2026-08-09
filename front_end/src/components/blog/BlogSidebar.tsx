"use client";

import { useRef } from "react";
import Link from "next/link";
import { BlogPost } from "@/types/blog";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import BlogCard from "./BlogCard";

interface BlogSidebarProps {
  posts: BlogPost[];
  categories: string[];
  tags: string[];
}

export default function BlogSidebar({
  posts,
  categories,
  tags,
}: BlogSidebarProps) {
  const popularPosts = posts.slice(0, 4);
  const listRef = useRef<HTMLDivElement>(null);
  useScrollReveal(listRef, {
    selector: "[data-reveal-item]",
    y: 16,
    stagger: 0.06,
    deps: [popularPosts.map((p) => p.id).join(",")],
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-soft">
        <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-voxcina-blue">
          دسته‌بندی‌ها
        </h3>
        <div className="space-y-1 sm:space-y-2">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/blog?category=${encodeURIComponent(category)}`}
              className="block py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 transition-colors hover:text-voxcina-blue"
            >
              {category}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-soft">
        <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-voxcina-blue">
          مقالات محبوب
        </h3>
        <div ref={listRef} className="space-y-3 sm:space-y-4">
          {popularPosts.map((post) => (
            <div key={post.id} data-reveal-item>
              <BlogCard post={post} variant="compact" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-soft">
        <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-voxcina-blue">برچسب‌ها</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-secondary-200 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-voxcina-blue transition-colors hover:bg-secondary-300"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl sm:rounded-2xl bg-voxcina-blue p-4 sm:p-6 shadow-soft">
        <h3 className="mb-1 sm:mb-2 text-base sm:text-lg font-bold text-white">خبرنامه وکسینا</h3>
        <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-white/80">
          برای دریافت آخرین مقالات و اخبار در خبرنامه ما عضو شوید.
        </p>
        <form className="space-y-2 sm:space-y-3">
          <input
            type="email"
            placeholder="ایمیل خود را وارد کنید"
            className="w-full rounded-lg border-0 bg-white/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-voxcina-blue transition-colors hover:bg-secondary-200"
          >
            عضویت
          </button>
        </form>
      </div>
    </div>
  );
}
