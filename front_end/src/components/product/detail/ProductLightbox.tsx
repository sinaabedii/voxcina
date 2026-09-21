"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import BackendImage from "@/components/BackendImage";
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [images.length, index, onSelect, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`گالری تصاویر ${productName}`}
      className="animate-fadeIn fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md"
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

      <div className="relative flex h-[80vh] w-full max-w-5xl items-center justify-center">
        <BackendImage
          src={images[index] || ""}
          alt={`${productName} — تصویر ${index + 1}`}
          className="max-h-full max-w-full object-contain"
          priority
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index + 1);
              }}
              disabled={index >= images.length - 1}
              aria-label="تصویر بعدی"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index - 1);
              }}
              disabled={index <= 0}
              aria-label="تصویر قبلی"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 flex max-w-full gap-2 overflow-x-auto px-4">
          {images.map((image, thumbIndex) => (
            <button
              key={image}
              type="button"
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                thumbIndex === index
                  ? "scale-110 border-white"
                  : "border-white/30 opacity-60 hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(thumbIndex);
              }}
              aria-label={`تصویر ${thumbIndex + 1}`}
              aria-current={thumbIndex === index}
            >
              <BackendImage src={image} alt="" className="h-full w-full object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
