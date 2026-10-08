"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Ruler,
  Sparkles,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { requestSizeRecommendation } from "@/lib/size-recommendation-api";
import { sizingLabelForKey } from "@/lib/sizing-labels";
import { cn, toDigitsOnly, toPersianNumber, toEnglishNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import {
  MeasurementSource,
  SizeFitPreference,
  SizeRecommendationRequest,
  SizeRecommendationResponse,
} from "@/types/size-recommendation";
import { VariantSelection } from "./useVariantSelection";

type Step = "form" | "result";
type Method = "measured" | "reference";

interface SizeRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSizeGuide: () => void;
  product: Product;
  selection: VariantSelection;
}

interface MeasurementField {
  key: string;
  label: string;
  hint?: string;
}

const fitOptions: Array<{ value: SizeFitPreference; label: string }> = [
  { value: "slim", label: "جذب" },
  { value: "regular", label: "استاندارد" },
  { value: "relaxed", label: "آزاد" },
];

const weightOptions = [
  ["50", "۴۵ تا ۵۴ کیلو"],
  ["60", "۵۵ تا ۶۴ کیلو"],
  ["70", "۶۵ تا ۷۴ کیلو"],
  ["80", "۷۵ تا ۸۴ کیلو"],
  ["90", "۸۵ تا ۹۴ کیلو"],
  ["100", "۹۵ تا ۱۰۴ کیلو"],
  ["110", "۱۰۵ کیلو یا بیشتر"],
] as const;

function labelForKey(key: string) {
  return sizingLabelForKey(key);
}

function normalizeSize(size?: string) {
  return size ? toEnglishNumber(size).trim().toLowerCase() : "";
}

function isFreeSize(size?: string) {
  return [
    "free",
    "free-size",
    "free size",
    "freesize",
    "one-size",
    "onesize",
    "فری سایز",
    "فری‌سایز",
    "فریسایز",
    "سایز آزاد",
  ].includes(normalizeSize(size));
}

function getMeasurementFields(product: Product): MeasurementField[] {
  const fromSizingType = product.sizing_type?.measurements?.map((measurement) => ({
    key: measurement.key,
    label: measurement.label || labelForKey(measurement.key),
    hint: measurement.body_guide,
  }));
  const fromChart = Object.keys(product.size_chart?.[0]?.values || {}).map((key) => ({
    key,
    label: labelForKey(key),
  }));

  return [...(fromSizingType?.length ? fromSizingType : fromChart)]
    .filter(({ key }) => !/^(height|weight|height_cm|weight_kg)$/i.test(key))
    .slice(0, 4);
}

function confidenceLabel(level?: SizeRecommendationResponse["confidence_level"]) {
  if (level === "high") return "اطمینان بالا";
  if (level === "medium") return "اطمینان متوسط";
  if (level === "low") return "اطمینان کم";
  return "پیشنهاد تقریبی";
}

function statusCopy(status: SizeRecommendationResponse["status"]) {
  switch (status) {
    case "no_chart":
      return {
        title: "جدول سایز ثبت نشده است",
        message: "لطفاً از جدول اندازه‌ها برای بررسی دقیق‌تر کمک بگیرید.",
      };
    case "no_match":
      return {
        title: "سایز منطبقی یافت نشد",
        message: "می‌توانید تن‌خور یا مقادیر را تغییر دهید یا جدول اندازه‌ها را مشاهده کنید.",
      };
    case "unavailable":
      return {
        title: "سایز مناسب در این رنگ موجود نیست",
        message: "می‌توانید موجودی رنگ‌های دیگر این محصول را بررسی کنید.",
      };
    case "insufficient_data":
      return {
        title: "اطلاعات برای پیشنهاد کافی نیست",
        message: "لطفاً قد و وزن تقریبی را به درستی وارد کنید.",
      };
    default:
      return {
        title: "پیشنهاد سایز",
        message: "نتیجه بر اساس اطلاعات واردشده و الگوی قواره محصول محاسبه شده است.",
      };
  }
}

function dataQualityLabel(key: string, fields: MeasurementField[]) {
  if (key === "height") return "قد";
  if (key === "weight") return "وزن تقریبی";
  return fields.find((field) => field.key === key)?.label || labelForKey(key);
}

function reasonDisplayLabel(
  reason: SizeRecommendationResponse["reasons"][number],
  fields: MeasurementField[]
) {
  if (reason.label && reason.label.toLowerCase() !== reason.key.toLowerCase()) return reason.label;
  return dataQualityLabel(reason.key, fields);
}

