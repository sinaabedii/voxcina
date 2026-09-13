"use client";

import { useState } from "react";
import { Minus, Plus, Ticket } from "lucide-react";

import Button from "@/components/ui/Button";

/**
 * Splits the fixed budget between the customer's discount and the seller's
 * commission.
 *
 * The control is a stepper with two buttons and a set of preset positions, NOT
 * a range slider: the split moves one whole percentage point at a time, and a
 * slider invites a drag that lands on a fraction. The two halves are bound —
 * raising one lowers the other — so an invalid total is not reachable from the
 * UI at all. The API validates it again anyway, because a form is not a
 * guarantee.
 */
export default function VoucherSplitPicker({
  totalPercent,
  minPercent,
  maxPercent,
  isSubmitting,
  disabled,
  disabledReason,
  onCreate,
}: {
  totalPercent: number;
  minPercent: number;
  maxPercent: number;
  isSubmitting: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onCreate: (discountPercent: number, sellerSharePercent: number) => void;
}) {
  // Start at the midpoint, rounded down, so the default is a real position on
  // the scale rather than a fraction when the budget is odd.
  const [discountPercent, setDiscountPercent] = useState(Math.floor(totalPercent / 2));
  const sellerSharePercent = totalPercent - discountPercent;

  const clamp = (next: number) => Math.min(maxPercent, Math.max(minPercent, next));
  const step = (delta: number) => setDiscountPercent((current) => clamp(current + delta));

  // A handful of round splits, kept inside the legal range.
  const presets = [0, 9, 18, 27, 36].filter((p) => p >= minPercent && p <= maxPercent);

  return (
    <div className="rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5 md:p-6">
      <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream mb-1">
        ساخت کد تخفیف جدید
      </h2>
      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6">
        مجموع سهم شما و تخفیف مشتری همیشه {totalPercent.toLocaleString("fa-IR")}٪ است. هر
        بار یک واحد جابه‌جا می‌شود و پس از ساخت، تقسیم این کد قابل تغییر نیست.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/80 dark:bg-amber-900/10 p-4 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">تخفیف مشتری</p>
          <p className="text-3xl font-bold text-amber-800 dark:text-amber-300">
            {discountPercent.toLocaleString("fa-IR")}٪
          </p>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800/30 bg-green-50/80 dark:bg-green-900/10 p-4 text-center">
          <p className="text-xs text-green-700 dark:text-green-400 mb-1">سهم شما</p>
          <p className="text-3xl font-bold text-green-800 dark:text-green-300">
            {sellerSharePercent.toLocaleString("fa-IR")}٪
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-4 mb-5"
        role="group"
        aria-label="تنظیم تقسیم درصد"
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={discountPercent <= minPercent || isSubmitting}
          aria-label="یک درصد از تخفیف مشتری کم کن"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="min-w-[9rem] text-center">
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
            تخفیف مشتری
          </p>
          <p
            className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream"
            aria-live="polite"
          >
            {discountPercent.toLocaleString("fa-IR")}٪
          </p>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={discountPercent >= maxPercent || isSubmitting}
          aria-label="یک درصد به تخفیف مشتری اضافه کن"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setDiscountPercent(preset)}
            disabled={isSubmitting}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              discountPercent === preset
                ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                : "border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30"
            }`}
          >
            {preset.toLocaleString("fa-IR")}٪ / {(totalPercent - preset).toLocaleString("fa-IR")}٪
          </button>
        ))}
      </div>

      {disabled && disabledReason && (
        <p className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-center text-sm text-amber-700 dark:text-amber-400">
          {disabledReason}
        </p>
      )}

      <Button
        variant="primary"
        className="w-full rounded-xl"
        onClick={() => onCreate(discountPercent, sellerSharePercent)}
        disabled={disabled || isSubmitting}
        isLoading={isSubmitting}
      >
        <Ticket className="ml-2 h-4 w-4" />
        ساخت کد با این تقسیم
      </Button>
    </div>
  );
}
