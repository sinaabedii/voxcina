"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import Loading from "@/components/ui/Loading";
import ProductLightbox from "./ProductLightbox";
import {
  GALLERY_FRAME_HEIGHT,
  GALLERY_LAYOUT,
  GALLERY_RAIL,
  GALLERY_THUMB,
} from "./gallery-metrics";

/** Hover-revealed on desktop, always visible where there is no hover. */
const ARROW_BUTTON =
  "absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-card/80 p-3 text-primary shadow-soft transition-opacity duration-300 hover:bg-card md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";

/** How the visitor reached the image now on screen. Reported for analytics. */
export type ImageViewSource = "initial" | "navigation" | "arrow" | "keyboard" | "thumbnail" | "color_change";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  brand?: string;
  /** Fires when an image is committed to the main frame, with time on the previous one. */
  onImageView?: (view: { index: number; total: number; source: ImageViewSource; dwellMs: number }) => void;
  onZoomChange?: (zoomed: boolean, index: number) => void;
  className?: string;
}

/**
 * Product image gallery: main frame, thumbnail rail, hover magnifier, lightbox.
 *
 * The main image is this route's LCP element, which constrains two things:
 *
 * 1. The wrapper entrance is the CSS `animate-hero-rise` (transform only).
 *    An `opacity: 0` start — which is what a framer-motion entrance gives you —
 *    disqualifies the element as an LCP candidate until the library has
 *    downloaded and hydrated, so the paint the server already delivered would
 *    not count.
 * 2. Nothing is preloaded. `selected` moves the moment the visitor clicks (the
 *    thumbnail ring and the counter give instant feedback) while `displayed` is
 *    what is actually painted, and only advances once the target image has
 *    decoded. The gap between the two drives the loader overlay, and the target
 *    is fetched exactly once, on demand.
 */
