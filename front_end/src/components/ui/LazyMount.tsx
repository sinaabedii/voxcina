"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  /** Rendered once the placeholder comes within `rootMargin` of the viewport. */
  children: ReactNode;
  /** Shown until then. Give it the real height to avoid a layout shift. */
  fallback?: ReactNode;
  /** How early to mount. Defaults to 600px ahead of the viewport. */
  rootMargin?: string;
  className?: string;
}

/**
 * Defers mounting a subtree until it is near the viewport.
 *
 * `next/dynamic` alone only code-splits: the chunk still downloads and evaluates
 * as soon as the page mounts, so a heavy below-the-fold widget competes with the
 * LCP element for the main thread. Pairing `dynamic()` with this keeps it off
 * the critical path entirely. Falls back to mounting immediately where
 * IntersectionObserver is unavailable, so nothing is ever unreachable.
 */
export default function LazyMount({
  children,
  fallback = null,
  rootMargin = "600px 0px",
  className,
}: LazyMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) {
      setIsMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {isMounted ? children : fallback}
    </div>
  );
}
