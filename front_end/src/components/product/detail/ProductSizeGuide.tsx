"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Ruler,
  Maximize2,
  CheckCircle2,
  Sparkles,
  Info,
  Shirt,
  HelpCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, ProductSizeMeasurement } from "@/types/product";
import { SizingType, SizingMeasurementDef } from "@/types/sizing-type";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import SizeGuideTable from "@/components/product/SizeGuideTable";
import Modal from "@/components/ui/Modal";
import { cn, toPersianNumber, toEnglishNumber } from "@/lib/utils";

interface ProductSizeGuideProps {
  product: Product;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  className?: string;
  allowZoom?: boolean;
}

export default function ProductSizeGuide({
  product,
  selectedSize,
  onSelectSize,
  className,
  allowZoom = true,
}: ProductSizeGuideProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);

  const { sizingTypes, fetchPublicSizingTypes } = useSizingTypeStore();

  // If sizing_type is not embedded on product directly, check if we have sizing_type_id
  const sizingType = useMemo<SizingType | undefined>(() => {
    if (product.sizing_type) return product.sizing_type;
    if (product.sizing_type_id) {
      return sizingTypes.find((st) => st.id === product.sizing_type_id);
    }
    return undefined;
  }, [product.sizing_type, product.sizing_type_id, sizingTypes]);

  // If product has sizing_type_id but no sizing_type object, fetch public sizing types
  useEffect(() => {
    if (product.sizing_type_id && !product.sizing_type && sizingTypes.length === 0) {
      fetchPublicSizingTypes();
    }
  }, [product.sizing_type_id, product.sizing_type, sizingTypes.length, fetchPublicSizingTypes]);

  const sizeChart: ProductSizeMeasurement[] = product.size_chart || [];
  const measurements: SizingMeasurementDef[] = sizingType?.measurements || [];

  const hasCustomSizing = Boolean(
    sizingType &&
    (sizeChart.length > 0 || sizingType.image_path || sizingType.general_fit_guide)
  );

  // If this product does NOT have custom sizing type or size chart, fall back gracefully
  if (!hasCustomSizing) {
    return (
      <div className={cn("space-y-4", className)} dir="rtl">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/20 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            جدول استاندارد ابعاد پوشاک برای این محصول در نظر گرفته شده است.
          </span>
        </div>
        <SizeGuideTable isOpen />
      </div>
    );
  }

  return (
    <div className={cn("space-y-8 text-foreground", className)} dir="rtl">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-primary">
              {sizingType?.name
                ? `راهنمای ابعاد و اندازه‌گیری: ${sizingType.name}`
                : "راهنمای تخصصی ابعاد و انتخاب سایز"}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Ruler className="w-3 h-3" />
              ابعاد دقیق (cm)
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            برای انتخاب مطمئن‌ترین سایز، اندازه‌های زیر را با یکی از لباس‌های مشابه خود در حالت پهن‌شده مقایسه نمایید.
          </p>
        </div>

        {selectedSize && (
          <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>سایز انتخابی فعلی: {selectedSize}</span>
          </div>
        )}
      </div>

      {/* Main Row: Technical Diagram and Dynamic Size Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Right Column: Annotated Technical Diagram */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center">
          <div className="w-full relative group rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 shadow-soft text-center overflow-hidden">
            {sizingType?.image_path ? (
              <div className="relative w-full aspect-square max-h-[340px] flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-card/40 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sizingType.image_path}
                  alt={sizingType.name || "دیاگرام راهنمای اندازه"}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />

                {/* Floating Lightbox Zoom Trigger */}
                {allowZoom && (
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-3 left-3 p-2 rounded-xl bg-background/80 hover:bg-background text-foreground shadow-md backdrop-blur-sm border border-border/20 transition-all opacity-80 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-medium"
                    title="مشاهده بزرگ‌نمایی دیاگرام"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>بزرگ‌نمایی دیاگرام</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square max-h-[300px] flex flex-col items-center justify-center p-6 text-muted-foreground bg-secondary/20 rounded-xl">
                <Shirt className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
                <span className="text-xs font-medium text-center">
                  دیاگرام شماتیک ابعاد برای این نوع پوشاک
                </span>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              نقاط و خطوط اندازه‌گیری بر روی تصویر مشخص گردیده است.
            </p>
          </div>
        </div>

        {/* Left Column: Dynamic Size Table */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              جدول ابعاد قطعات لباس (سانتی‌متر):
            </span>
            <span className="text-[11px] text-muted-foreground">
              کلیک روی هر سطر، سایز را در فرم خرید انتخاب می‌کند
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/30 bg-card/80 shadow-soft scrollbar-thin">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border/20">
                  <th className="p-3.5 font-bold text-foreground whitespace-nowrap min-w-[70px]">
                    سایز
                  </th>

                  {measurements.map((m) => (
                    <th
                      key={m.key}
                      className="p-3.5 font-semibold text-foreground text-center whitespace-nowrap"
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{m.label}</span>
                        <span className="text-[10px] text-muted-foreground">(cm)</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/10">
                {sizeChart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={measurements.length + 1}
                      className="p-6 text-center text-muted-foreground"
                    >
                      ابعاد تفکیکی برای سایزها ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  sizeChart.map((row, rowIdx) => {
                    const normalizeSize = (s?: string) =>
                      s ? toEnglishNumber(s).trim().toLowerCase() : "";
                    const isSelected = Boolean(
                      selectedSize &&
                        normalizeSize(selectedSize) === normalizeSize(row.size)
                    );

                    return (
                      <tr
                        key={rowIdx}
                        tabIndex={0}
                        role="button"
                        aria-label={`انتخاب سایز ${row.size}`}
                        onClick={() => onSelectSize?.(row.size)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectSize?.(row.size);
                          }
                        }}
                        className={cn(
                          "cursor-pointer transition-all duration-150 group focus:outline-none focus:ring-2 focus:ring-primary/40",
                          isSelected
                            ? "bg-primary/10 border-r-4 border-r-primary font-bold text-primary shadow-2xs"
                            : "hover:bg-secondary/30 text-foreground/90"
                        )}
                      >
                        {/* Size Column */}
                        <td className="p-3.5 whitespace-nowrap font-bold">
                          <div className="flex items-center gap-2">
                            <span>{row.size}</span>
                            {isSelected && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-normal shadow-2xs">
                                <Check className="w-2.5 h-2.5 ml-0.5" />
                                انتخابی
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Measurement Values Columns */}
                        {measurements.map((m) => {
                          const val = row.values?.[m.key];
                          return (
                            <td
                              key={m.key}
                              className={cn(
                                "p-3.5 text-center font-mono whitespace-nowrap",
                                isSelected ? "text-primary font-semibold" : "text-foreground/80"
                              )}
                            >
                              {val ? `${val} cm` : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>* تمامی اندازه‌ها بر اساس سانتی‌متر و با خطای احتمالی ۱ الی ۲ سانتی‌متر درج شده‌اند.</span>
          </div>
        </div>
      </div>

      {/* Persian Self-Measurement & Fit Guidance Section */}
      <div className="pt-6 border-t border-border/20 space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              چگونه اندازه بگیریم و قواره را انتخاب کنیم؟
            </h4>
            <p className="text-xs text-muted-foreground">
              راهنمای تطابق سایز بدن با قواره، تن‌خور و آزادی دوخت لباس
            </p>
          </div>
        </div>

        {/* General Fit Guide Card */}
        {sizingType?.general_fit_guide && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/20 to-primary/5 border border-primary/20 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
              <Shirt className="w-4 h-4" />
              <span>راهنمای قواره و سبک تن‌خور (Fit Guide)</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {sizingType.general_fit_guide}
            </p>
          </div>
        )}

        {/* Measurement Guides Grid */}
        {measurements.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground block">
              راهنمای تفکیکی اندازه‌گیری اعضای بدن برای این لباس:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {measurements.map((m) => (
                <div
                  key={m.key}
                  className="p-4 rounded-2xl border border-border/20 bg-card/70 backdrop-blur-sm space-y-2.5 hover:border-border/40 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/10">
                    <span className="font-bold text-xs sm:text-sm text-primary">
                      {m.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                      {m.key}
                    </span>
                  </div>

                  {m.body_guide && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                        <Ruler className="w-3 h-3 text-primary shrink-0" />
                        روش اندازه‌گیری روی بدن:
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                        {m.body_guide}
                      </p>
                    </div>
                  )}

                  {m.fit_advice && (
                    <div className="space-y-1 pt-1 border-t border-border/10">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        نکات تطابق و آزادی دوخت (Ease Allowance):
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                        {m.fit_advice}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal for Diagram */}
      {allowZoom && sizingType?.image_path && (
        <Modal
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          title={`دیاگرام فنی و خطوط اندازه‌گیری: ${sizingType.name || ""}`}
          contentClassName="max-w-3xl"
        >
          <div className="space-y-4" dir="rtl">
            <div className="relative w-full max-h-[75vh] min-h-[300px] rounded-xl bg-white dark:bg-card/40 p-4 flex items-center justify-center overflow-hidden border border-border/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sizingType.image_path}
                alt={sizingType.name || "دیاگرام فنی"}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {sizingType.general_fit_guide && (
              <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-3 rounded-xl border border-border/10">
                {sizingType.general_fit_guide}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
