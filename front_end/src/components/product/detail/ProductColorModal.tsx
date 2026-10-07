"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md transition-all sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border-t border-white/20 bg-[#0e223d] shadow-2xl sm:max-h-[80vh] sm:rounded-3xl sm:border">
        {/* Specular highlights & ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(230,198,135,0.25)_0%,transparent_70%)]" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/30" />
        </div>

        {/* Mobile handle indicator */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-voxcina-cream shadow-xs">
              <Palette className="size-4" />
            </span>
            <div>
              <h2 id="color-modal-title" className="text-base font-bold text-white">
                تنوع رنگ‌های محصول
              </h2>
              <p className="text-xs text-voxcina-cream/70">
                {toPersianNumber(colors.length)} رنگ موجود برای {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-voxcina-cream transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-voxcina-cream"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filter reminder if size selected */}
        {selectedSize && (
          <div className="border-b border-white/5 bg-white/[0.04] px-5 py-2">
            <p className="text-xs text-voxcina-cream/75">
              وضعیت موجودی بر اساس سایز انتخابی <span className="font-bold text-white">{toPersianNumber(selectedSize)}</span> نمایش داده می‌شود.
            </p>
          </div>
        )}

        {/* Colors Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
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
                      ? "border-voxcina-cream bg-white/20 shadow-[0_4px_20px_rgba(230,198,135,0.25)] ring-1 ring-voxcina-cream/50"
                      : "border-white/15 bg-white/[0.07] hover:border-white/30 hover:bg-white/[0.12]",
                    !isAvailable && "cursor-not-allowed opacity-40 hover:border-white/15 hover:bg-white/[0.07]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="relative block size-10 shrink-0 overflow-hidden rounded-xl border border-white/40 shadow-sm"
                      style={{ backgroundColor: color.color?.startsWith("#") ? color.color : "#DFD8CC" }}
                    >
                      {color.swatchImage && (
                        <Image src={color.swatchImage} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-bold", isSelected ? "text-white" : "text-voxcina-cream")}>
                        {color.colorName}
                      </p>
                      <p className="text-xs text-voxcina-cream/60">
                        {isAvailable ? (
                          <span className="text-emerald-400">موجود</span>
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
                        ? "border-voxcina-cream bg-voxcina-cream text-voxcina-blue shadow-xs"
                        : "border-white/25 bg-white/5 text-transparent group-hover:border-white/40"
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
        <div className="border-t border-white/10 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/40 bg-gradient-to-b from-white to-voxcina-cream text-sm font-bold text-voxcina-blue shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-all hover:brightness-105 active:scale-[0.99]"
          >
            تأیید و بازگشت به محصول
          </button>
        </div>
      </div>
    </div>
  );
}