export default function SizeRecommendationModal({
  isOpen,
  onClose,
  onOpenSizeGuide,
  product,
  selection,
}: SizeRecommendationModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isOpenRef = useRef(isOpen);

  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("measured");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [fitPreference, setFitPreference] = useState<SizeFitPreference>("regular");
  const [usualSize, setUsualSize] = useState("");
  const [result, setResult] = useState<SizeRecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();
  const fields = useMemo(() => getMeasurementFields(product), [product]);

  onCloseRef.current = onClose;
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen) {
      mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      if (!overlayRef.current) return;
      const visibleHeight = Math.min(viewport.height, window.innerHeight);
      overlayRef.current.style.setProperty("--size-dialog-viewport-height", `${visibleHeight}px`);
      overlayRef.current.style.top = `${viewport.offsetTop}px`;
    };
    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView(
      reduceMotion ? { block: "nearest" } : { behavior: "smooth", block: "nearest" }
    );
  }, [error, reduceMotion]);

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setResult(null);
      setError("");
      setIsSubmitting(false);
      setShowMeasurements(false);
      setShowDetails(false);
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const updateMeasurement = (key: string, value: string) => {
    setMeasurements((current) => ({ ...current, [key]: toDigitsOnly(value) }));
  };

  const validate = () => {
    const numericHeight = Number(toEnglishNumber(height));
    if (!height.trim()) return "قد خود را وارد کنید.";
    if (!Number.isFinite(numericHeight) || numericHeight < 120 || numericHeight > 230) {
      return "قد را بین ۱۲۰ تا ۲۳۰ سانتی‌متر وارد کنید.";
    }
    if (!weight) return "وزن تقریبی خود را انتخاب کنید.";
    return "";
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const submittedMeasurements: Record<string, string> = {
      height: toEnglishNumber(height).trim(),
      weight,
    };
    Object.entries(measurements).forEach(([key, value]) => {
      if (value.trim()) submittedMeasurements[key] = toEnglishNumber(value).trim();
    });

    const source: MeasurementSource = method === "measured" ? "measured" : "reference";
    const measurementSources: Record<string, MeasurementSource> = {
      height: method === "measured" ? "measured" : "estimated",
      weight: "estimated",
    };
    Object.keys(submittedMeasurements).forEach((key) => {
      if (key !== "height" && key !== "weight") measurementSources[key] = source;
    });

    const payload: SizeRecommendationRequest = {
      fit_preference: fitPreference,
      measurements: submittedMeasurements,
      measurement_sources: measurementSources,
    };
    if (selection.selectedVariant?.variantId) payload.variant_id = selection.selectedVariant.variantId;
    if (usualSize) payload.usual_size = usualSize;

    setError("");
    setIsSubmitting(true);
    try {
      const recommendation = await requestSizeRecommendation(product.id, payload);
      if (!isOpenRef.current) return;
      setResult(recommendation);
      setStep("result");
    } catch (requestError) {
      if (!isOpenRef.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "دریافت پیشنهاد سایز ممکن نشد. دوباره تلاش کنید."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToForm = () => {
    setError("");
    setStep("form");
  };

  const handleOpenGuide = () => {
    onClose();
    onOpenSizeGuide();
  };

  const sizeIsAvailable = (size?: string) => {
    if (!size) return false;
    const normalized = normalizeSize(size);
    if (!selection.sizes.some((option) => normalizeSize(option) === normalized)) return false;
    if (!selection.selectedColor) return true;
    return selection.sizesForSelectedColor.some((option) => normalizeSize(option) === normalized);
  };

  const applyRecommendation = () => {
    if (!result?.recommended_size || !sizeIsAvailable(result.recommended_size)) return;
    const canonicalSize =
      selection.sizes.find((size) => normalizeSize(size) === normalizeSize(result.recommended_size)) ||
      result.recommended_size;
    selection.setSize(canonicalSize);
    onClose();
    window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-size-option]")).find(
        (element) => normalizeSize(element.dataset.sizeOption) === normalizeSize(canonicalSize)
      );
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  };

  const copy = result ? statusCopy(result.status) : null;
  const freeSizeRecommendation = Boolean(
    result?.recommended_size &&
      (result.status === "recommended" || result.status === "no_chart") &&
      isFreeSize(result.recommended_size)
  );
  const recommendationAvailable =
    Boolean(result?.recommended_size) &&
    (result?.status === "recommended" || freeSizeRecommendation) &&
    sizeIsAvailable(result?.recommended_size);

  return typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="size-recommendation-overlay"
              ref={overlayRef}
              className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-4"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              onPointerDown={(event) => event.target === event.currentTarget && onClose()}
              dir="rtl"
            >
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="size-recommendation-title"
                initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: "spring", damping: 30, stiffness: 450 }}
                className="relative flex w-full max-h-[88dvh] sm:max-h-[85vh] sm:max-w-[440px] shrink-0 flex-col overflow-hidden rounded-t-3xl border border-border/30 bg-background shadow-2xl sm:rounded-2xl"
              >
                {/* Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-border/20 bg-card/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2
                        id="size-recommendation-title"
                        className="text-base font-bold text-foreground"
                      >
                        سایز من
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">{product.name}</p>
                    </div>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label="بستن"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>

                {/* Main Content Area */}
                <main
                  ref={mainRef}
                  tabIndex={-1}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [WebkitOverflowScrolling:touch] sm:p-5"
                >
                  <p role="status" className="sr-only">
                    {result
                      ? result.recommended_size
                        ? `سایز پیشنهادی: ${toPersianNumber(result.recommended_size)}`
                        : statusCopy(result.status).title
                      : ""}
                  </p>

                  {/* FORM STEP */}
                  {step === "form" && (
                    <form id="size-recommendation-form" onSubmit={submit} className="space-y-4">
                      {/* Height & Weight */}
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            قد <span className="text-destructive">*</span>
                          </span>
                          <div className="relative">
                            <input
                              value={toPersianNumber(height)}
                              onChange={(event) => setHeight(toDigitsOnly(event.target.value))}
                              inputMode="numeric"
                              maxLength={3}
                              placeholder="مثلاً ۱۷۵"
                              aria-invalid={Boolean(error && !height)}
                              className="h-11 w-full rounded-xl border border-border/40 bg-card px-3 pl-10 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              cm
                            </span>
                          </div>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            وزن تقریبی <span className="text-destructive">*</span>
                          </span>
                          <select
                            value={weight}
                            onChange={(event) => setWeight(event.target.value)}
                            aria-invalid={Boolean(error && !weight)}
                            className={cn(
                              "h-11 w-full rounded-xl border border-border/40 bg-card px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
                              !weight && "text-muted-foreground/60"
                            )}
                          >
                            <option value="">انتخاب وزن</option>
                            {weightOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* Fit Preference - Segmented Control */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-foreground">تن‌خور دلخواه</span>
                        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1 border border-border/30">
                          {fitOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFitPreference(option.value)}
                              className={cn(
                                "h-9 rounded-lg text-xs font-medium transition-all focus:outline-none",
                                fitPreference === option.value
                                  ? "bg-background text-foreground shadow-sm font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Usual Size (Optional) */}
                      {selection.sizes.length > 0 && (
                        <label className="block space-y-1.5">
                          <span className="text-xs text-muted-foreground">
                            سایز همیشگی شما <span className="text-[11px]">(اختیاری)</span>
                          </span>
                          <select
                            value={usualSize}
                            onChange={(event) => setUsualSize(event.target.value)}
                            className={cn(
                              "h-10 w-full rounded-xl border border-border/30 bg-card px-3 text-xs outline-none transition-colors focus:border-primary",
                              !usualSize && "text-muted-foreground/60"
                            )}
                          >
                            <option value="">اطلاع ندارم</option>
                            {selection.sizes.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {/* Optional Detailed Measurements Collapsible */}
                      {fields.length > 0 && (
                        <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowMeasurements((curr) => !curr)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                          >
                            <span className="flex items-center gap-1.5 font-medium">
                              <Ruler className="h-3.5 w-3.5 text-primary" />
                              اندازه‌های دقیق‌تر (اختیاری)
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                showMeasurements && "rotate-180"
                              )}
                            />
                          </button>

                          {showMeasurements && (
                            <div className="space-y-3 border-t border-border/20 p-3 bg-background/50">
                              <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary/40 p-0.5 border border-border/20 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setMethod("measured")}
                                  className={cn(
                                    "py-1.5 rounded-md font-medium transition-all",
                                    method === "measured"
                                      ? "bg-background text-foreground shadow-xs font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  اندازه بدن
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMethod("reference")}
                                  className={cn(
                                    "py-1.5 rounded-md font-medium transition-all",
                                    method === "reference"
                                      ? "bg-background text-foreground shadow-xs font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  لباس مشابه
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                {fields.map((field) => (
                                  <label key={field.key} className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground">
                                      {field.label}
                                    </span>
                                    <div className="relative">
                                      <input
                                        value={toPersianNumber(measurements[field.key] || "")}
                                        onChange={(event) =>
                                          updateMeasurement(field.key, event.target.value)
                                        }
                                        inputMode="numeric"
                                        maxLength={3}
                                        placeholder="مثلاً ۹۵"
                                        className="h-9 w-full rounded-lg border border-border/30 bg-background px-2.5 pl-8 text-xs outline-none focus:border-primary"
                                      />
                                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                        cm
                                      </span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </form>
                  )}

                  {/* RESULT STEP */}
                  {step === "result" && result && copy && (
                    <div className="space-y-3.5">
                      {result.recommended_size &&
                      (result.status === "recommended" || freeSizeRecommendation) ? (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                          <p className="text-xs text-muted-foreground font-medium">
                            {freeSizeRecommendation ? "راهنمای محصول" : "سایز پیشنهادی شما"}
                          </p>

                          <div className="my-1.5 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                            {toPersianNumber(result.recommended_size)}
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <span>
                              تن‌خور:{" "}
                              {result.fit_summary ||
                                (fitPreference === "slim"
                                  ? "جذب"
                                  : fitPreference === "relaxed"
                                  ? "آزاد"
                                  : "استاندارد")}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-foreground">
                              {confidenceLabel(result.confidence_level)}
                            </span>
                          </div>

                          {freeSizeRecommendation && (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              این لباس تک‌سایز (فری‌سایز) است و با اطلاعات شما همخوانی دارد.
                            </p>
                          )}

                          <div className="mt-3">
                            {recommendationAvailable ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                موجود در رنگ انتخابی
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-3.5 w-3.5" />
                                در این رنگ ناموجود (سایر رنگ‌ها را بررسی کنید)
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border/30 bg-secondary/30 p-4 text-center">
                          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">{copy.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {copy.message}
                          </p>
                        </div>
                      )}

                      {/* Collapsible Details for Reasons & Alternatives */}
                      {(result.reasons.length > 0 || result.alternatives.length > 0) && (
                        <div className="rounded-xl border border-border/25 bg-card/40 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowDetails((curr) => !curr)}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                          >
                            <span className="font-medium">جزئیات تن‌خور و پیشنهادها</span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                showDetails && "rotate-180"
                              )}
                            />
                          </button>

                          {showDetails && (
                            <div className="space-y-3 border-t border-border/20 p-3 text-xs">
                              {result.reasons.length > 0 && (
                                <div className="space-y-1.5">
                                  {result.reasons.map((reason) => (
                                    <div
                                      key={`${reason.key}-${reason.message}`}
                                      className="flex items-start gap-2 text-muted-foreground"
                                    >
                                      <span
                                        className={cn(
                                          "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                          reason.direction === "good"
                                            ? "bg-emerald-500"
                                            : "bg-primary"
                                        )}
                                      />
                                      <p className="leading-5">
                                        <span className="font-semibold text-foreground">
                                          {reasonDisplayLabel(reason, fields)}:{" "}
                                        </span>
                                        {reason.message}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {result.alternatives.length > 0 && (
                                <div className="pt-2 border-t border-border/15">
                                  <span className="block text-[11px] text-muted-foreground mb-1.5">
                                    سایر سایزها:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.alternatives.map((alt) => (
                                      <div
                                        key={alt.size}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-background px-2.5 py-1 text-xs"
                                      >
                                        <span className="font-bold text-foreground">
                                          {toPersianNumber(alt.size)}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          ({alt.fit_summary})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Notification */}
                  {error && (
                    <div
                      ref={errorRef}
                      role="alert"
                      className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </main>

                {/* Footer Actions */}
                <footer className="shrink-0 border-t border-border/20 bg-card/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
                  {step === "form" && (
                    <div className="space-y-2">
                      <Button
                        className="w-full h-11 text-sm font-semibold rounded-xl"
                        form="size-recommendation-form"
                        type="submit"
                        size="lg"
                        isLoading={isSubmitting}
                      >
                        محاسبه سایز من
                      </Button>
                      <button
                        type="button"
                        onClick={handleOpenGuide}
                        className="block w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-primary focus:outline-none"
                      >
                        مشاهده جدول اندازه‌ها
                      </button>
                    </div>
                  )}

                  {step === "result" && result && (
                    <div className="space-y-2">
                      {recommendationAvailable ? (
                        <Button
                          className="w-full h-11 text-sm font-semibold rounded-xl"
                          size="lg"
                          onClick={applyRecommendation}
                          rightIcon={<Check className="h-4 w-4" />}
                        >
                          انتخاب سایز {toPersianNumber(result.recommended_size ?? "")}
                        </Button>
                      ) : (
                        <Button
                          className="w-full h-11 text-sm font-semibold rounded-xl"
                          size="lg"
                          variant="outline"
                          onClick={handleOpenGuide}
                        >
                          مشاهده جدول اندازه‌ها
                        </Button>
                      )}

                      <div className="flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={returnToForm}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          تغییر اطلاعات
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenGuide}
                          className="text-xs text-primary transition-colors hover:underline focus:outline-none"
                        >
                          جدول اندازه‌ها
                        </button>
                      </div>
                    </div>
                  )}
                </footer>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;
}
