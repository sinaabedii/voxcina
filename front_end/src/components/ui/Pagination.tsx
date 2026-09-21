"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn, toPersianNumber } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const WINDOW_SIZE = 5;

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(
    1,
    Math.min(page - Math.floor(WINDOW_SIZE / 2), totalPages - (WINDOW_SIZE - 1)),
  );
  const end = Math.min(totalPages, start + WINDOW_SIZE - 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * Numbered RTL pagination (previous = ChevronRight). Renders nothing for a
 * single page so callers can drop it into a footer unconditionally.
 */
export default function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className={cn("flex justify-center", className)} aria-label="صفحه‌بندی">
      <div className="flex items-center gap-1 rounded-xl border border-voxcina-cream bg-voxcina-cream/30 p-1 dark:border-voxcina-blue/20 dark:bg-voxcina-blue/20">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="صفحه قبلی"
          className="rounded-lg text-voxcina-blue dark:text-voxcina-cream"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {pageWindow(page, totalPages).map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === page ? "primary" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
            className={cn(
              "min-w-9 rounded-lg",
              pageNumber !== page && "text-voxcina-blue dark:text-voxcina-cream",
            )}
          >
            {toPersianNumber(pageNumber)}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="صفحه بعدی"
          className="rounded-lg text-voxcina-blue dark:text-voxcina-cream"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
