"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Palette, X } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
import type { ColorOption } from "./useVariantSelection";

interface ProductColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ColorOption[];
  selectedColor?: string;
  selectedSize?: string;
  colorsForSelectedSize: ColorOption[];
  onSelectColor: (colorKey?: string) => void;
  productName: string;
}

export default function ProductColorModal({
  isOpen,
  onClose,
  colors,
  selectedColor,
  selectedSize,
  colorsForSelectedSize,
  onSelectColor,
  productName,
}: ProductColorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-modal-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-voxcina-blue/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border-t border-white/80 bg-white/95 sm:bg-[#FAF7F2] text-voxcina-blue shadow-[0_-12px_40px_rgba(26,60,105,0.12)] sm:max-h-[80vh] sm:rounded-3xl sm:border sm:border-voxcina-blue/15">
        {/* Specular highlights & ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(212,179,115,0.2)_0%,transparent_70%)]" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(26,60,105,0.06)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-voxcina-cream/30" />
        </div>

        {/* Mobile handle indicator */}
        <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-voxcina-blue/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-voxcina-blue/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-voxcina-blue/15 bg-white/80 text-voxcina-blue shadow-xs">
              <Palette className="size-4" />
            </span>
            <div>
              <h2 id="color-modal-title" className="text-base font-bold text-voxcina-blue">
                تنوع رنگ‌های محصول
              </h2>
              <p className="text-xs text-voxcina-blue/70">
                {toPersianNumber(colors.length)} رنگ موجود برای {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-9 items-center justify-center rounded-xl border border-voxcina-blue/15 bg-white/80 text-voxcina-blue transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-blue"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filter reminder if size selected */}
        {selectedSize && (
          <div className="shrink-0 border-b border-voxcina-blue/10 bg-voxcina-cream/40 px-5 py-2">
            <p className="text-xs text-voxcina-blue/75">
              وضعیت موجودی بر اساس سایز انتخابی <span className="font-bold text-voxcina-blue">{toPersianNumber(selectedSize)}</span> نمایش داده می‌شود.
            </p>
          </div>
        )}

        {/* Colors Grid - Scrollable with min-h-0 and overscroll-contain */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 touch-pan-y">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {colors.map((color) => {
              const key = color.variantId || color.colorName;
              const isSelected = selectedColor === key;
              const isAvailable = !selectedSize || colorsForSelectedSize.some((item) => item.variantId === color.variantId);

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    onSelectColor(isSelected ? undefined : key);
                  }}
                  className={cn(
                    "group relative flex items-center justify-between rounded-2xl border p-3 text-right transition-all",
                    isSelected
                      ? "border-voxcina-blue bg-voxcina-blue/5 shadow-[0_4px_14px_rgba(26,60,105,0.12)] ring-1 ring-voxcina-blue/30"
                      : "border-voxcina-blue/15 bg-white/80 hover:border-voxcina-blue/30 hover:bg-white",
                    !isAvailable && "cursor-not-allowed opacity-40 hover:border-voxcina-blue/15 hover:bg-white/80"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="relative block size-10 shrink-0 overflow-hidden rounded-xl border border-voxcina-blue/15 shadow-sm"
                      style={{ backgroundColor: color.color?.startsWith("#") ? color.color : "#DFD8CC" }}
                    >
                      {color.swatchImage && (
                        <Image src={color.swatchImage} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-bold", isSelected ? "text-voxcina-blue" : "text-voxcina-blue/90")}>
                        {color.colorName}
                      </p>
                      <p className="text-xs text-voxcina-blue/60">
                        {isAvailable ? (
                          <span className="text-emerald-600 font-medium">موجود</span>
                        ) : (
                          "ناموجود در این سایز"
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-all",
                      isSelected
                        ? "border-voxcina-blue bg-voxcina-blue text-white shadow-xs"
                        : "border-voxcina-blue/25 bg-voxcina-blue/5 text-transparent group-hover:border-voxcina-blue/40"
                    )}
                  >
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-voxcina-blue/10 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-r from-[#14305A] via-[#1A3C69] to-[#14305A] text-sm font-bold text-voxcina-cream shadow-[0_8px_20px_rgba(26,60,105,0.25)] transition-all hover:brightness-105 active:scale-[0.99]"
          >
            تأیید و بازگشت به محصول
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
