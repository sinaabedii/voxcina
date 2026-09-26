"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Crop, HelpCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { itemVariants } from "@/lib/tryon-motion";
import { cn } from "@/lib/utils";

interface PhotoUploadCardProps {
  /** The photo already chosen for this room, if any. */
  previewUrl: string | null;
  onOpenGuide: () => void;
  onClear: () => void;
  onFileDropped: (file: File) => void;
  onRecrop?: () => void;
}

/** The customer's photo: the drop zone before one is chosen, the preview after. */
export default function PhotoUploadCard({
  previewUrl,
  onOpenGuide,
  onClear,
  onFileDropped,
  onRecrop,
}: PhotoUploadCardProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileDropped(file);
    } else if (file) {
      toast.error("لطفاً یک فایل تصویری معتبر انتخاب کنید");
    }
  };

  return (
    <motion.div
      className="bg-background rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 overflow-hidden shadow-soft"
      variants={itemVariants}
    >
      {previewUrl ? (
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                عکس شما آماده پرو است
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue dark:hover:text-voxcina-cream flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>راهنما</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/20 bg-secondary-100 dark:bg-voxcina-blue/20 shadow-inner-soft">
              {/* Local crop blob/preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="تصویر شما برای پرو"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream">
                تصویر انتخاب شده
              </p>
              <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50 leading-tight">
                لباس‌ها به صورت هوشمند روی این تصویر پرو می‌شوند.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenGuide}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-voxcina-blue dark:text-voxcina-cream hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>تغییر عکس</span>
                </button>
                {onRecrop && (
                  <>
                    <span className="text-secondary-400">·</span>
                    <button
                      type="button"
                      onClick={onRecrop}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-voxcina-blue dark:text-voxcina-cream hover:underline"
                    >
                      <Crop className="h-3 w-3" />
                      <span>برش مجدد</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              title="حذف تصویر"
              aria-label="حذف تصویر"
              className="flex-shrink-0 w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl flex items-center justify-center transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenGuide}
          className={cn(
            "w-full text-right p-4 cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 block",
            dragOver
              ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue/[0.04]"
              : "border-secondary-300 dark:border-voxcina-blue/30 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40 hover:bg-secondary-100/50 dark:hover:bg-voxcina-blue/10"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/30 flex items-center justify-center bg-voxcina-blue/[0.05] dark:bg-voxcina-cream/[0.05] text-voxcina-blue dark:text-voxcina-cream shadow-inner-soft">
              <Camera className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                  آپلود عکس برای پرو
                </span>
                <span className="text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60 bg-secondary-200 dark:bg-voxcina-blue/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <HelpCircle className="h-2.5 w-2.5" />
                  راهنما
                </span>
              </div>
              <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50 leading-tight">
                <span className="lg:hidden">برای مشاهده شرایط و انتخاب عکس ضربه بزنید</span>
                <span className="hidden lg:inline">عکس را بکشید یا برای راهنما و انتخاب کلیک کنید</span>
              </p>
            </div>
          </div>
        </button>
      )}
    </motion.div>
  );
}
