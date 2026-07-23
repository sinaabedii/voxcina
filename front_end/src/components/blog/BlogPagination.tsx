'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | 'ellipsis';

/** Windows page numbers around the current page + always shows first/last, collapsing gaps into an ellipsis. */
function getPageList(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const keep = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: PageItem[] = [];
  let prev = 0;
  for (const page of sorted) {
    if (prev && page - prev > 1) result.push('ellipsis');
    result.push(page);
    prev = page;
  }
  return result;
}

export default function BlogPagination({ currentPage, totalPages, onPageChange }: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageList(currentPage, totalPages);

  return (
    <nav
      aria-label="صفحه‌بندی مقالات"
      className="mt-10 flex items-center justify-center gap-1.5 sm:mt-14 sm:gap-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="صفحه قبل"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-voxcina-blue shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-200 hover:shadow-medium disabled:pointer-events-none disabled:opacity-30 disabled:hover:translate-y-0 sm:h-11 sm:w-11"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-9 w-5 items-center justify-center text-sm text-gray-400 sm:h-11 sm:w-6"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 sm:h-11 sm:w-11 ${
              page === currentPage
                ? 'scale-105 bg-gradient-to-br from-voxcina-blue to-[#2a5490] text-white shadow-medium'
                : 'bg-white text-voxcina-blue shadow-soft hover:-translate-y-0.5 hover:bg-secondary-200 hover:shadow-medium'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="صفحه بعد"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-voxcina-blue shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-200 hover:shadow-medium disabled:pointer-events-none disabled:opacity-30 disabled:hover:translate-y-0 sm:h-11 sm:w-11"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </nav>
  );
}
