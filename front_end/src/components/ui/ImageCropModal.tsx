"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check, CropIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCroppedImgWithDimensions } from "@/lib/image-crop";
import { cn } from "@/lib/utils";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirm: (croppedFile: File, previewUrl: string) => void;
  onCancel: () => void;
}

// Output resolution: 384×512 (exactly 3:4, matches backend placeholder)
const OUTPUT_WIDTH = 384;
const OUTPUT_HEIGHT = 512;
const ASPECT = 3 / 4;

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || isProcessing) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImgWithDimensions(
        imageSrc,
        croppedAreaPixels,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
        0.92
      );
      const previewUrl = URL.createObjectURL(blob);
      const file = new File([blob], "person.jpg", { type: "image/jpeg" });
      onConfirm(file, previewUrl);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <motion.div
            className="bg-background rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 shadow-medium w-full max-w-sm overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-300 dark:border-voxcina-blue/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                  <CropIcon className="h-3.5 w-3.5 text-voxcina-cream" />
                </div>
                <div>
                  <p className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                    برش تصویر
                  </p>
                  <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 -mt-0.5">
                    تصویر را در قاب ۳:۴ قرار دهید
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="w-7 h-7 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                aria-label="بستن"
              >
                <X className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>

            {/* Crop area — 3:4 container */}
            <div className="relative w-full bg-zinc-900 flex-shrink-0" style={{ aspectRatio: "3/4", maxHeight: "55vh" }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid
                style={{
                  containerStyle: { borderRadius: 0 },
                  cropAreaStyle: {
                    border: "2px solid rgba(244,241,236,0.8)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  },
                }}
              />
            </div>

            {/* Zoom control */}
            <div className="px-4 py-3 border-b border-secondary-300 dark:border-voxcina-blue/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                  className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center hover:bg-voxcina-blue/20 dark:hover:bg-voxcina-blue/30 transition-colors flex-shrink-0"
                  aria-label="کاهش زوم"
                >
                  <ZoomOut className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-voxcina-blue bg-secondary-300 dark:bg-voxcina-blue/20"
                  aria-label="زوم"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
                  className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center hover:bg-voxcina-blue/20 dark:hover:bg-voxcina-blue/30 transition-colors flex-shrink-0"
                  aria-label="افزایش زوم"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream" />
                </button>
                <span className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 w-8 text-center flex-shrink-0" dir="ltr">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 text-center px-4 pt-2.5 flex-shrink-0">
              با انگشت یا موس تصویر را جابجا کنید
            </p>

            {/* Actions */}
            <div className="flex gap-2.5 px-4 pt-2 pb-4 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04] transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing || !croppedAreaPixels}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                  isProcessing || !croppedAreaPixels
                    ? "bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "bg-voxcina-blue text-voxcina-cream shadow-inset-button hover:opacity-90 active:opacity-80"
                )}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-voxcina-cream/30 border-t-voxcina-cream rounded-full animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    تایید برش
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
