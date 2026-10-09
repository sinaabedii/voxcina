"use client";

import React, { useState, useEffect, useId, useMemo, useRef } from "react";
import {
  Ruler,
  Maximize2,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Info,
  Shirt,
  Check,
} from "lucide-react";
import { Product, ProductSizeMeasurement } from "@/types/product";
import { SizingType, SizingMeasurementDef } from "@/types/sizing-type";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import SizeGuideTable from "@/components/product/SizeGuideTable";
import Modal from "@/components/ui/Modal";
import { sizingLabelForKey } from "@/lib/sizing-labels";
import { cn, toPersianNumber, toEnglishNumber } from "@/lib/utils";

interface ProductSizeGuideProps {
  product: Product;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  className?: string;
  allowZoom?: boolean;
}

// One measurement's how-to notes. On phones it is a drop box that starts
// collapsed; from sm up the same notes are always visible. Collapsed content is
// hidden with CSS only, so it stays in the markup.
function MeasurementGuideCard({ measurement }: { measurement: SizingMeasurementDef }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const { label, body_guide, fit_advice } = measurement;

  return (
    <div className="rounded-2xl border border-border/20 bg-card/70 backdrop-blur-sm transition-colors hover:border-border/40 motion-reduce:transition-none">
      {/* Phone: drop box trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:hidden"
      >
        <span className="text-sm font-bold text-primary">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-primary transition-transform duration-200 motion-reduce:transition-none",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Desktop: plain heading, notes always visible */}
      <div className="hidden px-4 pt-4 pb-2 border-b border-border/10 sm:block">
        <span className="font-bold text-sm text-primary">{label}</span>
      </div>

      <div
        id={panelId}
        className={cn("space-y-2.5 px-4 pb-4 pt-3", !isOpen && "hidden sm:block")}
      >
        {body_guide && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
              <Ruler className="w-3 h-3 text-primary shrink-0" />
              روش اندازه‌گیری روی بدن:
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed pr-4">
              {body_guide}
            </p>
          </div>
        )}

        {fit_advice && (
          <div className="space-y-1 pt-1 border-t border-border/10">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              نکات تطابق و آزادی دوخت (Ease Allowance):
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed pr-4">
              {fit_advice}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductSizeGuide({
  product,
  selectedSize,
  onSelectSize,
  className,
  allowZoom = true,
}: ProductSizeGuideProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const detailsId = useId();

  const { sizingTypes, fetchPublicSizingTypes, isLoading } = useSizingTypeStore();

  // A store entry wins over the product snapshot so an updated sizing type is
  // never masked by its payload copy; `product.sizing_type` is the fallback for
  // ids the public list does not carry (e.g. a type retired after the product
  // was published, whose chart must remain readable).
  const sizingType = useMemo<SizingType | undefined>(() => {
    if (product.sizing_type_id) {
      const fromStore = sizingTypes.find((st) => st.id === product.sizing_type_id);
      if (fromStore) return fromStore;
    }
    return product.sizing_type;
  }, [product.sizing_type, product.sizing_type_id, sizingTypes]);

  // One non-looping attempt per product, as soon as the product names a sizing
  // type the component has not resolved from either source. The ref keeps a
  // failed lookup (e.g. a transient network hiccup) from restarting the fetch.
  const fetchAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = product.sizing_type_id;
    if (!id || sizingType || isLoading) return;
    if (fetchAttemptedRef.current === id) return;
    fetchAttemptedRef.current = id;
    fetchPublicSizingTypes();
  }, [fetchPublicSizingTypes, isLoading, product.sizing_type_id, sizingType]);

  const sizeChart: ProductSizeMeasurement[] = product.size_chart || [];

  // Columns come from the sizing-type definition; when a product ships a size
  // chart without one (older records), rebuild the columns from the chart's
  // own keys so its real table renders instead of the generic fallback.
  const measurements: SizingMeasurementDef[] = useMemo(() => {
    const configured = sizingType?.measurements || [];
    if (configured.length > 0) return configured;
    const keys: string[] = [];
    sizeChart.forEach((row) => {
      Object.keys(row.values || {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key);
      });
    });
    return keys.map((key) => ({
      key,
      label: sizingLabelForKey(key),
      body_guide: "",
      fit_advice: "",
    }));
  }, [sizeChart, sizingType]);

  // Wait for a sizing-type lookup that is actually serving this component
  // before flashing the generic fallback table on top of it.
  const lookupInFlight = Boolean(product.sizing_type_id) && !sizingType && isLoading;

  const hasCustomSizing = Boolean(
    sizeChart.length > 0 ||
      (sizingType && (sizingType.image_path || sizingType.general_fit_guide))
  );

  // If this product does NOT have custom sizing type or size chart, fall back gracefully
  if (!hasCustomSizing) {
    return (
      <div className={cn("space-y-4", className)} dir="rtl">
        {lookupInFlight && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/20 text-xs text-muted-foreground animate-pulse">
            <Shirt className="w-4 h-4 text-primary shrink-0" />
            <span>در حال دریافت راهنمای ابعاد این لباس…</span>
          </div>
        )}
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

  const guidedMeasurements = measurements.filter((m) => m.body_guide || m.fit_advice);

  return (
    <div className={cn("text-foreground leading-relaxed", className)} dir="rtl">
      {/* Phone: summary, diagram, main table, per-metric drop boxes, one
          toggle for the fit guide. From sm up everything is shown; from lg the
          diagram and table share a row. */}
      <div className="grid grid-cols-1 items-start gap-y-5 sm:gap-y-8 lg:grid-cols-12 lg:gap-x-8">
        {/* Summary */}
        <div className="order-1 flex flex-col gap-2 border-b border-border/20 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:col-span-12">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-bold text-primary">
              {sizingType?.name
                ? `راهنمای ابعاد و اندازه‌گیری: ${sizingType.name}`
                : "راهنمای تخصصی ابعاد و انتخاب سایز"}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Ruler className="w-3 h-3" />
              ابعاد دقیق (cm)
            </span>
          </div>

          {selectedSize && (
            <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>سایز انتخابی فعلی: {selectedSize}</span>
            </div>
          )}
        </div>

        {/* Annotated technical diagram — always visible, directly above the
            table, so nobody has to open anything to see it. */}
        <div className="order-2 flex min-w-0 flex-col items-center lg:order-2 lg:col-span-5">
          <div className="w-full relative group rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 shadow-soft text-center overflow-hidden sm:p-4">
            {sizingType?.image_path ? (
              <div className="relative w-full aspect-square max-h-[300px] flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-card/40 p-2 sm:max-h-[340px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sizingType.image_path}
                  alt={sizingType.name || "دیاگرام راهنمای اندازه"}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
                />

                {/* Floating Lightbox Zoom Trigger */}
                {allowZoom && (
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-3 left-3 p-2 rounded-xl bg-background/80 hover:bg-background text-foreground shadow-md backdrop-blur-sm border border-border/20 transition-all opacity-80 group-hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex items-center gap-1.5 text-xs font-medium"
                    title="مشاهده بزرگنمایی دیاگرام"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>بزرگنمایی دیاگرام</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square max-h-[280px] flex flex-col items-center justify-center p-6 text-muted-foreground bg-secondary/20 rounded-xl sm:max-h-[300px]">
                <Shirt className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
                <span className="text-xs font-medium text-center">
                  دیاگرام شماتیک ابعاد برای این نوع پوشاک
                </span>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              نقاط و خطوط اندازهگیری بر روی تصویر مشخص گردیده است.
            </p>
          </div>
        </div>

        {/* Main: size table */}
        <div className="order-3 min-w-0 space-y-3 lg:order-3 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-bold text-foreground">
              جدول ابعاد قطعات لباس (سانتی‌متر):
            </span>
            {onSelectSize && (
              <span className="text-xs text-muted-foreground">
                کلیک روی هر سطر، سایز را در فرم خرید انتخاب می‌کند
              </span>
            )}
          </div>

          <div
            className="overflow-x-auto rounded-2xl border border-border/30 bg-card/80 shadow-soft scrollbar-thin focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            tabIndex={0}
            role="region"
            aria-label="جدول ابعاد لباس بر اساس سایز، به سانتی‌متر"
          >
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border/20">
                  <th
                    scope="col"
                    className="sticky right-0 z-10 bg-secondary/40 p-2.5 font-bold text-foreground whitespace-nowrap min-w-[72px] sm:p-3.5"
                  >
                    سایز
                  </th>

                  {measurements.map((m) => (
                    <th
                      key={m.key}
                      scope="col"
                      className="p-2.5 font-semibold text-foreground text-center whitespace-nowrap sm:p-3.5"
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{m.label}</span>
                        <span className="text-xs text-muted-foreground">(cm)</span>
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
                        onClick={() => onSelectSize?.(toEnglishNumber(row.size).trim())}
                        className={cn(
                          "cursor-pointer transition-colors duration-150 group motion-reduce:transition-none",
                          isSelected
                            ? "bg-primary/10 border-r-4 border-r-primary font-bold text-primary"
                            : "text-foreground/90 hover:bg-secondary/30"
                        )}
                      >
                        {/* Size column — pinned while the measurement columns
                            scroll, carried by a real button so keyboard and
                            screen-reader users can act on it directly. */}
                        <td
                          className={cn(
                            "sticky right-0 z-[1] bg-card p-0 transition-colors duration-150 group-hover:bg-secondary/30 motion-reduce:transition-none",
                            isSelected && "bg-primary/10"
                          )}
                        >
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSize?.(toEnglishNumber(row.size).trim());
                            }}
                            className="flex min-h-11 h-full w-full items-center justify-start gap-2 px-2.5 py-2.5 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-3.5 sm:py-3.5"
                          >
                            <span className="whitespace-nowrap font-bold">{row.size}</span>
                            {isSelected && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-normal">
                                <Check className="w-2.5 h-2.5 ml-0.5" />
                                انتخابی
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Measurement Values Columns — the header carries the
                            unit, cells stay numerals so Persian digits align. */}
                        {measurements.map((m) => {
                          const val = row.values?.[m.key];
                          return (
                            <td
                              key={m.key}
                              // Values and ranges keep one stable digit order
                              // regardless of the marked-up RTL context.
                              dir="ltr"
                              className={cn(
                                "p-2.5 text-center whitespace-nowrap font-semibold sm:p-3.5",
                                isSelected ? "text-primary" : "text-foreground/80"
                              )}
                            >
                              {val ? toPersianNumber(val) : "—"}
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

          <p className="text-xs text-muted-foreground sm:hidden">
            برای دیدن ستون‌های بیشتر، جدول را به چپ و راست بکشید.
          </p>

          <p className="pt-1 text-xs text-muted-foreground">
            * تمامی اندازه‌ها بر اساس سانتی‌متر و با خطای احتمالی ۱ الی ۲ سانتی‌متر درج شده‌اند.
          </p>
        </div>

        {/* Per-measurement how-to: one drop box per metric. Collapsed on phones,
            always expanded from sm up. */}
        {guidedMeasurements.length > 0 && (
          <div className="order-4 min-w-0 space-y-3 lg:order-4 lg:col-span-12">
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

            <span className="text-xs font-bold text-foreground block">
              راهنمای تفکیکی اندازه‌گیری اعضای بدن برای این لباس:
            </span>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              {guidedMeasurements.map((m) => (
                <MeasurementGuideCard key={m.key} measurement={m} />
              ))}
            </div>
          </div>
        )}

        {/* Phone-only disclosure for the general fit guide */}
        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
          aria-controls={detailsId}
          className="order-5 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none sm:hidden"
        >
          <span>
            {showDetails
              ? "بستن راهنمای قواره و انتخاب سایز"
              : "مشاهده راهنمای قواره و انتخاب سایز"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              showDetails && "rotate-180"
            )}
          />
        </button>

        {/* Details: collapsed on phones, always shown from sm up. `contents`
            lets its children keep participating in the grid above. */}
        <div id={detailsId} className={cn(showDetails ? "contents" : "hidden sm:contents")}>
          {/* Guidance: how to use the chart and the general fit guide */}
          <div className="order-6 min-w-0 space-y-6 border-t border-border/20 pt-6 lg:order-5 lg:col-span-12">
            <p className="text-xs text-muted-foreground leading-relaxed">
              برای انتخاب مطمئن‌ترین سایز، اندازه‌های زیر را با یکی از لباس‌های مشابه خود در حالت پهن‌شده مقایسه نمایید.
            </p>

            {sizingType?.general_fit_guide && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/20 to-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <Shirt className="w-4 h-4" />
                  <span>راهنمای قواره و سبک تن‌خور (Fit Guide)</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                  {sizingType.general_fit_guide}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal for Diagram */}
      {allowZoom && sizingType?.image_path && (
        <Modal
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          title={`دیاگرام فنی و خطوط اندازه‌گیری: ${sizingType.name || ""}`}
          contentClassName="max-w-3xl h-full"
          className="relative overflow-hidden p-0 sm:p-0"
        >
          <div className="absolute inset-0 flex flex-col gap-3 p-4 sm:gap-4 sm:p-5" dir="rtl">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-white border border-border/20 shadow-inner dark:bg-card/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sizingType.image_path}
                alt={sizingType.name || "دیاگرام فنی"}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
            {sizingType.general_fit_guide && (
              <p className="shrink-0 text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-2.5 sm:p-3 rounded-xl border border-border/10">
                {sizingType.general_fit_guide}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
