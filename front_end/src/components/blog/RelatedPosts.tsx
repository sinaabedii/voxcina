"use client";

import { useEffect, useRef, useState } from "react";
import { BlogPost } from "@/types/blog";
import { useBlogStore } from "@/store/blog-store";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import BlogCard from "./BlogCard";

interface RelatedPostsProps {
  currentPost: BlogPost;
}

export default function RelatedPosts({ currentPost }: RelatedPostsProps) {
  const { posts, fetchPosts } = useBlogStore();
  const [related, setRelated] = useState<BlogPost[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  useScrollReveal(gridRef, {
    selector: "[data-reveal-item]",
    deps: [related.map((p) => p.id).join(",")],
  });

  useEffect(() => {
    // Ensure we have posts
    if (posts.length === 0) {
      fetchPosts().then(() => {
        computeRelated();
      });
    } else {
      computeRelated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, currentPost]);

  const computeRelated = () => {
    const relatedPosts = posts
      .filter(
        (post) =>
          post.id !== currentPost.id &&
          (post.category === currentPost.category ||
            post.tags.some((tag) => currentPost.tags.includes(tag)))
      )
      .slice(0, 3);
    setRelated(relatedPosts);
  };

  if (related.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12 py-6 md:py-8 border-t border-gray-100">
      <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-bold text-voxcina-blue">مقالات مرتبط</h2>
      <div ref={gridRef} className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <div key={post.id} data-reveal-item>
            <BlogCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
} 