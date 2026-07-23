'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import BlogCard from './BlogCard';
import BlogCategories from './BlogCategories';
import BlogSearch from './BlogSearch';
import BlogSidebar from './BlogSidebar';
import { BlogPost } from '@/types/blog';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface BlogClientContentProps {
  /** Initial posts fetched on the server for SSR */
  initialPosts?: BlogPost[];
  /** Initial categories extracted from posts */
  initialCategories?: string[];
  /** Initial tags extracted from posts */
  initialTags?: string[];
  /** Current page number */
  currentPage?: number;
  /** Total pages */
  totalPages?: number;
  /** Total posts count */
  total?: number;
}

/**
 * Blog Client Content Component
 * 
 * Handles interactive filtering and search for blog posts.
 * Uses server-side filtering via URL parameters.
 */
export default function BlogClientContent({
  initialPosts = [],
  initialCategories = [],
  initialTags = [],
  currentPage = 1,
  totalPages = 1,
  total = 0,
}: BlogClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const gridRef = useRef<HTMLDivElement>(null);
  useScrollReveal(gridRef, {
    selector: '[data-reveal-item]',
    deps: [initialPosts.map((p) => p.id).join(',')],
  });

  // Update URL when filters change
  const updateFilters = useCallback((filters: { category?: string | null; tag?: string; search?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.category !== undefined) {
      if (filters.category) {
        params.set('category', filters.category);
      } else {
        params.delete('category');
      }
    }

    if (filters.tag) {
      params.set('tag', filters.tag);
    } else {
      params.delete('tag');
    }

    if (filters.search !== undefined) {
      if (filters.search) {
        params.set('search', filters.search);
      } else {
        params.delete('search');
      }
    }

    if (filters.page) {
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
    setSearchTerm(term);
    updateFilters({ search: term, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  return (
    <>
      <div className="mx-auto max-w-3xl mb-8">
        <BlogSearch onSearch={handleSearch} />
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <BlogCategories
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>

          {initialPosts.length > 0 ? (
            <>
              <div ref={gridRef} className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                {initialPosts.map((post, index) => (
                  <div
                    key={post.id}
                    data-reveal-item
                    className={index === 0 ? "col-span-1 sm:col-span-2" : ""}
                  >
                    <BlogCard
                      post={post}
                      variant={index === 0 ? "featured" : "default"}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  aria-label="صفحه‌بندی مقالات"
                  className="mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
                >
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-sm disabled:opacity-40 sm:h-10 sm:w-10"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="صفحه قبل"
                  >
                    ›
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm sm:h-10 sm:w-10 ${
                        page === currentPage
                          ? "bg-voxcina-blue text-white"
                          : "bg-gray-200"
                      }`}
                      onClick={() => handlePageChange(page)}
                      disabled={page === currentPage}
                      aria-current={page === currentPage ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-sm disabled:opacity-40 sm:h-10 sm:w-10"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="صفحه بعد"
                  >
                    ‹
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-white p-6 md:p-8 text-center shadow-soft">
              <h3 className="mb-2 text-xl font-bold text-voxcina-blue">
                مقالهای یافت نشد!
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                با معیارهای جستجوی فعلی هیچ مقالهای یافت نشد. لطفاً جستجوی
                دیگری را امتحان کنید.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 lg:mt-0 lg:col-span-4">
          <div className="sticky top-24">
            <BlogSidebar 
              posts={initialPosts}
              categories={initialCategories} 
              tags={initialTags}
            />
          </div>
        </div>
      </div>
    </>
  );
}
