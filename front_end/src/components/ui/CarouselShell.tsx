"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface CarouselShellProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
  scrollerClassName?: string;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  isDragging?: boolean;
  onScrollNext?: () => void;
  onScrollPrev?: () => void;
  emptyState?: React.ReactNode;
  scrollerProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Generic horizontal scroller shell – arrows, edge fade, selection styling.
 * Used by ProductCarousel and Categories to avoid duplicating arrow/button markup.
 */
export default function CarouselShell({
  children,
  className,
  scrollerClassName,
  scrollerRef,
  isDragging,
  onScrollNext,
  onScrollPrev,
  emptyState,
  scrollerProps,
  ...rest
}: CarouselShellProps) {
  if (emptyState) {
    return <div className={cn("h-52 md:h-64 flex items-center justify-center", className)}>{emptyState}</div>;
  }

  const showArrows = Boolean(onScrollNext && onScrollPrev);

  return (
    <div className={cn("relative group/slider", className)}>
      {showArrows && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onScrollNext}
            className="hidden md:inline-flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue -translate-x-1/2"
            aria-label="بعدی"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onScrollPrev}
            className="hidden md:inline-flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue translate-x-1/2"
            aria-label="قبلی"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>
        </>
      )}

      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory select-none carousel-edge-mask",
          !isDragging && "scroll-smooth",
          scrollerClassName,
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: isDragging ? "grabbing" : "grab",
          // `pan-x` alone told the browser this element only pans horizontally,
          // so a vertical swipe that started on a card scrolled nothing at all
          // and the page felt frozen. Both axes stay native; the pointer
          // handlers still take over once a horizontal drag passes threshold.
          touchAction: "pan-x pan-y",
        }}
        {...scrollerProps}
      >
        {children}
      </div>
    </div>
  );
}
