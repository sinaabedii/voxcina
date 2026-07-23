import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogClientContent from '@/components/blog/BlogClientContent';
import BlogListHero from '@/components/blog/BlogListHero';
import { BlogPost } from '@/types/blog';
import { serverFetchWithFallback } from '@/lib/server-api';

/**
 * Blog Listing Page - Server Component
 *
 * Fetches blog posts on the server for SEO and passes to client component.
 * Uses dynamic rendering for real-time data.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BlogPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { page = '1', limit = '9', category, tag, search } = searchParams;

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('page', page);
  queryParams.set('limit', limit);
  if (category) queryParams.set('category', category);
  if (tag) queryParams.set('tag', tag);
  if (search) queryParams.set('search', search);

  // Fetch blog posts on the server
  const postsResponse = await serverFetchWithFallback<{ data: BlogPost[]; total: number; page: number; limit: number; totalPages: number } | BlogPost[]>(
    `/api/blog-posts?${queryParams.toString()}`,
    { data: [], total: 0, page: 1, limit: 9, totalPages: 0 },
    { revalidate: 0 }
  );

  // Handle both array and paginated response formats
  const posts = Array.isArray(postsResponse) ? postsResponse : postsResponse.data || [];
  const total = Array.isArray(postsResponse) ? postsResponse.length : postsResponse.total || 0;
  const currentPage = Array.isArray(postsResponse) ? 1 : postsResponse.page || 1;
  const totalPages = Array.isArray(postsResponse) ? 1 : postsResponse.totalPages || 1;

  return (
    <>
      <Header />
      <section className="relative overflow-hidden py-10 sm:py-14">
        <div className="container px-4 sm:px-6 md:px-8">
          <BlogListHero
            title="بلاگ وکسینا"
            subtitle="آخرین مقالات، راهنمای خرید و نکات کاربردی درباره مد و پوشاک"
          />
        </div>
      </section>

      <section className="pb-16 pt-2 sm:pb-20 md:pb-24">
        <div className="container px-4 sm:px-6 md:px-8">
          <Suspense fallback={<BlogLoadingSkeleton />}>
            <BlogClientContent
              initialPosts={posts}
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
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
    <div>
      <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center gap-4 sm:mb-10">
        <div className="h-12 w-full animate-pulse rounded-full bg-gray-200 sm:h-14" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-gray-200 sm:aspect-[3/4]"
          />
        ))}
      </div>
    </div>
  );
}
