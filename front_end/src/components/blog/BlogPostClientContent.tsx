'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BlogPost } from '@/data/blog';
import { CalendarIcon, ClockIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import RelatedPosts from '@/components/blog/RelatedPosts';
import BlogSidebar from '@/components/blog/BlogSidebar';

interface BlogPostClientContentProps {
  post: BlogPost;
  categories: string[];
  tags: string[];
}

export default function BlogPostClientContent({
  post,
  categories,
  tags,
}: BlogPostClientContentProps) {
  // Format date
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Scroll to top on post change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post.slug]);

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
                <div className="relative h-6 w-6 sm:h-8 sm:w-8 overflow-hidden rounded-full">
                  <Image
                    src={post.author.avatar || "/images/avatars/placeholder.jpg"}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 24px, 32px"
                  />
                </div>
                <span>{post.author.name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{formattedDate}</span>
              </div>
              
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
                <div className="relative h-[200px] sm:h-[300px] md:h-[400px] w-full overflow-hidden">
                  <Image
                    src={post.coverImage || "/images/blog/placeholder.jpg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                  />
                </div>
                
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
                  <div
                    className="prose prose-sm sm:prose-base lg:prose-lg prose-blue max-w-none prose-headings:text-voxcina-blue prose-a:text-primary-500 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  
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
                </div>
              </article>

              <RelatedPosts currentPost={post} />
            </div>

            <div className="mt-6 lg:mt-0 lg:col-span-4">
              <div className="sticky top-24">
                <BlogSidebar
                  posts={[post]} // Only need the current post, but could pass more
                  categories={categories}
                  tags={tags}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
} 