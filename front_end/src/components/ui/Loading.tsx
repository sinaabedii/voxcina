"use client";

import { motion } from "framer-motion";

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
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20"
          style={{ borderTopColor: "transparent", borderRightColor: "transparent" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner pulsing ring */}
        <motion.div
          className="absolute inset-1 rounded-full border-2 border-voxcina-blue/40 dark:border-voxcina-cream/40"
          style={{ borderBottomColor: "transparent", borderLeftColor: "transparent" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Center dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`${dot} rounded-full bg-voxcina-blue dark:bg-voxcina-cream`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      </div>

      {text && (
        <motion.p
          className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
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
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
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
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
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
