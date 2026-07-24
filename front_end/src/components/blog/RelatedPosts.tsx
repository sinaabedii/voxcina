"use client";

import { useRef } from "react";
import { BlogPost } from "@/types/blog";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import BlogCard from "./BlogCard";

interface RelatedPostsProps {
  relatedPosts: BlogPost[];
}

/**
 * Renders posts computed server-side (see src/app/blog/[slug]/page.tsx) so the
 * related-articles links are present in the initial SSR HTML for crawlers,
 * instead of appearing only after a client-side fetch.
 */
export default function RelatedPosts({ relatedPosts }: RelatedPostsProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  useScrollReveal(gridRef, {
    selector: "[data-reveal-item]",
    deps: [relatedPosts.map((p) => p.id).join(",")],
  });

  if (relatedPosts.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12 py-6 md:py-8 border-t border-gray-100">
      <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-bold text-voxcina-blue">مقالات مرتبط</h2>
      <div ref={gridRef} className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {relatedPosts.map((post) => (
          <div key={post.id} data-reveal-item>
            <BlogCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
