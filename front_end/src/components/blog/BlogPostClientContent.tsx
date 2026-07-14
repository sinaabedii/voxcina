'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BlogPost, BlogBlock } from '@/types/blog';
import { CalendarIcon, ClockIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import RelatedPosts from '@/components/blog/RelatedPosts';
import BlogSidebar from '@/components/blog/BlogSidebar';

interface BlogPostClientContentProps {
  post: BlogPost;
}

/**
 * Blog Post Client Content Component
 * 
 * Renders structured blog post with typed blocks.
 * No dangerouslySetInnerHTML - all content is rendered through typed components.
 */
export default function BlogPostClientContent({ post }: BlogPostClientContentProps) {
  // Format date
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Scroll to top on post change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post.slug]);

  // Generate table of contents from headings
  const toc = post.blocks?.filter(
    (block) => block.type === 'header' || block.type === 'section' || block.type === 'subsection'
  );

  return (
    <>
      <section className="bg-secondary-100 py-8 md:py-12 lg:py-16">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 md:mb-4 flex flex-wrap items-center gap-2 md:gap-3 text-xs sm:text-sm text-gray-600">
              <Link
                href="/blog"
                className="flex items-center gap-1 hover:text-voxcina-blue"
              >
                <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>بازگشت به بلاگ</span>
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                href={`/blog?category=${encodeURIComponent(post.category)}`}
                className="rounded-full bg-secondary-200 px-2 sm:px-3 py-1 text-xs font-medium text-voxcina-blue hover:bg-secondary-300"
              >
                {post.category}
              </Link>
            </div>
            
            <h1 className="mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-voxcina-blue">
              {post.title}
            </h1>
            
            <div className="mb-4 md:mb-6 flex flex-wrap items-center gap-3 md:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                {post.authorSnapshot?.avatar && (
                  <div className="relative h-6 w-6 sm:h-8 sm:w-8 overflow-hidden rounded-full">
                    <Image
                      src={post.authorSnapshot.avatar}
                      alt={post.authorSnapshot.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 24px, 32px"
                    />
                  </div>
                )}
                <span>{post.authorSnapshot?.name || 'تیم وکسینا'}</span>
              </div>
              
              {formattedDate && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{formattedDate}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{post.readTime} دقیقه مطالعه</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 lg:py-12">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <article className="overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-soft">
                {/* Cover Image */}
                {post.coverImage && (
                  <div className="relative h-[200px] sm:h-[300px] md:h-[400px] w-full overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                    />
                  </div>
                )}
                
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
                  {/* Render Blocks */}
                  <div className="space-y-6">
                    {post.blocks?.map((block, index) => (
                      <BlogBlock key={block.id || index} block={block} />
                    ))}
                  </div>
                  
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-6 sm:mt-8 flex flex-wrap gap-2">
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
                </div>
              </article>

              <RelatedPosts currentPost={post} />
            </div>

            <div className="mt-6 lg:mt-0 lg:col-span-4">
              <div className="sticky top-24">
                <BlogSidebar
                  categories={[]}
                  tags={post.tags || []}
                  totalPosts={0}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * BlogBlock renders a single content block
 */
function BlogBlock({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'title':
      return (
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-blue leading-tight">
          {block.text}
        </h1>
      );

    case 'header':
      return (
        <h2 className="text-2xl md:text-3xl font-bold text-voxcina-blue mt-8 mb-4">
          {block.text}
        </h2>
      );

    case 'section':
      return (
        <h3 className="text-xl md:text-2xl font-bold text-voxcina-blue mt-6 mb-3">
          {block.text}
        </h3>
      );

    case 'subsection':
      return (
        <h4 className="text-lg md:text-xl font-bold text-voxcina-blue mt-4 mb-2">
          {block.text}
        </h4>
      );

    case 'text':
      return (
        <p className="text-gray-900 leading-relaxed text-base md:text-lg">
          {block.text}
        </p>
      );

    case 'image':
      return (
        <figure className="my-6">
          {block.imageID ? (
            <>
              <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-xl overflow-hidden">
                <Image
                  src={block.imageID}
                  alt={block.alt || 'article image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                />
              </div>
              {block.caption && (
                <figcaption className="text-sm text-gray-600 mt-2 text-center">
                  {block.caption}
                </figcaption>
              )}
            </>
          ) : (
            <div className="bg-gray-200 h-[300px] sm:h-[400px] md:h-[500px] rounded-xl flex items-center justify-center text-gray-500">
              Image not uploaded
            </div>
          )}
        </figure>
      );

    default:
      return null;
  }
}
