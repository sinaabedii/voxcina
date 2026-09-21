"use client";

import type { CSSProperties } from "react";
import {
  GALLERY_FRAME_HEIGHT,
  GALLERY_LAYOUT,
  GALLERY_RAIL,
  GALLERY_SKELETON_THUMBS,
  GALLERY_THUMB,
} from "@/components/product/detail/gallery-metrics";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeMap = {
  sm: { container: "w-8 h-8", dot: "w-1.5 h-1.5" },
  md: { container: "w-12 h-12", dot: "w-2 h-2" },
  lg: { container: "w-16 h-16", dot: "w-2.5 h-2.5" },
  xl: { container: "w-20 h-20", dot: "w-3 h-3" },
};

export default function Loading({ size = "md", text, fullScreen, overlay }: LoadingProps) {
  const { container, dot } = sizeMap[size];

  const Spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className={`${container} relative`}>
        {/* Outer rotating ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20 animate-loading-ring"
          style={{ borderTopColor: "transparent", borderRightColor: "transparent" }}
        />
        
        {/* Inner pulsing ring */}
        <div
          className="absolute inset-1 rounded-full border-2 border-voxcina-blue/40 dark:border-voxcina-cream/40 animate-loading-ring-reverse"
          style={{ borderBottomColor: "transparent", borderLeftColor: "transparent" }}
        />

        {/* Center dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${dot} rounded-full bg-voxcina-blue dark:bg-voxcina-cream animate-loading-dot`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {text && (
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium animate-loading-text">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {Spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-inherit">
        {Spinner}
      </div>
    );
  }

  return Spinner;
}

// Inline loading for buttons
export function ButtonLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dot-fast"
          style={{ animationDelay: `${i * 0.1}s`, "--loading-dot-min": 0.4 } as CSSProperties}
        />
      ))}
    </div>
  );
}

// Page loading skeleton
export function PageLoading({ text = "در حال بارگذاری..." }: { text?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}

// Card skeleton for product grids. Mirrors ProductCard's proportions so the
// real cards do not shift the layout when they replace the placeholders.
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card animate-pulse">
      <div className="aspect-[4/5] bg-muted" />
      <div className="space-y-3 p-3 sm:p-4">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-5 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

// Grid skeleton for product lists. Keep the column map in sync with
// components/product/ProductGrid.tsx.
export function ProductGridSkeleton({
  count = 10,
  columns = 5,
}: {
  count?: number;
  columns?: 2 | 3 | 4 | 5;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-3 sm:gap-4 md:gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Image loading skeleton for product gallery
export function ImageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-muted animate-pulse flex items-center justify-center ${className}`}>
      <Loading size="md" />
    </div>
  );
}

// Product detail skeleton.
//
// This is a *streaming* Suspense fallback: Next flushes it with the shell, the
// browser paints it, and React then swaps the real markup in via $RC. Whatever
// height difference exists between fallback and content is paid as a layout
// shift. The generic PageLoading spinner reserved min-h-[60vh] and then
// collapsed to nothing, which measured CLS 0.30 on this route (Lighthouse,
// mobile) — poor, and almost all of the route's CLS.
//
// So the geometry below mirrors the real gallery. The frame height, the shell
// and the rail come from `product/detail/gallery-metrics`, which both sides
// import so they cannot drift; the info column is hand-matched to
// `ProductPurchasePanel` and needs updating when that layout changes.
export function ProductDetailSkeleton() {
  return (
    <div className="container py-8 md:py-16" aria-hidden="true">
      <div className="mb-6 h-5 w-2/3 max-w-md rounded bg-muted animate-pulse" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-12">
        {/* Gallery — same shell, rail and frame height as ProductGallery */}
        <div className={GALLERY_LAYOUT}>
          <div className={GALLERY_RAIL}>
            {Array.from({ length: GALLERY_SKELETON_THUMBS }).map((_, i) => (
              <div key={i} className={`${GALLERY_THUMB} bg-muted animate-pulse`} />
            ))}
          </div>
          <div
            className={`w-full rounded-2xl bg-muted animate-pulse lg:flex-1 ${GALLERY_FRAME_HEIGHT}`}
          />
        </div>

        {/* Purchase panel — title, brand row, price, selectors, actions, badges */}
        <div>
          <div className="mb-3 h-8 w-4/5 rounded bg-muted animate-pulse" />
          <div className="mb-5 h-6 w-1/2 rounded bg-muted animate-pulse" />
          <div className="mb-6 h-9 w-2/5 rounded bg-muted animate-pulse" />

          <div className="mb-6">
            <div className="mb-2 h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </div>

          <div className="mb-6 h-6 w-2/5 rounded bg-muted animate-pulse" />

          <div className="mb-3 flex gap-3">
            <div className="h-12 w-32 rounded-xl bg-muted animate-pulse" />
            <div className="h-12 flex-1 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="mb-8 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Info tabs */}
      <div className="mt-12 h-64 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}

// Listing-page skeleton (products, categories, collections).
//
// Same reasoning as ProductDetailSkeleton: these are streamed Suspense
// fallbacks, so a short spinner that collapses when the grid arrives is paid
// as CLS. A grid of CardSkeletons is roughly the height of the real listing.
export function ProductListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="container py-8" aria-hidden="true">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-9 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
      </div>
      <ProductGridSkeleton count={count} />
    </div>
  );
}
