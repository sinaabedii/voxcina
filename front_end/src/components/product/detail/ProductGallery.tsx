"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ImageIcon, ZoomIn } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
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
  "absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-voxcina-lightCream/90 p-3 text-voxcina-blue shadow-soft transition-opacity duration-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue motion-reduce:transition-none lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100";

/** How the visitor reached the image now on screen. Reported for analytics. */
export type ImageViewSource = "initial" | "navigation" | "arrow" | "keyboard" | "thumbnail" | "color_change" | "swipe";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  brand?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  backHref: string;
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
  isFavorite,
  onToggleFavorite,
  backHref,
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

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
      if (target?.closest("input, textarea, select, button, a, [role='tab'], [contenteditable='true']")) return;
      // RTL page: ArrowLeft advances, matching where the chevrons point.
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        select(selectedRef.current + (event.key === "ArrowLeft" ? 1 : -1), "keyboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, isLightboxOpen, select]);

  const commitPendingImage = (loadedIndex: number) => {
    if (selectedRef.current === loadedIndex) setDisplayed(loadedIndex);
  };

  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    // Magnifying follows a real cursor; on touch, the lightbox is the gesture.
    if (event.pointerType !== "mouse" || !frameRef.current || !window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) return;
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
  const galleryActions = (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-5">
      <Link href={backHref} aria-label="بازگشت به محصولات" className="pointer-events-auto flex size-11 items-center justify-center rounded-xl border border-white/50 bg-voxcina-lightCream/80 text-voxcina-blue backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-blue">
        <ArrowRight className="size-5" />
      </Link>
      <button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"} aria-pressed={isFavorite} className="pointer-events-auto flex size-11 items-center justify-center rounded-xl border border-white/50 bg-voxcina-lightCream/80 text-voxcina-blue backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-voxcina-blue">
        <Heart className="size-5" fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );

  if (!total) {
    return (
      <div className={cn("min-w-0 lg:bg-voxcina-lightCream lg:p-4", className)}>
        <div
          className={cn(
            "relative flex w-full flex-col items-center justify-center gap-3 rounded-b-[28px] bg-voxcina-cream text-voxcina-blue/50 lg:rounded-2xl",
            GALLERY_FRAME_HEIGHT
          )}
        >
          {galleryActions}
          <ImageIcon className="size-10" strokeWidth={1} />
          بدون تصویر
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("min-w-0 lg:bg-voxcina-lightCream lg:p-4", className)}>
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
                       ? "border-voxcina-blue ring-2 ring-voxcina-blue/20"
                       : "border-voxcina-blue/10 bg-voxcina-cream hover:border-voxcina-blue/50"
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
               "group relative w-full overflow-hidden rounded-b-[28px] bg-voxcina-cream lg:min-w-0 lg:flex-1 lg:rounded-2xl",
              GALLERY_FRAME_HEIGHT
            )}
            onPointerMove={trackPointer}
            onPointerLeave={clearZoom}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              touchStartRef.current = { x: touch.clientX, y: touch.clientY };
              swipedRef.current = false;
            }}
            onTouchEnd={(event) => {
              const start = touchStartRef.current;
              touchStartRef.current = null;
              if (!start || !hasMultiple) return;
              const touch = event.changedTouches[0];
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
              swipedRef.current = true;
              select(selectedRef.current + (dx > 0 ? 1 : -1), "swipe");
            }}
          >
            {galleryActions}
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in"
              onClick={() => {
                if (swipedRef.current) return;
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
                  "object-contain transition-transform duration-300 motion-reduce:transition-none",
                  zoomOrigin && "scale-150"
                )}
                style={zoomOrigin ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` } : undefined}
                 loading="eager"
                 fetchPriority="high"
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
               <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-voxcina-cream/70 backdrop-blur-[1px]">
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
               </>
             )}

            <span aria-live="polite" aria-atomic="true" className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full bg-voxcina-lightCream/95 px-3 py-1.5 text-xs tabular-nums text-voxcina-blue" dir="ltr">
              <span className="sr-only">تصویر </span>{toPersianNumber(selected + 1)} / {toPersianNumber(total)}
            </span>

            {hasMultiple && (
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 lg:hidden" aria-label="انتخاب تصویر">
                {images.slice(Math.max(0, Math.min(selected - 2, total - 5)), Math.max(0, Math.min(selected - 2, total - 5)) + 5).map((image, offset) => {
                  const index = Math.max(0, Math.min(selected - 2, total - 5)) + offset;
                  return <button key={`${image}-${index}`} type="button" aria-label={`نمایش تصویر ${toPersianNumber(index + 1)}`} aria-current={selected === index} onClick={() => select(index, "thumbnail")} className="flex h-11 w-6 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue"><span className={cn("h-1 rounded-full transition-all motion-reduce:transition-none", selected === index ? "w-5 bg-voxcina-blue" : "w-2 bg-voxcina-blue/30")} /></button>;
                })}
              </div>
            )}

            <span className="pointer-events-none absolute bottom-4 left-4 z-10 hidden items-center gap-1.5 rounded-full bg-voxcina-blue/80 px-3 py-1.5 text-xs text-voxcina-cream backdrop-blur-sm transition-opacity duration-300 lg:flex lg:opacity-0 lg:group-hover:opacity-100">
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
