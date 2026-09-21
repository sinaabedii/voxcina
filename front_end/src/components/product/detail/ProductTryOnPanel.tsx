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
    <figure className="relative aspect-square overflow-hidden rounded-xl border border-border/20 shadow-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-full w-full object-cover" />
      <figcaption className="absolute bottom-2 right-2 rounded-lg bg-card/85 px-2 py-1 text-xs text-primary backdrop-blur-sm">
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
      <SectionTitle title="پرو مجازی" size="lg" className="mb-4" />

      <div className="grid gap-6 rounded-2xl border border-border/20 bg-card/50 p-5 shadow-soft sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:items-center lg:p-6">
        <div className="text-center sm:text-right">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60 text-primary">
            <Camera className="h-7 w-7" />
          </span>
          <h3 className="mb-2 font-medium text-primary">ببینید روی شما چطور می‌شود</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            عکس خود را آپلود کنید تا این محصول را روی تصویرتان ببینید.
          </p>
          <Button
            variant="outline"
            onClick={onStart}
            disabled={!isAvailable}
            className="w-full rounded-xl sm:w-auto"
          >
            <Camera className="ml-1.5 h-4 w-4" />
            شروع پرو مجازی
          </Button>
          {!isAvailable && (
            <p className="mt-2 text-xs text-muted-foreground">برای این محصول در دسترس نیست</p>
          )}
        </div>

        {isProcessing ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
            <Loading size="md" />
            <p className="text-sm font-medium text-muted-foreground">در حال پردازش تصویر…</p>
          </div>
        ) : resultImage ? (
          <div>
            <h4 className="mb-3 text-center font-medium text-primary sm:text-right">نتیجه پرو مجازی</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {uploadedPreview && <TryOnFrame src={uploadedPreview} label="تصویر اصلی" />}
              <TryOnFrame src={resultImage} label="با لباس" />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 p-6 text-center">
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
