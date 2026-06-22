import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogClientContent from '@/components/blog/BlogClientContent';
import { BlogPost } from '@/types/blog';
import { serverFetchWithFallback, CACHE_TIMES } from '@/lib/server-api';

/**
 * Blog Listing Page - Server Component
 * 
 * Fetches blog posts on the server for SEO and passes to client component.
 * Requirements: 4.3, 6.1
 */
export default async function BlogPage() {
  // Fetch blog posts on the server using absolute URLs for Docker compatibility
  const response = await serverFetchWithFallback<{ data: BlogPost[] } | BlogPost[]>(
    '/api/blog-posts',
    { data: [] },
    { revalidate: CACHE_TIMES.BLOG_POST, tags: ['blog'] }
  );

  // Handle both array and paginated response formats
  const posts = Array.isArray(response) ? response : response.data || [];
  
  // Extract unique categories and tags from posts
  const categories = Array.from(new Set(posts.map((p) => p.category))).filter(Boolean).sort();
  const tags = Array.from(new Set(posts.flatMap((p) => p.tags || []))).filter(Boolean).sort();

  return (
    <>
      <Header />
      <section className="py-10">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 md:mb-4 text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-blue">
              بلاگ وکسینا
            </h1>
            <p className="mb-6 md:mb-8 text-sm md:text-lg text-gray-600">
              آخرین مقالات، راهنمای خرید و نکات کاربردی درباره مد و پوشاک
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container px-4 sm:px-6 md:px-8">
          <Suspense fallback={<BlogLoadingSkeleton />}>
            <BlogClientContent 
              initialPosts={posts}
              initialCategories={categories}
              initialTags={tags}
            />
          </Suspense>
        </div>
      </section>
      <Footer />
    </>
  );
}

function BlogLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        {/* Categories skeleton */}
        <div className="mb-6 md:mb-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="h-9 w-20 bg-gray-200 animate-pulse rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Posts skeleton */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          {/* Featured post */}
          <div className="col-span-1 sm:col-span-2">
            <div className="group relative overflow-hidden rounded-2xl bg-gray-200 h-[400px] animate-pulse" />
          </div>
          
          {/* Regular posts */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-gray-200 h-[320px] animate-pulse" />
          ))}
        </div>
      </div>

      {/* Sidebar skeleton */}
      <div className="mt-8 lg:mt-0 lg:col-span-4">
        <div className="space-y-6 md:space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl bg-gray-200 h-[200px] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
