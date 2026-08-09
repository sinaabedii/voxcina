"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { BlogPost } from "@/types/blog";
import BlogHero from "@/components/blog/BlogHero";
import ReadingProgressBar from "@/components/blog/ReadingProgressBar";
import ArticleTOC from "@/components/blog/ArticleTOC";
import BlogBlockRenderer from "@/components/blog/BlogBlockRenderer";
import RelatedPosts from "@/components/blog/RelatedPosts";
import BlogSidebar from "@/components/blog/BlogSidebar";

interface BlogPostClientContentProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
  categories: string[];
}

/**
 * Blog Post Detail Page content.
 *
 * Composes the GSAP-driven hero, reading progress bar, scroll-spy table of
 * contents and the animated block renderer around the post's dynamic,
 * block-based content. No dangerouslySetInnerHTML — all content still flows
 * through typed block components.
 */
export default function BlogPostClientContent({ post, relatedPosts, categories }: BlogPostClientContentProps) {
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post.slug]);

  return (
    <>
      <BlogHero post={post} />
      <ReadingProgressBar articleRef={articleRef} />

      <section className="py-6 md:py-8 lg:py-12">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <article
                ref={articleRef}
                className="overflow-hidden rounded-xl bg-white p-4 shadow-soft sm:rounded-2xl sm:p-6 md:p-8 lg:p-10"
              >
                <BlogBlockRenderer blocks={post.blocks || []} />

                {post.tags && post.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="rounded-full bg-secondary-200 px-3 py-1 text-xs font-medium text-voxcina-blue transition-colors hover:bg-secondary-300"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}
              </article>

              <RelatedPosts relatedPosts={relatedPosts} />
            </div>

            <div className="mt-6 min-w-0 lg:mt-0 lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <ArticleTOC blocks={post.blocks || []} />
                <BlogSidebar posts={[post, ...relatedPosts]} categories={categories} tags={post.tags || []} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
