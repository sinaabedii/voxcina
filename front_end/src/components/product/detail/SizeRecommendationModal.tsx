"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Info,
  LockKeyhole,
  Ruler,
  Sparkles,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { requestSizeRecommendation } from "@/lib/size-recommendation-api";
import { cn, toDigitsOnly, toEnglishNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import {
  MeasurementSource,
  SizeFitPreference,
  SizeRecommendationRequest,
  SizeRecommendationResponse,
} from "@/types/size-recommendation";
import { VariantSelection } from "./useVariantSelection";

type Step = "intro" | "form" | "result";
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

const fitOptions: Array<{ value: SizeFitPreference; label: string; description: string }> = [
  { value: "slim", label: "جذب", description: "نزدیک‌تر به بدن" },
  { value: "regular", label: "استاندارد", description: "آزادی متعادل" },
  { value: "relaxed", label: "آزاد", description: "راحت و رها" },
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

const fallbackLabels: Record<string, string> = {
  chest: "دور سینه",
  bust: "دور سینه",
  waist: "دور کمر",
  hip: "دور باسن",
  shoulder: "عرض شانه",
  shoulder_width: "عرض شانه",
  sleeve: "قد آستین",
  sleeve_length: "قد آستین",
  inseam: "قد داخلی پا",
  length: "قد لباس",
};

function labelForKey(key: string) {
  return fallbackLabels[key.toLowerCase()] || "اندازه مرتبط";
}

function normalizeSize(size?: string) {
  return size ? toEnglishNumber(size).trim().toLowerCase() : "";
}

function isFreeSize(size?: string) {
  return ["free", "free-size", "free size", "freesize", "one-size", "onesize", "فری سایز", "فری‌سایز", "فریسایز", "سایز آزاد"].includes(
    normalizeSize(size)
  );
}

function getMeasurementFields(product: Product): MeasurementField[] {
  const fromSizingType = product.sizing_type?.measurements?.map((measurement) => ({
    key: measurement.key,
    label: measurement.label || labelForKey(measurement.key),
    hint: measurement.body_guide,
  }));
  const fromChart = Object.keys(product.size_chart?.[0]?.values || {}).map((key) => ({
    key,
    label: fallbackLabels[key.toLowerCase()] || labelForKey(key),
  }));

  return [...(fromSizingType?.length ? fromSizingType : fromChart)]
    .filter(({ key }) => !/^(height|weight|height_cm|weight_kg)$/i.test(key))
    .slice(0, 4);
}

function confidenceLabel(level?: SizeRecommendationResponse["confidence_level"]) {
  if (level === "high") return "اطمینان خوب";
  if (level === "medium") return "اطمینان متوسط";
  if (level === "low") return "اطمینان کم";
  return "پیشنهاد تقریبی";
}

function statusCopy(status: SizeRecommendationResponse["status"]) {
  switch (status) {
    case "no_chart":
      return {
        title: "برای این محصول جدول سایز نداریم",
        message: "برای انتخاب دقیق‌تر، جدول اندازه‌ها و اندازه لباس مشابه‌تان را بررسی کنید.",
      };
    case "no_match":
      return {
        title: "با اطلاعات فعلی سایز دقیقی پیدا نشد",
        message: "اندازه‌ها یا قواره انتخابی را کمی تغییر دهید، یا از جدول اندازه‌ها کمک بگیرید.",
      };
    case "unavailable":
      return {
        title: "سایز مناسب در رنگ انتخابی موجود نیست",
        message: "می‌توانید رنگ دیگری را بررسی کنید؛ ما رنگ فعلی شما را تغییر نمی‌دهیم.",
      };
    case "insufficient_data":
      return {
        title: "اطلاعات بیشتری لازم است",
        message: "قد و وزن تقریبی را وارد کنید و اگر می‌توانید یکی از اندازه‌های پیشنهادی را هم اضافه کنید.",
      };
    default:
      return {
        title: "پیشنهاد سایز آماده است",
        message: "این نتیجه تقریبی است و به اندازه‌گیری شما و قواره انتخابی بستگی دارد.",
      };
  }
}

function dataQualityLabel(key: string, fields: MeasurementField[]) {
  if (key === "height") return "قد";
  if (key === "weight") return "وزن تقریبی";
  return fields.find((field) => field.key === key)?.label || fallbackLabels[key.toLowerCase()] || "اندازه مرتبط";
}

function reasonDisplayLabel(reason: SizeRecommendationResponse["reasons"][number], fields: MeasurementField[]) {
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [step, setStep] = useState<Step>("intro");
  const [method, setMethod] = useState<Method>("measured");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [fitPreference, setFitPreference] = useState<SizeFitPreference>("regular");
  const [usualSize, setUsualSize] = useState("");
  const [result, setResult] = useState<SizeRecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = useMemo(() => getMeasurementFields(product), [product]);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      setStep("intro");
      setHeight("");
      setWeight("");
      setMeasurements({});
      setFitPreference("regular");
      setUsualSize("");
      setResult(null);
      setError("");
      setIsSubmitting(false);
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
      setResult(recommendation);
      setStep("result");
    } catch (requestError) {
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
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-size-option]"))
        .find((element) => normalizeSize(element.dataset.sizeOption) === normalizeSize(canonicalSize));
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      dir="rtl"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-recommendation-title"
        className="flex h-[min(94vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-border/30 bg-background shadow-2xl transition-all motion-reduce:transition-none sm:h-[min(90vh,760px)] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border/20 bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Ruler className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="size-recommendation-title" className="text-base font-bold text-primary sm:text-lg">
                سایز مناسب من
              </h2>
              <p className="text-[11px] text-muted-foreground">برای {product.name}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none"
            aria-label="بستن راهنمای انتخاب سایز"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          {step === "intro" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-secondary/30 p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-bold">انتخابی نزدیک‌تر به تن‌خور شما</span>
                </div>
                <h3 className="text-xl font-bold leading-9 text-foreground sm:text-2xl">
                  با چند اطلاعات ساده، سایز مناسب را پیدا کنید.
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  این نتیجه یک تخمین تقریبی است، نه اندازه‌گیری قطعی. اطلاعات شما فقط برای همین پیشنهاد استفاده می‌شود و ذخیره نمی‌شود.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/30 bg-card/70 p-4">
                  <LockKeyhole className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">خصوصی و بدون ذخیره‌سازی</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">اندازه‌ها در حساب، مرورگر یا آدرس صفحه ذخیره نمی‌شوند.</p>
                </div>
                <div className="rounded-2xl border border-border/30 bg-card/70 p-4">
                  <HelpCircle className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">کمتر از یک دقیقه</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">قد، وزن تقریبی و قواره دلخواه کافی است؛ چند اندازه دیگر اختیاری‌اند.</p>
                </div>
              </div>
            </div>
          )}

          {step === "form" && (
            <form id="size-recommendation-form" onSubmit={submit} className="space-y-6">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">روش وارد کردن اندازه‌ها</h3>
                    <p className="mt-1 text-xs text-muted-foreground">هر دو روش نتیجه‌ای تقریبی به شما می‌دهند.</p>
                  </div>
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["measured", "اندازه‌های بدنم را دارم", "اندازه‌های بدن با متر"],
                    ["reference", "تخمین سریع / لباس مرجع", "اندازه لباس مشابه شما"],
                  ].map(([value, title, description]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={method === value}
                      onClick={() => setMethod(value as Method)}
                      className={cn(
                        "min-h-[72px] rounded-2xl border p-3 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none",
                        method === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 bg-card hover:border-primary/40"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {title}
                        {method === value && <CheckCircle2 className="h-4 w-4" />}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">قد <span className="text-destructive">*</span></span>
                  <div className="relative">
                    <input
                      value={height}
                      onChange={(event) => setHeight(toDigitsOnly(event.target.value))}
                      inputMode="numeric"
                      placeholder="مثلاً ۱۷۲"
                      aria-invalid={Boolean(error && !height)}
                      className="h-12 w-full rounded-xl border border-border/40 bg-card px-4 pl-14 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
                    />
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">سانتی‌متر</span>
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">وزن تقریبی <span className="text-destructive">*</span></span>
                  <select
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="h-12 w-full rounded-xl border border-border/40 bg-card px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
                  >
                    <option value="">انتخاب بازه وزن</option>
                    {weightOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </section>

              {fields.length > 0 && (
                <section>
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-foreground">اندازه‌های اختیاری برای دقت بیشتر</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {method === "measured" ? "به سانتی‌متر وارد کنید؛ لازم نیست همه را بدانید." : "اندازه لباس مشابه را به سانتی‌متر وارد کنید."}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <label key={field.key} className="space-y-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        <div className="relative">
                          <input
                            value={measurements[field.key] || ""}
                            onChange={(event) => updateMeasurement(field.key, event.target.value)}
                            inputMode="numeric"
                            placeholder="مثلاً ۹۶"
                            className="h-12 w-full rounded-xl border border-border/40 bg-card px-4 pl-14 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
                          />
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-foreground">تن‌خور مورد علاقه شما</h3>
                  <p className="mt-1 text-xs text-muted-foreground">اگر بین دو سایز هستید، این انتخاب روی پیشنهاد اثر می‌گذارد.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {fitOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={fitPreference === option.value}
                      onClick={() => setFitPreference(option.value)}
                      className={cn(
                        "min-h-[64px] rounded-xl border px-2 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none",
                        fitPreference === option.value ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card hover:border-primary/40"
                      )}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{option.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">سایزی که معمولاً می‌پوشید <span className="font-normal text-muted-foreground">(اختیاری)</span></span>
                <select
                  value={usualSize}
                  onChange={(event) => setUsualSize(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border/40 bg-card px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
                >
                  <option value="">نمی‌دانم / وارد نمی‌کنم</option>
                  {selection.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </form>
          )}

          {step === "result" && result && copy && (
            <div className="space-y-5" role="status" aria-live="polite">
              {result.recommended_size && (result.status === "recommended" || freeSizeRecommendation) ? (
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {freeSizeRecommendation ? "راهنمای سایز این محصول" : "سایز پیشنهادی شما"}
                      </p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-foreground">{result.recommended_size}</p>
                    </div>
                    <div className="rounded-2xl bg-background/70 p-3 text-primary">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                  </div>
                  {freeSizeRecommendation && (
                    <p className="mt-4 text-sm leading-6 text-foreground/80">
                      این محصول فری‌سایز است و بر اساس اندازه‌های واردشده، جدول اندازه‌ها و تن‌خور دلخواه شما قابل بررسی است.
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-background/80 px-3 py-1.5 font-semibold text-primary">{confidenceLabel(result.confidence_level)}</span>
                    {result.fit_summary && <span className="rounded-full bg-background/60 px-3 py-1.5 text-foreground/80">{result.fit_summary}</span>}
                  </div>
                  {!recommendationAvailable && (
                    <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-6 text-amber-700 dark:text-amber-300">
                      این سایز در رنگ انتخابی شما موجود نیست. رنگ شما تغییر نمی‌کند؛ می‌توانید جدول اندازه‌ها یا گزینه‌های دیگر را ببینید.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/30 bg-secondary/30 p-5 sm:p-6">
                  <AlertCircle className="mb-3 h-7 w-7 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">{copy.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.message}</p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-secondary/35 p-3 text-xs leading-6 text-muted-foreground">
                <Info className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{result.approximate ? "این پیشنهاد تقریبی است؛ فرم بدن، جنس پارچه و تن‌خور لباس می‌تواند نتیجه را تغییر دهد." : copy.message}</span>
              </div>

              {result.reasons.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-bold">چرا این پیشنهاد؟</h3>
                  <div className="space-y-2">
                    {result.reasons.map((reason) => (
                      <div key={`${reason.key}-${reason.message}`} className="flex items-start gap-3 rounded-xl border border-border/20 bg-card p-3">
                        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", reason.direction === "good" ? "bg-emerald-500/10 text-emerald-600" : reason.direction === "unknown" ? "bg-secondary text-muted-foreground" : "bg-amber-500/10 text-amber-600")}>
                          {reason.direction === "good" ? <Check className="h-3.5 w-3.5" /> : <Ruler className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <p className="text-xs font-semibold">{reasonDisplayLabel(reason, fields)}</p>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">{reason.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {result.alternatives.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-bold">اگر تن‌خور دیگری می‌خواهید</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.alternatives.map((alternative) => (
                      <div key={alternative.size} className="rounded-xl border border-border/25 bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-primary">{alternative.size}</span>
                          <span className={cn("text-[11px]", alternative.available ? "text-emerald-600" : "text-muted-foreground")}>{alternative.available ? "موجود" : "ناموجود"}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{alternative.fit_summary}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {result.data_quality.used_keys.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  اطلاعات استفاده‌شده: {result.data_quality.used_keys.map((key) => dataQualityLabel(key, fields)).join("، ")}
                </p>
              )}
            </div>
          )}

          {isSubmitting && (
            <div className="mt-5 space-y-3 rounded-2xl border border-border/20 bg-card p-4" aria-live="polite" aria-label="در حال بررسی سایز">
              <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
              <div className="h-10 w-24 animate-pulse rounded-xl bg-secondary" />
              <div className="h-3 w-full animate-pulse rounded bg-secondary" />
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
              <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </main>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-border/20 bg-card/90 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step === "intro" && (
            <>
              <p className="text-center text-[11px] text-muted-foreground sm:text-right">بدون نیاز به عکس، سن یا اطلاعات هویتی</p>
              <Button size="lg" onClick={() => setStep("form")} rightIcon={<ChevronLeft className="h-4 w-4" />}>
                شروع راهنمای انتخاب سایز
              </Button>
            </>
          )}
          {step === "form" && (
            <>
              <button type="button" onClick={() => setStep("intro")} className="flex min-h-11 items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none">
                <ChevronRight className="h-4 w-4" /> بازگشت
              </button>
              <Button form="size-recommendation-form" type="submit" size="lg" isLoading={isSubmitting} rightIcon={<ArrowLeft className="h-4 w-4" />}>
                دیدن سایز پیشنهادی
              </Button>
            </>
          )}
          {step === "result" && result && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <button type="button" onClick={returnToForm} className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none">
                  <ChevronRight className="h-4 w-4" /> اصلاح اطلاعات
                </button>
                <button type="button" onClick={handleOpenGuide} className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none">
                  جدول اندازه‌ها <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              {recommendationAvailable ? (
                <Button size="lg" onClick={applyRecommendation} rightIcon={<Check className="h-4 w-4" />}>
                  انتخاب سایز {result.recommended_size}
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={handleOpenGuide}>
                  مشاهده جدول اندازه‌ها
                </Button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
