"use client";

import { Camera, Shirt } from "lucide-react";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import SectionTitle from "@/components/ui/SectionTitle";
import { cn } from "@/lib/utils";

interface ProductTryOnPanelProps {
  isAvailable: boolean;
  isProcessing: boolean;
  resultImage: string | null;
  uploadedPreview: string | null;
  onStart: () => void;
  className?: string;
}

/** One side of the before/after pair. Plain `img`: both sources are blobs or signed URLs. */
function TryOnFrame({ src, label }: { src: string; label: string }) {
  return (
    <figure className="relative aspect-square overflow-hidden rounded-lg border border-border/20 shadow-soft sm:rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-full w-full object-cover" />
      <figcaption className="absolute bottom-1.5 right-1.5 rounded-md bg-card/90 px-1.5 py-0.5 text-xs text-primary backdrop-blur-sm sm:bottom-2 sm:right-2 sm:rounded-lg sm:px-2 sm:py-1">
        {label}
      </figcaption>
    </figure>
  );
}

/**
 * Virtual try-on entry point.
 *
 * The button hands off to `/tryon`, where the photo upload and the generation
 * live. This panel only explains the feature and shows the last result if the
 * visitor has already been there in this session.
 */
export default function ProductTryOnPanel({
  isAvailable,
  isProcessing,
  resultImage,
  uploadedPreview,
  onStart,
  className,
}: ProductTryOnPanelProps) {
  return (
    <section className={cn(className)}>
      <SectionTitle
        title="پرو مجازی"
        size="lg"
        className="mb-2 sm:mb-4"
        titleClassName="text-base font-bold sm:text-2xl"
      />

      <div className="grid gap-3 rounded-xl border border-border/20 bg-card/50 p-3.5 shadow-soft sm:gap-6 sm:rounded-2xl sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-center sm:p-5 lg:p-6">
        <div className="text-right">
          <div className="flex items-center gap-3 sm:block">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-primary sm:mb-4 sm:h-14 sm:w-14 sm:rounded-full">
              <Camera className="h-5 w-5 sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-primary sm:mb-2 sm:text-base sm:font-medium">
                ببینید روی شما چطور می‌شود
              </h3>
              <p className="text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                عکس خود را آپلود کنید تا این محصول را روی تصویرتان ببینید.
              </p>
            </div>
          </div>
          <div className="mt-3 sm:mt-0">
            <Button
              variant="outline"
              onClick={onStart}
              disabled={!isAvailable}
              className="h-9 w-full rounded-lg text-xs font-medium sm:h-11 sm:w-auto sm:rounded-xl sm:text-sm"
            >
              <Camera className="ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              شروع پرو مجازی
            </Button>
            {!isAvailable && (
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2">برای این محصول در دسترس نیست</p>
            )}
          </div>
        </div>

        {isProcessing ? (
          <div className="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-lg border border-border/20 bg-background/50 p-3 sm:min-h-[200px] sm:gap-3 sm:rounded-xl sm:p-6">
            <div className="sm:hidden">
              <Loading size="sm" />
            </div>
            <div className="hidden sm:block">
              <Loading size="md" />
            </div>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">در حال پردازش تصویر…</p>
          </div>
        ) : resultImage ? (
          <div className="pt-1 sm:pt-0">
            <h4 className="mb-2 text-center text-xs font-semibold text-primary sm:mb-3 sm:text-right sm:text-sm sm:font-medium">
              نتیجه پرو مجازی
            </h4>
            <div
              className={cn(
                "grid gap-2 sm:gap-4",
                uploadedPreview ? "grid-cols-2" : "mx-auto max-w-[200px] grid-cols-1 sm:max-w-none"
              )}
            >
              {uploadedPreview && <TryOnFrame src={uploadedPreview} label="تصویر اصلی" />}
              <TryOnFrame src={resultImage} label="با لباس" />
            </div>
          </div>
        ) : (
          <div className="hidden min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 p-6 text-center sm:flex">
            <Shirt className="mb-2 h-10 w-10 text-primary/30" />
            <p className="text-sm text-muted-foreground">
              نتیجه پرو مجازی اینجا نمایش داده می‌شود.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
