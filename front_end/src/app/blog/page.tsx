import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogClientContent from '@/components/blog/BlogClientContent';
import BlogListHero from '@/components/blog/BlogListHero';
import BlogListSchema from '@/components/SEO/BlogListSchema';
import type { BlogCategory, BlogPost } from '@/types/blog';
import { serverFetchWithFallback } from '@/lib/server-api';

/**
 * Blog Listing Page - Server Component
 *
 * Fetches blog posts on the server for SEO and passes to client component.
 * Uses revalidated server fetches so crawlers receive stable HTML without
 * waiting on the backend for every request.
 */
export const revalidate = 3600;

const BLOG_TITLE = 'بلاگ وکسینا | مقالات و راهنمای مد و پوشاک';
const BLOG_DESCRIPTION =
  'مقالات آموزشی و راهنمای خرید در زمینه مد و پوشاک، ترندهای روز، نگهداری لباس و معرفی محصولات.';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}): Promise<Metadata> {
  const { page, category, tag, search } = searchParams;
  const isFiltered = Boolean(category || tag || search);
  const canonicalPath = !isFiltered && page && page !== '1'
    ? `/blog?page=${encodeURIComponent(page)}`
    : '/blog';

  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    keywords: ['بلاگ', 'مقاله', 'راهنمای خرید', 'مد', 'پوشاک', 'ترندها', 'وکسینا'],
    alternates: {
      canonical: canonicalPath,
      languages: {
        'fa-IR': canonicalPath,
        'x-default': canonicalPath,
      },
    },
    openGraph: {
      type: 'website',
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      url: canonicalPath,
    },
    robots: isFiltered
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default async function BlogPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { page = '1', limit = '9', category, tag, search } = searchParams;

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('page', page);
  queryParams.set('limit', limit);
  if (category) queryParams.set('category', category);
  if (tag) queryParams.set('tag', tag);
  if (search) queryParams.set('search', search);

  // Fetch public blog data on the server. The client component receives this
  // data only for filtering and animation; the initial content is SSR HTML.
  const [postsResponse, blogCategories] = await Promise.all([
    serverFetchWithFallback<{
      data: BlogPost[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    } | BlogPost[]>(
      `/api/blog-posts?${queryParams.toString()}`,
      { data: [], total: 0, page: 1, limit: 9, totalPages: 0 },
      { revalidate: 3600, tags: ['blog'] }
    ),
    serverFetchWithFallback<BlogCategory[]>('/api/blog/categories', [], {
      revalidate: 3600,
      tags: ['blog-categories'],
    }),
  ]);

  // Handle both array and paginated response formats
  const posts = Array.isArray(postsResponse) ? postsResponse : postsResponse.data || [];
  const total = Array.isArray(postsResponse) ? postsResponse.length : postsResponse.total || 0;
  const currentPage = Array.isArray(postsResponse) ? 1 : postsResponse.page || 1;
  const currentLimit = Array.isArray(postsResponse) ? posts.length || 9 : postsResponse.limit || 9;
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

      <BlogListSchema
        posts={posts}
        page={currentPage}
        limit={currentLimit}
        total={total}
        canonicalPath={
          category || tag || search
            ? '/blog'
            : currentPage > 1
              ? `/blog?page=${currentPage}`
              : '/blog'
        }
      />

      <section className="pb-16 pt-2 sm:pb-20 md:pb-24">
        <div className="container px-4 sm:px-6 md:px-8">
          <Suspense fallback={<BlogLoadingSkeleton />}>
            <BlogClientContent
              initialPosts={posts}
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              initialCategories={blogCategories}
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
