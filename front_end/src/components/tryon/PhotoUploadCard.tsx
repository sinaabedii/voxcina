"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { itemVariants } from "@/lib/tryon-motion";
import { cn } from "@/lib/utils";

interface PhotoUploadCardProps {
  /** The photo already chosen for this room, if any. */
  previewUrl: string | null;
  onOpenGuide: () => void;
  onClear: () => void;
  onFileDropped: (file: File) => void;
}

/** The customer's photo: the drop zone before one is chosen, the preview after. */
export default function PhotoUploadCard({
  previewUrl,
  onOpenGuide,
  onClear,
  onFileDropped,
}: PhotoUploadCardProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      // A dropped file is already chosen, so the guide would only stand between
      // the user and the crop step. The guide stays one click away on the zone.
      onFileDropped(file);
    } else if (file) {
      toast.error("لطفاً یک فایل تصویری انتخاب کنید");
    }
  };

  return (
    <motion.div
      className="bg-background rounded-xl border border-secondary-300 dark:border-voxcina-blue/20 overflow-hidden"
      variants={itemVariants}
    >
      {previewUrl ? (
        <div className="flex items-center gap-3 p-2.5">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/20">
            {/* A local crop result (blob/data URL), so next/image has nothing to optimise. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="تصویر شما" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream">تصویر شما</p>
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">عکس آپلود شده</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onClear(); }}
            className="flex-shrink-0 w-7 h-7 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        // Opens the guide instead of the picker directly, so the photo
        // requirements are read before a photo is chosen. Drag and drop
        // still lands straight on the crop step.
        <button
          type="button"
          onClick={onOpenGuide}
          className={cn(
            "w-full text-right flex items-center gap-3 p-2.5 cursor-pointer rounded-xl border-2 border-dashed transition-all",
            dragOver
              ? "border-secondary-400 dark:border-voxcina-blue/40 bg-voxcina-blue/[0.04]"
              : "border-secondary-300 dark:border-voxcina-blue/20 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04]"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-xl flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/20 flex items-center justify-center bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04]">
            <Upload className="h-6 w-6 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70">عکس خود را آپلود کنید</p>
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">
              <span className="lg:hidden">برای دیدن راهنما و انتخاب عکس ضربه بزنید</span>
              <span className="hidden lg:inline">اینجا رها کنید یا برای دیدن راهنما کلیک کنید</span>
            </p>
          </div>
        </button>
      )}
    </motion.div>
  );
}
