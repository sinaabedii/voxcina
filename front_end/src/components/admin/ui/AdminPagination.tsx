"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Standard numbered admin pagination (RTL: previous = ChevronRight).
 */
export default function AdminPagination({ page, totalPages, onChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/20 rounded-xl p-1 shadow-sm border border-voxcina-cream dark:border-voxcina-blue/20">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="صفحه قبلی"
          className="rounded-lg text-voxcina-blue dark:text-voxcina-cream"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        {pageWindow(page, totalPages).map((p) => (
          <Button
            key={p}
            variant={p === page ? "primary" : "ghost"}
            size="sm"
            onClick={() => onChange(p)}
            className={cn(
              "rounded-lg min-w-9",
              p !== page && "text-voxcina-blue dark:text-voxcina-cream"
            )}
          >
            {p.toLocaleString("fa-IR")}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="صفحه بعدی"
          className="rounded-lg text-voxcina-blue dark:text-voxcina-cream"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