export default function ProductGallery({
  images,
  productName,
  brand,
  onImageView,
  onZoomChange,
  className,
}: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
  const [isLightboxOpen, setLightboxOpen] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<ImageViewSource>("initial");
  const viewStartRef = useRef(0); // 0 = sentinel for the very first view
  // Mirrors `selected` so a late-finishing overlay can tell whether it is stale.
  const selectedRef = useRef(0);

  const total = images.length;
  const hasMultiple = total > 1;

  const select = useCallback((index: number, source: ImageViewSource) => {
    const next = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
    if (next === selectedRef.current) return;
    sourceRef.current = source;
    setSelected(next);
  }, [total]);

  // Reset when the colour changes: variant images come first in the list, so
  // index 0 is the new colour's hero shot. Both indices reset together — the
  // image paints immediately if cached, otherwise the overlay covers the swap.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    sourceRef.current = "color_change";
    setSelected(0);
    setDisplayed(0);
  }, [images]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Report time spent on the image the visitor just left.
  useEffect(() => {
    if (!total || !onImageView) return;
    const now = Date.now();
    const dwellMs = viewStartRef.current === 0 ? 0 : now - viewStartRef.current;
    viewStartRef.current = now;
    onImageView({ index: Math.min(selected, total - 1), total, source: sourceRef.current, dwellMs });
    sourceRef.current = "navigation";
  }, [selected, total, onImageView]);

  // Page-level arrow keys drive the gallery, but not while the lightbox has
  // them and not while the visitor is typing somewhere on the page.
  useEffect(() => {
    if (!hasMultiple || isLightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      // RTL page: ArrowLeft advances, matching where the chevrons point.
      if (event.key === "ArrowLeft") select(selectedRef.current + 1, "keyboard");
      if (event.key === "ArrowRight") select(selectedRef.current - 1, "keyboard");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, isLightboxOpen, select]);

  const commitPendingImage = (loadedIndex: number) => {
    if (selectedRef.current === loadedIndex) setDisplayed(loadedIndex);
  };

  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    // Magnifying follows a real cursor; on touch, the lightbox is the gesture.
    if (event.pointerType !== "mouse" || !frameRef.current) return;
    const { left, top, width, height } = frameRef.current.getBoundingClientRect();
    if (!zoomOrigin) onZoomChange?.(true, selected);
    setZoomOrigin({
      x: ((event.clientX - left) / width) * 100,
      y: ((event.clientY - top) / height) * 100,
    });
  };

  const clearZoom = () => {
    if (zoomOrigin) onZoomChange?.(false, selected);
    setZoomOrigin(null);
  };

  const selectedSrc = images[selected];
  const displayedSrc = images[Math.min(displayed, Math.max(total - 1, 0))];
  const isSwitching = !!selectedSrc && !!displayedSrc && selectedSrc !== displayedSrc;
  const altText = [productName, brand].filter(Boolean).join(" — ");

  if (!total) {
    return (
      <div className={cn(GALLERY_LAYOUT, className)}>
        <div
          className={cn(
            "flex w-full items-center justify-center rounded-2xl border border-border/15 bg-secondary/20 text-muted-foreground lg:flex-1 lg:min-w-0",
            GALLERY_FRAME_HEIGHT
          )}
        >
          بدون تصویر
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("animate-hero-rise", className)}>
        <div className={GALLERY_LAYOUT}>
          {hasMultiple && (
            <div className={GALLERY_RAIL} aria-label="تصاویر محصول">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-current={selected === index}
                  aria-label={`تصویر ${index + 1} از ${total}`}
                  className={cn(
                    GALLERY_THUMB,
                    "relative border transition-colors",
                    selected === index
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/20 bg-card hover:border-primary/50"
                  )}
                  onClick={() => select(index, "thumbnail")}
                >
                  <Image src={image} alt="" fill sizes="80px" className="object-contain" />
                </button>
              ))}
            </div>
          )}

          <div
            ref={frameRef}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl border border-border/15 bg-card shadow-soft lg:flex-1 lg:min-w-0",
              GALLERY_FRAME_HEIGHT
            )}
            onPointerMove={trackPointer}
            onPointerLeave={clearZoom}
          >
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in"
              onClick={() => {
                // Drop the hover magnifier before the overlay covers the frame,
                // otherwise it is still scaled when the visitor closes again.
                clearZoom();
                setLightboxOpen(true);
              }}
              aria-label={`بزرگ‌نمایی تصویر ${selected + 1} از ${total}`}
            >
              <Image
                src={displayedSrc}
                alt={altText}
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className={cn(
                  "object-contain transition-transform duration-300",
                  zoomOrigin && "scale-150"
                )}
                style={zoomOrigin ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` } : undefined}
                priority
              />
              {isSwitching && (
                <Image
                  key={selectedSrc}
                  src={selectedSrc}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-contain"
                  loading="eager"
                  onLoad={() => commitPendingImage(selected)}
                />
              )}
            </button>

            {isSwitching && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-[1px]">
                <Loading size="md" />
              </div>
            )}

            {hasMultiple && (
              <>
                {selected < total - 1 && (
                  <button
                    type="button"
                    aria-label="تصویر بعدی"
                    className={cn(ARROW_BUTTON, "left-4")}
                    onClick={() => select(selected + 1, "arrow")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {selected > 0 && (
                  <button
                    type="button"
                    aria-label="تصویر قبلی"
                    className={cn(ARROW_BUTTON, "right-4")}
                    onClick={() => select(selected - 1, "arrow")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                <span className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-primary/70 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                  {selected + 1} / {total}
                </span>
              </>
            )}

            <span className="pointer-events-none absolute bottom-4 right-4 z-10 hidden items-center gap-1.5 rounded-full bg-primary/70 px-3 py-1.5 text-xs text-white backdrop-blur-sm transition-opacity duration-300 md:flex md:opacity-0 md:group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" />
              برای نمای کامل کلیک کنید
            </span>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <ProductLightbox
          images={images}
          index={selected}
          productName={productName}
          onSelect={(index) => select(index, "thumbnail")}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
