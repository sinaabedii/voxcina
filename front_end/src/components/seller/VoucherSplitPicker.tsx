"use client";

import { useState } from "react";
import { Calendar, Clock, Minus, Plus, Ticket, Truck, Users } from "lucide-react";

import Button from "@/components/ui/Button";
import {
  SHIPPING_DISCOUNT_LABELS,
  SHIPPING_DISCOUNT_OPTIONS,
  type ShippingDiscount,
} from "@/lib/shipping-discount";

const USAGE_PRESETS = [10, 25, 50, 100, 250, 500];

const VALIDITY_PRESETS = [
  { days: 7, label: "۷ روز" },
  { days: 14, label: "۱۴ روز" },
  { days: 30, label: "۳۰ روز" },
  { days: 90, label: "۹۰ روز" },
  { days: 180, label: "۱۸۰ روز" },
  { days: 365, label: "۱ سال" },
];

/**
 * Configure and mint a seller voucher code:
 * - Budget split between customer discount and seller commission
 * - User usage limit (max_uses, minimum 1)
 * - Expiration / validity period (valid_days, 1 to 365 days)
 * - Shipping option ("free" | "half" | "full"; "full" = customer pays)
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
  onCreate: (
    discountPercent: number,
    sellerSharePercent: number,
    maxUses: number,
    validDays: number,
    shippingDiscount: ShippingDiscount
  ) => void;
}) {
  // Start at the midpoint, rounded down, so the default is a real position on
  // the scale rather than a fraction when the budget is odd.
  const [discountPercent, setDiscountPercent] = useState(Math.floor(totalPercent / 2));
  const [maxUses, setMaxUses] = useState<number>(50);
  const [validDays, setValidDays] = useState<number>(30);
  // "full" (customer pays shipping) is the default, matching discounts the
  // backend creates when the field is absent.
  const [shippingDiscount, setShippingDiscount] = useState<ShippingDiscount>("full");

  const sellerSharePercent = totalPercent - discountPercent;

  const clampSplit = (next: number) => Math.min(maxPercent, Math.max(minPercent, next));
  const stepSplit = (delta: number) => setDiscountPercent((current) => clampSplit(current + delta));

  const stepUses = (delta: number) => {
    setMaxUses((current) => Math.max(1, (current || 0) + delta));
  };

  const stepDays = (delta: number) => {
    setValidDays((current) => Math.min(365, Math.max(1, (current || 0) + delta)));
  };

  // A handful of round splits, kept inside the legal range.
  const splitPresets = [0, 9, 18, 27, 36].filter((p) => p >= minPercent && p <= maxPercent);

  const isValid =
    discountPercent >= minPercent &&
    discountPercent <= maxPercent &&
    maxUses >= 1 &&
    validDays >= 1 &&
    validDays <= 365;

  const expiryDate = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
  const expiryDateFormatted =
    validDays >= 1 && validDays <= 365
      ? expiryDate.toLocaleDateString("fa-IR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <div className="rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5 md:p-6 shadow-sm">
      <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream mb-1">
        ساخت کد تخفیف جدید
      </h2>
      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6">
        مجموع سهم شما و تخفیف مشتری همیشه {totalPercent.toLocaleString("fa-IR")}٪ است. سقف استفاده و
        مدت اعتبار را نیز تعیین کنید.
      </p>

      {/* 1. Split Section */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-5">
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
          className="flex items-center justify-center gap-4 mb-4"
          role="group"
          aria-label="تنظیم تقسیم درصد"
        >
          <button
            type="button"
            onClick={() => stepSplit(-1)}
            disabled={discountPercent <= minPercent || isSubmitting}
            aria-label="یک درصد از تخفیف مشتری کم کن"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
          >
            <Minus className="h-5 w-5" />
          </button>

          <div className="min-w-[9rem] text-center">
            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">تخفیف مشتری</p>
            <p
              className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream"
              aria-live="polite"
            >
              {discountPercent.toLocaleString("fa-IR")}٪
            </p>
          </div>

          <button
            type="button"
            onClick={() => stepSplit(1)}
            disabled={discountPercent >= maxPercent || isSubmitting}
            aria-label="یک درصد به تخفیف مشتری اضافه کن"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {splitPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDiscountPercent(preset)}
              disabled={isSubmitting}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                discountPercent === preset
                  ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue shadow-sm font-bold"
                  : "border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30"
              }`}
            >
              {preset.toLocaleString("fa-IR")}٪ / {(totalPercent - preset).toLocaleString("fa-IR")}٪
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-5 border-t border-voxcina-cream dark:border-voxcina-blue/20">
        {/* 2. Usage Limit Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="voucher-max-uses"
              className="flex items-center gap-2 text-sm font-bold text-voxcina-blue dark:text-voxcina-cream"
            >
              <Users className="h-4 w-4 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
              <span>سقف تعداد استفاده برای کاربران</span>
            </label>
            <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
              حداقل ۱ بار
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => stepUses(-5)}
              disabled={maxUses <= 1 || isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
              aria-label="کاهش سقف استفاده"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <input
                id="voucher-max-uses"
                type="number"
                min={1}
                value={maxUses || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxUses(Number.isNaN(val) ? 0 : Math.max(0, val));
                }}
                onBlur={() => {
                  if (!maxUses || maxUses < 1) setMaxUses(1);
                }}
                disabled={isSubmitting}
                className="w-full text-center font-bold text-lg rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream py-2 px-3 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/20 dark:focus:ring-voxcina-cream/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-normal text-voxcina-blue/50 dark:text-voxcina-cream/50 pointer-events-none">
                بار
              </span>
            </div>

            <button
              type="button"
              onClick={() => stepUses(5)}
              disabled={isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
              aria-label="افزایش سقف استفاده"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {USAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMaxUses(preset)}
                disabled={isSubmitting}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  maxUses === preset
                    ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue shadow-sm font-bold"
                    : "border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30"
                }`}
              >
                {preset.toLocaleString("fa-IR")} بار
              </button>
            ))}
          </div>
        </div>

        {/* 3. Validity Duration Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="voucher-valid-days"
              className="flex items-center gap-2 text-sm font-bold text-voxcina-blue dark:text-voxcina-cream"
            >
              <Calendar className="h-4 w-4 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
              <span>مدت اعتبار کد</span>
            </label>
            <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
              حداکثر ۱ سال (۳۶۵ روز)
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => stepDays(-1)}
              disabled={validDays <= 1 || isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
              aria-label="کاهش روزهای اعتبار"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <input
                id="voucher-valid-days"
                type="number"
                min={1}
                max={365}
                value={validDays || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setValidDays(Number.isNaN(val) ? 0 : Math.min(365, Math.max(0, val)));
                }}
                onBlur={() => {
                  if (!validDays || validDays < 1) setValidDays(1);
                  if (validDays > 365) setValidDays(365);
                }}
                disabled={isSubmitting}
                className="w-full text-center font-bold text-lg rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream py-2 px-3 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/20 dark:focus:ring-voxcina-cream/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-normal text-voxcina-blue/50 dark:text-voxcina-cream/50 pointer-events-none">
                روز
              </span>
            </div>

            <button
              type="button"
              onClick={() => stepDays(1)}
              disabled={validDays >= 365 || isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream transition-colors hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 disabled:opacity-40"
              aria-label="افزایش روزهای اعتبار"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
            {VALIDITY_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setValidDays(preset.days)}
                disabled={isSubmitting}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  validDays === preset.days
                    ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue shadow-sm font-bold"
                    : "border border-voxcina-cream dark:border-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {expiryDateFormatted && (
            <div className="flex items-center justify-between text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 rounded-lg bg-voxcina-cream/30 dark:bg-voxcina-blue/20 px-3 py-1.5">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 opacity-70" />
                <span>انقضای تقریبی:</span>
              </span>
              <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                {expiryDateFormatted}
              </span>
            </div>
          )}
        </div>

        {/* 4. Shipping Discount Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="voucher-shipping-discount"
              className="flex items-center gap-2 text-sm font-bold text-voxcina-blue dark:text-voxcina-cream"
            >
              <Truck className="h-4 w-4 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
              <span>تخفیف هزینه ارسال</span>
            </label>
          </div>

          <select
            id="voucher-shipping-discount"
            value={shippingDiscount}
            onChange={(e) => setShippingDiscount(e.target.value as ShippingDiscount)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-voxcina-blue/20 dark:focus:ring-voxcina-cream/20 transition-all disabled:opacity-60"
          >
            {SHIPPING_DISCOUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-voxcina-blue/50 dark:text-voxcina-cream/50">
            در حالت «{SHIPPING_DISCOUNT_LABELS.free}»، ۵۰٪ هزینه ارسال بر عهده فروشنده و مابقی بر
            عهده پلتفرم است. در دو حالت دیگر، هزینه ارسال توسط پلتفرم و کاربر پرداخت می‌شود.
          </p>
        </div>

        {/* 5. Configuration Preview Summary */}
        <div className="rounded-xl border border-voxcina-cream/80 dark:border-voxcina-blue/30 bg-voxcina-cream/20 dark:bg-voxcina-blue/15 p-3.5 text-xs space-y-1.5 text-voxcina-blue/80 dark:text-voxcina-cream/80">
          <div className="flex justify-between items-center">
            <span>تخفیف مشتری / سهم فروشنده:</span>
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {discountPercent.toLocaleString("fa-IR")}٪ / {sellerSharePercent.toLocaleString("fa-IR")}٪
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>تخفیف هزینه ارسال:</span>
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {SHIPPING_DISCOUNT_LABELS[shippingDiscount]}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>سقف مجاز استفاده:</span>
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {maxUses.toLocaleString("fa-IR")} بار
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>مدت اعتبار:</span>
            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">
              {validDays.toLocaleString("fa-IR")} روز
            </span>
          </div>
        </div>

        {disabled && disabledReason && (
          <p className="rounded-xl bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-center text-sm text-amber-700 dark:text-amber-400">
            {disabledReason}
          </p>
        )}

        <Button
          variant="primary"
          className="w-full rounded-xl"
          onClick={() => onCreate(discountPercent, sellerSharePercent, maxUses, validDays, shippingDiscount)}
          disabled={disabled || isSubmitting || !isValid}
          isLoading={isSubmitting}
        >
          <Ticket className="ml-2 h-4 w-4" />
          ساخت کد تخفیف جدید
        </Button>
      </div>
    </div>
  );
}
