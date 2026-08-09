'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import BlogCard from './BlogCard';
import BlogCategories from './BlogCategories';
import BlogSearch from './BlogSearch';
import BlogPagination from './BlogPagination';
import type { BlogCategory, BlogPost } from '@/types/blog';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface BlogClientContentProps {
  /** Initial posts fetched on the server for SSR */
  initialPosts?: BlogPost[];
  /** Current page number */
  currentPage?: number;
  /** Total pages */
  totalPages?: number;
  /** Total posts count */
  total?: number;
  /** Categories fetched on the server for the initial HTML */
  initialCategories?: BlogCategory[];
}

/**
 * Blog Client Content Component
 *
 * Handles interactive filtering and search for blog posts.
 * Uses server-side filtering via URL parameters.
 */
export default function BlogClientContent({
  initialPosts = [],
  currentPage = 1,
  totalPages = 1,
  total = 0,
  initialCategories,
}: BlogClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );

  const gridRef = useRef<HTMLDivElement>(null);
  useScrollReveal(gridRef, {
    selector: '[data-reveal-item]',
    deps: [initialPosts.map((p) => p.id).join(',')],
  });

  // Update URL when filters change
  const updateFilters = useCallback((filters: { category?: string | null; search?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.category !== undefined) {
      if (filters.category) {
        params.set('category', filters.category);
      } else {
        params.delete('category');
      }
    }

    if (filters.search !== undefined) {
      if (filters.search) {
        params.set('search', filters.search);
      } else {
        params.delete('search');
      }
    }

    if (filters.page && filters.page > 1) {
      params.set('page', filters.page.toString());
    } else {
      params.delete('page');
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    updateFilters({ category, page: 1 });
  };

  const handleSearch = (term: string) => {
    updateFilters({ search: term, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    if (typeof window !== 'undefined' && gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center gap-4 sm:mb-10">
        <BlogSearch onSearch={handleSearch} initialValue={searchParams.get('search') || ''} />
        <BlogCategories
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          initialCategories={initialCategories}
        />
      </div>

      {total > 0 && (
        <p className="mb-6 text-center text-sm text-gray-500 sm:mb-8">
          {total} مقاله
        </p>
      )}

      {initialPosts.length > 0 ? (
        <>
          <div
            ref={gridRef}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
          >
            {initialPosts.map((post) => (
              <div key={post.id} data-reveal-item>
                <BlogCard post={post} variant="grid" />
              </div>
            ))}
          </div>

          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center shadow-soft sm:p-14">
          <h3 className="mb-2 text-xl font-bold text-voxcina-blue">
            مقاله‌ای یافت نشد!
          </h3>
          <p className="text-sm text-gray-600 md:text-base">
            با معیارهای جستجوی فعلی هیچ مقاله‌ای یافت نشد. لطفاً جستجوی
            دیگری را امتحان کنید.
          </p>
        </div>
      )}
    </>
  );
}
