"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductLightboxProps {
  images: string[];
  index: number;
  productName: string;
  onSelect: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen image viewer for the product gallery.
 *
 * Loaded on demand (`next/dynamic` in `ProductGallery`) and only mounted while
 * open, so neither its markup nor its handlers are on the path to the LCP
 * paint. It is deliberately not built on `ui/Modal`: that renders a bounded
 * card with a title bar, and this is a bleed-to-edge viewer.
 *
 * Rendered through a portal into `document.body`, which is load-bearing rather
 * than stylistic. `position: fixed` resolves against the nearest ancestor that
 * has a transform, and the gallery's `.animate-hero-rise` entrance is declared
 * `animation-fill-mode: both` — so after it finishes the element keeps the last
 * keyframe's `transform: none`, which computes to the *identity matrix*, not to
 * `none`. That is enough to make it a containing block, and without the portal
 * this overlay laid itself out inside the gallery column (752x676 instead of
 * the full 1440x757 viewport) rather than over the page.
 */
export default function ProductLightbox({
  images,
  index,
  productName,
  onSelect,
  onClose,
}: ProductLightboxProps) {
  // RTL page, so ArrowLeft advances and ArrowRight goes back — the same
  // direction the on-image chevrons point.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onSelect(Math.min(index + 1, images.length - 1));
      if (event.key === "ArrowRight") onSelect(Math.max(index - 1, 0));
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [images.length, index, onSelect, onClose]);

  // Lock the page behind the overlay. Hiding the scrollbar widens the viewport,
  // which visibly jolts every centred element on the page, so give the width
  // back as padding for as long as the lock is in place.
  useEffect(() => {
    const { body, documentElement } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`گالری تصاویر ${productName}`}
      className="animate-fadeIn fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/90 p-4 pt-16 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute left-4 top-4 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onClose}
        aria-label="بستن"
      >
        <X className="h-7 w-7" />
      </button>

      <div
        className="relative min-h-0 w-full max-w-5xl flex-1"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={images[index] || ""}
          alt={`${productName} — تصویر ${index + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-contain"
          priority
        />

        {images.length > 1 && (
          <>
            {index < images.length - 1 && (
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                onClick={() => onSelect(index + 1)}
                aria-label="تصویر بعدی"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                onClick={() => onSelect(index - 1)}
                aria-label="تصویر قبلی"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex max-w-full shrink-0 gap-2 overflow-x-auto overflow-y-hidden px-4 py-1 scrollbar-hide">
          {images.map((image, thumbIndex) => (
            <button
              key={`${image}-${thumbIndex}`}
              type="button"
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                thumbIndex === index
                  ? "scale-110 border-white"
                  : "border-white/30 opacity-60 hover:opacity-100"
              )}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(thumbIndex);
              }}
              aria-label={`تصویر ${thumbIndex + 1}`}
              aria-current={thumbIndex === index}
            >
              <Image src={image} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
